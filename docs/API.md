# API Reference — Cipla MedKnowledge Platform v2

Base URL (local): `http://localhost:4000`
All API routes are under `/api/v1`. Interactive docs: `GET /api-docs`
(Swagger UI — verified live 2026-11-06: `GET /api-docs/` returns 200 with the Swagger UI bundle.)

> Every endpoint below is taken from `shared/API_CONTRACT.md`. Request /
> response shapes follow the contract's standard envelope. Field-level
> details that the contract does not specify are marked **TODO**.

## 1. Conventions

### Standard envelope

Success:

```json
{ "success": true, "data": { "...": "..." }, "meta": { "page": 1, "total": 9 } }
```

Error:

```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Authentication required" } }
```

`meta` is present only on paginated list responses.

### Authentication

- Auth is a httpOnly cookie, `mkp_session` (signed JWT, 8 h expiry).
  The browser sends it automatically; `fetch` calls must use
  `credentials: include`.
- There is no `Authorization: Bearer` header flow and no token in
  `localStorage`.
- All endpoints except `POST /auth/login`, `POST /auth/forgot-password`,
  `POST /auth/reset-password`, and `GET /health` require the cookie.
- Admin endpoints additionally require `role: "admin"`.

### Errors

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/query failed validation |
| 401 | `UNAUTHORIZED` | Missing, expired, or invalid session cookie |
| 403 | `FORBIDDEN` | Authenticated but lacking the required role |
| 404 | `NOT_FOUND` | Resource does not exist |
| 429 | `RATE_LIMITED` | Too many requests (see §3) |
| 500 | `INTERNAL_ERROR` | Unexpected server error (no stack trace leaked) |

Exact error `code` strings, verified live 2026-11-06 against the running
server: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `DATABASE_UNAVAILABLE`,
`INTERNAL_ERROR` (see `docs/TESTING.md` §3.2).

### Rate limits

Per the contract, rate limiting and login lockout apply (see
`docs/SECURITY.md`). Exact limits are implementation-defined and
**TODO: verify**; the documented intent is: login attempts are
limited per IP/account with temporary lockout, and the assistant chat
endpoint is limited per user.

## 2. Health

### `GET /api/v1/health`

No auth. Liveness check for Render (`healthCheckPath`).

```bash
curl http://localhost:4000/api/v1/health
```

```json
{ "success": true, "data": { "status": "ok", "db": "down", "version": "2.0.0" } }
```

Verified live 2026-11-06: the health payload is
`{status, db, version}` — `db` is `"down"` with no `DATABASE_URL`
configured (`"ok"` when MySQL is reachable). There is no `uptime` field.

## 3. Auth

### `POST /api/v1/auth/login`

```bash
curl -i -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"doctor@example.com","password":"Doctor123!"}'
```

Response `200` — sets `Set-Cookie: mkp_session=...; HttpOnly; SameSite=Lax`
(`Secure` in production):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "…",
      "name": "Dr. Sarah Mitchell, MD",
      "email": "doctor@example.com",
      "role": "doctor"
    }
  }
}
```

Response `401` — invalid credentials (generic message; does not say
whether the email exists):

```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Invalid email or password" } }
```

### `POST /api/v1/auth/logout`

Auth required. Clears the `mkp_session` cookie.

```json
{ "success": true, "data": { "message": "Logged out" } }
```

### `GET /api/v1/auth/me`

Auth required. Returns the current user (never includes `passwordHash`).

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "…",
      "name": "Dr. Sarah Mitchell, MD",
      "email": "doctor@example.com",
      "role": "doctor"
    }
  }
}
```

### `POST /api/v1/auth/forgot-password`

No auth. Body: `{ "email": "..." }`. Always returns success (even if the
email is unknown) to avoid user enumeration. If the email exists, a
single-use reset token is created (`PasswordResetToken`) and emailed.

```json
{ "success": true, "data": { "message": "If an account exists for this email, a reset link has been sent" } }
```

**TODO: verify** the email-sending mechanism and the exact response
message — the contract defines the endpoint but no mail provider.

### `POST /api/v1/auth/reset-password`

No auth. Body: `{ "token": "...", "password": "..." }` (exact field
names **TODO: verify**). The token must be unexpired and unused; it is
consumed on success. The new password must meet the password policy
(see `docs/SECURITY.md`).

```json
{ "success": true, "data": { "message": "Password updated" } }
```

Expired/used/invalid token → `400 VALIDATION_ERROR` (or `401` —
**TODO: verify**).

## 4. Articles

### `GET /api/v1/articles`

Auth required. Query params: `search`, `category`, `sort`
(`newest` | `oldest` | `title`), `page`, `limit`.

