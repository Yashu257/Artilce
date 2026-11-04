# Cipla MedKnowledge Clinical Intelligence Platform

An enterprise-grade, responsive **Medical Knowledge Platform** designed specifically for physicians, neurologists, and healthcare professionals. Built with pure white medical SaaS aesthetics (`#FFFFFF`), evidence-grounded AI intelligence, real peer-reviewed clinical publications, and interactive slide presentations.

---

## 1. Project Overview & Features

- **9 Verified Clinical Publications & Launch Decks:**
  - 📄 *LAUNCH DECK - EARLY INITIATION BETTER.pdf* (Freedon Study, *Epilepsia* 2026)
  - 📄 *LAUNCH DECK - EFF IN TITRATION PHASE.pdf* (Study C017, *Acta Neurol Scand* 2022)
  - 📄 *LAUNCH DECK - EVENTUALLY MONOTHERAPY.pdf* (Benavente et al., *Epileptic Disorders* 2026)
  - 📄 *LAUNCH DECK - PHASE III LTE POST-HOC.pdf* (Study C021 Extension, *Epilepsia* 2021)
  - 📄 *LAUNCH DECK - PHASE III LTE.pdf* (Zero DRESS Trial, *Epilepsia* 2020)
  - 📄 *LAUNCH DECK - RWE - GERMAN - COMPARATIVE.pdf* (KORK Study, *Epilepsia Open* 2024)
  - 📄 *LAUNCH DECK - RWE COMPARATIVE vs OTHER ASMs.pdf* (CNS Drugs, 2024)
  - 📄 *LAUNCH DECK - ULTRA-REFRACTORY FOS.pdf* (Danish Epilepsy Centre, *Neurol Sci* 2025)
  - 📄 *REDUCE 1 ASM SPANISH CONSENSUS.pdf* (SEEP Spanish Consensus, *Epilepsia Open* 2024)

- **Interactive Presentation Deck Viewer:** High-resolution multi-page slide previews and figure galleries rendered directly from the PDF launch decks.
- **Evidence-Grounded AI Assistant:** Fully active question-answering assistant citing indexed clinical protocols with transparent source navigation.
- **Flexible Authentication:** Physician login supporting any `@gmail.com` address or demo credentials.
- **Pure White Enterprise SaaS UI:** Clean typography, zero congestion, and responsive layouts across desktop, tablet, and mobile.

---

## 2. Deploying on Render

This repository is pre-configured with a **`render.yaml` Blueprint** and a **Backend Dockerfile** for seamless deployment on Render.

### Option A: One-Click Blueprint Deployment (Recommended)

1. Push this repository to your GitHub account: `https://github.com/Yashu257/Artilce.git`
2. Go to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub repository (`Yashu257/Artilce`).
5. Render will automatically detect `render.yaml` and configure:
   - **`cipla-articles-backend`** (PHP 8.3 Web Service running via Docker)
   - **`cipla-articles-frontend`** (React 19 Vite Static Site with automatic routing rewrites)
6. Click **Apply**. Both services will build and deploy automatically!

---

### Option B: Manual Service Deployment on Render

#### 1. Deploy the Backend (Web Service)
1. In Render Dashboard, click **New +** &rarr; **Web Service**.
2. Connect your repository: `Yashu257/Artilce`.
3. Set the following fields:
   - **Name:** `cipla-articles-backend`
   - **Language / Runtime:** `Docker`
   - **Root Directory:** `backend`
   - **Dockerfile Path:** `Dockerfile` (or `./backend/Dockerfile`)
   - **Instance Type:** `Free`
4. In **Environment Variables**, add:
   - `PORT`: `10000`
   - `FRONTEND_ORIGIN`: Your Render frontend URL (e.g. `https://cipla-articles-frontend.onrender.com`)
   - *(Optional for MySQL)*: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`
5. Click **Deploy Web Service**. Once live, copy your backend URL (e.g. `https://cipla-articles-backend.onrender.com`).

