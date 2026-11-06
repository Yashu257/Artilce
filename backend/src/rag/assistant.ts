/**
 * assistant.ts — answerQuestion(): retrieve -> deduplicate -> ground -> generate -> persist.
 *
 * Implements the plug-in contract in ./types.ts:
 *   export const ASSISTANT_AVAILABLE = true
 *   export const handleChat: AssistantHandler
 */
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getEmbeddingProvider, tokenize } from './embeddings';
import { retrieve, type RetrievedChunk } from './retrieval';
import {
  INSUFFICIENT_INFORMATION,
  MEDICAL_DISCLAIMER,
  SYSTEM_PROMPT,
  buildGroundedPrompt,
  cleanExcerptText,
} from './prompts';
import type { AssistantHandler, ChatRequest, ChatResult } from './types';

export const ASSISTANT_AVAILABLE = true;

export type AssistantMode = 'llm' | 'local-retrieval';

export interface AssistantAnswer extends ChatResult {
  mode: AssistantMode;
  engine: string;
  provider: string;
}

const OPENAI_CHAT_MODEL = 'gpt-4o-mini';
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

function withDisclaimer(body: string): string {
  return `${body.trim()}\n\n${MEDICAL_DISCLAIMER}`;
}

/**
 * Deduplicate chunks: when multiple chunks come from the same document and page,
 * merge their evidence into a single citation entry to prevent repeated citations.
 */
