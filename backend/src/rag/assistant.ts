/**
 * assistant.ts — MedKnow Intelligent Conversational AI & Website Knowledge Assistant.
 *
 * Implements the three knowledge domains:
 * 1. Website & Platform Knowledge (features, routes, articles, bookmarking, PDF viewer, search)
 * 2. Medical Knowledge & Publications (RAG on Cenobamate, Brivaracetam, clinical trials, dosing, safety)
 * 3. Natural Conversation & Contextual Understanding (multi-turn follow-ups, simple explanations, comparisons)
 *
 * Rejects unrelated general-purpose questions (math, jokes, recipes, weather, coding, sports).
 */
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getEmbeddingProvider, tokenize } from './embeddings';
import { retrieve, type RetrievedChunk } from './retrieval';
import {
  INSUFFICIENT_INFORMATION,
  MEDICAL_DISCLAIMER,
  MEDKNOW_SYSTEM_PROMPT,
  buildConversationPrompt,
  cleanExcerptText,
} from './prompts';
import { getPlatformSystemContext } from './platformKnowledge';
import type { AssistantHandler, ChatRequest, ChatResult } from './types';

export const ASSISTANT_AVAILABLE = true;

export type AssistantMode = 'llm' | 'local-retrieval';

export interface AssistantAnswer extends ChatResult {
  mode: AssistantMode;
  engine: string;
  provider: string;
}

const OPENAI_CHAT_MODEL = 'gpt-4o-mini';
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];

export const OUT_OF_SCOPE_RESPONSE =
  "I'm MedKnow, your Cipla Clinical AI Assistant. I'm designed to help you explore the medical knowledge and features available on this platform. I can assist with clinical research, medical publications, study summaries, safety information and navigating the knowledge repository. I can't help with unrelated general-purpose requests.";

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
    'hi medknow',
    'hello medknow',
    'hey medknow',
  ];
  if (greetingExact.includes(q)) return true;

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
 * Identify unrelated general-purpose requests that MedKnow must reject politely.
 * (e.g. math calculations, jokes, romantic stories, cooking recipes, weather, programming, sports scores)
 */
export function isUnrelatedOutOfScope(question: string): boolean {
  const q = question.toLowerCase().trim();

  // Greetings, basic intros, or platform feature questions are IN-SCOPE
  if (/^(hi|hello|hey|good\s+(morning|afternoon|evening)|namaste|greetings)\b/i.test(q)) return false;
  if (/^(what is this|what can i do|what can you do|how (to|do i) use|help|guide me)\b/i.test(q)) return false;
  if (/^(simplify|can you simplify|explain in simple|tell me more|what about|summarize|compare)\b/i.test(q)) return false;

  // Questions mentioning any clinical, medical, platform, or website terms are IN-SCOPE
  const inScopeKeywords = [
    'cipla',
    'medknow',
    'website',
    'platform',
    'article',
    'publication',
    'study',
    'trial',
    'deck',
    'pdf',
    'citation',
    'bookmark',
    'search',
    'feature',
    'dashboard',
    'doctor',
    'patient',
    'cenobamate',
    'brivaracetam',
    'epilepsy',
    'seizure',
    'asm',
    'efficacy',
    'safety',
    'adverse',
    'tolerability',
    'dosing',
    'titration',
    'monotherapy',
    'dual therapy',
    'freedon',
    'kork',
    'c021',
    'c017',
    'spanish',
    'consensus',
    'retention',
    'pharmacology',
    'mechanism',
    'sv2a',
    'gaba',
    'sodium',
    'clobazam',
    'lacosamide',
    'perampanel',
    'drug',
    'medicine',
    'medical',
    'clinical',
    'treatment',
    'therapy',
    'symptom',
    'disease',
    'syndrome',
    'neurology',
    'neurologist',
    'evidence',
    'guideline',
    'dose',
    'mg',
    'explore',
    'learn',
  ];
  if (inScopeKeywords.some((k) => q.includes(k))) {
    return false;
  }

  // Purely unrelated requests
  // 1. Math / Calculations: e.g. "2+2", "100 * 25", "100 x 25", "what is 2+2", "calculate 50 / 2"
  if (/^(\s*what\s+is\s+)?\s*\d+\s*[\+\-\*\/\^xX%×÷]\s*\d+/i.test(q)) return true;
  if (/^\s*\d+\s*[\+\-\*\/×÷]\s*\d+\s*(\=|\?)?\s*$/.test(q)) return true;
  if (/^(calculate|solve|evaluate|compute)\s+[\d\s\+\-\*\/\(\)\^\.xX×÷]+/i.test(q)) return true;

  // 2. Jokes, comedy
  if (/\b(tell\s+me\s+a\s+joke|make\s+me\s+laugh|funny\s+joke)\b/i.test(q)) return true;

  // 3. Creative fiction, romance, poetry
  if (/\b(write\s+a\s+(romantic\s+story|love\s+story|story|poem|song|lyrics))\b/i.test(q)) return true;

  // 4. Cooking, recipes, food
  if (/\b(recipe|how\s+to\s+cook|how\s+to\s+bake|ingredients\s+for|make\s+a\s+cake|cooking\s+recipe)\b/i.test(q))
    return true;

  // 5. Weather forecasts
  if (/\b(weather|forecast|temperature|will\s+it\s+rain)\b/i.test(q)) return true;

  // 6. Coding / programming
  if (/\b(write\s+(a\s+)?(python|javascript|typescript|c\+\+|java|html|css|sql|code|program|script))\b/i.test(q))
    return true;
  if (/\b(python\s+code|python\s+program|debug\s+this\s+code)\b/i.test(q)) return true;

  // 7. Sports, cricket, football, match scores
  if (/\b(who\s+won\s+the|cricket\s+score|football\s+score|ipl\s+score|world\s+cup|match\s+score)\b/i.test(q))
    return true;

  // 8. General entertainment, cinema, celebrity trivia
  if (/\b(box\s+office|celebrity|hollywood|bollywood|actor|actress)\b/i.test(q)) return true;

  return false;
}