```bash
curl 'http://localhost:4000/api/v1/articles?search=cenobamate&category=Real-World%20Evidence%20(RWE)&sort=newest&page=1&limit=10' \
  -H 'Cookie: mkp_session=...'
```

```json
{
  "success": true,
  "data": [
    {
      "id": "…",
      "title": "…",
      "slug": "launch-deck-early-initiation-better",
      "summary": "…",
      "category": "Real-World Evidence (RWE)",
      "status": "published",
      "pdfFileName": "LAUNCH DECK - EARLY INITIATION BETTER.pdf",
      "pdfPages": 36,
      "thumbnailUrl": "…",
      "publishedAt": "2026-01-15T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "total": 9 }
}
```

Only `published` articles are returned to doctors; **TODO: verify**
whether drafts/archived are visible to admins through this endpoint or
only via admin routes.

### `GET /api/v1/articles/:slugOrId`

Auth required. Accepts either the slug or the database id.

```json
{
  "success": true,
  "data": {
    "id": "…",
    "title": "…",
    "slug": "launch-deck-early-initiation-better",
    "summary": "…",
    "category": "Real-World Evidence (RWE)",
    "content": "…full structured content…",
    "status": "published",
    "pdfFileName": "LAUNCH DECK - EARLY INITIATION BETTER.pdf",
    "pdfPages": 36,
    "publishedAt": "2026-01-15T00:00:00.000Z"
  }
}
```

Unknown slug/id → `404 NOT_FOUND`.

### `GET /api/v1/articles/categories`

Auth required. Returns the 4 categories with article counts
(**TODO: verify** exact shape — counts may be included or not):

```json
{
  "success": true,
  "data": [
    { "name": "Real-World Evidence (RWE)", "slug": "real-world-evidence-rwe", "count": 3 },
    { "name": "Phase III Clinical Trials & Efficacy", "slug": "phase-iii-clinical-trials-efficacy", "count": 2 },
    { "name": "Titration & Dosing Guidelines", "slug": "titration-dosing-guidelines", "count": 2 },
    { "name": "Monotherapy & Concomitant ASM Deprescribing", "slug": "monotherapy-concomitant-asm-deprescribing", "count": 2 }
  ]
}
```

> Counts above are illustrative — the seed data is the source of truth;
> verify counts against the seeded database.

### `POST /api/v1/articles/:id/bookmark`

Auth required. Toggles or creates a bookmark for the article
(**TODO: verify** toggle vs. create-only semantics — the contract lists
a single POST endpoint and a `Bookmark` unique user+article pair, which
implies idempotent create; whether a second call removes the bookmark
is unspecified).

```json
{ "success": true, "data": { "bookmarked": true } }
```

### `GET /api/v1/articles/bookmarks`

Auth required. Returns the current user's bookmarked articles
(paginated — **TODO: verify** pagination params).

```json
{ "success": true, "data": [ { "id": "…", "title": "…", "slug": "…" } ], "meta": { "page": 1, "total": 2 } }
```

### `POST /api/v1/articles/:id/viewed`

Auth required. Records an `ActivityLog` row for the view. No-op if the
article does not exist → `404 NOT_FOUND`.

```json
{ "success": true, "data": { "message": "View recorded" } }
```

## 5. Documents

### `GET /api/v1/documents`

Auth required. Query params: `search`, `category`, `type`
(**TODO: verify** what `type` values are accepted — e.g. `pdf`).

```json
{
  "success": true,
  "data": [
    {
      "id": "…",
      "title": "…",
      "fileName": "LAUNCH DECK - EARLY INITIATION BETTER.pdf",
      "mimeType": "application/pdf",
      "size": 1234567,
      "category": "Real-World Evidence (RWE)",
      "status": "ready",
      "pageCount": 36,
      "version": 1
    }
  ],
  "meta": { "page": 1, "total": 9 }
}
```

### `GET /api/v1/documents/:id`

Auth required. Returns document metadata (same shape as one list item).

### `GET /api/v1/documents/:id/file`

Auth required. Streams the PDF bytes with `Content-Type:
application/pdf` and `Accept-Ranges: bytes` / `Content-Range` support
for the in-browser PDF viewer. This is the **only** way to fetch file
content — there is no public URL.

```bash
curl http://localhost:4000/api/v1/documents/<id>/file \
  -H 'Cookie: mkp_session=...' -H 'Range: bytes=0-1023' -o part.pdf
```

### `POST /api/v1/documents` — admin only

Multipart form upload. Fields: `file` (the PDF), `title`, `category`
(exact field names **TODO: verify**). Validates MIME type and size
before storing; creates a `Document` row with status `pending` and
triggers ingestion.

