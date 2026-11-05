# Testing — Cipla MedKnowledge Platform v2

> **Status: partially verified 2026-11-06** (integration/E2E run, see §3).
> Builds, unauthenticated/authenticated-no-DB HTTP behaviour, RAG QA,
> SSE chat, secrets/PDF checks and schema↔migration comparison were run
> live in this sandbox and are recorded below with evidence. Everything
> that needs a live MySQL database is honestly marked **Not runnable in
> sandbox** — it was not run, and is not claimed to pass. There is no
> MySQL/MariaDB server and no Docker in the sandbox
> (`which mysql mysqld docker` → none found).

## 1. How to run the checks

```bash
# Backend — script names verified against backend/package.json
cd backend
npm install --ignore-scripts   # --ignore-scripts: Prisma postinstall
                               # engine download fails in the sandbox (see §3)
npx prisma generate            # FAILS in sandbox (ECONNRESET, §3); works
                               # where Prisma engine downloads are reachable
npm run build                  # tsc — must pass with no errors
# npm test — no test script exists in backend/package.json (2026-11-06)

# Frontend
cd frontend
npm install
npm run build                  # Next.js production build, TS strict

# Manual smoke test (see §3)
# 1. Start MySQL, backend (:4000), frontend (:3000)
# 2. Log in as doctor@example.com / Doctor123!
# 3. Work through the checklist in docs/USER_GUIDE.md
```

## 2. Test plan

### 2.1 Build and static checks

| Test | Expected |
|---|---|
| `backend: npm run build` (tsc) | Exits 0, no type errors |
| `backend: npx prisma generate` | Client generates without errors |
| `frontend: npm run build` (Next.js, TS strict) | Exits 0 |
| No secrets in code | `grep -r` for keys/passwords in `backend/src`, `frontend/src` returns nothing except placeholders in `.env.example` |
| Prisma schema matches contract | Models/fields in `backend/prisma/schema.prisma` match `shared/API_CONTRACT.md` |

### 2.2 Auth

| Test | Expected |
|---|---|
| Login with `doctor@example.com` / `Doctor123!` | 200, `mkp_session` httpOnly cookie set, user object returned |
| Login with wrong password | 401, generic message, no cookie |
| Login with unknown email | 401, same generic message as wrong password |
| Login with any `@gmail.com` address (v1 behaviour) | 401 — Gmail auto-auth removed in v2 |
| `GET /auth/me` with valid cookie | 200, current user, no `passwordHash` |
| `GET /auth/me` without cookie | 401 |
| `POST /auth/logout` | Cookie cleared |
| Protected route (e.g. `GET /articles`) without cookie | 401 |
| Admin route (`GET /admin/users`) as doctor | 403 |
| Admin route as admin (`admin@cipla.example`) | 200 |
| Expired/tampered cookie | 401 |
| Forgot-password with unknown email | Success response (no user enumeration) |
| Reset with expired/used token | 400 |

### 2.3 Articles and documents

| Test | Expected |
|---|---|
| `GET /articles` | 9 published articles, `meta.total = 9` |
| `GET /articles?search=cenobamate` | Only matching articles returned |
| `GET /articles?category=Real-World Evidence (RWE)` | Only that category |
| `GET /articles?sort=title` | Alphabetical order |
| `GET /articles/:slug` for each of the 9 slugs | 200, full content |
| `GET /articles/nonexistent` | 404 |
| `POST /articles/:id/bookmark` then `GET /articles/bookmarks` | Bookmark appears; second call is idempotent (TODO: confirm toggle semantics) |
| `POST /articles/:id/viewed` | `ActivityLog` row created; dashboard `recentlyViewed` updates |
| `GET /documents` | 9 documents, all `status: ready` after ingest |
| `GET /documents/:id/file` with auth | 200, `application/pdf`, streams bytes |
| `GET /documents/:id/file` without auth | 401 |
| `GET /documents/:id/file` with `Range: bytes=0-1023` | 206 Partial Content |
| `POST /documents` as doctor | 403 |
| `POST /documents` as admin with a PDF | 201/200, status `pending` → `ready` after ingestion |
| `POST /documents` as admin with a non-PDF | 400 |
| `POST /documents/:id/reprocess` as admin | Status returns to `ready` |

### 2.4 Dashboard

| Test | Expected |
|---|---|
| `GET /dashboard` | `totalArticles = 9`, `totalDocuments = 9`, 4 categories with counts, `recentlyViewed` / `popular` / `recentActivity` populated from DB only |

### 2.5 AI assistant (RAG)

