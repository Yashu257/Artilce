# PDF Indexing Report — Cipla MedKnowledge

Generated: 2026-11-05T21:26:42.517Z
Embedding provider: `local-tfidf` (OpenAI `text-embedding-3-small` if `OPENAI_API_KEY` is set, else Gemini `text-embedding-004` if `GEMINI_API_KEY` is set, else local TF-IDF hashed vectors, 384-dim).
Vector index: `backend/data/vector-index.json`. Document rows: MySQL `Document` / `DocumentChunk` when the database is reachable, otherwise `backend/data/documents.json` (JSON fallback — see the `dbPersisted` column).

## Totals

- Documents: 9 (9 ready, 0 failed)
- Pages extracted: 97
- Chunks: 184 (~3000 chars each, 200-char overlap, split by section heading)
- Vectors: 184 (one per chunk)

## Per-PDF results

| File | Pages | Chars | Chunks | Vectors | Status | Persisted to |
| --- | ---: | ---: | ---: | :--- | :--- |
| LAUNCH DECK - EARLY INITIATION BETTER.pdf | 13 | 53,539 | 25 | 25 | ready | MySQL |
| LAUNCH DECK - EFF IN TITRATION PHASE.pdf | 11 | 40,977 | 20 | 20 | ready | MySQL |
| LAUNCH DECK - EVENTUALLY MONOTHERAPY.pdf | 11 | 42,034 | 21 | 21 | ready | MySQL |
| LAUNCH DECK - PHASE III LTE.pdf | 10 | 42,063 | 19 | 19 | ready | MySQL |
| LAUNCH DECK - PHASE III LTE POST-HOC.pdf | 11 | 38,672 | 18 | 18 | ready | MySQL |
| LAUNCH DECK - RWE - GERMAN - COMPARATIVE.pdf | 13 | 60,971 | 26 | 26 | ready | MySQL |
| LAUNCH DECK - RWE COMPARATIVE vs OTHER ASMs.pdf | 10 | 42,079 | 19 | 19 | ready | MySQL |
| LAUNCH DECK - ULTRA-REFRACTORY FOS.pdf | 10 | 41,089 | 18 | 18 | ready | MySQL |
| REDUCE 1 ASM SPANISH CONSENSUS.pdf | 8 | 35,236 | 18 | 18 | ready | MySQL |

## Notes

- Every PDF is processed independently; each chunk preserves `documentId`, document title/filename, page number, section/heading, and extracted text.
- Scanned-image PDFs (no text layer, < 50 chars/page on average) are marked `failed` with a reason — no fake OCR is performed.
- Retrieval is hybrid (0.7 vector cosine + 0.3 keyword BM25-ish), top 6, with a relevance threshold of 0.15 for local TF-IDF vectors and 0.55 for dense OpenAI/Gemini embeddings (see `backend/src/rag/vectorStore.ts`).
