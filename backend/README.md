# Cipla MedKnowledge — Backend (v2)

Express + TypeScript + Prisma (MySQL) API for the Cipla MedKnowledge
Clinical Intelligence Platform. Implements `shared/API_CONTRACT.md`
exactly: httpOnly-cookie JWT auth, articles, documents (authenticated
PDF streaming), dashboard, admin, and the assistant route (RAG plug-in).

## Quick start

```bash
cp .env.example .env        # fill in DATABASE_URL + JWT_SECRET
npm install
npx prisma generate
npx prisma migrate deploy   # or: npm run prisma:migrate (dev)
npm run seed                # 2 demo users, 4 categories, 9 articles, 9 documents
npm run dev                 # http://localhost:4000, docs at /api-docs
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | ts-node-dev on `src/index.ts` |
| `npm run build` | `tsc` -> `dist/` |
| `npm start` | `node dist/index.js` |
| `npm run seed` | `ts-node prisma/seed.ts` |
| `npm run ingest` | RAG ingestion CLI (`scripts/ingest.ts`, owned by the RAG agent) |
| `npm run indexing-report` | JSON indexing report per PDF (pages, chunks, status, file presence; works even without a live DB, falling back to `data/documents.json` + an `uploads/` scan). Same data is available authenticated as `GET /api/v1/admin/documents/report`. |
| `npm run prisma:migrate` | `prisma migrate dev` |
| `npm run prisma:deploy` | `prisma migrate deploy` |

## Environment (`.env`, see `.env.example` — placeholders only, no real keys)

- `DATABASE_URL` — MySQL, database `medical_knowledge_db`
- `JWT_SECRET` — **required in production**; login refuses to issue tokens without it
- `FRONTEND_ORIGIN` — default `http://localhost:3000` (CORS, credentials)
- `PORT` — default `4000`
- `OPENAI_API_KEY` / `GEMINI_API_KEY` — optional; RAG falls back to local TF-IDF

### Env-file guidance (who owns what)

- **Backend**: `backend/.env.example` (this file) is the only env example
  this backend owns. Copy it to `backend/.env`.
- **Frontend** (owned by the frontend agent): `frontend/.env.local`
  (example: `frontend/.env.local.example`) needs only
  `NEXT_PUBLIC_API_URL=http://localhost:4000` — the browser never holds
  secrets; auth is the httpOnly `mkp_session` cookie set by this backend.
- **Root**: if a root `.env.example` is wanted for the whole repo, it
  should only point at the two files above (e.g. `DATABASE_URL`,
  `JWT_SECRET` for the backend and `NEXT_PUBLIC_API_URL` for the
  frontend) and must not duplicate real values.

## Migrations

`prisma/migrations/20261106000000_init/migration.sql` is a real,
runnable migration matching `prisma/schema.prisma` (verified offline by
comparing it against `prisma migrate diff --from-empty
--to-schema-datamodel` output: all 11 tables, columns, indexes and
foreign keys match exactly; a from-migrations diff needs a live shadow
DB, so run that check as part of the first live migrate).

```bash
npx prisma migrate deploy   # production / Render (also run by the Dockerfile)
npx prisma migrate dev      # development — needs a live MySQL DATABASE_URL
npm run seed                # afterwards, to load demo users + articles
```

`docs/MIGRATION.md` (coordinator) should capture the real `migrate dev`
output from a run against MySQL. Note: in this sandbox there is no local
MySQL server, so the live migrate could not be executed here — see
"Known limitations" below.

## Auth

- `POST /api/v1/auth/login` — sets httpOnly cookie `mkp_session` (JWT, 8h, Secure in prod, SameSite=Lax). No localStorage token, no Gmail-domain auto-auth, no public registration.
- Lockout: **5 failed logins -> 15-minute account lockout** (in-memory Map; resets on server restart — acceptable for the single-instance v2 deploy; the per-IP rate limiter is an additional layer).
- `POST /forgot-password` returns the same message whether or not the email exists. Reset tokens are random, stored only as SHA-256 hashes, expire after 1h, single-use. **No email provider is wired up in v2**: in non-production the token is written to the server log so the flow can be tested; in production it must be emailed.
- Demo accounts (seeded, bcrypt hashes only — change in production):
  - `doctor@example.com` / `Doctor123!` — Dr. Sarah Mitchell, MD (doctor)
  - `admin@cipla.example` / `Admin123!` — admin (admin-module testing only)

## Endpoints

All under `/api/v1`, standard envelope `{ success, data, error, meta }`.
Swagger UI at `/api-docs`. Health at `/health` and `/api/v1/health`
(always 200; the `db` field reports `up`/`down` so a smoke check passes
even when MySQL is unreachable).

