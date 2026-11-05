# Setup — Cipla MedKnowledge Platform v2

Local development setup for the v2 stack (Next.js frontend, Express +
TypeScript + Prisma backend, MySQL 8).

> If you only want to run the original v1 project, see the original README
> at `~/workspace/user/product/extracted/Artilce-main/README.md`
> (React + Vite on port 5173/5175, PHP backend). This guide is for v2 only.

## 1. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20+ (LTS) | Check with `node --version` |
| npm | bundled with Node 20 | |
| MySQL | 8.0+ | Or MariaDB 10.4+ — **TODO: verify MariaDB compatibility with the Prisma schema** |
| Git | any recent | |

Optional:

- An **OpenAI API key** (`OPENAI_API_KEY`) — for embeddings
  (`text-embedding-3-small`) and chat generation.
- A **Gemini API key** (`GEMINI_API_KEY`) — used only if no OpenAI key
  is set.
- With neither key, the RAG assistant falls back to local TF-IDF
  retrieval with extractive answers (no LLM call). See `docs/ARCHITECTURE.md §3.4`.

No other accounts or services are required to run locally.

## 2. Clone and install

```bash
git clone <repo-url> cipla-medknowledge-v2
cd cipla-medknowledge-v2
```

Install both workspaces (run in two terminals, or sequentially):

```bash
cd backend && npm install
cd ../frontend && npm install
```

> Verified 2026-11-06: both `package.json` files exist; `npm install`
> and both production builds pass (see `docs/TESTING.md` §3.1).

## 3. Database setup

Create the database and a dedicated user (do not use `root` with an
empty password outside a throwaway local install):

```sql
CREATE DATABASE medical_knowledge_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mkp'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON medical_knowledge_db.* TO 'mkp'@'localhost';
FLUSH PRIVILEGES;
```

## 4. Backend setup

### 4.1 Environment — `backend/.env`

```bash
cd backend
cp .env.example .env
```

Edit `.env` (placeholders only in `.env.example`; never commit real
values):

```env
# Required
DATABASE_URL="mysql://mkp:choose-a-strong-password@localhost:3306/medical_knowledge_db"
JWT_SECRET="generate-a-long-random-string"   # e.g. openssl rand -base64 48
PORT=4000
FRONTEND_ORIGIN="http://localhost:3000"
NODE_ENV=development

# Optional — RAG (at most one is needed; OpenAI takes priority)
OPENAI_API_KEY=""
GEMINI_API_KEY=""

# Optional — uploads
UPLOAD_DIR="./uploads"
MAX_UPLOAD_MB=50
```

Generate a JWT secret:

```bash
openssl rand -base64 48
```

### 4.2 Migrate and seed

```bash
cd backend
npx prisma migrate dev        # applies migrations, creates the schema
npx prisma generate           # generates the Prisma client
npm run seed                  # seeds 9 articles, 4 categories, demo users
```

Verified 2026-11-06: the seed script is `npm run seed`
(`backend/package.json` → `ts-node prisma/seed.ts`). The seed is the source of truth for content:
`frontend/src/data/sampleArticles.js` in the original repo — 9 articles,
4 categories (Real-World Evidence (RWE); Phase III Clinical Trials &
Efficacy; Titration & Dosing Guidelines; Monotherapy & Concomitant ASM
Deprescribing). Titles, summaries, authors, publication dates, PDF
names, slide images, and section content are preserved verbatim; no
dosages or trial results are invented.

Seeded demo users:

| Email | Password | Role | Name |
|---|---|---|---|
| `doctor@example.com` | `Doctor123!` | doctor | Dr. Sarah Mitchell, MD |
| `admin@cipla.example` | `Admin123!` | admin | (admin — for admin-module testing only) |

Passwords are stored as bcrypt hashes only; the seed hashes them with
`bcryptjs` `hashSync` at seed time.

### 4.3 Ingest the PDFs

The 9 launch-deck PDFs already live in `backend/uploads/`. Ingestion
parses them into searchable chunks:

```bash
cd backend
npm run ingest
```

