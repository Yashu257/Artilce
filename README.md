# Cipla MedKnowledge Clinical Intelligence Platform — v2

A medical knowledge platform for physicians, neurologists, and other
healthcare professionals, built around 9 verified clinical publications
and launch decks on cenobamate and epilepsy. It offers a searchable
article library, a PDF document viewer, and an evidence-grounded AI
assistant that answers only from those documents, with citations.

> **Status:** v2 is built and integration-verified in the sandbox on
> 2026-11-06 — see [docs/TESTING.md](docs/TESTING.md) for the actual
> results. Frontend and backend builds pass (11 Next.js pages; `tsc`
> clean), the RAG QA re-run is 11/11 with 60/60 citations verified, and
> the live SSE chat streams grounded, cited answers. What is **not**
> verified is anything needing a live MySQL database: there is no MySQL
> or Docker in the sandbox, so login, seeded content, dashboard counts,
> and authenticated-page screenshots are all still unproven. The
> authoritative contract is `shared/API_CONTRACT.md`.

## What it does

- **Articles** — browse, search, filter, and sort 9 verified clinical
  publications; read full structured content; bookmark articles.
- **Documents** — view the 9 launch-deck PDFs in an authenticated,
  streaming PDF viewer (no public URLs).
- **AI Assistant** — ask clinical questions; get answers grounded in
  the documents with real citations (document, page, section, excerpt).
  If the documents do not contain enough information, it says so
  instead of guessing.
- **Dashboard** — article/document counts, categories, recently viewed,
  popular articles, recent activity — all computed from the database.
- **Admin** — user list, document ingestion status, activity/audit feed,
  document upload, reprocessing, and deletion.

## What was rebuilt vs the original (v1)

The original project (`~/workspace/user/product/extracted/Artilce-main/`,
read-only reference) was React 19 + Vite, a PHP 8.3 backend, and MySQL,
with demo login (`doctor@example.com` / `Doctor123!`), 9 launch decks,
and an AI assistant UI whose backend returned HTTP 503.

| Area | v1 (original) | v2 (this repo) |
|---|---|---|
| Frontend | React 19 + Vite (port 5173/5175) | Next.js 14/15 + TypeScript strict (port 3000) |
| Backend | PHP 8.3, PDO, session cookies | Express + TypeScript + Prisma (port 4000) |
| Database | MySQL via raw `schema.sql` / `seed.sql` | MySQL 8 via Prisma migrations, `medical_knowledge_db` |
| Auth | PHP sessions; any `@gmail.com` address could sign in | httpOnly cookie `mkp_session` (JWT, 8 h); seeded accounts only; Gmail auto-auth removed |
| AI assistant | UI only; `/chatbot/ask.php` returned 503 | Working RAG: pdf-parse ingestion, hybrid keyword+vector retrieval, SSE streaming, citations, per-user conversations |
| RAG fallback | — | OpenAI embeddings → Gemini → local TF-IDF (`backend/data/vector-index.json`) |
| API docs | — | Swagger UI at `/api-docs` |
| Deployment | Render Blueprint (PHP Docker + Vite static) | Render Blueprint (Node Docker + Next.js) — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |

Content is unchanged in scope: the same 9 publications, 4 categories
(Real-World Evidence (RWE); Phase III Clinical Trials & Efficacy;
Titration & Dosing Guidelines; Monotherapy & Concomitant ASM
Deprescribing), and the same demo doctor account. No dosages or trial
results beyond the source articles and PDFs have been added.

## Quickstart

Prerequisites: Node.js 20+, MySQL 8. Optional: an OpenAI or Gemini API
key (without one, the assistant uses the local TF-IDF fallback).

```bash
# 1. Create the database (see docs/SETUP.md for the SQL)
# 2. Backend
cd backend && cp .env.example .env   # fill in DATABASE_URL + JWT_SECRET
npm install
npx prisma migrate dev && npm run seed && npm run ingest
npm run dev                          # → http://localhost:4000

# 3. Frontend (new terminal)
cd frontend && npm install
cp .env.example .env.local           # NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
npm run dev                          # → http://localhost:3000
```

Full step-by-step setup, including troubleshooting, is in
[docs/SETUP.md](docs/SETUP.md).

## Demo credentials

