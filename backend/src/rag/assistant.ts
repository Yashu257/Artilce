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
): Promise<AssistantAnswer> {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) throw new Error('Question must not be empty.');

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

export async function answerQuestionStream(
  userId: string,
  conversationId: string | undefined,
  question: string,
  onToken: (token: string) => void,
): Promise<AssistantAnswer> {
  const result = await answerQuestion(userId, conversationId, question);
  const text = result.answer;
  for (let i = 0; i < text.length; i += 80) {
    onToken(text.slice(i, i + 80));
  }
  return result;
}