```json
{ "success": true, "data": { "id": "…", "title": "…", "status": "pending" } }
```

Non-admin → `403 FORBIDDEN`. Invalid file → `400 VALIDATION_ERROR`.

### `DELETE /api/v1/documents/:id` — admin only

Deletes the document, its chunks, and the stored file.

```json
{ "success": true, "data": { "message": "Document deleted" } }
```

### `POST /api/v1/documents/:id/reprocess` — admin only

Re-runs ingestion (parse → chunk → embed) for the document; status goes
`processing` → `ready` (or `failed`).

```json
{ "success": true, "data": { "id": "…", "status": "processing" } }
```

## 6. AI Assistant

### `POST /api/v1/assistant/chat`

Auth required. Streams **Server-Sent Events**. Request body:

```json
{ "conversationId": "…", "question": "What does the evidence say about early initiation of cenobamate?" }
```

`conversationId` is optional — omit it to start a new conversation.

SSE stream: the answer is streamed as events, followed by a final event
carrying the citations and conversation id. The exact SSE event names /
field layout are **TODO: verify against the implementation**; the
contract fixes the logical result shape:

```json
{
  "answer": "…grounded answer…",
  "citations": [
    {
      "documentId": "…",
      "documentName": "LAUNCH DECK - EARLY INITIATION BETTER.pdf",
      "page": 4,
      "section": "Efficacy",
      "excerpt": "…verbatim excerpt from the retrieved chunk…",
      "relevance": 0.87
    }
  ],
  "conversationId": "…"
}
```

If no chunk clears the relevance threshold, the answer is exactly:

> "I couldn't find sufficient information in the available Cipla medical
> resources to answer this question reliably."

plus a medical disclaimer, with an empty citations list. The
conversation and messages are persisted (`Conversation` + `Message`
rows, citations stored as `citationsJson`); conversations are isolated
per user.

### `GET /api/v1/assistant/conversations`

Auth required. Lists the current user's conversations, newest first.

```json
{ "success": true, "data": [ { "id": "…", "title": "…", "createdAt": "…", "updatedAt": "…" } ] }
```

### `GET /api/v1/assistant/conversations/:id`

Auth required. Returns one conversation with its messages. Another
user's conversation id → `404 NOT_FOUND` (not `403`, to avoid leaking
existence).

### `DELETE /api/v1/assistant/conversations/:id`

Auth required. Deletes the conversation and its messages (own
conversations only).

```json
{ "success": true, "data": { "message": "Conversation deleted" } }
```

### `POST /api/v1/assistant/feedback`

Auth required. Body (exact fields **TODO: verify** — contract lists the
endpoint only):

```json
{ "messageId": "…", "rating": "helpful", "comment": "…" }
```

```json
{ "success": true, "data": { "message": "Feedback recorded" } }
```

## 7. Dashboard

### `GET /api/v1/dashboard`

Auth required. All counts come from the database — nothing is hardcoded.

```json
{
  "success": true,
  "data": {
    "totalArticles": 9,
    "totalDocuments": 9,
    "categories": [
      { "name": "Real-World Evidence (RWE)", "count": 3 }
    ],
    "recentlyViewed": [ { "id": "…", "title": "…", "slug": "…" } ],
    "popular": [ { "id": "…", "title": "…", "slug": "…", "views": 12 } ],
    "recentActivity": [ { "action": "viewed", "entityType": "article", "entityId": "…", "createdAt": "…" } ]
  }
}
```

Exact field names for `recentlyViewed` / `popular` / `recentActivity`
items are **TODO: verify**.

## 8. Admin

All admin endpoints require `role: "admin"`; doctors get `403 FORBIDDEN`.

### `GET /api/v1/admin/users`

```json
{
  "success": true,
  "data": [
    { "id": "…", "name": "Dr. Sarah Mitchell, MD", "email": "doctor@example.com", "role": "doctor", "isActive": true, "createdAt": "…" }
  ]
}
```

### `GET /api/v1/admin/documents/status`

Document ingestion status overview (per-document `pending` /
`processing` / `ready` / `failed`).

```json
{ "success": true, "data": [ { "id": "…", "title": "…", "status": "ready", "pageCount": 36, "version": 1 } ] }
```

### `GET /api/v1/admin/activity`

Audit/activity feed. Exact shape **TODO: verify**.

```json
{ "success": true, "data": [ { "id": "…", "userId": "…", "action": "login", "details": "…", "createdAt": "…" } ] }
```

## 9. Swagger

`GET /api-docs` serves the Swagger UI for this API. **TODO: verify** it
is wired up and that the spec matches this document; if the two
disagree, the implementation is the authority and this document must be
updated.