export function deduplicateChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const map = new Map<string, RetrievedChunk>();
  for (const c of chunks) {
    const key = `${c.documentId}:${c.page}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...c });
    } else {
      // Merge excerpt if new text adds information
      if (!existing.excerpt.includes(c.excerpt.slice(0, 40))) {
        existing.excerpt = `${existing.excerpt}\n\n${c.excerpt}`;
      }
      if (c.relevance > existing.relevance) {
        existing.relevance = c.relevance;
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Extract clean professional display name for greeting.
 * If user email is e.g. yashwanth9883@gmail.com, resolves to "Yashwanth".
 */
export function getUserDisplayName(user?: { name?: string | null; email?: string | null } | null): string {
  if (user?.name && user.name.trim().toLowerCase() !== 'doctor' && user.name.trim().length > 0) {
    return user.name.trim();
  }
  if (user?.email) {
    const handle = user.email.split('@')[0];
    const cleanHandle = handle.replace(/[0-9._-]+$/, '').replace(/^[0-9._-]+/, '');
    const nameCandidate = cleanHandle || handle;
    if (nameCandidate) {
      return nameCandidate.charAt(0).toUpperCase() + nameCandidate.slice(1);
    }
  }
  return 'Doctor';
}

/**
 * Check if the user query is a greeting.
 */
export function isGreeting(question: string): boolean {
  const q = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const greetingExact = [
    'hi',
    'hello',
    'hey',
    'hiya',
    'hola',
    'namaste',
    'good morning',
    'good afternoon',
    'good evening',
    'greetings',
    'sup',
    'yo',
    'hi there',
    'hello there',
    'hey there',
  ];
  if (greetingExact.includes(q)) return true;

  // Short greetings like "hi bot", "hello medknow", "hey there"
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(q) && q.split(/\s+/).length <= 4) {
    const clinicalKeywords = [
      'brivaracetam',
      'cenobamate',
      'epilepsy',
      'seizure',
      'trial',
      'study',
      'kork',
      'dose',
      'efficacy',
      'asm',
      'monotherapy',
      'article',
      'pdf',
      'patient',
    ];
    if (!clinicalKeywords.some((k) => q.includes(k))) {
      return true;
    }
  }
  return false;
}

/**
 * Check if the user query is asking about the website, the assistant,
 * what questions they can ask, what information is available, or capabilities.
 */
export function isPlatformOrCapabilityQuery(question: string): boolean {
  const q = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // If question is asking about a specific clinical title, drug, or trial (e.g. "what is this Effectiveness and safety of cenobamate..."),
  // let it proceed to RAG!
  const clinicalKeywords = [
    'cenobamate',
    'brivaracetam',
    'kork',
    'freedon',
    'monotherapy',
    'dual therapy',
    'epilepsy',
    'seizure',
    'asm',
    'titration',
    'retention',
    'adverse',
    'sv2a',
    'spanish',
    'consensus',
    'mg',
    'dosage',
  ];
  if (clinicalKeywords.some((k) => q.includes(k))) {
    return false;
  }

  // Exact or common phrases
  const directPatterns = [
    /^what is this(\s+about)?$/,
    /^what is this\s+(website|platform|app|application|portal|tool|system|place)$/,
    /^what is this\s+all\s+about$/,
    /^what are you[a-z]*$/, // handles "what are you", "what are youo", "what are youu"
    /^who are you[a-z]*$/,
    /^what is your (name|role|purpose)$/,
    /^what (can|should|do) i ask(\s+here|\s+over here)?$/,
    /^what i (have to|can|should) ask(\s+over here|\s+here)?$/,
    /^what (kind of )?(info|information|data)\s+(can|will|do) i get(\s+here|\s+over here)?$/,
    /^what (can|do) you do(\s+here)?$/,
    /^how (does this work|to use this|can this help me)$/,
    /^tell me about (this|this website|this platform|yourself|medknowledge)$/,
    /^about (this|this website|this platform|medknowledge)$/,
    /^what is cipla medknowledge$/,
    /^guide me(\s+here)?$/,
    /^help(\s+me)?$/,
  ];

  if (directPatterns.some((p) => p.test(q))) {
    return true;
  }

  // General conversational intent checks (when no clinical keywords are present)
  const isAskingWhatThisIs =
    /(what is this|about this website|about this platform|what this website|what this platform)/.test(q);
  const isAskingWhatToAsk = /(what (can|should|to|do) i ask|what i have to ask|what questions)/.test(q);
  const isAskingWhatInfo = /(what (kind of )?(info|information)|what data|what knowledge)/.test(q);
  const isAskingIdentity = /(what|who) are you[a-z]*/.test(q);
  const isAskingCapabilities = /(what can you do|what do you do|how can you help|how to use this)/.test(q);
  const isAskingDocuments = /(what|which) (articles|documents|publications|decks|resources|papers)/.test(q);

  return (
    isAskingWhatThisIs ||
    isAskingWhatToAsk ||
    isAskingWhatInfo ||
    isAskingIdentity ||
    isAskingCapabilities ||
    isAskingDocuments
  );
}

const CLINICAL_GUARDWORDS = [
  'patient',
  'dose',
  'dosing',
  'efficacy',
  'trial',
  'study',
  'seizure',
  'epilepsy',
  'brivaracetam',
  'kork',
  'freedon',
  'monotherapy',
  'asm',
  'treatment',
  'adverse',
  'tolerability',
  'clinical',
  'medical',
  'therapy',
  'retention',
  'plasma',
  'syndrome',
  'sv2a',
  'pediatric',
  'geriatric',
  'dr',
  'doctor',
  'cipla',
  'article',
  'publication',
  'mg',
  'safety',
];

/**
 * Check if user query is out-of-scope (silly questions, math like 2+2, jokes, cooking, etc.)
 */
export function isOutOfScope(question: string): boolean {
  const q = question.toLowerCase().trim();

  // If question mentions any clinical or medical concept, it is NOT out-of-scope
  if (CLINICAL_GUARDWORDS.some((word) => q.includes(word))) {
    return false;
  }

  // Math equations / calculations: e.g. "2+2", "2 + 2", "5 * 10", "what is 2+2"
  if (/^(\s*what\s+is\s+)?\s*\d+\s*[\+\-\*\/\^xX%]\s*\d+/i.test(q)) return true;
  if (/^\s*\d+\s*[\+\-\*\/]\s*\d+\s*(\=|\?)?\s*$/.test(q)) return true;
  if (/^(calculate|solve|evaluate)\s+[\d\s\+\-\*\/\(\)\^\.]+/i.test(q)) return true;

  // Non-medical topics
  const nonMedicalPatterns = [
    /\btell\s+me\s+a\s+joke\b/i,
    /\b(weather|forecast|temperature\s+in)\b/i,
    /\b(recipe|how\s+to\s+cook|how\s+to\s+bake|ingredients\s+for)\b/i,
    /\b(who\s+won\s+the|cricket\s+score|football\s+score|ipl|world\s+cup)\b/i,
    /\b(movie|cinema|actor|actress|song|lyrics|box\s+office)\b/i,
    /\b(write\s+a\s+poem|write\s+a\s+song|write\s+code|python\s+code|javascript\s+code)\b/i,
    /\b(capital\s+of|president\s+of|prime\s+minister\s+of)\b/i,
    /\b(bitcoin|crypto|stock\s+price|cryptocurrency)\b/i,
  ];

  for (const pattern of nonMedicalPatterns) {
    if (pattern.test(q)) return true;
  }

  return false;
}

export function buildGreetingResponse(userName: string): string {
  return (
    `Hello **${userName}**! 👋\n\n` +
    `I am **MedKnow**, your Cipla Clinical AI Assistant. I am here to help you navigate clinical evidence, trial data, and therapeutic publications across the indexed Cipla medical knowledge resources.\n\n` +
    `**Here are a few clinical areas you can explore:**\n` +
    `* **Clinical Trial Outcomes**: Efficacy and safety endpoints from the Freedon study and the German KORK real-world comparative trial.\n` +
    `* **Dosing & Titration Protocols**: Rapid initiation strategies, titration schedules, and monotherapy conversion guidance.\n` +
    `* **Pharmacology & Tolerability**: SV2A binding kinetics, retention rates, and drug-drug interaction profiles.\n\n` +
    `How can I assist your clinical inquiry today?`
  );
}

export function buildPlatformOverviewResponse(userName: string): string {
  return (
    `### Welcome to Cipla MedKnowledge, **${userName}**! 🩺\n\n` +
    `**Cipla MedKnowledge** is an evidence-grounded clinical intelligence platform designed for healthcare professionals. I am **MedKnow**, your dedicated Cipla Clinical AI Assistant.\n\n` +
    `---\n\n` +
    `### 1. What is this platform about?\n` +
    `This platform provides rapid, evidence-grounded access to verified peer-reviewed publications and clinical launch decks for anti-seizure medications (such as **Cenobamate** and **Brivaracetam**). It helps physicians evaluate clinical trial results, safety profiles, and consensus treatment protocols.\n\n` +
    `### 2. What kind of information will you get here?\n` +
    `* **Clinical Trial Outcomes**: Detailed efficacy endpoints (≥50%, ≥75%, and 100% seizure freedom rates) from major clinical trials including the **Freedon study**, the **German KORK real-world comparative trial**, and international cohort studies.\n` +
    `* **Dosing & Titration Protocols**: Initiation dosing, titration schedules, slow vs. rapid titration guidelines, and conversion protocols to **monotherapy** or **dual therapy**.\n` +
    `* **Safety & Tolerability**: Long-term retention rates, adverse event management, SV2A binding kinetics, and pharmacokinetic drug-drug interactions with concomitant ASMs.\n` +
    `* **Expert Consensus**: Evidence-based recommendations such as the **Spanish Consensus on reducing concomitant ASMs**.\n\n` +
    `### 3. What can you ask over here?\n` +
    `You can ask both broad clinical questions and highly specific study queries. For example:\n` +
    `* *"What were the key efficacy findings and seizure freedom rates in the German KORK study?"*\n` +
    `* *"How should concomitant ASMs be reduced according to the Spanish Consensus?"*\n` +
    `* *"What is the titration schedule when converting a patient to Cenobamate monotherapy?"*\n` +
    `* *"What are the most common adverse events reported in the real-world trials?"*\n` +
    `* *"What does the clinical evidence say about patient retention rates over 12 months?"*\n\n` +
    `---\n\n` +
    `💡 **How it works**: Every clinical answer is synthesized directly from indexed medical publications with **clickable inline citations** [1], [2] that open the exact page of the original PDF deck.\n\n` +
    `How can I assist your clinical inquiry today?`
  );
}

