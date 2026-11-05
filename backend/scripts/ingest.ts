/**
 * scripts/ingest.ts — CLI to ingest the 9 Cipla PDFs in backend/uploads/.
 *
 * Usage:
 *   npx ts-node scripts/ingest.ts [--dry-run] [--file "<name>.pdf"] [--limit N]
 *
 * --dry-run: extract + chunk + embed in memory only; writes nothing to the
 *   DB or the vector index. Proves extraction/chunking works with no live
 *   DB and no LLM key (local TF-IDF fallback).
 * Default run: full ingestion — Document + DocumentChunk rows in Prisma
 *   (JSON fallback to backend/data/documents.json if the DB is down),
 *   Document.status ready/failed, and backend/data/vector-index.json.
 * Each document is retried 2x on failure (see services/ingestion.ts).
 *
 * NOTE: requires .env to be loadable for DATABASE_URL when a DB write is
 * wanted; without it the run still completes via the JSON fallback and
 * says so in the summary.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { chunkDocument } from '../src/rag/chunking';
import { extractPdfFile } from '../src/rag/extract';
import { embedTexts, getEmbeddingProvider } from '../src/rag/embeddings';
import { ingestDocument, type IngestMeta, type IngestResult } from '../src/services/ingestion';

export const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
export const DATA_DIR = path.resolve(__dirname, '../data');
export const INDEXING_REPORT_JSON = path.join(DATA_DIR, 'indexing-report.json');
export const INDEXING_REPORT_MD = path.resolve(__dirname, '../../docs/INDEXING.md');

/** The 9 source PDFs, mapped to article titles/categories from
 *  frontend/src/data/sampleArticles.js (seed source of truth).
 *  NOTE: on-disk filenames in backend/uploads/ all carry the
 *  "LAUNCH DECK - " prefix; sampleArticles.js pdf_name omits it for 5
 *  files, so fileName below follows the disk, not pdf_name. */
export const DOCUMENTS: IngestMeta[] = [
  {
    fileName: 'LAUNCH DECK - EARLY INITIATION BETTER.pdf',
    title: 'Launch Deck: Early Initiation Better — Freedon Study (Real-Life Outcomes in Different Lines)',
    category: 'Real-World Evidence (RWE)',
    slug: 'launch-deck-early-initiation-better',
  },
  {
    fileName: 'LAUNCH DECK - EFF IN TITRATION PHASE.pdf',
    title: 'Launch Deck: Efficacy in Titration Phase — Onset of Efficacy and Adverse Events',
    category: 'Titration & Dosing Guidelines',
    slug: 'launch-deck-eff-in-titration-phase',
  },
  {
    fileName: 'LAUNCH DECK - EVENTUALLY MONOTHERAPY.pdf',
    title: 'Launch Deck: Eventually Monotherapy — Conversion to Monotherapy or Dual Therapy',
    category: 'Monotherapy & Concomitant ASM Deprescribing',
    slug: 'launch-deck-eventually-monotherapy',
  },
  {
    fileName: 'LAUNCH DECK - PHASE III LTE.pdf',
    title: 'Launch Deck: Phase III LTE Safety Study — Large Multicenter Open-Label Trial (Zero DRESS Cases)',
    category: 'Phase III Clinical Trials & Efficacy',
    slug: 'launch-deck-phase-iii-lte-safety-study',
  },
  {
    fileName: 'LAUNCH DECK - PHASE III LTE POST-HOC.pdf',
    title: 'Launch Deck: Phase III LTE Post-Hoc Analysis — Long-Term Efficacy for Uncontrolled Focal Seizures',
    category: 'Phase III Clinical Trials & Efficacy',
    slug: 'launch-deck-phase-iii-lte-post-hoc',
  },
  {
    fileName: 'LAUNCH DECK - RWE - GERMAN - COMPARATIVE.pdf',
    title: 'Launch Deck: RWE German Comparative — The Cenobamate KORK Study (Comparison vs Other ASMs)',
    category: 'Real-World Evidence (RWE)',
    slug: 'launch-deck-rwe-german-comparative-kork-study',
  },
  {
    fileName: 'LAUNCH DECK - RWE COMPARATIVE vs OTHER ASMs.pdf',
    title: 'Launch Deck: RWE Comparative vs Other ASMs — Early Adjunctive Treatment in Drug-Resistant Focal Seizures',
    category: 'Real-World Evidence (RWE)',
    slug: 'launch-deck-rwe-comparative-vs-other-asms',
  },
  {
    fileName: 'LAUNCH DECK - ULTRA-REFRACTORY FOS.pdf',
    title: 'Launch Deck: Ultra-Refractory FOS — Danish Epilepsy Centre Results (Add-On in Extreme Refractoriness)',
    category: 'Real-World Evidence (RWE)',
    slug: 'launch-deck-ultra-refractory-fos',
  },
  {
    fileName: 'REDUCE 1 ASM SPANISH CONSENSUS.pdf',
    title: 'Spanish Consensus: Reduce 1 ASM — Management of Concomitant ASMs When Using Cenobamate',
    category: 'Monotherapy & Concomitant ASM Deprescribing',
    slug: 'reduce-1-asm-spanish-consensus',
  },
];