| Test | Expected |
|---|---|
| Supported question (answerable from the 9 decks), e.g. early initiation of cenobamate | Grounded answer with ≥1 citation; every citation has a real documentId, page, section, excerpt matching a retrieved chunk |
| Unsupported question (e.g. a drug/condition not in the corpus) | Answer is exactly "I couldn't find sufficient information in the available Cipla medical resources to answer this question reliably." + medical disclaimer; citations empty; no hallucinated source |
| Chat without a key configured (TF-IDF fallback) | Extractive answer from retrieved chunks, still cited; no crash, no invented content |
| Conversation isolation | User B cannot `GET` user A's conversation id (404) |
| `GET /assistant/conversations` | Only the caller's conversations listed |
| `DELETE /assistant/conversations/:id` | Conversation and messages deleted |
| SSE streaming | Answer arrives as SSE events; final event carries citations + conversationId |

### 2.6 Security spot checks

| Test | Expected |
|---|---|
| SQL injection in `search` param (`' OR '1'='1`) | Treated as a literal string; no error, no extra rows |
| XSS payload in a chat question | Returned escaped; no script execution in the UI |
| Path traversal in document upload filename (`../../etc/passwd`) | Stored under a server-generated name inside `uploads/` |
| CORS from an unlisted origin | Browser blocks the response (no `Access-Control-Allow-Origin` for that origin) |
| Cookie flags in production | `HttpOnly`, `Secure`, `SameSite=Lax` |

## 3. Results — verification run 2026-11-06 (integration agent)

Environment: this sandbox. Node v24.22.1, npm 10.9.4. Backend started
as `PORT=4000 JWT_SECRET=<test-only-secret> node dist/index.js` with
**no `DATABASE_URL` set** (no MySQL exists here); frontend as
`npm run dev` on `:3000`. Statuses: **Pass** / **Fail** /
**Not runnable in sandbox** (needs MySQL) — nothing in the last group
is claimed to pass.

### 3.1 Builds and static checks

| Test | Actual (evidence) | Status |
|---|---|---|
| Backend `npm run build` (tsc) | Exit 0, no errors — run twice: once on arrival, once after the articles-auth fix (§3.4). `backend/src/rag/types.ts` re-export fix verified: build still passes. | **Pass** |
| Backend `npx prisma generate` | **Fails every time in this sandbox** (4 attempts): Prisma CLI crashes with `ECONNRESET` / `Error: aborted` while fetching engines through the egress proxy. The pre-generated client in `backend/node_modules/.prisma/client` (incl. `libquery_engine-debian-openssl-3.0.x.so.node`) is present, so `tsc` and the server work — but a fresh install without that cache cannot start until engine downloads work. Same failure for `prisma migrate diff`. | **Fail** (sandbox network; re-run where Prisma downloads work) |
| Frontend `npm run build` (Next.js) | Exit 0. `✓ Compiled successfully`, 11/11 static pages generated. Routes: `/`, `/admin`, `/ai-assistant`, `/articles`, `/articles/[slug]`, `/bookmarks`, `/dashboard`, `/documents`, `/documents/[id]`, `/login`, `/_not-found`. | **Pass** |
| No secrets in code | `grep` over `backend/src`, `frontend/*`, `shared`, `backend/prisma`: no API keys / tokens / private keys; no `.env` file anywhere in the repo; `.env.example` files contain placeholders only. Caveat (see §3.5): the *demo passwords* appear in plaintext in `backend/prisma/seed.ts` source, the login page demo-fill, and docs — hashed with bcrypt before storage, never stored or compared in plaintext. | **Pass** (with the documented demo-password caveat) |
| Prisma schema ↔ migration | Direct file comparison (see `docs/MIGRATION.md` §2): 11/11 models = 11 tables, all scalar fields match in order, 15 indexes (5 unique), 9 FKs. `prisma migrate diff` itself could not run (same ECONNRESET as `prisma generate`). | **Pass** (by file comparison; live diff still to run — see MIGRATION.md §3) |
| `npm run ingest:dry-run` | Exit 0. `DONE: 9 ready, 0 failed` — 97 pages, 184 chunks, nothing written (dry run). Page counts per PDF match the seed exactly (13/11/11/10/11/13/10/10/8). Indexing report unchanged: 9/9 docs, 97 pages, 184 chunks, 184 vectors. | **Pass** |

### 3.2 Backend HTTP smoke tests (no DB)