| Email | Password | Role |
|---|---|---|
| `doctor@example.com` | `Doctor123!` | Doctor — Dr. Sarah Mitchell, MD |
| `admin@cipla.example` | `Admin123!` | Admin — admin-module testing only |

Passwords are stored as bcrypt hashes only. These accounts are for
local/demo use; rotate or disable them before any non-demo deployment.

## Architecture (summary)

```
Browser (Next.js :3000)
  │  fetch, credentials: include, httpOnly cookie
  ▼
Express + TypeScript API (:4000) — /api/v1
  ├── Auth (cookie JWT, RBAC doctor/admin)
  ├── Articles / Documents / Dashboard / Admin (Prisma → MySQL 8)
  └── Assistant (SSE) → RAG service → vector store
        ├── OpenAI text-embedding-3-small (if OPENAI_API_KEY)
        ├── Gemini embeddings (else if GEMINI_API_KEY)
        └── Local TF-IDF index, backend/data/vector-index.json (fallback)
PDFs live in backend/uploads/ and are streamed only through the
authenticated file endpoint — never at a public URL.
```

Full detail, including the system diagram, data flows, and the rationale
for Express + TypeScript over NestJS: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

| Document | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, components, data flows, auth/RBAC, security boundaries, framework choice, vector-store separation |
| [docs/SETUP.md](docs/SETUP.md) | Prerequisites, local setup (backend + frontend), database, seed, ingest, troubleshooting |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Render Blueprint, Docker, environment variables, CORS/cookies in prod, MySQL hosting |
| [docs/MIGRATION.md](docs/MIGRATION.md) | The initial Prisma migration: 11 tables, 15 indexes, 9 FKs, schema↔migration verification, live migrate/seed commands |
| [docs/INDEXING.md](docs/INDEXING.md) | RAG ingestion: 9/9 PDFs, 97 pages, 184 chunks/vectors |
| [docs/AI_TEST_RESULTS.md](docs/AI_TEST_RESULTS.md) | RAG QA: 11/11 questions, 60/60 citations verified |
| [docs/TESTING.md](docs/TESTING.md) | Test plan and results (verified 2026-11-06; DB-dependent tests marked not runnable in sandbox) |
| [docs/API.md](docs/API.md) | All `/api/v1` endpoints with request/response examples, auth, errors, rate limits, Swagger |
| [docs/SECURITY.md](docs/SECURITY.md) | bcrypt, httpOnly cookies, RBAC, rate limiting/lockout, validation, injection protection, file validation, headers/CORS, audit logs, secrets, prompt-injection protection, medical safety |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Doctor workflow (login, dashboard, articles, documents/PDF viewer, AI assistant, bookmarks) and admin workflow |

The binding contract for all agents is
[`shared/API_CONTRACT.md`](shared/API_CONTRACT.md) — docs, frontend,
and backend must not diverge from it.

## Project tree (verified 2026-11-06)

```
cipla-medknowledge-v2/
├── .env.example            # pointer only — backend/.env + frontend/.env.local
├── render.yaml             # Render Blueprint: backend Docker web service +
│                           #   frontend Node web service (not a static site)
├── README.md
├── shared/
│   └── API_CONTRACT.md     # binding contract for all agents
├── docs/
│   ├── ARCHITECTURE.md  API.md  SETUP.md  DEPLOYMENT.md  MIGRATION.md
│   ├── SECURITY.md  USER_GUIDE.md  TESTING.md  INDEXING.md
│   ├── AI_TEST_RESULTS.md
│   └── screenshots/        # login.png (real) + README.md (capture steps)
├── frontend/               # Next.js 14 + TS (11 pages, `npm run build` ✓)
│   ├── app/                # login, dashboard, articles/[slug], documents/[id],
│   │                       #   ai-assistant, admin, bookmarks, page.tsx
│   ├── components/         # AppShell, Sidebar, TopNav, ArticleCard,
│   │                       #   DocumentCard, PdfViewer, ChatMessage,
│   │                       #   CitationPanel, SourcePreviewPanel, …
│   ├── lib/                # api.ts, auth.ts, types.ts
│   ├── middleware.ts       # redirects unauthenticated /dashboard etc. to /login
│   ├── .env.example        # NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
│   └── public/
│       ├── cipla-logo.svg / cipla-logo.png
│       ├── documents/      # the 9 real launch-deck PDFs
│       ├── slides/         # 36 slide PNGs (4 per deck)
│       └── thumbnails/     # 9 deck thumbnails
└── backend/                # Express + TS + Prisma (tsc ✓, :4000)
    ├── src/
    │   ├── index.ts        # /health, /api/v1/health, /api-docs, routers
    │   ├── config/         # env.ts, swagger.ts
    │   ├── lib/            # prisma.ts, logger.ts, audit.ts
    │   ├── middleware/     # auth.ts (mkp_session JWT), errorHandler.ts, rateLimit.ts
    │   ├── modules/        # auth, articles, documents, dashboard, admin routes
    │   ├── routes/         # assistant.ts (SSE chat)
    │   ├── rag/            # assistant, retrieval, embeddings, chunking,
    │   │                   #   extract, vectorStore, prompts, types, qdrant
    │   ├── services/       # ingestion.ts
    │   └── utils/          # response.ts, validation.ts
    ├── scripts/            # ingest.ts, test-assistant.ts, indexing-report.ts
    ├── prisma/
    │   ├── schema.prisma   # 11 models, MySQL
    │   ├── seed.ts / seed-data.json
    │   └── migrations/20261106000000_init/migration.sql
    ├── data/               # documents.json, indexing-report.json,
    │                       #   vector-index.json (184 TF-IDF vectors)
    ├── uploads/            # the 9 real launch-deck PDFs
    ├── Dockerfile          # multi-stage Node 22; runs prisma migrate deploy
    └── .env.example
```

