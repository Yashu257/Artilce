/**
 * services/ingestion.ts — ingest one PDF into Document + DocumentChunk rows
 * and the local vector index.
 *
 * Pipeline: extract (pdf-parse, page numbers preserved) -> chunk
 * (~3000 chars, 200 overlap, by section) -> embed (OpenAI / Gemini /
 * local TF-IDF fallback) -> persist.
 *
 * Persistence is best-effort against Prisma/MySQL: if the DB is
 * unreachable, Document/DocumentChunk rows are written to
 * backend/data/documents.json instead and the run is logged honestly
 * (status 'ready' in the JSON fallback, with dbPersisted: false).
 * The vector index (backend/data/vector-index.json) is always written.
 * Optionally mirrors chunks to Qdrant when QDRANT_URL is set.
 */
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { chunkDocument, type Chunk } from '../rag/chunking';
import { extractPdfFile } from '../rag/extract';
import { embedTexts, getEmbeddingProvider } from '../rag/embeddings';
import { LocalVectorStore, type StoredChunk } from '../rag/vectorStore';
import { getQdrantConfig, qdrantUpsert } from '../rag/qdrant';

export interface IngestMeta {
  title: string;
  fileName: string;
  category: string;
  slug: string;
}

export interface IngestResult {
  documentId: string;
  title: string;
  fileName: string;
  status: 'ready' | 'failed';
  pageCount: number;
  totalChars: number;
  chunkCount: number;
  provider: string;
  dbPersisted: boolean;
  failureReason?: string;
}

export const DATA_DIR = path.resolve(__dirname, '../../data');
export const DOCUMENTS_JSON_PATH = path.join(DATA_DIR, 'documents.json');
const MAX_ATTEMPTS = 3; // initial try + 2 retries

export function documentIdFor(fileName: string): string {
  // Stable, human-readable id derived from the file name so re-ingestion
  // upserts the same Document instead of duplicating it.
  return (
    'doc-' +
    fileName
      .toLowerCase()
      .replace(/\.pdf$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface JsonDocumentRecord extends IngestResult {
  chunks: Array<{ page: number; section: string; chunkIndex: number; content: string }>;
}

function loadDocumentsJson(): JsonDocumentRecord[] {
  if (!fs.existsSync(DOCUMENTS_JSON_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DOCUMENTS_JSON_PATH, 'utf-8')) as JsonDocumentRecord[];
  } catch {
    return [];
  }
}

function saveDocumentsJson(records: JsonDocumentRecord[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DOCUMENTS_JSON_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

async function persistToDb(
  meta: IngestMeta,
  documentId: string,
  fileSize: number,
  pageCount: number,
  status: 'ready' | 'failed',
  chunks: Chunk[],
  embeddings: number[][],
): Promise<boolean> {
  try {
    await prisma.document.upsert({
      where: { id: documentId },
      create: {
        id: documentId,
        title: meta.title,
        fileName: meta.fileName,
        mimeType: 'application/pdf',
        size: fileSize,
        category: meta.category,
        status,
        pageCount,
        version: 1,
      },
      update: { title: meta.title, category: meta.category, status, pageCount, size: fileSize },
    });
    if (status === 'ready') {
      await prisma.documentChunk.deleteMany({ where: { documentId } });
      for (let i = 0; i < chunks.length; i++) {
        await prisma.documentChunk.create({
          data: {
            documentId,
            page: chunks[i].page,
            section: chunks[i].section,
            content: chunks[i].content,
            chunkIndex: chunks[i].chunkIndex,
            embeddingJson: JSON.stringify(embeddings[i]),
          },
        });
      }
    }
    return true;
  } catch (err) {
    logger.warn('[ingestion] Prisma persist failed — falling back to JSON', { error: String(err) });
    return false;
  }
}

async function ingestOnce(meta: IngestMeta, filePath: string): Promise<IngestResult> {
  const documentId = documentIdFor(meta.fileName);
  const fileSize = fs.statSync(filePath).size;
  const provider = getEmbeddingProvider();

  const extraction = await extractPdfFile(filePath);
  if (extraction.failureReason) {
    logger.warn(`[ingestion] ${meta.fileName}: ${extraction.failureReason}`);
    await persistToDb(meta, documentId, fileSize, extraction.totalPages, 'failed', [], []);
    return {
      documentId,
      title: meta.title,
      fileName: meta.fileName,
      status: 'failed',
      pageCount: extraction.totalPages,
      totalChars: extraction.totalChars,
      chunkCount: 0,
      provider,
      dbPersisted: false,
      failureReason: extraction.failureReason,
    };
  }

  const chunks = chunkDocument(extraction.pages, documentId);
  const embeddings = await embedTexts(chunks.map((c) => c.content));

  const stored: StoredChunk[] = chunks.map((c, i) => ({
    id: `${documentId}-chunk-${c.chunkIndex}`,
    documentId,
    documentName: meta.title,
    page: c.page,
    section: c.section,
    chunkIndex: c.chunkIndex,
    content: c.content,
    embedding: embeddings[i].vector,
  }));

  // Vector index (always written — the retrieval path reads this file).
  const store = new LocalVectorStore();
  store.addChunks(documentId, stored);

  // Optional Qdrant mirror (only when QDRANT_URL is set).
  const qdrant = getQdrantConfig();
  if (qdrant) {
    try {
      await qdrantUpsert(qdrant, stored);
    } catch (err) {
      logger.warn('[ingestion] Qdrant mirror failed (local index still written)', { error: String(err) });
    }
  }

  const dbPersisted = await persistToDb(
    meta,
    documentId,
    fileSize,
    extraction.totalPages,
    'ready',
    chunks,
    embeddings.map((e) => e.vector),
  );

  if (!dbPersisted) {
    const records = loadDocumentsJson().filter((r) => r.documentId !== documentId);
    records.push({
      documentId,
      title: meta.title,
      fileName: meta.fileName,
      status: 'ready',
      pageCount: extraction.totalPages,
      totalChars: extraction.totalChars,
      chunkCount: chunks.length,
      provider,
      dbPersisted: false,
      chunks: chunks.map((c) => ({
        page: c.page,
        section: c.section,
        chunkIndex: c.chunkIndex,
        content: c.content,
      })),
    });
    saveDocumentsJson(records);
    logger.warn(`[ingestion] ${meta.fileName}: DB unavailable — Document/DocumentChunk rows saved to data/documents.json`);
  }

  return {
    documentId,
    title: meta.title,
    fileName: meta.fileName,
    status: 'ready',
    pageCount: extraction.totalPages,
    totalChars: extraction.totalChars,
    chunkCount: chunks.length,
    provider,
    dbPersisted,
  };
}

/** Ingest one document with up to 2 retries (3 attempts total). */
export async function ingestDocument(meta: IngestMeta, filePath: string): Promise<IngestResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await ingestOnce(meta, filePath);
    } catch (err) {
      lastError = err;
      logger.warn(`[ingestion] ${meta.fileName}: attempt ${attempt}/${MAX_ATTEMPTS} failed`, {
        error: String(err),
      });
      if (attempt < MAX_ATTEMPTS) await sleep(1000 * attempt);
    }
  }
  const reason = `Ingestion failed after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`;
  logger.error(`[ingestion] ${meta.fileName}: ${reason}`);
  return {
    documentId: documentIdFor(meta.fileName),
    title: meta.title,
    fileName: meta.fileName,
    status: 'failed',
    pageCount: 0,
    totalChars: 0,
    chunkCount: 0,
    provider: getEmbeddingProvider(),
    dbPersisted: false,
    failureReason: reason,
  };
}