#### 2. Deploy the Frontend (Static Site)
1. In Render Dashboard, click **New +** &rarr; **Static Site**.
2. Connect your repository: `Yashu257/Artilce`.
3. Set the following fields:
   - **Name:** `cipla-articles-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. In **Environment Variables**, add:
   - `VITE_API_BASE_URL`: Your backend URL from Step 1 (e.g. `https://cipla-articles-backend.onrender.com`)
5. In **Redirects / Rewrites** tab:
   - Click **Add Rule**
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Action:** `Rewrite`
6. Click **Create Static Site**.

---

## 3. Local Development Setup

### Backend (PHP 8.2+)
```bash
cd backend
php -S 127.0.0.1:8001 router.php
```

### Frontend (Node.js 18+)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5175](http://localhost:5175) in your browser.

---

## 2. Mandatory White Theme & Color Palette

The entire interface strictly adheres to the pure white medical SaaS design rules:

| Element | Color Hex | Usage |
| :--- | :--- | :--- |
| **Main Page Background** | `#FFFFFF` | Used across every single page, sidebar, header, and card |
| **Sidebar Background** | `#FFFFFF` | Fixed left navigation with thin border |
| **Header Background** | `#FFFFFF` | Sticky top navigation with breadcrumb and profile |
| **Card Background** | `#FFFFFF` | White cards with subtle border and soft shadow |
| **Primary Text** | `#17324D` | Dark navy for headings and high-contrast typography |
| **Secondary Text** | `#64748B` | Slate gray for subtitles, metadata, and labels |
| **Primary Teal** | `#078D7A` | Primary buttons, active navigation, links, and icons |
| **Secondary Teal** | `#12B98B` | Accents and badges |
| **Light Teal Accent** | `#E8F6F3` | Active navigation pill, assistant bubble, icon badge bg |
| **Border Color** | `#E2E8F0` | Thin light-gray element separators |
| **Input Background** | `#FFFFFF` | Clean form controls |
| **Hover Background** | `#F8FAFC` | Subtle button and row hover feedback |
| **Disabled Background** | `#F1F5F9` | Disabled inputs and pending feature pills |
| **Error Color** | `#DC2626` | Validation warnings and logout action |
| **Success Color** | `#15803D` | Active session indicators |

---

## 3. Demo Credentials (Phase 1)

For testing and reviewing the authenticated experience:

- **Medical Email:** `doctor@example.com`
- **Password:** `Doctor123!`
- **Role:** Physician / Doctor (`Dr. Sarah Mitchell, MD`)
- *Note:* A convenient **"Fill Demo Doctor"** button is built into the login card for one-click testing.

---

## 4. Local Development Setup

### Prerequisites
- Node.js (v18+)
- PHP (v8.1+ with PDO MySQL extension)
- MySQL (v8.0+ or MariaDB 10.4+)

### Step 1: Clone and Database Setup
1. Import `database/schema.sql` into MySQL:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. Import placeholder seed data from `database/seed.sql`:
   ```bash
   mysql -u root -p < database/seed.sql
   ```

### Step 2: Configure Environment Variables
- Copy `frontend/.env.example` to `frontend/.env`:
  ```env
  VITE_API_BASE_URL=/api
  ```
- Optional database environment variables for PHP (defaults to `127.0.0.1:3306`, DB: `medical_knowledge_db`, User: `root`, Pass: `""`):
  ```bash
  export DB_HOST=127.0.0.1
  export DB_PORT=3306
  export DB_NAME=medical_knowledge_db
  export DB_USER=root
  export DB_PASS=your_password
  ```

### Step 3: Start PHP Backend
```bash
php -S 127.0.0.1:8000 backend/router.php
```

### Step 4: Start Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Deployment to COACT Server (Production)

### Frontend Production Build
1. Build the production bundle:
   ```bash
   cd frontend
   npm run build
   ```
   The optimized production assets are generated in `frontend/dist/`.
2. Copy the contents of `frontend/dist/` to your web server document root (e.g. `/var/www/html/` or public directory).

