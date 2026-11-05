/**
 * chunking.ts — split extracted PDF text into retrieval chunks.
 *
 * Contract: ~800 tokens (~3000 chars) per chunk, 200-char overlap,
 * split on section headings where possible. Every chunk preserves
 * { documentId, page, section, chunkIndex } so citations can point at a
 * real page/section of a real document.
 */

export interface ChunkInput {
  documentId: string;
  page: number;
  text: string;
  /** Section heading in force at the start of this page (if known). */
  section?: string;
}

export interface Chunk {
  documentId: string;
  page: number;
  section: string;
  chunkIndex: number;
  content: string;
}

export const CHUNK_TARGET_CHARS = 3000; // ~800 tokens
export const CHUNK_OVERLAP_CHARS = 200;

/**
 * Lines that look like section headings in Cipla launch decks / consensus
 * PDFs: ALL-CAPS short lines, numbered headings ("1. Introduction",
 * "3.2 Methods"), or title-case lines ending in a colon.
 */
const HEADING_PATTERNS: RegExp[] = [
  /^\s*\d+(?:\.\d+)*[.)]\s+[A-Z][A-Za-z0-9 ,:;()&\-/]{3,80}$/, // 1. / 2.1 Title
  /^\s*[A-Z][A-Z0-9 ,:;()&'’\-/]{4,80}$/, // ALL-CAPS heading
  /^\s*[A-Z][A-Za-z0-9 ,;()&\-/]{3,70}:\s*$/, // Title-case line ending in ":"
];

export function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 4 || trimmed.length > 90) return false;
  // Exclude lines that are clearly sentences / body text.
  if (/\.\s+[A-Z]/.test(trimmed)) return false;
  if (trimmed.endsWith('.')) return false;
  return HEADING_PATTERNS.some((re) => re.test(trimmed));
}

/** Split a page's text into { section, text } segments at headings. */
export function splitBySections(
  text: string,
  initialSection = 'Introduction',
): Array<{ section: string; text: string }> {
  const segments: Array<{ section: string; text: string }> = [];
  let currentSection = initialSection;
  let buffer: string[] = [];

  const flush = () => {
    const joined = buffer.join('\n').trim();
    if (joined) segments.push({ section: currentSection, text: joined });
    buffer = [];
  };

  for (const line of text.split('\n')) {
    if (isHeading(line)) {
      flush();
      currentSection = line.trim().replace(/:\s*$/, '');
    } else {
      buffer.push(line);
    }
  }
  flush();
  if (segments.length === 0 && text.trim()) {
    segments.push({ section: currentSection, text: text.trim() });
  }
  return segments;
}

/**
 * Greedy char-window chunker with overlap. Splits on sentence boundaries
 * where possible so chunks don't cut mid-sentence; falls back to a hard
 * cut when a single sentence exceeds the target size.
 */
export function chunkText(
  text: string,
  targetChars = CHUNK_TARGET_CHARS,
  overlapChars = CHUNK_OVERLAP_CHARS,
): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= targetChars) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + targetChars, clean.length);
    if (end < clean.length) {
      // Prefer a sentence boundary in the last 25% of the window.
      const window = clean.slice(Math.max(start, end - Math.floor(targetChars * 0.25)), end);
      const lastBoundary = Math.max(
        window.lastIndexOf('. '),
        window.lastIndexOf('! '),
        window.lastIndexOf('? '),
        window.lastIndexOf('; '),
      );
      if (lastBoundary > 0) {
        end = Math.max(start, end - Math.floor(targetChars * 0.25)) + lastBoundary + 1;
      }
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(start + 1, end - overlapChars);
  }
  return chunks;
}

/**
 * Chunk one extracted page. A chunk never spans pages (page attribution
 * must stay exact for citations); a long section is split by chunkText.
 */
export function chunkPage(input: ChunkInput, startIndex: number): Chunk[] {
  const segments = splitBySections(input.text, input.section ?? 'Introduction');
  const out: Chunk[] = [];
  let idx = startIndex;
  for (const seg of segments) {
    for (const piece of chunkText(seg.text)) {
      out.push({
        documentId: input.documentId,
        page: input.page,
        section: seg.section,
        chunkIndex: idx++,
        content: piece,
      });
    }
  }
  return out;
}

/** Chunk a whole document (pages in order). chunkIndex is global per document. */
export function chunkDocument(pages: Array<{ page: number; text: string }>, documentId: string): Chunk[] {
  const out: Chunk[] = [];
  let section = 'Introduction';
  for (const p of pages) {
    const pageChunks = chunkPage({ documentId, page: p.page, text: p.text, section }, out.length);
    if (pageChunks.length > 0) {
      section = pageChunks[pageChunks.length - 1].section;
    }
    out.push(...pageChunks);
  }
  return out;
}
