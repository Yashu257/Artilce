# Screenshots — Cipla MedKnowledge Platform v2

## What is here (real captures)

| File | Page | How it was captured |
|---|---|---|
| `login.png` | Login (`/login`) | **Real screenshot**, 2026-11-06, headless Chromium (Playwright `chromium_headless_shell-1248`, 1440×900) against the frontend dev server on `http://localhost:3000` with the backend running on `:4000`. No login was performed; the page renders without a session. |

## What is NOT here — and why (honest blocker)

No screenshots of the authenticated pages (dashboard, articles,
article detail, documents, PDF viewer, AI assistant, admin, bookmarks)
could be captured in this sandbox, and **none were fabricated**.
The attempt was made and logged in `_capture-log.txt`: every protected
route redirected to `/login`.

Root cause: the frontend `AppShell` (`frontend/components/AppShell.tsx`)
calls `GET /api/v1/auth/me` on every protected page and redirects to
`/login` whenever that call fails — and with no MySQL in the sandbox
that call always fails (`503 DATABASE_UNAVAILABLE`, because `/auth/me`
looks the user up in the database). A valid `mkp_session` JWT cookie
alone is not enough; the session cannot be verified without the
database. This is real, observed behaviour, not a screenshot-tool
failure: the same cookie *does* authenticate direct API calls
(`GET /api/v1/articles` → `503` after auth passes, `GET
/api/v1/admin/users` as doctor → `403`), and the AI-assistant SSE
endpoint streams a full grounded answer with citations (see
`docs/TESTING.md` §3). The UI pages themselves are unreachable until
MySQL exists.

## How to capture the missing screenshots (locally, with MySQL)

```bash
# 1. Prerequisites: Node 20+, MySQL 8 running, database created
#    (docs/SETUP.md §3), backend + frontend installed.
cd cipla-medknowledge-v2

# 2. Backend: migrate + seed + ingest, then start it
cd backend && cp .env.example .env   # DATABASE_URL + JWT_SECRET
npx prisma migrate deploy && npm run seed && npm run ingest
PORT=4000 npm run dev                # or: npm run build && npm start

# 3. Frontend (second terminal)
cd frontend && cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
npm run dev                          # http://localhost:3000

# 4. Browser automation (one-time)
npx -y playwright@1.64.1 install chromium --only-shell
npm install playwright-core@1.64.1   # in a scratch dir, or add as a devDependency

# 5. Capture: log in through the UI once (doctor@example.com /
#    Doctor123!), then screenshot each route in the same browser
#    context so the mkp_session cookie is present:
#      /dashboard  /articles  /articles/launch-deck-early-initiation-better
#      /documents  /documents/doc-launch-deck-early-initiation-better
#      /ai-assistant (ask: "What is the evidence for cenobamate efficacy
#        during the titration phase?" and wait for the streamed answer)
#      /admin  /bookmarks  /login (logged out)
#    Save as PNG, 1440x900, into this folder:
#      dashboard.png  articles.png  article-detail.png  documents.png
#      document-viewer.png  ai-assistant.png  ai-assistant-answer.png
#      admin.png  bookmarks.png  login.png
#    Then delete this section's "NOT here" notice and list the files
#    in the table above with the capture date.
```

## Capture log of the sandbox attempt

`_capture-log.txt` — per-page result of the 2026-11-06 run (9 of 10
targets landed on `/login`; the AI-assistant target failed because the
question box never rendered behind the redirect). The identical
login-page captures from that run were deleted; only the single real
`login.png` is kept.