Verified 2026-11-06: the ingest script is `npm run ingest`
(`backend/scripts/ingest.ts`). Expected behaviour:
`pdf-parse` extracts text with page numbers, chunks at ~800 tokens /
~3000 chars with ~200 overlap, stores rows in `DocumentChunk`, and —
if an LLM key is set — writes embeddings; otherwise it builds the local
TF-IDF index at `backend/data/vector-index.json`. Re-run ingestion after
uploading a new document, or use the admin
`POST /api/v1/documents/:id/reprocess` endpoint.

Verify ingestion worked:

```bash
npx prisma studio
# or: mysql -u mkp -p medical_knowledge_db -e "SELECT COUNT(*) FROM DocumentChunk;"
```

### 4.4 Start the backend

```bash
cd backend
npm run dev
```

Expected: server listening on `http://localhost:4000`.
Sanity check:

```bash
curl http://localhost:4000/api/v1/health
# → {"success":true,"data":{"status":"ok", ...}}
```

## 5. Frontend setup

### 5.1 Environment — `frontend/.env.local`

```bash
cd frontend
cp .env.example .env.local   # verified 2026-11-06: frontend/.env.example exists
```

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
```

> The frontend calls the backend directly from the browser with
> `credentials: include`. There is no Next.js API-route proxy in the
> contract. Verified 2026-11-06: `frontend/lib/api.ts` calls the backend
> directly with `credentials: include`; there is no rewrite/proxy.

### 5.2 Start the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the
demo doctor credentials above. A "Fill Demo Doctor" quick-fill button
is provided on the login card (carried over from v1).

Production build check:

```bash
cd frontend
npm run build
```

## 6. Quickstart (all services)

```bash
# Terminal 1 — MySQL must already be running
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Then open http://localhost:3000.

## 7. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `Can't reach database server` / Prisma `P1001` | MySQL not running; wrong `DATABASE_URL`; check `mysql -u mkp -p -e "SELECT 1;"`. On macOS: `brew services start mysql`. |
| `Access denied for user 'mkp'` | Password or grants wrong — re-run the `GRANT` in §3. |
| `Environment variable not found: DATABASE_URL` | `.env` missing or in the wrong directory — it belongs in `backend/`, not the repo root. |
| `JWT_SECRET` errors / login loops | `JWT_SECRET` missing or changed between restarts (old cookies become invalid — clear cookies and log in again). |
| Login returns 401 with correct demo password | Seed did not run, or ran against a different database. Re-run `npm run seed` and check the `User` table. |
| CORS error in the browser console | `FRONTEND_ORIGIN` must be exactly `http://localhost:3000` (no trailing slash). Backend must be on port 4000. |
| Cookie not set after login | The frontend must fetch with `credentials: include`; the cookie is httpOnly so it will not appear in `document.cookie` — check the Network tab / Application → Cookies. |
| Assistant answers with the "couldn't find sufficient information" message for everything | Ingestion has not run, or no chunks clear the relevance threshold. Re-run `npm run ingest` and check `DocumentChunk` row count. |
| Assistant answers are extractive / no fluent summary | No `OPENAI_API_KEY` or `GEMINI_API_KEY` is set — this is the intended TF-IDF fallback, not a bug. Add a key and re-ingest. |
| `npm run build` fails in frontend | TypeScript strict mode — fix the reported type errors; do not weaken `tsconfig.json` to get a green build. |
| `npx prisma migrate dev` fails on an existing DB | The DB may have a v1 schema. Use a fresh database named `medical_knowledge_db` for v2; do not migrate the v1 `schema.sql` database in place. |
| PDF viewer shows nothing | `GET /api/v1/documents/:id/file` requires auth — confirm you are logged in and the document status is `ready` (see `GET /api/v1/admin/documents/status`). |

## 8. Resetting local data

```bash
cd backend
npx prisma migrate reset   # drops the DB, re-applies migrations, re-seeds
npm run ingest             # rebuild chunks + vector index
```

This deletes all local users, bookmarks, conversations, and activity.
