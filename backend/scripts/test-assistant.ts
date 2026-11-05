/**
 * scripts/test-assistant.ts — QA harness for the RAG assistant.
 *
 * Runs 10 grounded questions derived from the actual PDFs + 1 unsupported
 * question through answerQuestion() (the same code path the HTTP route
 * uses), then verifies EVERY citation against its source page:
 * the citation's excerpt (normalised) must occur in the extracted text
 * of the cited page of the cited PDF, and the page must be within range.
 *
 * Writes docs/AI_TEST_RESULTS.md (full per-question results) and prints
 * a pass/fail summary. Exits 1 if any verification fails.
 *
 * Prerequisites: run `npm run ingest` first (builds backend/data/vector-index.json).
 * No LLM key is needed — with no OPENAI_API_KEY / GEMINI_API_KEY the run
 * exercises local-retrieval mode and says so in the report.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { answerQuestion } from '../src/rag/assistant';
import { INSUFFICIENT_INFORMATION, MEDICAL_DISCLAIMER } from '../src/rag/prompts';
import { extractPdfFile } from '../src/rag/extract';
import { DOCUMENTS, UPLOADS_DIR } from './ingest';

const TEST_USER_ID = 'qa-test-user';
const RESULTS_MD = path.resolve(__dirname, '../../docs/AI_TEST_RESULTS.md');

interface TestQuestion {
  id: string;
  question: string;
  /** 'grounded' questions must retrieve >=1 chunk; 'unsupported' must hit the exact fallback. */
  kind: 'grounded' | 'unsupported';
}

export const TEST_QUESTIONS: TestQuestion[] = [
  { id: 'Q1', question: 'What clinical evidence is available for early initiation?', kind: 'grounded' },
  { id: 'Q2', question: 'What is the evidence for cenobamate efficacy during the titration phase?', kind: 'grounded' },
  { id: 'Q3', question: 'When can cenobamate be used as monotherapy, and how is conversion to monotherapy handled?', kind: 'grounded' },
  { id: 'Q4', question: 'What did the Phase III long-term extension safety study find?', kind: 'grounded' },
  { id: 'Q5', question: 'What were the results of the Phase III LTE post-hoc analysis for uncontrolled focal seizures?', kind: 'grounded' },
  { id: 'Q6', question: 'What did the German KORK study find when comparing cenobamate with other ASMs?', kind: 'grounded' },
  { id: 'Q7', question: 'What real-world evidence compares cenobamate with other ASMs in drug-resistant focal seizures?', kind: 'grounded' },
  { id: 'Q8', question: 'What evidence supports cenobamate in ultra-refractory focal-onset seizures?', kind: 'grounded' },
  { id: 'Q9', question: 'What does the Spanish consensus recommend about reducing concomitant ASMs when using cenobamate?', kind: 'grounded' },
  { id: 'Q10', question: 'What is the Freedon study and what did it show about different lines of therapy?', kind: 'grounded' },
  { id: 'Q11', question: 'What is the dosage for treating diabetes with cenobamate?', kind: 'unsupported' },
];

const normalize = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();

interface CitationCheck {
  documentName: string;
  page: number;
  section: string;
  relevance: number;
  excerpt: string;
  verified: boolean;
  detail: string;
}

interface QuestionResult {
  id: string;
  question: string;
  kind: string;
  mode: string;
  engine: string;
  provider: string;
  citations: CitationCheck[];
  answer: string;
  passed: boolean;
  notes: string[];
}

async function verifyCitation(
  citation: { documentName: string; page: number; excerpt: string },
  extractionCache: Map<string, { totalPages: number; pages: Map<number, string> }>,
): Promise<CitationCheck> {
  const base = {
    documentName: citation.documentName,
    page: citation.page,
    section: '',
    relevance: 0,
    excerpt: citation.excerpt,
    verified: false,
    detail: '',
  };
  const meta = DOCUMENTS.find((d) => d.title === citation.documentName);
  if (!meta) return { ...base, detail: `No source PDF mapped for document title "${citation.documentName}".` };
  const filePath = path.join(UPLOADS_DIR, meta.fileName);
  let extraction = extractionCache.get(meta.fileName);
  if (!extraction) {
    const result = await extractPdfFile(filePath);
    extraction = {
      totalPages: result.totalPages,
      pages: new Map(result.pages.map((p) => [p.page, normalize(p.text)])),
    };
    extractionCache.set(meta.fileName, extraction);
  }
  if (citation.page < 1 || citation.page > extraction.totalPages) {
    return { ...base, detail: `Page ${citation.page} out of range (PDF has ${extraction.totalPages} pages).` };
  }
  const pageText = extraction.pages.get(citation.page) ?? '';
  const probe = normalize(citation.excerpt).slice(0, 120);
  if (probe.length > 20 && pageText.includes(probe)) {
    return { ...base, verified: true, detail: `Excerpt found verbatim (first 120 chars) on p. ${citation.page} of ${meta.fileName}.` };
  }
  return { ...base, detail: `Excerpt NOT found on cited p. ${citation.page} of ${meta.fileName}.` };
}

