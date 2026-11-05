/**
 * vectorStore.ts — local JSON vector index + hybrid search.
 *
 * Storage: backend/data/vector-index.json
 *   { version, provider, dimension, updatedAt, chunks: [StoredChunk] }
 * Search is in-memory cosine similarity over the loaded index.
 *
 * Hybrid scoring:  score = 0.7 * cosine(vector) + 0.3 * keywordScore
 *   keywordScore is a BM25-ish score: sum over query terms of
 *   idf(term) * tf(term, chunk) / (tf + 1), normalised to [0, 1] by the
 *   best chunk's raw keyword score for the query.
 *
 * Relevance thresholds (documented, provider-dependent — the local
 * TF-IDF hashed vectors are sparse bag-of-words vectors, so absolute
 * cosine values are much lower than for dense neural embeddings):
 *   - local-tfidf (384-dim hash): threshold 0.15
 *   - openai / gemini (dense):    threshold 0.55
 * A chunk is only returned as evidence if its hybrid score meets the
 * threshold for the index's provider. Retrieval below threshold is
 * treated as "insufficient information" by the assistant, never padded
 * with weak matches.
 */
import * as fs from 'fs';
import * as path from 'path';
import { getEmbeddingProvider, tokenize, type EmbeddingProvider } from './embeddings';

export interface StoredChunk {
  id: string;
  documentId: string;
  documentName: string;
  page: number;
  section: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}

export interface VectorIndex {
  version: number;
  provider: EmbeddingProvider;
  dimension: number;
  updatedAt: string;
  chunks: StoredChunk[];
}

export interface SearchHit {
  chunk: StoredChunk;
  vectorScore: number;
  keywordScore: number;
  score: number;
}

export const VECTOR_INDEX_PATH = path.resolve(__dirname, '../../data/vector-index.json');
export const VECTOR_WEIGHT = 0.7;
export const KEYWORD_WEIGHT = 0.3;

/**
 * Keyword-evidence floor for the local TF-IDF provider
 * (see `bestRawKeywordScore`): the best chunk in the corpus must share
 * at least this much IDF-weighted vocabulary with the question, or the
 * corpus is judged to contain no chunk that actually discusses the
 * question's topic. Calibrated on the 11-question QA set
 * (docs/AI_TEST_RESULTS.md): grounded questions score >= 4.12, the
 * off-topic question ("dosage for treating diabetes with cenobamate")
 * scores 3.01. The hybrid-score threshold alone cannot separate them —
 * the off-topic question's top hybrid score (0.469) exceeds several
 * grounded ones — because the keyword component saturates on the
 * ubiquitous term "cenobamate". This floor is applied ONLY for the
 * local-tfidf provider; dense embeddings carry the semantics themselves
 * and are governed by their 0.55 hybrid threshold instead.
 */
export const MIN_KEYWORD_RAW_LOCAL = 3.5;

export function relevanceThreshold(provider: EmbeddingProvider): number {
  return provider === 'local-tfidf' ? 0.15 : 0.55;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Inverse document frequency per term, computed over the index. */
export function computeIdf(chunks: StoredChunk[]): Map<string, number> {
  const docCount = chunks.length;
  const df = new Map<string, number>();
  for (const chunk of chunks) {
    for (const term of new Set(tokenize(chunk.content))) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log(1 + docCount / count));
  }
  return idf;
}

