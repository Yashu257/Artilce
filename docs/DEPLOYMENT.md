# Deployment — Cipla MedKnowledge Platform v2

> **Verified 2026-11-06 (integration run):** `render.yaml` now exists
> at the repo root and `backend/Dockerfile` exists. The frontend is a
> **Node web service** (`npm run start`), not a static site — it has
> dynamic routes (`/articles/[slug]`, `/documents/[id]`) and no
> `output: 'export'` in `next.config.js`. The Blueprint below matches
> the landed files. What has **not** been verified is an actual Render
> deploy — no Blueprint apply has been run (see §7).

## 1. Target topology (Render)

| Service | Type | Purpose |
|---|---|---|
| `cipla-medknowledge-backend` | Web Service (Docker) | Express + TS API on port 4000 (Render assigns `PORT`) |
| `cipla-medknowledge-frontend` | Web Service (Node) | Next.js production build, `npm run start` on port 3000 (dynamic routes — not a static site) |
| MySQL | Managed / external | `medical_knowledge_db` — Render has no native MySQL; see §4 |

The v1 project deployed the same way (PHP backend via Docker +
React/Vite static site) from a `render.yaml` Blueprint; v2 keeps the
Blueprint approach and swaps the runtimes.

## 2. Render Blueprint — `render.yaml` (repo root)

The Blueprint must define both services and declare the database URL
as a synced environment variable. Indicative shape (adapt service
names/paths to the landed file):

```yaml
services:
  - type: web
    name: cipla-medknowledge-backend
    runtime: docker
    rootDir: backend
    dockerfilePath: ./Dockerfile
    plan: free
    envVars:
      - key: NODE_ENV
        value: production
      - key: FRONTEND_ORIGIN
        value: https://cipla-medknowledge-frontend.onrender.com
      - key: DATABASE_URL
        sync: false            # set in the Render dashboard (see §4)
      - key: JWT_SECRET
        generateValue: true    # Render-generated secret
      - key: OPENAI_API_KEY
        sync: false            # optional; set in dashboard if used
      - key: GEMINI_API_KEY
        sync: false            # optional; set in dashboard if used
    healthCheckPath: /api/v1/health

  - type: web
    name: cipla-medknowledge-frontend
    runtime: node
    rootDir: frontend
    buildCommand: npm install && npm run build
    startCommand: npm run start
    plan: free
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://cipla-medknowledge-backend.onrender.com/api/v1
```

> **Verified 2026-11-06:** the frontend is a Node web service
> (`npm run start`), as specified in the root `render.yaml`. Do not
> deploy it as a static site — its dynamic routes would 404.

Deploy steps:

1. Push the repo to GitHub.
2. Render Dashboard → **New +** → **Blueprint** → connect the repo.
3. Render detects `render.yaml`; set the `sync: false` variables
   (`DATABASE_URL`, LLM keys) in the dashboard.
4. Click **Apply**. Both services build and deploy.

## 3. Docker — backend

`backend/Dockerfile` (**TODO: verify it exists and matches this spec**)
must:

- Use a Node 20 base image, multi-stage if possible (build stage:
  `npm install` → `npx prisma generate` → `npm run build`; runtime
  stage: production deps + compiled `dist/` + `prisma/` schema).
- Run database migrations on start (e.g. `npx prisma migrate deploy`
  as the container entrypoint step) — never `migrate dev` in production.
- Listen on `$PORT` (Render injects it; default 4000 locally).
- Run as a non-root user where practical.
- Include the `uploads/` directory as a writable volume/path, with the
  understanding that Render's free-tier filesystem is **ephemeral**:
  uploaded PDFs and the TF-IDF index (`backend/data/vector-index.json`)
  do not survive a redeploy/restart on a free instance. For durable
  uploads in production, use Render Disk (paid) or external object
  storage — **TODO: confirm the chosen approach; do not assume uploads
  persist on the free tier**.

Indicative Dockerfile shape:

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY uploads ./uploads
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

The exact entrypoint filename (`dist/index.js`) must match the backend's
actual build output — **TODO: verify**.

## 4. MySQL hosting options

Render does not offer managed MySQL. Options, in order of preference:

1. **Managed MySQL** (recommended for production): PlanetScale,
   Aiven, or another MySQL-compatible host. Set its connection string
   as `DATABASE_URL` in the Render dashboard. Use TLS (`sslmode` /
   `sslaccept=strict` per the provider) and a least-privilege user.