async function main(): Promise<void> {
  const indexPath = path.resolve(__dirname, '../data/vector-index.json');
  if (!fs.existsSync(indexPath)) {
    console.error('[test] No vector index found. Run `npm run ingest` first.');
    process.exit(1);
  }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as { chunks: unknown[] };
  console.log(`[test] Vector index: ${index.chunks.length} chunks. Provider mode: no LLM key = local-retrieval (unless OPENAI_API_KEY/GEMINI_API_KEY set).`);

  const extractionCache = new Map<string, { totalPages: number; pages: Map<number, string> }>();
  const results: QuestionResult[] = [];

  for (const tq of TEST_QUESTIONS) {
    console.log(`\n[test] ${tq.id}: ${tq.question}`);
    const answer = await answerQuestion(TEST_USER_ID, undefined, tq.question);
    const notes: string[] = [];
    const citationChecks: CitationCheck[] = [];
    for (const c of answer.citations) {
      const check = await verifyCitation(c, extractionCache);
      citationChecks.push({ ...check, section: c.section, relevance: c.relevance });
    }

    let passed = true;
    if (tq.kind === 'unsupported') {
      const exact = answer.answer.startsWith(INSUFFICIENT_INFORMATION);
      if (!exact) { passed = false; notes.push('FAIL: unsupported question did not return the exact insufficient-information sentence.'); }
      if (answer.citations.length !== 0) { passed = false; notes.push(`FAIL: unsupported question returned ${answer.citations.length} citations (expected 0).`); }
      if (!answer.answer.includes(MEDICAL_DISCLAIMER)) { passed = false; notes.push('FAIL: medical disclaimer missing.'); }
      if (exact) notes.push('Returned the exact insufficient-information sentence, with no citations.');
    } else {
      if (answer.citations.length === 0) { passed = false; notes.push('FAIL: grounded question retrieved no chunks above threshold.'); }
      const unverified = citationChecks.filter((c) => !c.verified);
      if (unverified.length > 0) { passed = false; notes.push(`FAIL: ${unverified.length} citation(s) did not verify against the source page.`); }
      if (!answer.answer.includes(MEDICAL_DISCLAIMER)) { passed = false; notes.push('FAIL: medical disclaimer missing.'); }
      if (answer.mode !== 'llm' && answer.mode !== 'local-retrieval') { passed = false; notes.push(`FAIL: unexpected mode "${answer.mode}".`); }
      notes.push(`Mode: ${answer.mode} (engine: ${answer.engine}, embedding provider: ${answer.provider}).`);
    }
    console.log(`[test] ${tq.id}: ${passed ? 'PASS' : 'FAIL'} — ${answer.citations.length} citation(s), mode=${answer.mode}`);
    for (const c of citationChecks) {
      console.log(`[test]   citation p.${c.page} ${c.documentName} relevance=${c.relevance} verified=${c.verified}`);
    }
    results.push({
      id: tq.id,
      question: tq.question,
      kind: tq.kind,
      mode: answer.mode,
      engine: answer.engine,
      provider: answer.provider,
      citations: citationChecks,
      answer: answer.answer,
      passed,
      notes,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const generatedAt = new Date().toISOString();
  const llmConfigured = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);

  const sections = results
    .map((r) => {
      const cites = r.citations
        .map(
          (c) =>
            `- [${c.verified ? 'VERIFIED' : 'FAILED'}] ${c.documentName}, p. ${c.page} (${c.section}), relevance ${c.relevance}\n  Excerpt: "${c.excerpt}"\n  Check: ${c.detail}`,
        )
        .join('\n') || '- (no citations)';
      return `## ${r.id} — ${r.passed ? 'PASS' : 'FAIL'} (${r.kind})\n\n**Question:** ${r.question}\n\n**Mode:** \`${r.mode}\` (engine: \`${r.engine}\`, embedding provider: \`${r.provider}\`)\n\n**Answer:**\n\n> ${r.answer.replace(/\n/g, '\n> ')}\n\n**Retrieved chunks / citations:**\n\n${cites}\n\n**Notes:** ${r.notes.join(' ')}\n`;
    })
    .join('\n');

  const md = `# AI Assistant Test Results — Cipla MedKnowledge

Generated: ${generatedAt}

## How this was tested

- 10 grounded questions derived from the actual 9 PDFs + 1 unsupported question, run through the same \`answerQuestion()\` code path the \`POST /api/v1/assistant/chat\` route uses.
- Retrieval: real hybrid search (0.7 vector cosine + 0.3 keyword BM25-ish) over \`backend/data/vector-index.json\`, top 6, relevance threshold 0.15 (local TF-IDF) / 0.55 (dense embeddings). No hardcoded answers.
- Citation verification: for EVERY citation, the excerpt (normalised, first 120 chars) was checked to occur verbatim in the extracted text of the cited page of the cited PDF, and the page was checked to be within the PDF's page range. A citation that fails either check is marked FAILED.
- LLM keys during this run: ${llmConfigured ? 'an OpenAI/Gemini key WAS configured — answers in `llm` mode were generated by that model from retrieved context.' : 'NO OpenAI/Gemini key was configured — all answers ran in `local-retrieval` mode: evidence retrieved from PDFs, answer composed from retrieved excerpts, no external LLM. No LLM generation is claimed for this run.'}

## Summary

- ${passedCount}/${results.length} questions passed.
- Unsupported question (Q11) must return exactly: "I couldn't find sufficient information in the available Cipla medical resources to answer this question reliably." — see Q11 below.

${sections}
`;
  fs.mkdirSync(path.dirname(RESULTS_MD), { recursive: true });
  fs.writeFileSync(RESULTS_MD, md, 'utf-8');
  console.log(`\n[test] ${passedCount}/${results.length} passed. Full results: ${RESULTS_MD}`);
  process.exit(passedCount === results.length ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[test] Fatal error:', err);
    process.exit(1);
  });
}