function parseArgs(argv: string[]): { dryRun: boolean; file?: string; limit?: number } {
  const args = { dryRun: false, file: undefined as string | undefined, limit: undefined as number | undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    if (argv[i] === '--file' && argv[i + 1]) args.file = argv[++i];
    if (argv[i] === '--limit' && argv[i + 1]) args.limit = Number(argv[++i]);
  }
  return args;
}

async function dryRun(meta: IngestMeta, filePath: string): Promise<void> {  const extraction = await extractPdfFile(filePath);
  if (extraction.failureReason) {
    console.log(`[dry-run] ${meta.fileName}: FAILED — ${extraction.failureReason}`);
    return;
  }
  const chunks = chunkDocument(extraction.pages, 'dry-run');
  const embeddings = await embedTexts(chunks.slice(0, 3).map((c) => c.content));
  console.log(
    `[dry-run] ${meta.fileName}: ${extraction.totalPages} pages (${extraction.pageSource}), ` +
      `${extraction.totalChars} chars, ${chunks.length} chunks, ` +
      `first chunk p.${chunks[0]?.page} [${chunks[0]?.section}] (${chunks[0]?.content.length} chars), ` +
      `embedding provider=${embeddings[0]?.provider} dim=${embeddings[0]?.dimension}`,
  );
}

export interface IndexingReportEntry {
  file: string;
  title: string;
  slug: string;
  category: string;
  documentId: string;
  pagesExtracted: number;
  totalChars: number;
  chunks: number;
  vectors: number;
  embeddingProvider: string;
  status: 'ready' | 'failed';
  dbPersisted: boolean;
  failureReason?: string;
}

/**
 * Indexing report (requirement 1): one entry per PDF, written to
 * backend/data/indexing-report.json and docs/INDEXING.md. `vectors`
 * equals `chunks` — one embedding vector per chunk.
 */
