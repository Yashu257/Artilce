/**
 * retrieval.ts — retrieve(question, topK) over the local vector index.
 *
 * Returns only chunks whose hybrid score meets the provider threshold
 * (see vectorStore.ts). No chunk above threshold => empty list, and the
 * assistant must answer with the exact insufficient-information sentence
 * rather than guessing.
 */
import { getEmbedding } from './embeddings';
import {
  LocalVectorStore,
  MIN_KEYWORD_RAW_LOCAL,
  VECTOR_INDEX_PATH,
  bestRawKeywordScore,
  hybridSearch,
  loadIndex,
  relevanceThreshold,
} from './vectorStore';

export interface RetrievedChunk {
  documentId: string;
  documentName: string;
  page: number;
  section: string;
  excerpt: string;
  relevance: number;
  chunkIndex: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  provider: string;
  threshold: number;
  topK: number;
}

const EXCERPT_CHARS = 500;

export function toRetrievedChunk(hit: {
  chunk: { documentId: string; documentName: string; page: number; section: string; content: string; chunkIndex: number };
  score: number;
}): RetrievedChunk {
  const content = hit.chunk.content;
  return {
    documentId: hit.chunk.documentId,
    documentName: hit.chunk.documentName,
    page: hit.chunk.page,
    section: hit.chunk.section,
    excerpt: content.length > EXCERPT_CHARS ? content.slice(0, EXCERPT_CHARS).trimEnd() + '…' : content,
    relevance: Math.round(hit.score * 1000) / 1000,
    chunkIndex: hit.chunk.chunkIndex,
  };
}

export async function retrieve(question: string, topK = 6): Promise<RetrievalResult> {
  const index = loadIndex(VECTOR_INDEX_PATH);
  const threshold = relevanceThreshold(index.provider);
  if (index.chunks.length === 0) {
    return { chunks: [], provider: index.provider, threshold, topK };
  }
  // Keyword-evidence floor (local TF-IDF only): if no chunk in the corpus
  // shares enough IDF-weighted vocabulary with the question, the corpus
  // does not discuss the question's topic — even if the hybrid score
  // looks passable because the keyword component saturates on ubiquitous
  // terms such as "cenobamate". See MIN_KEYWORD_RAW_LOCAL.
  if (index.provider === 'local-tfidf' && bestRawKeywordScore(index, question) < MIN_KEYWORD_RAW_LOCAL) {
    return { chunks: [], provider: index.provider, threshold, topK };
  }
  const { vector } = await getEmbedding(question);
  const hits = hybridSearch(index, vector, question, topK);
  const chunks = hits.filter((h) => h.score >= threshold).map(toRetrievedChunk);
  return { chunks, provider: index.provider, threshold, topK };
}

/** Retrieval backed by an already-loaded store (avoids re-reading the file). */
export async function retrieveWithStore(
  store: LocalVectorStore,
  question: string,
  topK = 6,
): Promise<RetrievalResult> {
  const threshold = relevanceThreshold(store.provider);
  if (store.size === 0) return { chunks: [], provider: store.provider, threshold, topK };
  if (store.provider === 'local-tfidf' && store.rawKeywordBest(question) < MIN_KEYWORD_RAW_LOCAL) {
    return { chunks: [], provider: store.provider, threshold, topK };
  }
  const { vector } = await getEmbedding(question);
  const hits = store.search(vector, question, topK);
  const chunks = hits.filter((h) => h.score >= threshold).map(toRetrievedChunk);
  return { chunks, provider: store.provider, threshold, topK };
}
