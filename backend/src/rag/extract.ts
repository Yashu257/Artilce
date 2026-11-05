/**
 * extract.ts — PDF text extraction with page numbers preserved.
 *
 * Uses pdf-parse. Page numbers are captured via pdf-parse's `pagerender`
 * callback (pdf.js `getTextContent` per page) when available; otherwise the
 * text is split on form-feed characters, and as a last resort the whole
 * text is treated as a single page (page 1) with an explicit note.
 *
 * Scanned-image PDFs: pdf-parse extracts no embedded text. We do NOT fake
 * OCR — if a document averages < 50 extractable characters per page we
 * mark it failed with a clear reason so ingestion can report it honestly.
 */
import * as fs from 'fs';

export interface ExtractedPage {
  page: number;
  text: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  totalPages: number;
  totalChars: number;
  avgCharsPerPage: number;
  /** True when the PDF looks scanned (no embedded text layer). */
  isScanned: boolean;
  /** Present when the document should be marked failed. */
  failureReason?: string;
  /** How page numbers were determined: 'pagerender' | 'formfeed' | 'single-page'. */
  pageSource: 'pagerender' | 'formfeed' | 'single-page';
}

export const MIN_CHARS_PER_PAGE = 50;

/** Light cleaning: de-hyphenate, collapse whitespace, drop bare page numbers. */
export function cleanText(raw: string): string {
  return raw
    .replace(/([A-Za-z])-\n([A-Za-z])/g, '$1$2') // de-hyphenate line breaks
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^\d{1,3}$/.test(line)) // bare page numbers
    .join('\n')
    .trim();
}

type PdfParseFn = (dataBuffer: Buffer, options?: Record<string, unknown>) => Promise<{
  text: string;
  numpages: number;
  numrender: number;
  info?: Record<string, unknown>;
}>;

// pdf-parse's pagerender receives the pdf.js page object; types are loose
// on purpose (the library ships no pagerender typings).
async function renderPageText(pageData: {
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
}): Promise<string> {
  const content = await pageData.getTextContent();
  // pdf.js returns items in reading order per text block; join with a
  // space and let cleanText normalise. Newlines are approximated by
  // treating each item as its own fragment.
  return content.items.map((item) => item.str ?? '').join(' ');
}

export async function extractPdf(buffer: Buffer, fileName = 'document.pdf'): Promise<ExtractionResult> {
  // Require lazily so a missing/broken pdf-parse install fails loudly here,
  // not at import time of the whole RAG module.
  const pdfParse = (await import('pdf-parse')).default as unknown as PdfParseFn;

  const pages: ExtractedPage[] = [];
  let pageSource: ExtractionResult['pageSource'] = 'pagerender';

  const data = await pdfParse(buffer, {
    pagerender: async (pageData: Parameters<typeof renderPageText>[0]) => {
      const text = await renderPageText(pageData);
      pages.push({ page: pages.length + 1, text: cleanText(text) });
      return text;
    },
  });

  let totalPages = data.numpages || pages.length;

  if (pages.length === 0) {
    // pagerender callback was not honoured (older pdf-parse behaviour):
    // fall back to form-feed splitting, then to a single page.
    const raw = data.text || '';
    if (raw.includes('\f')) {
      pageSource = 'formfeed';
      raw.split('\f').forEach((chunk, i) => {
        const text = cleanText(chunk);
        if (text) pages.push({ page: i + 1, text });
      });
    } else if (raw.trim()) {
      pageSource = 'single-page';
      pages.push({ page: 1, text: cleanText(raw) });
    }
    totalPages = data.numpages || pages.length;
  }

  // Normalise: guarantee page numbers are sequential and text is cleaned.
  const normalised = pages.map((p, i) => ({ page: i + 1, text: p.text }));
  const totalChars = normalised.reduce((sum, p) => sum + p.text.length, 0);
  const avgCharsPerPage = totalPages > 0 ? totalChars / totalPages : 0;
  const isScanned = totalPages > 0 && avgCharsPerPage < MIN_CHARS_PER_PAGE;

  return {
    pages: normalised,
    totalPages,
    totalChars,
    avgCharsPerPage,
    isScanned,
    pageSource,
    failureReason: isScanned
      ? `Scanned-image PDF (no extractable text layer): ${fileName} averages ` +
        `${Math.round(avgCharsPerPage)} chars/page over ${totalPages} pages ` +
        `(threshold ${MIN_CHARS_PER_PAGE}). OCR is not performed; ` +
        `re-upload a text-based PDF.`
      : undefined,
  };
}

export async function extractPdfFile(filePath: string): Promise<ExtractionResult> {
  const buffer = await fs.promises.readFile(filePath);
  return extractPdf(buffer, filePath.split('/').pop() ?? filePath);
}