export function writeIndexingReport(results: IngestResult[]): void {
  const entries: IndexingReportEntry[] = results.map((r) => {
    const meta = DOCUMENTS.find((d) => d.fileName === r.fileName);
    return {
      file: r.fileName,
      title: r.title,
      slug: meta?.slug ?? '',
      category: meta?.category ?? '',
      documentId: r.documentId,
      pagesExtracted: r.pageCount,
      totalChars: r.totalChars,
      chunks: r.chunkCount,
      vectors: r.chunkCount,
      embeddingProvider: r.provider,
      status: r.status,
      dbPersisted: r.dbPersisted,
      ...(r.failureReason ? { failureReason: r.failureReason } : {}),
    };
  });
  const totals = {
    documents: entries.length,
    ready: entries.filter((e) => e.status === 'ready').length,
    failed: entries.filter((e) => e.status === 'failed').length,
    pagesExtracted: entries.reduce((s, e) => s + e.pagesExtracted, 0),
    chunks: entries.reduce((s, e) => s + e.chunks, 0),
    vectors: entries.reduce((s, e) => s + e.vectors, 0),
  };
  const report = {
    generatedAt: new Date().toISOString(),
    embeddingProvider: results[0]?.provider ?? getEmbeddingProvider(),
    vectorIndex: 'backend/data/vector-index.json',
    totals,
    documents: entries,
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(INDEXING_REPORT_JSON, JSON.stringify(report, null, 2), 'utf-8');

  const rows = entries
    .map(
      (e) =>
        `| ${e.file} | ${e.pagesExtracted} | ${e.totalChars.toLocaleString()} | ${e.chunks} | ${e.vectors} | ${e.status} | ${e.dbPersisted ? 'MySQL' : 'JSON fallback'} |`,
    )
    .join('\n');
  const md = `# PDF Indexing Report — Cipla MedKnowledge

Generated: ${report.generatedAt}
Embedding provider: \`${report.embeddingProvider}\` (OpenAI \`text-embedding-3-small\` if \`OPENAI_API_KEY\` is set, else Gemini \`text-embedding-004\` if \`GEMINI_API_KEY\` is set, else local TF-IDF hashed vectors, 384-dim).
Vector index: \`backend/data/vector-index.json\`. Document rows: MySQL \`Document\` / \`DocumentChunk\` when the database is reachable, otherwise \`backend/data/documents.json\` (JSON fallback — see the \`dbPersisted\` column).

## Totals

- Documents: ${totals.documents} (${totals.ready} ready, ${totals.failed} failed)
- Pages extracted: ${totals.pagesExtracted}
- Chunks: ${totals.chunks} (~3000 chars each, 200-char overlap, split by section heading)
- Vectors: ${totals.vectors} (one per chunk)

## Per-PDF results

| File | Pages | Chars | Chunks | Vectors | Status | Persisted to |
| --- | ---: | ---: | ---: | :--- | :--- |
${rows}

## Notes

- Every PDF is processed independently; each chunk preserves \`documentId\`, document title/filename, page number, section/heading, and extracted text.
- Scanned-image PDFs (no text layer, < 50 chars/page on average) are marked \`failed\` with a reason — no fake OCR is performed.
- Retrieval is hybrid (0.7 vector cosine + 0.3 keyword BM25-ish), top 6, with a relevance threshold of 0.15 for local TF-IDF vectors and 0.55 for dense OpenAI/Gemini embeddings (see \`backend/src/rag/vectorStore.ts\`).
`;
  fs.mkdirSync(path.dirname(INDEXING_REPORT_MD), { recursive: true });
  fs.writeFileSync(INDEXING_REPORT_MD, md, 'utf-8');
  console.log(`[ingest] Indexing report written: ${INDEXING_REPORT_JSON} and ${INDEXING_REPORT_MD}`);
}

async function main(): Promise<void> {
  const { dryRun: isDryRun, file, limit } = parseArgs(process.argv.slice(2));
  console.log(
    `[ingest] provider=${getEmbeddingProvider()} ` +
      `(OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? 'set' : 'unset'}, ` +
      `GEMINI_API_KEY=${process.env.GEMINI_API_KEY ? 'set' : 'unset'})`,
  );

  let docs = DOCUMENTS;
  if (file) docs = docs.filter((d) => d.fileName === file);
  if (limit) docs = docs.slice(0, limit);
  if (docs.length === 0) {
    console.error('[ingest] No matching documents. Check --file value.');
    process.exit(1);
  }

  let ready = 0;
  let failed = 0;
  const results: IngestResult[] = [];
  for (const meta of docs) {
    const filePath = path.join(UPLOADS_DIR, meta.fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`[ingest] ${meta.fileName}: MISSING FILE — skipped`);
      failed++;
      results.push({
        documentId: '',
        title: meta.title,
        fileName: meta.fileName,
        status: 'failed',
        pageCount: 0,
        totalChars: 0,
        chunkCount: 0,
        provider: getEmbeddingProvider(),
        dbPersisted: false,
        failureReason: 'File not found in backend/uploads/',
      });
      continue;
    }
    if (isDryRun) {
      await dryRun(meta, filePath);
      ready++;
      continue;
    }
    const result = await ingestDocument(meta, filePath);
    results.push(result);
    console.log(
      `[ingest] ${meta.fileName}: status=${result.status} pages=${result.pageCount} ` +
        `chunks=${result.chunkCount} dbPersisted=${result.dbPersisted}` +
        (result.failureReason ? ` reason=${result.failureReason}` : ''),
    );
    if (result.status === 'ready') ready++;
    else failed++;
  }
  console.log(`[ingest] DONE: ${ready} ready, ${failed} failed, ${docs.length} total${isDryRun ? ' (dry run — nothing written)' : ''}`);
  if (!isDryRun && results.length > 0) writeIndexingReport(results);
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[ingest] Fatal error:', err);
    process.exit(1);
  });
}
