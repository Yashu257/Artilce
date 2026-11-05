/**
 * embeddings.ts — getEmbedding(text).
 *
 * Provider selection (in order, first available wins):
 *   1. OpenAI  text-embedding-3-small (1536-dim) — if OPENAI_API_KEY is set
 *   2. Gemini  text-embedding-004     (768-dim)  — if GEMINI_API_KEY is set
 *   3. Local TF-IDF hashed vector      (384-dim)  — always available, no key,
 *      deterministic. This is a hashed bag-of-words vector (term frequency
 *      hashed into fixed buckets, L2-normalised), NOT a neural embedding.
 *      Retrieval thresholds are lower for it (see vectorStore.ts).
 *
 * No keys are ever hardcoded; SDKs are imported lazily so the module works
 * with neither package/key installed.
 */

export type EmbeddingProvider = 'openai' | 'gemini' | 'local-tfidf';

export const LOCAL_DIMENSION = 384;
export const OPENAI_MODEL = 'text-embedding-3-small';
export const OPENAI_DIMENSION = 1536;
export const GEMINI_MODEL = 'gemini-embedding-001';
export const GEMINI_DIMENSION = 3072;

export interface EmbeddingResult {
  vector: number[];
  provider: EmbeddingProvider;
  dimension: number;
  model: string;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (process.env.EMBEDDING_PROVIDER === 'local-tfidf') return 'local-tfidf';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY && process.env.USE_GEMINI_EMBEDDINGS === 'true') return 'gemini';
  return 'local-tfidf';
}

export function getEmbeddingDimension(provider: EmbeddingProvider = getEmbeddingProvider()): number {
  if (provider === 'openai') return OPENAI_DIMENSION;
  if (provider === 'gemini') return GEMINI_DIMENSION;
  return LOCAL_DIMENSION;
}

/** Tokenise for the local vector: lowercase words, drop stopwords/short tokens.
 * The list includes generic question words (what/when/how/find/...) — they
 * occur in almost every question but almost never in slide-deck text, so
 * without this they would carry a huge IDF and dominate both the local
 * vectors and the keyword score. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'at', 'as', 'from', 'that', 'this',
  'it', 'its', 'not', 'but', 'had', 'have', 'has', 'which', 'who', 'were',
  'will', 'can', 'may', 'also', 'than', 'into', 'over', 'after', 'before',
  'between', 'during', 'per', 'vs', 'versus', 'et', 'al',
  // Generic question words — high IDF, zero topical value.
  'what', 'when', 'where', 'whom', 'how', 'why', 'did', 'does', 'do',
  'could', 'should', 'would', 'might', 'tell', 'show', 'give', 'find',
  'finds', 'list', 'name', 'describe', 'explain', 'summarize', 'summarise',
  'handled', 'compares', 'compare',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%.\- ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Deterministic FNV-1a hash of a token -> bucket index. */
function hashToken(token: string, dimension: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % dimension;
}

/**
 * Local TF-IDF-style hashed vector. Term frequency (log-scaled) is added
 * to the token's bucket; the vector is L2-normalised. Deterministic for
 * the same input — the same text always yields the same vector, which is
 * what makes the JSON vector index stable across runs.
 */
export function localEmbed(text: string, dimension = LOCAL_DIMENSION): number[] {
  const vector = new Array<number>(dimension).fill(0);
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  for (const [token, count] of counts) {
    const idx = hashToken(token, dimension);
    vector[idx] += 1 + Math.log(count);
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

async function openaiEmbed(text: string): Promise<number[]> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.embeddings.create({ model: OPENAI_MODEL, input: text });
  return res.data[0].embedding;
}

async function geminiEmbed(text: string): Promise<number[]> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = client.getGenerativeModel({ model: GEMINI_MODEL });
  const res = await model.embedContent(text);
  return res.embedding.values;
}

export async function getEmbedding(text: string): Promise<EmbeddingResult> {
  const provider = getEmbeddingProvider();
  if (provider === 'openai') {
    return { vector: await openaiEmbed(text), provider, dimension: OPENAI_DIMENSION, model: OPENAI_MODEL };
  }
  if (provider === 'gemini') {
    return { vector: await geminiEmbed(text), provider, dimension: GEMINI_DIMENSION, model: GEMINI_MODEL };
  }
  return { vector: localEmbed(text), provider, dimension: LOCAL_DIMENSION, model: 'local-tfidf-hash-384' };
}

/** Embed many texts sequentially (keeps API rate usage gentle). */
export async function embedTexts(texts: string[]): Promise<EmbeddingResult[]> {
  const out: EmbeddingResult[] = [];
  for (const text of texts) out.push(await getEmbedding(text));
  return out;
}