- Auth: login, logout, me, forgot-password, reset-password
- Articles: list (`?search=&category=&sort=newest|oldest|title&page=&limit=`), get by slug/id, categories, bookmarks, bookmark toggle, viewed
- Documents: list, get, `/file` (auth + streamed, Range support, never a public URL), upload (admin, PDF-only, 25 MB), delete (admin), reprocess (admin — re-queues as `pending`, clears chunks; ingestion itself is the RAG pipeline)
- Assistant: `POST /assistant/chat` (SSE), conversations list/get/delete, feedback. Chat delegates to `src/rag/assistant.ts`; while the RAG module reports unavailable it returns an honest **503** — never a fake answer.
- Dashboard: counts from the DB only (totalArticles, totalDocuments, categories, recentlyViewed, popular, recentActivity)
- Admin (admin role only): users (no password hashes), documents/status, documents/report (indexing report), activity

## Server-side authorization (not UI-only)

Authorization is enforced in the route handlers / middleware, never just
in the frontend:

- **Conversations are per-user.** `GET` / `DELETE /assistant/conversations/:id`
  fetch the conversation first: if it exists but belongs to another user
  the server returns **403** and writes an `assistant.conversation.access_denied`
  / `delete_denied` row to `AuditLog`.
- **Document files.** `GET /documents/:id/file` requires authentication.
  Documents uploaded by an admin are shared clinical resources (any
  authenticated doctor may stream them); a document uploaded by a
  non-admin user is private to that user (and admins). A denied access
  returns **403** and is written to `AuditLog` as `document.file.access_denied`.
- **Admin routes** (`/admin/*`, document upload/delete/reprocess) require
  the `admin` role; a role failure returns 403 and is audit-logged as
  `authz.forbidden`.

## Seed data

`prisma/seed-data.json` is generated verbatim from the original
`frontend/src/data/sampleArticles.js` — 9 articles, 4 categories, with
titles, summaries, authors, published dates, PDF names/pages, slide
images and full section content preserved. No dosages or trial results
were invented. Document rows point at the 9 PDFs in `backend/uploads/`
and are seeded with status `pending`; the RAG ingestion run flips them
to `ready` once chunks exist.

## Render deploy (snippet)

```yaml
services:
  - type: web
    name: cipla-medknowledge-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    plan: starter
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: FRONTEND_ORIGIN
        value: https://your-frontend.onrender.com
      - key: NODE_ENV
        value: production
```

The Dockerfile runs `prisma migrate deploy` on start, so the first
deploy creates the schema; run `npm run seed` once afterwards (or as a
one-off job) to load demo users + articles.

## Layout

```
src/
  index.ts            Express app (helmet, CORS+credentials, rate limits, /health, /api-docs)
  config/             env.ts, swagger.ts (hand-written OpenAPI spec)
  lib/                prisma.ts (singleton + dbIsUp), logger.ts (winston), audit.ts
  middleware/         auth.ts (JWT cookie guard, requireRole), rateLimit.ts, errorHandler.ts
  modules/
    auth/             login/logout/me/forgot/reset + lockout
    articles/         list/get/categories/bookmark/viewed
    documents/        list/get/file-stream/upload/delete/reprocess
    dashboard/        DB-derived counts
    admin/            users / documents/status / documents/report / activity
  routes/assistant.ts chat (SSE) + conversations + feedback; delegates to src/rag/
  rag/                owned by the RAG agent (assistant, retrieval, chunking, embeddings…)
  services/           owned by the RAG agent (ingestion)
  utils/              response.ts (standard envelope + ApiError), validation.ts (zod DTOs)
prisma/               schema.prisma, migrations/, seed.ts, seed-data.json
scripts/ingest.ts     RAG ingestion CLI (owned by the RAG agent)
scripts/indexing-report.ts  JSON indexing report per PDF (works without a live DB)
uploads/              9 source PDFs (seed data — do not delete)
```

## Known limitations (as verified in this sandbox)

- **No live MySQL here.** `npm install`, `npx prisma generate` and
  `npm run build` pass, and the server starts with `/health` reporting
  `db: down` until `DATABASE_URL` points at a real MySQL. `prisma
  migrate dev` / `prisma migrate deploy` and `npm run seed` therefore
  could not be executed in this sandbox — they need a live MySQL
  (`medical_knowledge_db`). The migration was verified offline instead
  (comparison against Prisma-generated DDL from the schema; see
  Migrations above).
- **Prisma engine downloads are flaky through this sandbox's egress
  proxy** (Node fetch to `binaries.prisma.sh` resets; curl works). The
  engines were fetched with curl into the Prisma cache and
  `prisma generate` was run with `PRISMA_QUERY_ENGINE_LIBRARY` /
  `PRISMA_QUERY_ENGINE_BINARY` / `PRISMA_SCHEMA_ENGINE_BINARY` pointing
  at them. On a normal network / in Docker / on Render this workaround
  is unnecessary — `npm install` downloads the engines itself.
- **Login lockout is in-memory** (resets on server restart). Fine for
  the single-instance v2 deploy; move it to the DB/Redis if the backend
  ever runs multi-instance.
- **No email provider is wired up**, so password-reset tokens are logged
  server-side in non-production only (see Auth above).