| Test | Actual (evidence) | Status |
|---|---|---|
| `GET /health` | 200 `{"success":true,"data":{"status":"ok","db":"down","version":"2.0.0"}}` | **Pass** |
| `GET /api/v1/health` | 200, same body | **Pass** |
| Swagger UI | `GET /api-docs` → 301 to `/api-docs/` → 200, Swagger UI HTML | **Pass** |
| Protected routes, no cookie | `GET /api/v1/articles`, `/articles/categories`, `/articles/<slug>`, `/articles/bookmarks`, `/assistant/conversations`, `/dashboard`, `/admin/users`, `/documents`, `/auth/me` → **all 401** `{"success":false,"error":{"code":"UNAUTHORIZED","message":"Authentication required."}}` | **Pass** |
| Unknown route | `GET /api/v1/nope` → 404 `{"success":false,"error":{"code":"NOT_FOUND","message":"Route not found."}}` | **Pass** |
| `POST /auth/logout` (no cookie) | 200 `{"success":true,"data":{"loggedOut":true}}` | **Pass** |
| `POST /auth/login` (no DB) | 503 `{"success":false,"error":{"code":"DATABASE_UNAVAILABLE","message":"The database is unavailable. Please try again later."}}` — clean envelope, **no stack trace in the response** (stack is logged server-side only, by design in `src/middleware/errorHandler.ts`) | **Pass** (degraded-mode behaviour) |
| Authenticated (JWT minted with the test secret) DB routes | `GET /api/v1/articles`, `/dashboard`, `/documents` → 503 `DATABASE_UNAVAILABLE`, clean envelope, no stack leak. Auth passes, then the DB call fails cleanly. | **Pass** (degraded-mode behaviour) |
| Admin route as doctor (JWT, role=doctor) | `GET /api/v1/admin/users` → 403 `{"code":"FORBIDDEN","message":"Admin access is required."}` — role check runs before any DB call | **Pass** |
| Login — valid demo doctor | Needs MySQL (seeded user lookup). `POST /auth/login` returns 503 without a DB. | **Not runnable in sandbox** |
| Login — wrong password / unknown email / `@gmail.com` | Needs MySQL. | **Not runnable in sandbox** |
| `GET /auth/me` with valid cookie | Needs MySQL (user lookup). Without a DB it is 503, not 200. | **Not runnable in sandbox** |
| Admin route as admin | Needs MySQL + seeded admin. | **Not runnable in sandbox** |
| Expired/tampered cookie | Not run — tampered-cookie 401 is code-level JWT verification (`readSession` returns null → `unauthorized()`); run against the live server with MySQL to confirm end-to-end. | **Not runnable in sandbox** |
| Forgot-password / reset | Needs MySQL (token rows). | **Not runnable in sandbox** |

### 3.3 Articles / documents / dashboard (need MySQL)

| Test | Actual | Status |
|---|---|---|
| `GET /articles` (9 published, `meta.total = 9`), search, category, sort, detail ×9, 404 for unknown slug, bookmarks, `POST /articles/:id/viewed`, `GET /documents`, file stream + Range, upload as doctor/admin, reprocess | None of these can return data without MySQL: every DB-backed call returns the 503 envelope above. Content correctness is **unverified**. | **Not runnable in sandbox** |
| `GET /documents/:id/file` without auth | 401 verified (route is behind `requireAuth`; see §3.2 — the 401 fires before any DB access). The 200/206 cases need MySQL. | **Pass** (401 half only) |
| Dashboard counts | Needs MySQL. | **Not runnable in sandbox** |

### 3.4 Integration fix made during this run

**Articles routes were public; the contract/docs say auth required.**
On arrival, `GET /api/v1/articles`, `GET /api/v1/articles/:slugOrId`
used `optionalAuth` and `GET /api/v1/articles/categories` had **no auth
middleware at all**, so an unauthenticated request reached the database
(503 without a DB; 200 with one) — contradicting `docs/API.md`
("Auth required" on all three) and this document's §2.2 ("Protected
route (e.g. `GET /articles`) without cookie → 401"). Every other
module (documents, dashboard, admin, assistant) already used
`requireAuth`. Fix (small, in `backend/src/modules/articles/routes.ts`
only): all three routes now use `requireAuth`; the now-unused
`optionalAuth` import was removed. `npm run build` passes after the
fix, and the re-test shows 401 for all three unauthenticated
(§3.2). The frontend is unaffected: its middleware already requires
the `mkp_session` cookie on `/articles/*` and its API client sends
`credentials: include`.

### 3.5 Secrets / demo-password note