export function buildOutOfScopeResponse(): string {
  return (
    `I am **MedKnow**, an AI clinical assistant designed exclusively to support healthcare professionals with scientific evidence, clinical trials, and therapeutic data from the Cipla medical repository.\n\n` +
    `I am unable to answer general, mathematical, or non-medical queries (such as calculations, jokes, or general trivia).\n\n` +
    `Please feel free to ask questions regarding the indexed medical publications, clinical trial results, dosing guidelines, or therapeutic evidence.`
  );
}

/**
 * Extractive fallback: synthesized cleanly when an external LLM key is not available
 * or during a temporary provider outage.
 */
export function extractiveAnswer(question: string, chunks: RetrievedChunk[]): string {
  const queryTerms = new Set(tokenize(question));

  const pickSentence = (excerpt: string): string => {
    const cleaned = cleanExcerptText(excerpt);
    const sentences = cleaned.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const withTerm = sentences.find(
      (s) => s.length >= 35 && [...queryTerms].some((t) => s.toLowerCase().includes(t)),
    );
    return withTerm ?? sentences.find((s) => s.length >= 35) ?? sentences[0] ?? cleaned;
  };

  const points = chunks.map((c, i) => {
    const sentence = pickSentence(c.excerpt);
    return `* ${sentence} [${i + 1}]`;
  });

  return (
    `Clinical evidence retrieved from Cipla indexed publications identifies the following findings:\n\n` +
    `### Key Findings\n` +
    points.join('\n')
  );
}