### PHP Backend Deployment
1. Upload the `backend/` directory to the server.
2. Ensure PHP 8.1+ with `pdo_mysql`, `session`, and `json` extensions is enabled.
3. Verify that `backend/.htaccess` is in place. It automatically enforces:
   - Session cookie security flags (`HttpOnly`, `SameSite=Lax`)
   - Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`)
   - Protected directory blocking for `backend/config/`
4. Set production database credentials via Apache `SetEnv` or system environment variables:
   ```apache
   SetEnv DB_HOST "127.0.0.1"
   SetEnv DB_NAME "medical_knowledge_db"
   SetEnv DB_USER "coact_db_user"
   SetEnv DB_PASS "YourStrongSecretPassword"
   SetEnv FRONTEND_ORIGIN "https://your-medical-platform.com"
   ```

### HTTPS & Secure Cookies Recommendation
In production:
- Ensure HTTPS is enabled via TLS/SSL certificate.
- When accessed over HTTPS, the PHP session cookie automatically sets the `Secure` flag (`secure => true`, `samesite => 'None'` or `'Lax'`).

---

## 6. Features Completed in Phase 1

- [x] **Pure White Theme**: 100% compliant with pure white palette (`#FFFFFF`), subtle shadows, thin light-gray borders (`#E2E8F0`), and teal accents (`#078D7A`).
- [x] **Page 1 (Login)**: Secure authentication form, email format validation, password visibility toggle, remember-me checkbox, demo credential quick-fill, and error alerts.
- [x] **Page 2 (Dashboard)**: Welcome header for authenticated doctor, dynamic search bar, 5 category resource cards with derived article counts, 4 featured articles, and AI Assistant promo banner.
- [x] **Page 3 (Articles Listing)**: Comprehensive catalog of 12 placeholder articles, real-time keyword search, category filter pills, sorting options (Newest, Oldest, Title A-Z, Title Z-A), and responsive load-more pagination.
- [x] **Page 4 (Article Detail)**: Reusable reading template with executive summary, interactive Table of Contents (TOC), structured subsection paragraphs, comparative clinical matrix tables, related article cards, print button (`window.print()`), and share link copy action.
- [x] **Page 5 (AI Assistant — UI Only)**: Visual interface with message history layout, example clinical question chips, grounded source citation area, and strictly **DISABLED** inputs and send button.
- [x] **Core PHP Backend**:
  - Reusable PDO connection (`backend/config/database.php`)
  - Prepared statements for SQL injection prevention
  - `password_hash()` and `password_verify()` authentication
  - Session regeneration on login (`session_regenerate_id(true)`)
  - Server-side auth protection middleware (`backend/middleware/auth.php`)
  - Protected endpoints (`/articles/list.php`, `/articles/get.php`, `/auth/me.php`)
  - Disabled chatbot endpoint returning HTTP 503 (`/chatbot/ask.php`)
- [x] **MySQL Database**: Complete `schema.sql` and `seed.sql` with 12 structured articles and demo doctor account.
- [x] **Zero Fabricated Content**: All articles and categories are strictly neutral placeholders awaiting official medical committee review.

---

## 7. Phase 2 Integration Roadmap

When the 12 approved clinical reference articles and AI model credentials arrive:

1. **Official Medical Content Insertion**: Replace the 12 placeholder records in MySQL with finalized clinical guidelines, dosages, contraindications, and tables.
2. **AI Knowledge Retrieval Engine**:
   - Ingest the 12 articles into a vector store or full-text inverted index.
   - Ground queries exclusively against the 12 approved articles (zero hallucination).
3. **Backend Chatbot Activation**:
   - Update `backend/chatbot/ask.php` to perform retrieval-augmented generation (RAG).
   - Return structured response: answer text, article citations, subsection anchor, and confidence indicator.
4. **Chatbot UI Activation**:
   - Enable message input and send button in `ChatInterfacePlaceholder.jsx`.
   - Remove "Phase 2 Disabled" badge.
   - Connect message stream to `ask.php` endpoint.
