# User Guide — Cipla MedKnowledge Platform v2

For physicians, neurologists, and other healthcare professionals
("doctors"), and for platform administrators. This guide describes the
v2 workflows as defined in `shared/API_CONTRACT.md`. Where a workflow
depends on implementation details that were not yet landed when this
guide was written, that is noted.

## 1. Getting in

### Logging in

1. Open the platform (locally: http://localhost:3000).
2. Enter your email and password, then **Sign in**.
3. Demo account for evaluation:
   - Email: `doctor@example.com`
   - Password: `Doctor123!`
   - Signed in as Dr. Sarah Mitchell, MD.
   - The login card has a **Fill Demo Doctor** button that fills these
     in for you.
4. If you forget your password, use **Forgot password** on the login
   page. You will receive a reset link by email; the link is single-use
   and expires. (**TODO: verify** the email delivery is configured —
   the endpoint exists in the contract; the mail provider was not
   confirmed.)

Notes:

- Only accounts created by an administrator (or seeded) can log in.
  Unlike v1, signing in with any `@gmail.com` address no longer works.
- Your session lasts 8 hours. After that you will be asked to log in
  again.
- Use **Log out** in the top navigation when you finish, especially on
  a shared computer.

## 2. Dashboard

After login you land on the dashboard. It shows:

- **Totals**: number of articles and documents available.
- **Categories**: the 4 content categories with article counts.
- **Recently viewed**: articles you have opened recently.
- **Popular**: the most-viewed articles.
- **Recent activity**: your recent actions on the platform.

Use the search bar at the top to search across articles, or pick a
category card to browse that category.

## 3. Articles

### Browsing

Open **Articles** from the sidebar. You can:

- **Search** by keyword (title, summary, content).
- **Filter** by category using the filter pills.
- **Sort** by Newest, Oldest, or Title A–Z.
- **Page** through results (10 per page by default — **TODO: verify**
  the default page size).

The catalogue contains 9 verified clinical publications / launch decks
on cenobamate and epilepsy, across 4 categories:

| Category | Content |
|---|---|
| Real-World Evidence (RWE) | German comparative RWE, RWE vs other ASMs, early initiation (Freedon study) |
| Phase III Clinical Trials & Efficacy | Phase III long-term extension (LTE), LTE post-hoc analyses |
| Titration & Dosing Guidelines | Efficacy in the titration phase |
| Monotherapy & Concomitant ASM Deprescribing | Eventually monotherapy, Spanish consensus on reducing 1 ASM, ultra-refractory focal-onset seizures |

### Reading an article

Click an article to open its detail page:

- **Summary** at the top, then the full structured content with a
  table of contents.
- **Source PDF**: where available, the linked launch-deck PDF opens in
  the document viewer.
- **Related articles** at the bottom.
- **Print**: use your browser's print function for a clean copy.
- Opening an article records it in your recently-viewed list and on
  the dashboard.

### Bookmarks

- Click the **bookmark** icon on any article to save it.
- Open **Bookmarks** from the sidebar to see everything you saved.
- Click the bookmark icon again to remove it. (**TODO: verify**
  toggle semantics — the contract defines a single bookmark endpoint
  and implies idempotent create; confirm the UI behaviour once the
  frontend lands.)

## 4. Documents and the PDF viewer

Open **Documents** from the sidebar to browse the 9 launch-deck PDFs
(the same sources behind the articles).

- **Search** by title and **filter** by category and type.
- Click a document to open it in the built-in PDF viewer. The viewer
  streams the file from the backend; PDFs are never exposed at a public
  URL, and the viewer supports paging through the deck.
- Each document shows its title, category, page count, and processing
  status. A document marked `pending` or `processing` is still being
  ingested and may not be fully searchable by the AI assistant yet;
  `ready` means it is indexed.

## 5. AI Assistant

Open **AI Assistant** from the sidebar.

### Asking a question

1. Type your question — for example:
   - "What does the evidence say about early initiation of cenobamate?"
   - "What was the efficacy of cenobamate during the titration phase?"
2. Press Enter or the send button. The answer streams in.
3. **Citations** appear with the answer: each one names the source
   document, page, section, and a verbatim excerpt, with a relevance
   score. Click a citation to open the source document at the cited
   page where the viewer supports it. (**TODO: verify** citation
   click-to-page behaviour in the frontend.)
4. Suggested question chips are shown when you start a new chat.

### What the assistant will and will not do

- It answers **only from the 9 Cipla launch decks / publications** in
  the platform. Every claim in an answer is tied to a citation from
  those documents.
- If the available documents do not contain enough information to
  answer reliably, it says exactly:

  > "I couldn't find sufficient information in the available Cipla
  > medical resources to answer this question reliably."

  followed by a medical disclaimer. That is the correct behaviour, not
  an error — do not rephrase the question to try to force an answer
  out of it.
- It does not diagnose, prescribe, or give patient-specific advice.
  It is a clinical information retrieval aid for healthcare
  professionals. Answers carry a medical disclaimer; apply your own
  clinical judgement and consult the full source publication.
- It cannot answer questions about drugs, conditions, or studies that
  are not in the 9 documents.

### Conversations

- Each chat is a **conversation**, listed in the sidebar of the
  assistant page. Switch between conversations to resume them.
- Start a new conversation with the **New chat** button.
- Delete a conversation with the delete action on it. Deleting removes
  the conversation and its messages permanently.
- Conversations are private to your account. No other user can see
  them.
- You can give feedback on an answer (helpful / not helpful) where the
  feedback control is shown — this helps the team improve retrieval.
  (**TODO: verify** the feedback UI is present in the frontend.)

## 6. Admin workflow

Log in with the admin account to manage the platform:

- Email: `admin@cipla.example`
- Password: `Admin123!`
- This account is for admin-module testing and administration only;
  do not use it for clinical browsing.

### Admin pages

- **Users** (`/admin/users`): list of platform users — name, email,
  role, active status. (**TODO: verify** which user-management actions
  the UI exposes — the contract defines only a list endpoint, so
  create/deactivate actions may not exist yet.)
- **Document status** (`/admin/documents/status`): ingestion status of
  every document — `pending`, `processing`, `ready`, or `failed`.
  A `failed` document can be reprocessed from here (or via
  `POST /api/v1/documents/:id/reprocess`).
- **Activity** (`/admin/activity`): audit/activity feed — logins,
  document uploads/deletes, and other admin-relevant events.

### Uploading a new document

1. Go to **Documents** (or the admin document page) and choose
   **Upload**.
2. Select a PDF (max 50 MB by default) and give it a title and a
   category.
3. The document is stored and queued for ingestion: parsed, chunked,
   and embedded. Its status moves `pending` → `processing` → `ready`.
4. Once `ready`, the document is searchable by the AI assistant and
   viewable in the PDF viewer.
5. If ingestion fails, the status shows `failed` — check the admin
   document status page and reprocess it. Scanned image-only PDFs
   will not ingest usefully (OCR is not implemented); use text-based
   PDFs.

### Deleting a document

Delete from the document's admin actions. This removes the document,
its search index entries, and the stored file. This cannot be undone.

## 7. Troubleshooting (for users)

| Problem | What to do |
|---|---|
| Can't log in | Check the email/password; use **Forgot password**. If the demo account fails, the backend seed may not have run — contact the platform team. |
| Page shows a login screen unexpectedly | Your 8-hour session expired — log in again. |
| Article or document list is empty | Check you are logged in; try clearing the search/filter. If still empty, the database seed or ingestion may not have run. |
| PDF viewer is blank | The document may still be `processing` — check its status. If `ready` and still blank, try reloading; contact the team if it persists. |
| Assistant says it couldn't find information | The answer genuinely is not in the 9 documents, or the document is still ingesting. Try a question clearly covered by one of the decks. |
| Assistant gives an answer with no citations | Report it to the platform team — answers must always be cited. |