async function generateWithLlm(
  question: string,
  chunks: RetrievedChunk[],
): Promise<{ text: string; mode: string } | null> {
  const provider = getEmbeddingProvider();
  const userPrompt = buildGroundedPrompt(question, chunks);

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });
    return { text: res.choices[0]?.message?.content?.trim() ?? '', mode: 'llm-openai' };
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
      for (const m of GEMINI_MODELS) {
        try {
          const model = client.getGenerativeModel({
            model: m,
            systemInstruction: SYSTEM_PROMPT,
          });
          const res = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          });
          const text = res.response.text().trim();
          if (text) {
            return { text, mode: `llm-gemini-${m}` };
          }
        } catch (mErr) {
          logger.warn(`[assistant] Gemini generation on ${m} failed, trying next`, { error: String(mErr) });
        }
      }
    } catch (err) {
      logger.warn('[assistant] Gemini initialization failed', { error: String(err) });
    }
  }

  return null;
}

async function persistConversation(
  userId: string,
  conversationId: string | undefined,
  question: string,
  answer: string,
  citations: RetrievedChunk[],
): Promise<string> {
  try {
    let convId = conversationId;
    if (convId) {
      const existing = await prisma.conversation.findFirst({ where: { id: convId, userId } });
      if (!existing) convId = undefined;
    }
    if (!convId) {
      const title = question.length > 80 ? question.slice(0, 80) + '…' : question;
      const created = await prisma.conversation.create({
        data: { userId, title },
      });
      convId = created.id;
    }
    const citationsJson = JSON.stringify(citations);
    await prisma.message.create({ data: { conversationId: convId, role: 'user', content: question } });
    await prisma.message.create({
      data: { conversationId: convId, role: 'assistant', content: answer, citationsJson },
    });
    return convId;
  } catch (err) {
    logger.warn('[assistant] Failed to persist conversation (continuing without DB)', {
      error: String(err),
    });
    return conversationId ?? `local-${Date.now()}`;
  }
}