- `backend/prisma/seed.ts:72,78` holds the demo passwords in plaintext
  *source* (`'Doctor123!'`, `'Admin123!'`) and hashes them at insert
  time (`bcrypt.hash(u.password, 10)` — seed.ts:90). What is stored is
  a bcrypt hash only; auth compares with bcrypt, never with plaintext.
- `frontend/app/login/page.tsx:19,81` has a "Fill demo credentials"
  button that fills the same pair, and prints the pair on the page.
  This is a deliberate, documented demo affordance (README "Demo
  credentials"), not a leak — but it means the demo password is visible
  to anyone who can open the login page, and it must be rotated/disabled
  before any non-demo deployment. If the demo-fill is unwanted, remove
  the button + the printed line; the seed values stay as the documented
  demo accounts.
- No other plaintext credential was found in code. `.env.example`
  files (root, `backend/`, `frontend/`) contain placeholders only.

### 3.6 AI assistant (RAG) — re-run 2026-11-06

| Test | Actual (evidence) | Status |
|---|---|---|
| `npx ts-node scripts/test-assistant.ts` | **11/11 PASS**, 60/60 citations verified (re-run; `docs/AI_TEST_RESULTS.md` regenerated with the new run timestamp, same results). No LLM key was set: all answers ran in `local-retrieval` mode (extractive, local TF-IDF). Conversation persistence warns and continues without a DB (`Failed to persist conversation (continuing without DB)`). | **Pass** |
| Supported question (live API) | `POST /api/v1/assistant/chat` with a valid JWT cookie, question "What is the evidence for cenobamate efficacy during the titration phase?" → **HTTP 200 SSE**: 15 `token` events streaming a grounded answer, then a `done` event `{answer, citations[6], conversationId: "local-…", mode: "local-retrieval"}` and `[DONE]`. First citation: `doc-launch-deck-rwe-german-comparative`, p. 13, Introduction, relevance 0.464. | **Pass** |
| Unsupported question (live API) | Same endpoint, "What is the dosage for treating diabetes with cenobamate?" → HTTP 200, answer is exactly "I couldn't find sufficient information in the available Cipla medical resources to answer this question reliably." (+ disclaimer), 0 citations. | **Pass** |
| SSE streaming | Verified live as above: token events + final citations event + `[DONE]`. | **Pass** |
| Chat without a key (TF-IDF fallback) | Verified live as above — no `OPENAI_API_KEY`/`GEMINI_API_KEY` set; extractive cited answer, no crash, no invented content. | **Pass** |
| Conversation isolation / list / delete | Needs MySQL (conversations are persisted to `Conversation`/`Message` rows; without a DB they get `local-…` ids and are not retrievable). | **Not runnable in sandbox** |
| LLM generation (OpenAI/Gemini) | No key is available in the sandbox; LLM mode was **not tested and is not claimed**. | **Not runnable in sandbox** |

### 3.7 Security spot checks

| Test | Actual | Status |
|---|---|---|
| SQL injection / XSS / path traversal / CORS / cookie flags | Not exercised live (all need a DB-backed request path or a browser origin test). Code-level notes: upload filenames are server-generated (`${Date.now()}-${basename…}` with unsafe chars replaced, `src/modules/documents/routes.ts:57-64`); the error handler never leaks stacks to clients; `mkp_session` is set `httpOnly`, `Secure` in prod, `SameSite=Lax` (`src/middleware/auth.ts`). | **Not runnable in sandbox** |

### 3.8 Screenshots

- Real capture: `docs/screenshots/login.png` (1440×900, headless
  Chromium via Playwright, frontend dev server `:3000`). It renders
  correctly — MedKnowledge branding, teal `#075C67` palette.
- Authenticated pages **could not be screenshotted in the sandbox**:
  `AppShell` calls `GET /api/v1/auth/me` and redirects to `/login`
  whenever it fails, and without MySQL it always fails (503). Nine
  screenshot targets all landed on the login page; the identical
  duplicates were deleted rather than kept. See
  `docs/screenshots/README.md` for the exact local capture steps (needs
  MySQL + seed). No placeholder or fabricated screenshots were used.

### 3.9 Still not runnable in this sandbox (summary)

Live MySQL login/logout + seeded data, articles/documents/dashboard
content, bookmarks, conversation isolation, admin-as-admin, LLM
generation, password-reset flow, SQLi/XSS/traversal/CORS checks, and
authenticated-page screenshots. All of these need a MySQL
`DATABASE_URL` (and, for LLM mode, an OpenAI/Gemini key). The first
live run against MySQL should follow `docs/MIGRATION.md` §3 (migrate
→ status → seed → row counts) and then re-run §2.2–§2.6 end-to-end.
