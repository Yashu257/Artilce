# Security — Cipla MedKnowledge Platform v2

Security controls for the v2 stack (Next.js + Express + TypeScript +
Prisma + MySQL 8). Controls marked **TODO: verify** are required by
the contract but had no implementation to inspect at the time of
writing (backend/frontend builds were in progress).

## 1. Authentication

- **Passwords**: stored as bcrypt hashes only (`passwordHash` column).
  The seed hashes demo passwords with `bcryptjs` `hashSync` at seed
  time; plaintext passwords never appear in code, logs, or the
  database. Use a cost factor of 10–12 (bcryptjs default 10 is
  acceptable; **TODO: verify the value chosen**).
- **Sessions**: signed JWT in an httpOnly cookie `mkp_session`, 8-hour
  expiry. `Secure` in production, `SameSite=Lax`, `HttpOnly` always.
  No token in `localStorage` / `sessionStorage`, no token in URLs.
- **Login failure handling**: generic error message ("Invalid email or
  password") — the response must not reveal whether the email exists.
- **No Gmail-domain auto-auth**: the v1 behaviour that let any
  `@gmail.com` address in is explicitly removed. Only accounts present
  in the `User` table can log in.
- **Session invalidation on logout**: the cookie is cleared; since
  sessions are stateless JWTs, logout is client-side cookie clearing
  plus (recommended) an `AuditLog` entry. **TODO: verify** whether the
  implementation adds server-side revocation (e.g. a token denylist) —
  the contract does not require one, so assume logout = cookie clear
  until confirmed.
- **Password reset**: single-use tokens, stored hashed
  (`PasswordResetToken.tokenHash`), with `expiresAt` and `usedAt`.
  The plaintext token is delivered only via the reset email and is
  never logged. **TODO: verify** the email provider and token expiry
  (recommended: 1 hour).

## 2. Authorisation (RBAC)

- Roles: `doctor` (default) and `admin`.
- Enforcement is server-side middleware on every route:
  - Any authenticated user: articles, documents (read), assistant,
    dashboard, bookmarks.
  - Admin only: `POST /api/v1/documents`, `DELETE /api/v1/documents/:id`,
    `POST /api/v1/documents/:id/reprocess`, `GET /api/v1/admin/*`.
- The frontend hides admin navigation for doctors, but that is UI
  only — it is not a security control. A doctor calling an admin
  endpoint directly must receive `403 FORBIDDEN`.
- **Per-user isolation**: conversations, messages, bookmarks, and
  activity are always scoped to the authenticated user id from the
  JWT. Requesting another user's conversation id returns `404`
  (not `403`) to avoid leaking existence.
- **Inactive users**: `User.isActive = false` must be rejected at
  login and on subsequent requests (**TODO: verify** the check exists
  in the auth middleware, not just at login).

## 3. Rate limiting and lockout

- **Login**: rate-limited per IP and per account, with temporary
  lockout after repeated failures (exact thresholds **TODO: verify**;
  recommended: 5 failed attempts → 15-minute lockout). Lockout
  responses must not reveal whether the account exists.
- **Assistant chat**: rate-limited per user to bound LLM cost
  (recommended: e.g. 30 requests / 10 min — **TODO: verify** the
  implemented values).
- **General API**: a global rate limit should apply to `/api/v1/*`
  (**TODO: verify** it is wired up).
- Rate-limit responses use HTTP `429` with the standard error envelope.
- **TODO: verify** the rate-limit store: in-memory is acceptable for a
  single instance; Redis is required if the backend ever runs with
  multiple instances.

## 4. Input validation

- All request bodies, query params, and path params are validated
  server-side (e.g. with Zod — **TODO: verify** the validation library).
  Client-side validation is UX only.
- Article search/sort/pagination params are allow-listed:
  `sort` ∈ `newest | oldest | title`; `page`/`limit` are coerced to
  positive integers with a capped `limit` (recommended max 50).
- Chat questions are length-capped (recommended max ~2000 characters)
  to bound prompt size and cost.
- Unknown/extra fields are ignored or rejected, never passed through
  to the database.

## 5. Injection protection

- **SQL injection**: Prisma parameterized queries are the only database
  access path. No string-concatenated SQL, no raw queries with
  interpolated user input.
- **NoSQL / object injection**: n/a (MySQL via Prisma), but request
  objects are never spread directly into Prisma `data`/`where` clauses
  without an allow-list.
- **XSS**: React/Next.js escapes output by default. Article `content`
  is rendered as data, never via `dangerouslySetInnerHTML` with
  unsanitised input (**TODO: verify** the article renderer). Any HTML
  in seeded content must come from the trusted seed file only.
- **Log injection**: user-controlled values (emails, questions) are not
  written to logs raw with newlines unescaped in a way that could forge
  log lines — keep logging structured.

## 6. File upload validation

Applies to `POST /api/v1/documents` (admin only):

- MIME type allow-list: `application/pdf` only (checked by content,
  not just extension — **TODO: verify** content sniffing is implemented).
- Size cap: `MAX_UPLOAD_MB` (default 50 MB).
- Files are stored under `backend/uploads/` with a server-generated
  name; the original filename is stored as metadata only and never
  used as a filesystem path (prevents path traversal).
- Uploaded files are never executed and never served directly — they
  are only streamed through the authenticated
  `GET /api/v1/documents/:id/file` endpoint with `Range` support.
- **Scanned PDFs**: OCR is not implemented (see `README.md`
  limitations). A scanned image-only PDF will ingest with little or no
  text and should surface as `failed` or near-empty chunks, not as
  silently wrong answers.

## 7. Headers and CORS

- **CORS**: allow-list is exactly the frontend origin
  (`FRONTEND_ORIGIN`, `http://localhost:3000` locally), with
  `credentials: true`. No wildcard origin with credentials.
- **Security headers** (recommended; **TODO: verify** helmet or
  equivalent is configured): `Content-Security-Policy`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
  (or `frame-ancestors 'none'`), `Referrer-Policy: no-referrer`,
  `Strict-Transport-Security` in production.
- **Cookie flags**: `HttpOnly`, `Secure` in production,
  `SameSite=Lax`, `Path=/`, 8-hour `Max-Age`.
- **Error responses** never include stack traces, SQL, or internal
  paths in production.

## 8. Audit logging

- `AuditLog` rows are written for security-relevant events: login
  success/failure, logout, password reset request/completion, admin
  document upload/delete/reprocess, admin user actions.
  `ActivityLog` covers product activity (article views, bookmarks).
- Audit entries record user id (nullable for anonymous attempts),
  action, details, and IP where available. Audit logs are append-only
  in practice — no API endpoint deletes them.
- **TODO: verify** which events are actually logged in the
  implementation; the contract defines the `AuditLog` model but not
  the event list.

## 9. Secrets management

- Secrets exist only as environment variables: `DATABASE_URL`,
  `JWT_SECRET`, `OPENAI_API_KEY`, `GEMINI_API_KEY`.
- `.env` files are git-ignored; `.env.example` contains placeholders
  only. No secret is ever committed, logged, or returned in an API
  response.
- LLM API keys are sent only to the configured provider, over HTTPS.
  Only the user's question and retrieved chunk text are sent — no
  passwords, no full user records.
- Demo credentials (`doctor@example.com` / `Doctor123!`,
  `admin@cipla.example` / `Admin123!`) are for local/demo use only.
  Any non-demo deployment must rotate or disable them before going
  live (see `docs/DEPLOYMENT.md §8`).

## 10. Prompt-injection protection (RAG)

The assistant answers only from retrieved chunks. Defences:

- **Grounding**: the LLM prompt includes retrieved chunk text only,
  with an instruction to answer solely from that context and to refuse
  (with the exact refusal sentence) when the context is insufficient.
- **No tool use / no side effects**: the assistant has no tools, makes
  no API calls, and cannot read the database beyond retrieval. A
  malicious instruction inside a PDF or a user question cannot cause
  writes, deletes, or data exfiltration through the assistant.
- **Citation discipline**: citations may only reference retrieved
  chunks (real document, page, section, excerpt). The model is not
  permitted to invent sources.
- **Input handling**: user questions are treated as untrusted data,
  never as system instructions; retrieved document text is likewise
  treated as data, not instructions.
- **Output**: the refusal path (below-threshold retrieval) does not
  call the LLM at all, so prompt injection cannot influence it.
- **TODO: verify** the exact system prompt and whether retrieved text
  is delimited/escaped in the prompt sent to the provider.

## 11. Medical safety rules

- The assistant is a **clinical information retrieval aid**, not a
  diagnostic or prescribing tool. Answers must carry a medical
  disclaimer (exact wording **TODO: verify**).
- The assistant must never invent dosages, trial results, or
  contraindications. Anything not present in the retrieved chunks is
  answered with the fixed refusal sentence.
- Content is limited to the 9 seeded launch decks / publications.
  No general medical knowledge is to be presented as if sourced from
  Cipla resources.
- This platform is for healthcare professionals. It is not patient
  advice, and the UI must not present it as such.

## 12. Known gaps

- Rate-limit thresholds, lockout durations, bcrypt cost, validation
  library, helmet/CSP configuration, password-reset email provider,
  and the audit event list are all **TODO: verify** against the
  implementation.
- Server-side JWT revocation is not in the contract; logout relies on
  cookie clearing.