export async function answerQuestion(
  userId: string,
  conversationId: string | undefined,
  question: string,
  user?: { name?: string | null; email?: string | null } | null,
): Promise<AssistantAnswer> {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) throw new Error('Question must not be empty.');

  // 1. Handle Greetings / Introductions
  if (isGreeting(cleanQuestion)) {
    const userInfo =
      user ||
      (await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }).catch(() => null));
    const displayName = getUserDisplayName(userInfo);
    const greeting = buildGreetingResponse(displayName);
    const convId = await persistConversation(userId, conversationId, cleanQuestion, greeting, []);
    return {
      answer: greeting,
      citations: [],
      conversationId: convId,
      mode: 'local-retrieval',
      engine: 'conversational-greeting',
      provider: 'medknow',
    };
  }

  // 2. Handle Platform Overview / Capabilities / "What is this" / "What can I ask" queries
  if (isPlatformOrCapabilityQuery(cleanQuestion)) {
    const userInfo =
      user ||
      (await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }).catch(() => null));
    const displayName = getUserDisplayName(userInfo);
    const overview = buildPlatformOverviewResponse(displayName);
    const convId = await persistConversation(userId, conversationId, cleanQuestion, overview, []);
    return {
      answer: overview,
      citations: [],
      conversationId: convId,
      mode: 'local-retrieval',
      engine: 'platform-guide',
      provider: 'medknow',
    };
  }

  // 3. Handle Out-of-Scope / Non-Medical Queries (e.g. 2+2, jokes, weather, etc.)
  if (isOutOfScope(cleanQuestion)) {
    const denial = buildOutOfScopeResponse();
    const convId = await persistConversation(userId, conversationId, cleanQuestion, denial, []);
    return {
      answer: denial,
      citations: [],
      conversationId: convId,
      mode: 'local-retrieval',
      engine: 'out-of-scope-denial',
      provider: 'medknow',
    };
  }

  const { chunks, provider } = await retrieve(cleanQuestion, 6);

  if (chunks.length === 0) {
    const answer = withDisclaimer(INSUFFICIENT_INFORMATION);
    const convId = await persistConversation(userId, conversationId, cleanQuestion, answer, []);
    return { answer, citations: [], conversationId: convId, mode: 'local-retrieval', engine: 'insufficient', provider };
  }

  // Deduplicate chunks from the same document & page
  const dedupedChunks = deduplicateChunks(chunks);

  const llm = await generateWithLlm(cleanQuestion, dedupedChunks);
  let answer: string;
  let mode: AssistantMode;
  let engine: string;
  if (llm && llm.text) {
    answer = withDisclaimer(llm.text);
    mode = 'llm';
    engine = llm.mode;
  } else {
    answer = withDisclaimer(extractiveAnswer(cleanQuestion, dedupedChunks));
    mode = 'local-retrieval';
    engine = 'extractive';
  }

  const convId = await persistConversation(userId, conversationId, cleanQuestion, answer, dedupedChunks);
  return { answer, citations: dedupedChunks, conversationId: convId, mode, engine, provider };
}

export const handleChat: AssistantHandler = async (req: ChatRequest): Promise<ChatResult> => {
  return answerQuestion(req.userId, req.conversationId, req.question);
};

async function generateWithLlmStream(
  question: string,
  chunks: RetrievedChunk[],
  onToken: (token: string) => void,
): Promise<{ text: string; mode: string } | null> {
  const userPrompt = buildGroundedPrompt(question, chunks);

  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
      for (const m of GEMINI_MODELS) {
        try {
          const model = client.getGenerativeModel({
            model: m,
            systemInstruction: SYSTEM_PROMPT,
          });
          const responseStream = await model.generateContentStream({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          });
          let fullText = '';
          for await (const chunk of responseStream.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              fullText += chunkText;
              onToken(chunkText);
            }
          }
          if (fullText.trim()) {
            return { text: fullText.trim(), mode: `llm-gemini-${m}` };
          }
        } catch (mErr) {
          logger.warn(`[assistant] Gemini stream on ${m} failed, trying next`, { error: String(mErr) });
        }
      }
    } catch (err) {
      logger.warn('[assistant] Gemini initialization failed', { error: String(err) });
    }
  }

  // Fallback to non-streaming generateWithLlm
  const nonStream = await generateWithLlm(question, chunks);
  if (nonStream && nonStream.text) {
    const words = nonStream.text.split(' ');
    for (const w of words) {
      onToken(w + ' ');
      await new Promise((r) => setTimeout(r, 20));
    }
    return nonStream;
  }

  return null;
}

