# Shared API & Data Contract — Cipla MedKnowledge v2 (DO NOT DIVERGE)

## Ports & env
- Frontend Next.js: http://localhost:3000
- Backend Express+TS: http://localhost:4000, base `/api/v1`
- DB: MySQL `medical_knowledge_db` via Prisma, `DATABASE_URL` in backend/.env
- Auth: httpOnly cookie `mkp_session` (JWT signed, 8h), Secure in prod, SameSite=Lax. No localStorage token. No Gmail-domain auto-auth. Demo: doctor@example.com / Doctor123! (bcrypt hash only, seed via bcryptjs hashSync).
- CORS: frontend origin only (http://localhost:3000), credentials true.
- Standard response: `{ success: boolean, data?: any, error?: { code, message }, meta?: { page, total } }`

## REST endpoints (must all exist)
- POST /api/v1/auth/login, POST /api/v1/auth/logout, GET /api/v1/auth/me, POST /api/v1/auth/forgot-password, POST /api/v1/auth/reset-password
- GET /api/v1/articles?search=&category=&sort=newest|oldest|title&page=&limit= ; GET /api/v1/articles/:slugOrId ; GET /api/v1/articles/categories ; POST /api/v1/articles/:id/bookmark ; GET /api/v1/articles/bookmarks ; POST /api/v1/articles/:id/viewed (records activity)
- GET /api/v1/documents?search=&category=&type= ; GET /api/v1/documents/:id ; GET /api/v1/documents/:id/file (auth + streamed, NOT public URL, with Range support) ; POST /api/v1/documents (admin, multipart) ; DELETE /api/v1/documents/:id (admin) ; POST /api/v1/documents/:id/reprocess (admin)
- POST /api/v1/assistant/chat (SSE streaming, body {conversationId?, question}) returns {answer, citations:[{documentId, documentName, page, section, excerpt, relevance}], conversationId} ; GET /api/v1/assistant/conversations ; GET /api/v1/assistant/conversations/:id ; DELETE /api/v1/assistant/conversations/:id ; POST /api/v1/assistant/feedback
- GET /api/v1/dashboard (counts from DB only: totalArticles, totalDocuments, categories with counts, recentlyViewed, popular, recentActivity)
- GET /api/v1/admin/users, GET /api/v1/admin/documents/status, GET /api/v1/admin/activity (admin only)
- GET /api/v1/health, GET /api-docs (Swagger)

## Prisma models (backend/prisma/schema.prisma)
User(id, name, email unique, passwordHash, role doctor|admin default doctor, isActive, createdAt, updatedAt)
Category(id, name unique, slug unique, description)
Article(id, title, slug unique, summary, category String, content LongText, status draft|published|archived, pdfFileName?, pdfPages Int?, thumbnailUrl?, publishedAt, createdAt, updatedAt) + indexes on slug, category, status
Document(id, title, fileName, mimeType, size, category, status pending|processing|ready|failed, pageCount, version Int, uploadedById, createdAt, updatedAt)
DocumentChunk(id, documentId FK, page Int, section String?, content Text, chunkIndex Int, embeddingJson Text? (nullable, for local fallback), createdAt)
Conversation(id, userId FK, title, createdAt, updatedAt)
Message(id, conversationId FK, role user|assistant, content Text, citationsJson Text?, createdAt)
Bookmark(id, userId FK, articleId FK, createdAt, unique user+article)
ActivityLog(id, userId FK nullable, action, entityType, entityId, createdAt)
AuditLog(id, userId FK nullable, action, details, ip?, createdAt)
PasswordResetToken(id, userId FK, tokenHash, expiresAt, usedAt?)

## Seed data — source of truth
- Parse ~/workspace/user/product/extracted/Artilce-main/frontend/src/data/sampleArticles.js — 9 articles, 4 categories (Real-World Evidence (RWE), Phase III Clinical Trials & Efficacy, Titration & Dosing Guidelines, Monotherapy & Concomitant ASM Deprescribing). Preserve titles, summaries, authors, published_at, pdf names, slide_images, sections content. Do NOT invent dosages/trial results beyond that file + PDFs.
- PDFs (9) already copied to frontend/public/documents/ and backend/uploads/. Map: EARLY INITIATION BETTER -> launch-deck-early-initiation-better, EFF IN TITRATION PHASE -> launch-deck-eff-in-titration-phase, EVENTUALLY MONOTHERAPY -> launch-deck-eventually-monotherapy, PHASE III LTE -> phase-iii-lte safety, PHASE III LTE POST-HOC -> launch-deck-phase-iii-lte-post-hoc, RWE GERMAN COMPARATIVE -> launch-deck-rwe-german-comparative, RWE COMPARATIVE vs OTHER ASMs -> launch-deck-rwe-comparative-vs-other-asms, ULTRA-REFRACTORY FOS -> launch-deck-ultra-refractory-fos, REDUCE 1 ASM SPANISH CONSENSUS -> spanish-consensus-reduce-1-asm.
- Demo users: doctor@example.com / Doctor123! (Dr. Sarah Mitchell, MD, doctor), admin@cipla.example / Admin123! (admin, for admin module testing only — document in README).

## Design tokens (frontend)
Primary #075C67, Secondary #148A91, Background #F6F8F8, Surface #FFFFFF, Heading #172B35, Body #52636B, Border #E4EAEC, Success #15803D, Warning #B45309, Error #DC2626. Font Inter. No gradients, no glassmorphism, no emojis as icons, Lucide only, use existing Cipla logo at /cipla-logo.svg. Collapsible sidebar, top nav, breadcrumbs.

## RAG rules
- Ingestion: pdf-parse, preserve page numbers, chunk ~800 tokens / ~3000 chars with 200 overlap, semantic-ish by section heading, store in DocumentChunk. Embeddings: OpenAI text-embedding-3-small if OPENAI_API_KEY, else Gemini if GEMINI_API_KEY, else local TF-IDF vectors stored in backend/data/vector-index.json + in-memory cosine. Never hardcode keys.
- Retrieval: hybrid keyword+vector, top 6, relevance threshold; if below threshold or no chunks, answer EXACTLY: "I couldn't find sufficient information in the available Cipla medical resources to answer this question reliably." + medical disclaimer. Citations must be real page/section/excerpt from retrieved chunks only.
- Chat: POST /api/v1/assistant/chat streams SSE, persists Conversation+Message, per-user isolation.

## File ownership (avoid conflicts)
- Frontend agent: ONLY frontend/ + root README frontend section. Do NOT edit backend/.
- Backend agent: ONLY backend/ (except backend/uploads PDFs already there) + shared contract compliance. Do NOT edit frontend/.
- RAG agent: ONLY backend/src/rag/, backend/src/services/ingestion*, backend/src/routes/assistant.ts (or create it if backend agent hasn't), backend/data/, backend/scripts/ingest.ts. Coordinate via contract; do NOT rewrite backend auth/articles.
- Docs agent: ONLY docs/ + root README.md. Do NOT edit code.
- Coordinator (parent) integrates + builds + tests.

## Build commands (must pass)
- frontend: npm install && npm run build (Next 14/15, TS strict)
- backend: npm install && npm run build (tsc) && npx prisma generate
- No secrets in code. .env.example only with placeholders.