2. **Self-hosted MySQL** on a VPS (e.g. the COACT server used for v1):
   open port 3306 only to the Render service IPs / use a firewall, TLS
   on, dedicated `mkp` user.
3. **Local/dev only**: local MySQL 8, or Docker Compose
   (`mysql:8` image) — not a production option.

Whichever host is chosen, the database name remains
`medical_knowledge_db` and the schema is created by
`prisma migrate deploy`, not by importing the v1 `schema.sql`.

## 5. Environment variables — production checklist

### Backend (Render dashboard, never in `render.yaml` as plaintext)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Full MySQL connection string, incl. credentials |
| `JWT_SECRET` | Yes | Long random string; use Render `generateValue` or dashboard secret |
| `FRONTEND_ORIGIN` | Yes | Exact deployed frontend URL, no trailing slash, e.g. `https://cipla-medknowledge-frontend.onrender.com` |
| `NODE_ENV` | Yes | `production` |
| `PORT` | No | Injected by Render |
| `OPENAI_API_KEY` | No | Optional; enables OpenAI embeddings + chat |
| `GEMINI_API_KEY` | No | Optional; used only if no OpenAI key |
| `UPLOADS_DIR` | No | `uploads` default (the var `backend/src/config/env.ts` reads) |
| Upload size limit | — | 25 MB, hardcoded in `backend/src/modules/documents/routes.ts` (multer); there is no `MAX_UPLOAD_MB` env var |

### Frontend

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Exact deployed backend API base, e.g. `https://cipla-medknowledge-backend.onrender.com/api/v1` (no trailing slash). This is the name `frontend/lib/api.ts` reads; the `/api/v1` suffix is required. `NEXT_PUBLIC_` vars are baked into the client bundle at build time — a wrong value requires a rebuild. |

### Rules

- No secrets in code, in `render.yaml`, or in git. `.env.example`
  files contain placeholders only.
- Rotate `JWT_SECRET` only with a maintenance window: rotation
  invalidates all existing `mkp_session` cookies and forces re-login.
- LLM keys are optional; the app must boot and serve articles/documents
  with neither key set (extractive TF-IDF fallback).

## 6. CORS and cookies in production

- `FRONTEND_ORIGIN` must be the exact frontend origin; CORS allows
  that origin only, with `credentials: true`.
- The `mkp_session` cookie is set with `Secure` (HTTPS only),
  `HttpOnly`, `SameSite=Lax`, 8-hour expiry. `SameSite=Lax` is
  sufficient because the frontend and backend are same-site navigations
  via top-level navigation and `fetch` from the frontend origin; if the
  frontend is ever embedded cross-site, this must be revisited
  (`SameSite=None` + `Secure`), not silently changed.
- Both services must be served over HTTPS (Render provides TLS by
  default). Mixed content (HTTP API from an HTTPS page) will fail.
- If a custom domain is added, update `FRONTEND_ORIGIN` and
  `NEXT_PUBLIC_API_URL` to match, and redeploy both services.

## 7. Post-deploy verification

After the first Blueprint apply, run through this checklist:

1. `GET https://<backend>/api/v1/health` returns
   `{"success":true,...}`.
2. `GET https://<backend>/api-docs` loads Swagger UI.
3. Open the frontend URL; log in with `doctor@example.com` /
   `Doctor123!` (seed must have run — see §8).
4. Articles list loads; an article detail page renders.
5. Documents list loads; a PDF streams via the file endpoint.
6. Ask the assistant a supported question (expect a cited answer) and
   an unsupported one (expect the exact refusal sentence).
7. Log in as `admin@cipla.example` and open the admin pages.

## 8. Seeding production

Seeding is **not** automatic on deploy (the seed contains demo
credentials). Run it once, deliberately, from a machine with the
production `DATABASE_URL`:

```bash
cd backend
DATABASE_URL="<production-url>" npx prisma migrate deploy
DATABASE_URL="<production-url>" npm run seed
DATABASE_URL="<production-url>" npm run ingest
```

**TODO: verify** the seed/ingest script names once `backend/package.json`
lands. After seeding, change or disable the demo passwords if the
deployment is anything other than a demo — see `docs/SECURITY.md`.

## 9. Rollback

- Render keeps prior deploys: roll back a service from the dashboard
  (select the previous deploy → **Rollback**).
- Database migrations are forward-only (`prisma migrate deploy`).
  A rollback of code that depends on a newer schema requires a new
  migration; never hand-edit the production database to "undo" a
  migration.