/** Raw BM25-ish keyword score of a chunk for the query terms. */
export function keywordScoreRaw(queryTerms: string[], chunk: StoredChunk, idf: Map<string, number>): number {
  const counts = new Map<string, number>();
  for (const token of tokenize(chunk.content)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  let score = 0;
  for (const term of new Set(queryTerms)) {
    const tf = counts.get(term) ?? 0;
    if (tf > 0) score += (idf.get(term) ?? 0) * (tf / (tf + 1));
  }
  return score;
}

export function hybridSearch(
  index: VectorIndex,
  queryVector: number[],
  queryText: string,
  topK = 6,
): SearchHit[] {
  if (index.chunks.length === 0) return [];
  const queryTerms = tokenize(queryText);
  const idf = computeIdf(index.chunks);

  const rawKeyword = new Map<string, number>();
  let maxKeyword = 0;
  for (const chunk of index.chunks) {
    const raw = keywordScoreRaw(queryTerms, chunk, idf);
    rawKeyword.set(chunk.id, raw);
    if (raw > maxKeyword) maxKeyword = raw;
  }

  const hits: SearchHit[] = index.chunks.map((chunk) => {
    const vectorScore = cosineSimilarity(queryVector, chunk.embedding);
    const keywordScore = maxKeyword > 0 ? (rawKeyword.get(chunk.id) ?? 0) / maxKeyword : 0;
    return {
      chunk,
      vectorScore,
      keywordScore,
      score: VECTOR_WEIGHT * vectorScore + KEYWORD_WEIGHT * keywordScore,
    };
  });

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, topK);
}

/** Best raw (unnormalised) keyword score of any chunk for the query.
 *  Used by the keyword-evidence floor: unlike the normalised
 *  keywordScore in hybridSearch (which saturates at 1.0 for any chunk
 *  matching the ubiquitous terms), the raw score measures how much
 *  IDF-weighted vocabulary the best chunk actually shares with the
 *  question. Returns 0 for an empty index. */
export function bestRawKeywordScore(index: VectorIndex, queryText: string): number {
  if (index.chunks.length === 0) return 0;
  const queryTerms = [...new Set(tokenize(queryText))];
  if (queryTerms.length === 0) return 0;
  const idf = computeIdf(index.chunks);
  let best = 0;
  for (const chunk of index.chunks) {
    const raw = keywordScoreRaw(queryTerms, chunk, idf);
    if (raw > best) best = raw;
  }
  return best;
}

export function loadIndex(indexPath = VECTOR_INDEX_PATH): VectorIndex {
  if (!fs.existsSync(indexPath)) {
    return {
      version: 1,
      provider: getEmbeddingProvider(),
      dimension: 0,
      updatedAt: new Date().toISOString(),
      chunks: [],
    };
  }
  const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as VectorIndex;
  return parsed;
}

export function saveIndex(index: VectorIndex, indexPath = VECTOR_INDEX_PATH): void {
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  const payload: VectorIndex = { ...index, updatedAt: new Date().toISOString() };
  fs.writeFileSync(indexPath, JSON.stringify(payload), 'utf-8');
}

export function upsertChunks(
  index: VectorIndex,
  documentId: string,
  chunks: StoredChunk[],
): VectorIndex {
  const kept = index.chunks.filter((c) => c.documentId !== documentId);
  return { ...index, chunks: [...kept, ...chunks] };
}

export function removeDocument(index: VectorIndex, documentId: string): VectorIndex {
  return { ...index, chunks: index.chunks.filter((c) => c.documentId !== documentId) };
}

/** Small in-memory store used by the assistant at runtime. */
export class LocalVectorStore {
  private index: VectorIndex;

  constructor(indexPath = VECTOR_INDEX_PATH) {
    this.index = loadIndex(indexPath);
    this.indexPath = indexPath;
  }

  private indexPath: string;

  get size(): number {
    return this.index.chunks.length;
  }

  get provider(): EmbeddingProvider {
    return this.index.provider;
  }

  reload(): void {
    this.index = loadIndex(this.indexPath);
  }

  addChunks(documentId: string, chunks: StoredChunk[]): void {
    this.index = upsertChunks(this.index, documentId, chunks);
    if (chunks.length > 0) {
      this.index.provider = getEmbeddingProvider();
      this.index.dimension = chunks[0].embedding.length;
    }
    saveIndex(this.index, this.indexPath);
  }

  search(queryVector: number[], queryText: string, topK = 6): SearchHit[] {
    return hybridSearch(this.index, queryVector, queryText, topK);
  }

  /** Best raw keyword score of any chunk for the query (keyword-evidence floor). */
  rawKeywordBest(queryText: string): number {
    return bestRawKeywordScore(this.index, queryText);
  }
}
