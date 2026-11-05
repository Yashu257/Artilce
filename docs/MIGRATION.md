# Migration — Cipla MedKnowledge Platform v2

Applies the Prisma schema (`backend/prisma/schema.prisma`, MySQL) to the
`medical_knowledge_db` database. Single initial migration:

```
backend/prisma/migrations/20261106000000_init/migration.sql   (152 lines)
```

## 1. What the migration creates

**11 tables** (all `id VARCHAR(191)` primary key, `cuid()` in Prisma):

| Table | Purpose | Notable columns |
|---|---|---|
| `User` | Seeded doctors + admins | `email` unique, `passwordHash` (bcrypt only), `role` (`doctor` \| `admin`, default `doctor`), `isActive` |
| `Category` | 4 article categories | `name` + `slug` unique |
| `Article` | 9 published articles | `slug` unique, `summary` TEXT, `content` LONGTEXT, `status` (default `published`), `pdfFileName`, `pdfPages`, `thumbnailUrl`, `publishedAt` |
| `Document` | 9 launch-deck PDFs | `fileName`, `mimeType` (default `application/pdf`), `size`, `category`, `status` (default `pending`), `pageCount`, `version`, `uploadedById` |
| `DocumentChunk` | RAG chunks (184 rows after ingest) | `documentId`, `page`, `section`, `content` TEXT, `chunkIndex`, `embeddingJson` |
| `Conversation` | Per-user AI chats | `userId`, `title` |
| `Message` | Chat turns | `conversationId`, `role`, `content` TEXT, `citationsJson` |
| `Bookmark` | Article bookmarks | `userId` + `articleId` (unique pair) |
| `ActivityLog` | Article views etc. | `userId` (nullable), `action`, `entityType`, `entityId` |
| `AuditLog` | Security events | `userId` (nullable), `action`, `details` TEXT, `ip` |
| `PasswordResetToken` | Reset flow | `userId`, `tokenHash` (SHA-256 only), `expiresAt`, `usedAt` |

**15 indexes** — 5 unique, 10 plain:

- Unique: `User_email_key` (`User.email`), `Category_name_key`,
  `Category_slug_key`, `Article_slug_key`, `Bookmark_userId_articleId_key`
  (`Bookmark(userId, articleId)`).
- Plain: `Article_slug_idx`, `Article_category_idx`, `Article_status_idx`,
  `Document_status_idx`, `Document_category_idx`,
  `DocumentChunk_documentId_idx`,
  `DocumentChunk_documentId_chunkIndex_idx`,
  `Conversation_userId_idx`, `Message_conversationId_idx`,
  `ActivityLog_userId_idx`.

**9 foreign keys** (all `ON UPDATE CASCADE`):

| Constraint | References | On delete |
|---|---|---|
| `Document_uploadedById_fkey` | `User(id)` | SET NULL |
| `DocumentChunk_documentId_fkey` | `Document(id)` | CASCADE |
| `Conversation_userId_fkey` | `User(id)` | CASCADE |
| `Message_conversationId_fkey` | `Conversation(id)` | CASCADE |
| `Bookmark_userId_fkey` / `Bookmark_articleId_fkey` | `User(id)` / `Article(id)` | CASCADE |
| `ActivityLog_userId_fkey` | `User(id)` | SET NULL |
| `AuditLog_userId_fkey` | `User(id)` | SET NULL |
| `PasswordResetToken_userId_fkey` | `User(id)` | CASCADE |

## 2. Schema ↔ migration verification (2026-11-06, sandbox)

`prisma migrate diff` could **not** be run in this sandbox: the Prisma CLI
has to download its schema/query engines and every attempt failed with
`ECONNRESET` (same failure as `npx prisma generate`, see §4). The check
was therefore done by direct comparison of the two files, and it passed
in full:

- Table names in `migration.sql` = model names in `schema.prisma`:
  all **11/11 match, in the same order**.
- Scalar field names (and order) per model = column names per table:
  all **11/11 models match exactly** (relation-only fields such as
  `User.documents` or `Article.bookmarks` correctly have no column).
- Index count 15 (5 unique) and FK count 9, as listed above, match the
  `@@index` / `@@unique` / `@relation` declarations in the schema.

The earlier claim in `backend/README.md` (that an offline
`migrate diff --from-empty --to-schema-datamodel` matched exactly) could
**not be re-verified** in this sandbox for the same engine-download
reason. Before treating the migration as proven against a live database,
run the live diff in §3 on a machine with MySQL and working Prisma
engine downloads.

## 3. Applying the migration (needs a real MySQL)

```bash
# 1. Create the database (see docs/SETUP.md §3 for the SQL)
#    CREATE DATABASE medical_knowledge_db CHARACTER SET utf8mb4
#      COLLATE utf8mb4_unicode_ci;

# 2. Point the backend at it
cd backend
cp .env.example .env   # set DATABASE_URL + JWT_SECRET

# 3a. Production / Render (also run by backend/Dockerfile on start)
npx prisma migrate deploy

# 3b. Development (creates a new migration if the schema changed)
npx prisma migrate dev

# 4. Seed demo data (2 users, 4 categories, 9 articles, 9 documents)
npm run seed

# 5. Ingest the 9 PDFs into the RAG index (writes DocumentChunk rows
#    when a DB is present; falls back to backend/data/documents.json
#    without one — see docs/INDEXING.md)
npm run ingest
```

### Live verification to run where MySQL exists

```bash
# A. The migration applied cleanly, no pending migrations:
npx prisma migrate status
#    Expected: "Database schema is up to date!"

# B. The live schema matches the Prisma schema exactly (needs a shadow
#    database — Prisma creates it automatically from DATABASE_URL):
npx prisma migrate diff --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma --shadow-database-url \
  "mysql://mkp:<password>@localhost:3306/mkp_shadow"
#    Expected: empty diff (no output / "no differences").

# C. Row counts after seed + ingest:
mysql medical_knowledge_db -e \
  "SELECT (SELECT COUNT(*) FROM User) users,
          (SELECT COUNT(*) FROM Category) categories,
          (SELECT COUNT(*) FROM Article) articles,
          (SELECT COUNT(*) FROM Document) documents,
          (SELECT COUNT(*) FROM DocumentChunk) chunks;"
#    Expected: users=2, categories=4, articles=9, documents=9,
#    chunks=184.
```

## 4. Honest status — what was NOT run here

- **No live `prisma migrate deploy`, `migrate dev`, or `seed` has ever
  run for v2.** There is no MySQL/MariaDB server in this sandbox
  (`which mysql mysqld docker` → none found; no Docker daemon), and no
  `DATABASE_URL` is set. Every DB-backed route therefore returns the
  designed clean `503 DATABASE_UNAVAILABLE` envelope (verified live
  against the running server — see `docs/TESTING.md` §3).
- **`npx prisma generate` fails in this sandbox** (3+ attempts, all
  `ECONNRESET` while the CLI fetches engines through the egress proxy).
  The pre-generated client in `backend/node_modules/.prisma/client`
  (with `libquery_engine-debian-openssl-3.0.x.so.node`) is present, so
  `npm run build` (tsc) and the server start fine — but a fresh
  `npm install` on a machine without that cached client would need
  working Prisma engine downloads before the backend can start.
- **Rollback:** this is the initial migration; rolling back means
  dropping the database and re-running `migrate deploy` (`DROP DATABASE
  medical_knowledge_db;` then §3). There is no down-migration — do not
  run this against a database that holds data you need to keep.