/**
 * Intelligent retrieval query expansion for multi-turn contextual follow-ups.
 * (e.g. "What about safety?" -> "cenobamate safety tolerability adverse events")
 */
export function buildRetrievalQuery(question: string, history: Array<{ role: string; content: string }>): string {
  const q = question.trim();
  const clinicalKeywords = [
    'cenobamate',
    'brivaracetam',
    'freedon',
    'kork',
    'c021',
    'c017',
    'spanish',
    'consensus',
    'titration',
    'monotherapy',
    'dual therapy',
    'deprescribing',
    'clobazam',
    'lacosamide',
    'perampanel',
    'danish',
    'adverse',
    'retention',
  ];

  if (clinicalKeywords.some((k) => q.toLowerCase().includes(k))) {
    return q;
  }

  if (history.length > 0) {
    const recentText = history
      .map((h) => h.content)
      .join(' ')
      .toLowerCase();
    const foundKeywords = clinicalKeywords.filter((k) => recentText.includes(k));
    if (foundKeywords.length > 0) {
      return `${foundKeywords.slice(0, 3).join(' ')} ${q}`;
    }
  }

  return q;
}

/**
 * Extractive fallback when LLM is unavailable.
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
  history: Array<{ role: string; content: string }> = [],
  platformContext: string = '',
): Promise<{ text: string; mode: string } | null> {
  const provider = getEmbeddingProvider();
  const userPrompt = buildConversationPrompt(question, chunks, history, platformContext);

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: MEDKNOW_SYSTEM_PROMPT },
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
            systemInstruction: MEDKNOW_SYSTEM_PROMPT,
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

async function generateWithLlmStream(
  question: string,
  chunks: RetrievedChunk[],
  history: Array<{ role: string; content: string }> = [],
  platformContext: string = '',
  onToken: (token: string) => void,
): Promise<{ text: string; mode: string } | null> {
  const userPrompt = buildConversationPrompt(question, chunks, history, platformContext);

  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
      for (const m of GEMINI_MODELS) {
        try {
          const model = client.getGenerativeModel({
            model: m,
            systemInstruction: MEDKNOW_SYSTEM_PROMPT,
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
  const nonStream = await generateWithLlm(question, chunks, history, platformContext);
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

  // Load conversation history for contextual follow-ups
  let history: Array<{ role: string; content: string }> = [];
  if (conversationId) {
    try {
      const previousMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
      history = previousMessages.reverse().map((m) => ({ role: m.role, content: m.content }));
    } catch (e) {
      logger.warn('[assistant] Could not load previous conversation history', { error: String(e) });
    }
  }

  // 1. Initial Greeting / Conversational Welcome
  if (isGreeting(cleanQuestion) && history.length === 0) {
    const userInfo =
      user ||
      (await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }).catch(() => null));
    const displayName = getUserDisplayName(userInfo);
    const greeting = `Hello **${displayName}**! I'm **MedKnow**, your Cipla Clinical AI Assistant. How can I help you explore clinical evidence, research publications or medical information today?`;
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

  // 2. Clear Out-of-Scope Detection (math, jokes, recipes, weather, programming, sports)
  if (isUnrelatedOutOfScope(cleanQuestion)) {
    const denial = OUT_OF_SCOPE_RESPONSE;
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

  // 3. Resolve context for follow-up queries
  const retrievalQuery = buildRetrievalQuery(cleanQuestion, history);

  // 4. Retrieve matching medical document chunks
  const { chunks, provider } = await retrieve(retrievalQuery, 6);
  const dedupedChunks = deduplicateChunks(chunks);

  // 5. Get structured platform knowledge registry
  const platformContext = getPlatformSystemContext();

  // 6. Generate answer using MedKnow LLM
  const llm = await generateWithLlm(cleanQuestion, dedupedChunks, history, platformContext);

  let answer: string;
  let mode: AssistantMode;
  let engine: string;
  let citationsToReturn: RetrievedChunk[] = [];

  if (llm && llm.text) {
    answer = llm.text;
    mode = 'llm';
    engine = llm.mode;
    if (dedupedChunks.length > 0 && /\[\d+\]/.test(llm.text)) {
      citationsToReturn = dedupedChunks;
    }
  } else {
    if (dedupedChunks.length > 0) {
      answer = withDisclaimer(extractiveAnswer(cleanQuestion, dedupedChunks));
      mode = 'local-retrieval';
      engine = 'extractive';
      citationsToReturn = dedupedChunks;
    } else {
      answer = `I am **MedKnow**, your Cipla Clinical AI Assistant. I can help you explore medical research publications, summarize clinical studies, compare trial evidence, explain pharmacology, and navigate features on the Cipla MedKnowledge platform. How can I assist your clinical inquiry today?`;
      mode = 'local-retrieval';
      engine = 'fallback-general';
    }
  }

  const convId = await persistConversation(userId, conversationId, cleanQuestion, answer, citationsToReturn);
  return { answer, citations: citationsToReturn, conversationId: convId, mode, engine, provider };
}

export const handleChat: AssistantHandler = async (req: ChatRequest): Promise<ChatResult> => {
  return answerQuestion(req.userId, req.conversationId, req.question);
};

export async function answerQuestionStream(
  userId: string,
  conversationId: string | undefined,
  question: string,
  onToken: (token: string) => void,
  user?: { name?: string | null; email?: string | null } | null,
): Promise<AssistantAnswer> {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) throw new Error('Question must not be empty.');

  // Load conversation history for contextual follow-ups
  let history: Array<{ role: string; content: string }> = [];
  if (conversationId) {
    try {
      const previousMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      });
      history = previousMessages.reverse().map((m) => ({ role: m.role, content: m.content }));
    } catch (e) {
      logger.warn('[assistant] Could not load previous conversation history', { error: String(e) });
    }
  }

  // 1. Initial Greeting / Conversational Welcome
  if (isGreeting(cleanQuestion) && history.length === 0) {
    const userInfo =
      user ||
      (await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }).catch(() => null));
    const displayName = getUserDisplayName(userInfo);
    const greeting = `Hello **${displayName}**! I'm **MedKnow**, your Cipla Clinical AI Assistant. How can I help you explore clinical evidence, research publications or medical information today?`;
    for (const word of greeting.split(' ')) {
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

  // 2. Clear Out-of-Scope Detection (math, jokes, recipes, weather, programming, sports)
  if (isUnrelatedOutOfScope(cleanQuestion)) {
    const denial = OUT_OF_SCOPE_RESPONSE;
    for (const word of denial.split(' ')) {
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

  // 3. Resolve context for follow-up queries
  const retrievalQuery = buildRetrievalQuery(cleanQuestion, history);

  // 4. Retrieve matching medical document chunks
  const { chunks, provider } = await retrieve(retrievalQuery, 6);
  const dedupedChunks = deduplicateChunks(chunks);

  // 5. Get structured platform knowledge registry
  const platformContext = getPlatformSystemContext();

  // 6. Generate answer using MedKnow LLM Stream
  const streamed = await generateWithLlmStream(cleanQuestion, dedupedChunks, history, platformContext, onToken);

  let answer: string;
  let mode: AssistantMode;
  let engine: string;
  let citationsToReturn: RetrievedChunk[] = [];

  if (streamed && streamed.text) {
    answer = streamed.text;
    mode = 'llm';
    engine = streamed.mode;
    if (dedupedChunks.length > 0 && /\[\d+\]/.test(streamed.text)) {
      citationsToReturn = dedupedChunks;
    }
  } else {
    if (dedupedChunks.length > 0) {
      answer = withDisclaimer(extractiveAnswer(cleanQuestion, dedupedChunks));
      mode = 'local-retrieval';
      engine = 'extractive';
      citationsToReturn = dedupedChunks;
      for (const word of answer.split(' ')) {
        onToken(word + ' ');
        await new Promise((r) => setTimeout(r, 20));
      }
    } else {
      answer = `I am **MedKnow**, your Cipla Clinical AI Assistant. I can help you explore medical research publications, summarize clinical studies, compare trial evidence, explain pharmacology, and navigate features on the Cipla MedKnowledge platform. How can I assist your clinical inquiry today?`;
      mode = 'local-retrieval';
      engine = 'fallback-general';
      for (const word of answer.split(' ')) {
        onToken(word + ' ');
        await new Promise((r) => setTimeout(r, 20));
      }
    }
  }

  const convId = await persistConversation(userId, conversationId, cleanQuestion, answer, citationsToReturn);
  return { answer, citations: citationsToReturn, conversationId: convId, mode, engine, provider };
}
