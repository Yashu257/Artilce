/**
 * qdrant.ts — Qdrant vector-DB adapter (STUB / optional).
 *
 * Activates ONLY when QDRANT_URL is set. Otherwise the local JSON index
 * (backend/data/vector-index.json) is used and this module is inert.
 *
 * Implemented over the Qdrant REST API with plain fetch — no extra
 * dependency. Only the operations the RAG pipeline needs are covered:
 * upsert points (id = chunk id, vector + payload) and hybrid-ish search
 * (vector search; keyword re-ranking is done client-side by retrieval).
 * Collection creation is best-effort and idempotent.
 *
 * NOTE: this adapter is a stub in the sense that no Qdrant instance is
 * configured in this repo and it has not been tested against a live
 * Qdrant server. The local JSON store remains the default and the
 * tested path.
 */
import type { StoredChunk } from './vectorStore';

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collection: string;
}

export function getQdrantConfig(): QdrantConfig | null {
  const url = process.env.QDRANT_URL;
  if (!url) return null;
  return {
    url: url.replace(/\/$/, ''),
    apiKey: process.env.QDRANT_API_KEY || undefined,
    collection: process.env.QDRANT_COLLECTION || 'cipla-medknowledge',
  };
}

export function isQdrantEnabled(): boolean {
  return getQdrantConfig() !== null;
}

function headers(config: QdrantConfig): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) h['api-key'] = config.apiKey;
  return h;
}

export async function ensureCollection(config: QdrantConfig, dimension: number): Promise<void> {
  const res = await fetch(`${config.url}/collections/${config.collection}`, {
    method: 'PUT',
    headers: headers(config),
    body: JSON.stringify({ vectors: { size: dimension, distance: 'Cosine' } }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Qdrant ensureCollection failed: ${res.status} ${await res.text()}`);
  }
}

export async function qdrantUpsert(config: QdrantConfig, chunks: StoredChunk[]): Promise<void> {
  if (chunks.length === 0) return;
  await ensureCollection(config, chunks[0].embedding.length);
  const points = chunks.map((c) => ({
    id: c.id,
    vector: c.embedding,
    payload: {
      documentId: c.documentId,
      documentName: c.documentName,
      page: c.page,
      section: c.section,
      chunkIndex: c.chunkIndex,
      content: c.content,
    },
  }));
  const res = await fetch(`${config.url}/collections/${config.collection}/points?wait=true`, {
    method: 'PUT',
    headers: headers(config),
    body: JSON.stringify({ points }),
  });
  if (!res.ok) throw new Error(`Qdrant upsert failed: ${res.status} ${await res.text()}`);
}

export interface QdrantHit {
  chunk: StoredChunk;
  score: number;
}

export async function qdrantSearch(
  config: QdrantConfig,
  queryVector: number[],
  topK = 6,
): Promise<QdrantHit[]> {
  const res = await fetch(`${config.url}/collections/${config.collection}/points/search`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({ vector: queryVector, limit: topK, with_payload: true }),
  });
  if (!res.ok) throw new Error(`Qdrant search failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    result: Array<{ id: string; score: number; payload: Record<string, unknown> }>;
  };
  return data.result.map((r) => ({
    score: r.score,
    chunk: {
      id: String(r.id),
      documentId: String(r.payload.documentId ?? ''),
      documentName: String(r.payload.documentName ?? ''),
      page: Number(r.payload.page ?? 0),
      section: String(r.payload.section ?? ''),
      chunkIndex: Number(r.payload.chunkIndex ?? 0),
      content: String(r.payload.content ?? ''),
      embedding: [],
    },
  }));
}