Generated files excluded above: `backend/dist/` (compiled output),
`frontend/.next/`, and `node_modules/` in both workspaces.

## API at a glance

Base: `http://localhost:4000/api/v1` · Swagger: `http://localhost:4000/api-docs`

- Auth: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`,
  `POST /auth/forgot-password`, `POST /auth/reset-password`
- Articles: `GET /articles`, `GET /articles/:slugOrId`,
  `GET /articles/categories`, `POST /articles/:id/bookmark`,
  `GET /articles/bookmarks`, `POST /articles/:id/viewed`
- Documents: `GET /documents`, `GET /documents/:id`,
  `GET /documents/:id/file` (auth + streamed + Range),
  `POST /documents`, `DELETE /documents/:id`,
  `POST /documents/:id/reprocess` (admin)
- Assistant: `POST /assistant/chat` (SSE), `GET /assistant/conversations`,
  `GET /assistant/conversations/:id`, `DELETE /assistant/conversations/:id`,
  `POST /assistant/feedback`
- Dashboard: `GET /dashboard` · Admin: `GET /admin/users`,
  `GET /admin/documents/status`, `GET /admin/activity` ·
  Health: `GET /health`

See [docs/API.md](docs/API.md) for full request/response examples.

## Honest limitations

- **Requires MySQL 8** and a running backend; there is no offline or
  SQLite mode.
- **An LLM key is optional but changes behaviour**: with an OpenAI or
  Gemini key, the assistant uses embeddings + LLM generation; without
  one, retrieval and answers fall back to local TF-IDF vectors with
  extractive answers. The fallback is cited and grounded, but it is
  not a fluent LLM summary.
- **RAG fallback is extractive TF-IDF** — relevance ranking is
  keyword-based, so phrasing-sensitive questions may retrieve less
  well than with embeddings.
- **OCR is not implemented for scanned PDFs.** Image-only scanned
  PDFs ingest with little or no text and will not be searchable; use
  text-based PDFs.
- **Corpus is fixed at 9 documents.** The assistant knows only the
  seeded launch decks/publications; it cannot answer general medical
  questions, and it refuses rather than improvising.
- **The assistant is a clinical information retrieval aid, not a
  diagnostic or prescribing tool.** Answers carry a medical disclaimer
  and must be checked against the full source publication.
- **Demo credentials are baked into the seed** for local evaluation;
  they must be rotated or disabled before any non-demo deployment.
- **Uploads on Render's free tier are ephemeral** (see
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)); durable file storage
  needs a disk or object storage.
- **Unverified areas** (need a live MySQL + a Render deploy): the
  `prisma migrate deploy` + seed run, login with the seeded demo
  accounts, seeded article/document/dashboard content, authenticated
  page screenshots (only `docs/screenshots/login.png` exists so far),
  the password-reset email provider, and an actual Render Blueprint
  apply. LLM generation is untested (no key in the sandbox); the
  assistant runs in local TF-IDF retrieval mode without one.
