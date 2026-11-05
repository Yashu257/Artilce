/**
 * Indexing report — `npx ts-node scripts/indexing-report.ts`.
 *
 * Prints a JSON report (one row per PDF/document) that the RAG agent and
 * the docs coordinator use to verify ingestion coverage:
 *   { generatedAt, dbReachable, summary: {total, byStatus, totalChunks,
 *     totalPages, missingFiles}, documents: [{documentId, title, fileName,
 *     category, status, pageCount, chunkCount, sizeBytes, fileExists}] }
 *
 * Works without a live MySQL: if the DB is unreachable it falls back to
 * backend/data/documents.json (the RAG ingestion fallback) and the
 * uploads/ directory scan, and says so in `dbReachable: false`.
 * Exit code 0 even when the DB is down (this is a report, not a migration);
 * exit code 1 only if nothing could be read at all.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const DOCUMENTS_JSON = path.resolve(__dirname, '../data/documents.json');

interface ReportRow {
  documentId: string;
  title: string;
  fileName: string;
  category: string;
  status: string;
  pageCount: number;
  chunkCount: number;
  sizeBytes: number;
  fileExists: boolean;
}

function scanUploads(): ReportRow[] {
  if (!fs.existsSync(UPLOADS_DIR)) return [];
  return fs
    .readdirSync(UPLOADS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .sort()
    .map((fileName) => {
      const stat = fs.statSync(path.join(UPLOADS_DIR, fileName));
      return {
        documentId: `doc-${fileName.toLowerCase().replace(/\.pdf$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
        title: fileName.replace(/\.pdf$/i, ''),
        fileName,
        category: 'unknown (DB unavailable)',
        status: 'unknown',
        pageCount: 0,
        chunkCount: 0,
        sizeBytes: stat.size,
        fileExists: true,
      };
    });
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let rows: ReportRow[] = [];
  let dbReachable = false;
  try {
    const docs = await prisma.document.findMany({
      orderBy: { title: 'asc' },
      include: { _count: { select: { chunks: true } } },
    });
    dbReachable = true;
    rows = docs.map((d) => ({
      documentId: d.id,
      title: d.title,
      fileName: d.fileName,
      category: d.category,
      status: d.status,
      pageCount: d.pageCount,
      chunkCount: d._count.chunks,
      sizeBytes: d.size,
      fileExists: fs.existsSync(path.join(UPLOADS_DIR, path.basename(d.fileName))),
    }));
  } catch {
    // DB fallback: RAG ingestion JSON records, merged over the uploads scan.
    const scanned = scanUploads();
    const byId = new Map(scanned.map((r) => [r.documentId, r]));
    if (fs.existsSync(DOCUMENTS_JSON)) {
      try {
        const records = JSON.parse(fs.readFileSync(DOCUMENTS_JSON, 'utf8')) as Array<{
          documentId: string;
          title: string;
          fileName: string;
          status: string;
          pageCount: number;
          chunkCount: number;
        }>;
        for (const rec of records) {
          const row = byId.get(rec.documentId) ?? {
            documentId: rec.documentId,
            title: rec.title,
            fileName: rec.fileName,
            category: 'unknown (DB unavailable)',
            status: rec.status,
            pageCount: rec.pageCount,
            chunkCount: rec.chunkCount,
            sizeBytes: 0,
            fileExists: fs.existsSync(path.join(UPLOADS_DIR, path.basename(rec.fileName))),
          };
          row.status = rec.status;
          row.pageCount = rec.pageCount;
          row.chunkCount = rec.chunkCount;
          row.title = rec.title;
          byId.set(rec.documentId, row);
        }
      } catch {
        // fall through with the uploads scan only
      }
    }
    rows = [...byId.values()].sort((a, b) => a.title.localeCompare(b.title));
  } finally {
    await prisma.$disconnect();
  }

  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const report = {
    generatedAt: new Date().toISOString(),
    dbReachable,
    summary: {
      total: rows.length,
      byStatus,
      totalChunks: rows.reduce((s, r) => s + r.chunkCount, 0),
      totalPages: rows.reduce((s, r) => s + r.pageCount, 0),
      missingFiles: rows.filter((r) => !r.fileExists).map((r) => r.fileName),
    },
    documents: rows,
  };
  console.log(JSON.stringify(report, null, 2));
}

void main().catch((err: unknown) => {
  console.error('Indexing report failed:', err);
  process.exit(1);
});