export async function answerQuestionStream(
  userId: string,
  conversationId: string | undefined,
  question: string,
  onToken: (token: string) => void,
  user?: { name?: string | null; email?: string | null } | null,
): Promise<AssistantAnswer> {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) throw new Error('Question must not be empty.');

  // 1. Handle Greetings / Introductions
  if (isGreeting(cleanQuestion)) {
    const userInfo =
      user ||
      (await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }).catch(() => null));
    const displayName = getUserDisplayName(userInfo);
    const greeting = buildGreetingResponse(displayName);
    const words = greeting.split(' ');
    for (const word of words) {
      onToken(word + ' ');
      await new Promise((r) => setTimeout(r, 20));
    }
    const convId = await persistConversation(userId, conversationId, cleanQuestion, greeting, []);
    return {
      answer: greeting,
      citations: [],
      conversationId: convId,
      mode: 'local-retrieval',
      engine: 'conversational-greeting',
      provider: 'medknow',
    };
  }

  // 2. Handle Platform Overview / Capabilities / "What is this" / "What can I ask" queries
  if (isPlatformOrCapabilityQuery(cleanQuestion)) {
    const userInfo =
      user ||
      (await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }).catch(() => null));
    const displayName = getUserDisplayName(userInfo);
    const overview = buildPlatformOverviewResponse(displayName);
    const words = overview.split(' ');
    for (const word of words) {
      onToken(word + ' ');
      await new Promise((r) => setTimeout(r, 15));
    }
    const convId = await persistConversation(userId, conversationId, cleanQuestion, overview, []);
    return {
      answer: overview,
      citations: [],
      conversationId: convId,
      mode: 'local-retrieval',
      engine: 'platform-guide',
      provider: 'medknow',
    };
  }

  // 3. Handle Out-of-Scope / Non-Medical Queries (e.g. 2+2, jokes, etc.)
  if (isOutOfScope(cleanQuestion)) {
    const denial = buildOutOfScopeResponse();
    const words = denial.split(' ');
    for (const word of words) {
      onToken(word + ' ');
      await new Promise((r) => setTimeout(r, 20));
    }
    const convId = await persistConversation(userId, conversationId, cleanQuestion, denial, []);
    return {
      answer: denial,
      citations: [],
      conversationId: convId,
      mode: 'local-retrieval',
      engine: 'out-of-scope-denial',
      provider: 'medknow',
    };
  }

  const { chunks, provider } = await retrieve(cleanQuestion, 6);

  if (chunks.length === 0) {
    const answer = withDisclaimer(INSUFFICIENT_INFORMATION);
    for (const word of answer.split(' ')) {
      onToken(word + ' ');
      await new Promise((r) => setTimeout(r, 25));
    }
    const convId = await persistConversation(userId, conversationId, cleanQuestion, answer, []);
    return { answer, citations: [], conversationId: convId, mode: 'local-retrieval', engine: 'insufficient', provider };
  }

  const dedupedChunks = deduplicateChunks(chunks);

  const streamed = await generateWithLlmStream(cleanQuestion, dedupedChunks, onToken);
  let answer: string;
  let mode: AssistantMode;
  let engine: string;

  if (streamed && streamed.text) {
    answer = withDisclaimer(streamed.text);
    mode = 'llm';
    engine = streamed.mode;
    onToken('\n\n' + MEDICAL_DISCLAIMER);
  } else {
    const rawAnswer = extractiveAnswer(cleanQuestion, dedupedChunks);
    answer = withDisclaimer(rawAnswer);
    mode = 'local-retrieval';
    engine = 'extractive';
    const words = answer.split(' ');
    for (const word of words) {
      onToken(word + ' ');
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  const convId = await persistConversation(userId, conversationId, cleanQuestion, answer, dedupedChunks);
  return { answer, citations: dedupedChunks, conversationId: convId, mode, engine, provider };
}
