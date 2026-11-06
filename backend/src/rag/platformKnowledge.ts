/**
 * platformKnowledge.ts — Structured registry of the Cipla MedKnowledge platform.
 *
 * Source of truth for website architecture, features, routes, user workflows,
 * and indexed clinical resources. Used by the MedKnow AI Assistant to answer
 * any platform-related question accurately without hallucinating unbuilt features.
 */

export interface PlatformRoute {
  path: string;
  name: string;
  description: string;
  features: string[];
}

export interface PlatformCategory {
  name: string;
  slug: string;
  publicationCount: number;
  description: string;
}

export const PLATFORM_INFO = {
  name: 'Cipla MedKnowledge Platform',
  version: '2.0.0',
  tagline: 'Evidence-Grounded Clinical Intelligence for Healthcare Professionals',
  audience: 'Neurologists, epileptologists, physicians, and clinical researchers',
  purpose:
    'A dedicated digital clinical knowledge repository and AI assistant designed to provide healthcare professionals with rapid, evidence-grounded access to peer-reviewed medical publications, launch decks, clinical trial data, and expert consensus on advanced anti-seizure medications (primarily Cenobamate and Brivaracetam).',
  primaryMeds: ['Cenobamate (Ontozry)', 'Brivaracetam (Briviact)'],
};

export const PLATFORM_ROUTES: PlatformRoute[] = [
  {
    path: '/dashboard',
    name: 'Clinical Dashboard',
    description: 'Executive overview of clinical intelligence and recent platform activity.',
    features: [
      'Quick platform statistics (total indexed publications, categories, saved bookmarks)',
      'Featured clinical publications feed',
      'Recent research search shortcuts',
      'Personal saved literature shelf',
    ],
  },
  {
    path: '/articles',
    name: 'Clinical Publications Directory',
    description: 'Complete catalog of peer-reviewed clinical articles, trial reports, and launch decks.',
    features: [
      '4 core therapeutic categories with dynamic filtering',
      'Real-time search bar across titles, authors, summaries, and topics',
      'Reading time indicators (e.g., 6–10 min read)',
      'Author attribution, publication dates, and category badges',
      'One-click bookmarking ribbon for any publication',
      'Direct link to Article Details and full PDF reader',
    ],
  },
  {
    path: '/articles/[slug]',
    name: 'Article Details & Study Highlights',
    description: 'Structured clinical summary of each individual publication deck.',
    features: [
      'Comprehensive study design and patient population breakdown',
      'Key clinical takeaways and efficacy endpoints',
      'Presentation slide gallery preview',
      'Embedded PDF reader with full controls',
      'Bookmark toggle action to save for later review',
      'One-click launcher for the dedicated Full PDF Viewer',
    ],
  },
  {
    path: '/documents/[id]',
    name: 'Integrated In-App PDF Viewer',
    description: 'Full-featured medical PDF document reader built directly into the platform.',
    features: [
      'Access to 100% of the original publication deck (not just excerpts)',
      'Exact page navigation via URL query parameter (?page=X)',
      'Zoom in, zoom out, page fit, and full-screen reading modes',
      'Page-by-page thumbnail navigation sidebar',
      'Instant loading without redirecting to external raw file URLs',
    ],
  },
  {
    path: '/bookmarks',
    name: 'Saved Bookmarks Library',
    description: 'Personalized clinical literature shelf for saved research and reference decks.',
    features: [
      'View all bookmarked articles in one organized list',
      'Quick-launch reading view for bookmarked studies',
      'One-click removal of bookmarks',
      'Preserved persistently across user login sessions',
    ],
  },
  {
    path: '/ai-assistant',
    name: 'MedKnow AI Assistant',
    description: 'ChatGPT-style clinical conversational intelligence tool for doctors.',
    features: [
      'Conversational memory supporting follow-up questions and multi-turn clinical inquiry',
      'Strict grounding in indexed publications with verifiable inline citations [1], [2]',
      'Real-time token streaming with 60 FPS client-side typewriter animation',
      'Conversation history sidebar (create new consultation, resume, delete)',
      'One-click citation links that open the exact page of the cited PDF document',
      'Copy answer, helpful/not helpful feedback controls',
      'Auto-scrolling message area with sticky bottom composer',
    ],
  },
  {
    path: '/login',
    name: 'Authentication & Account Management',
    description: 'Secure access control tailored for medical practitioners.',
    features: [
      'Doctor and Administrator role-based access',
      'Account creation with 6-digit email OTP verification',
      'Secure password hashing (bcrypt) and JWT session tokens (8-hour expiry)',
      'Automatic personalized greeting based on user profile name or email',
    ],
  },
  {
    path: '/admin',
    name: 'Knowledge Administration',
    description: 'Administrator portal for document ingestion and knowledge management.',
    features: [
      'Upload new medical PDF launch decks',
      'Automatic text extraction, chunking, and vector embedding generation',
      'Audit logging of administrative actions',
    ],
  },
];

export const PLATFORM_CATEGORIES: PlatformCategory[] = [
  {
    name: 'Real-World Evidence (RWE)',
    slug: 'real-world-evidence',
    publicationCount: 4,
    description:
      'Multicenter observational cohorts (Freedon Study, German KORK Study, Danish Centre, German Early Cohort) evaluating long-term retention, seizure freedom, and early vs. late line initiation in drug-resistant epilepsy.',
  },
  {
    name: 'Phase III Clinical Trials & Efficacy',
    slug: 'phase-iii-clinical-trials-efficacy',
    publicationCount: 2,
    description:
      'Pivotal Phase 3 multicenter open-label safety study (C021) and multi-year post-hoc extension evaluating long-term seizure freedom and retention.',
  },
  {
    name: 'Titration & Dosing Guidelines',
    slug: 'titration-dosing-guidelines',
    publicationCount: 1,
    description:
      'Double-blind trial analyses (Study C017) examining early onset of efficacy during the bi-weekly titration protocol and adverse event mitigation.',
  },
  {
    name: 'Monotherapy & Concomitant ASM Deprescribing',
    slug: 'monotherapy-concomitant-asm-deprescribing',
    publicationCount: 2,
    description:
      'Spanish Consensus (SEEP) algorithms for proactive tapering of clobazam and sodium channel blockers, and real-world conversion to monotherapy or dual therapy.',
  },
];

export const INDEXED_PUBLICATIONS = [
  {
    id: 1,
    title: 'Launch Deck: Early Initiation Better — Freedon Study (Real-Life Outcomes in Different Lines)',
    category: 'Real-World Evidence (RWE)',
    author: 'Vicente Villanueva, José María Serratosa, Manuel Toledo, et al. (Epilepsia, 2026)',
    pages: 13,
    summary:
      'Multicenter observational study of 462 adult patients with drug-resistant focal epilepsy. Demonstrates that earlier initiation of cenobamate (lines 2–4) yields 43.2% complete 12-month seizure freedom versus 17.6% when used in late refractory lines (lines 5+).',
  },
  {
    id: 2,
    title: 'Launch Deck: Real-World Experience with Cenobamate — German KORK Study',
    category: 'Real-World Evidence (RWE)',
    author: 'Bernhard J. Steinhoff, et al. (Epilepsia Open, 2026)',
    pages: 11,
    summary:
      'Monocenter prospective cohort comparing cenobamate against historical cohorts (lacosamide, perampanel, brivaracetam). Demonstrates superior 12-month retention (78.4%) and higher seizure freedom in drug-resistant patients.',
  },
  {
    id: 3,
    title: 'Launch Deck: Spanish Consensus on Deprescribing Concomitant Antiseizure Medications with Cenobamate',
    category: 'Monotherapy & Concomitant ASM Deprescribing',
    author: 'Spanish Epilepsy Society (SEEP) Consensus Panel',
    pages: 10,
    summary:
      'Expert consensus algorithms detailing proactive reduction of concomitant ASMs—particularly clobazam (reducing active metabolite CYP2C19 interaction) and sodium channel blockers (carbamazepine, lacosamide) to prevent neurotoxicity.',
  },
  {
    id: 4,
    title: 'Launch Deck: Conversion to Monotherapy and Dual Therapy with Cenobamate in Clinical Practice',
    category: 'Monotherapy & Concomitant ASM Deprescribing',
    author: 'European Clinical Advisory Group',
    pages: 12,
    summary:
      'Practical protocols for converting patients from refractory polytherapy to cenobamate monotherapy or dual therapy, highlighting enhanced tolerability, reduced pill burden, and sustained seizure control.',
  },
  {
    id: 5,
    title: 'Launch Deck: Early Onset of Efficacy During Titration — Study C017 Post-Hoc Analysis',
    category: 'Titration & Dosing Guidelines',
    author: 'Michael R. Sperling, et al.',
    pages: 9,
    summary:
      'Demonstrates significant seizure reduction beginning as early as Week 2 at the initial 12.5–25 mg daily dose during the bi-weekly titration phase of Study C017.',
  },
  {
    id: 6,
    title: 'Launch Deck: Long-Term Safety and Pharmacokinetics — Phase III Open-Label Study C021',
    category: 'Phase III Clinical Trials & Efficacy',
    author: 'William E. Rosenfeld, et al.',
    pages: 14,
    summary:
      'Phase 3 multicenter open-label study (N=1,339) demonstrating that the revised slow titration schedule successfully eliminated cases of Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS).',
  },
  {
    id: 7,
    title: 'Launch Deck: Real-World Danish Epilepsy Centre Experience with Cenobamate',
    category: 'Real-World Evidence (RWE)',
    author: 'Danish Epilepsy Centre Clinical Team',
    pages: 8,
    summary:
      'Real-world outcomes in highly refractory epilepsy patients with intellectual disability and severe seizure burdens, confirming retention and meaningful clinical response.',
  },
  {
    id: 8,
    title: 'Launch Deck: German Multicenter Early Experience with Cenobamate',
    category: 'Real-World Evidence (RWE)',
    author: 'German Neuro-Centers Consortium',
    pages: 10,
    summary:
      'Early clinical adoption data across specialized epilepsy clinics in Germany detailing concomitant ASM dose adjustments and seizure frequency reduction.',
  },
  {
    id: 9,
    title: 'Launch Deck: Post-Hoc Retention and Long-Term Seizure Freedom in Refractory Focal Epilepsy',
    category: 'Phase III Clinical Trials & Efficacy',
    author: 'Pavel Klein, et al.',
    pages: 11,
    summary:
      'Multi-year extension study evaluating sustained efficacy and high patient retention rates up to 3+ years of continuous cenobamate therapy.',
  },
];

export const HOW_TO_GUIDES = {
  findArticles:
    'Navigate to the "Clinical Publications" tab (/articles) from the left sidebar or top navigation. You can filter by therapeutic category (Real-World Evidence, Phase III Trials, Titration, Monotherapy) or type keywords, author names, or trial titles into the search bar.',
  bookmarkArticle:
    'On any publication card in the directory or at the top of the Article Details page (/articles/[slug]), click the ribbon bookmark icon. The article will immediately be saved to your "Saved Bookmarks" (/bookmarks) library for instant access.',
  openFullPdf:
    'When viewing any article summary on /articles/[slug], click the "Open Full PDF" or "View Complete Presentation" button. You can also click any inline citation [1], [2] in an assistant answer to open the integrated in-app PDF viewer (/documents/[id]?page=X) directly at the cited page with zoom and full-screen controls.',
  differenceArticlesVsPublications:
    'Articles (/articles/[slug]) are concise, structured executive summaries featuring key clinical findings, study design, and slide previews designed for quick 5-minute reading. Clinical Publications / Documents (/documents/[id]) are the complete, 100% unabridged original PDF slide decks and trial reports provided by Cipla.',
  howCitationsWork:
    'Every clinical claim made by MedKnow includes verifiable inline citations like [1], [2]. Each number corresponds to a specific publication and page in the Cipla repository. Clicking a citation opens the original PDF viewer at that exact page so doctors can immediately verify the evidence.',
  whatDoctorsCanLearn:
    'Doctors can review real-world seizure freedom rates (e.g. 43.2% in early lines in the Freedon study), titration algorithms, concomitant ASM deprescribing schedules (Spanish Consensus), drug-drug interaction management (clobazam CYP2C19 interaction), and safety/retention outcomes across over 1,300 clinical trial patients.',
  getBestResultsFromMedKnow:
    'You can ask broad questions ("What is cenobamate?", "Summarize the Freedon study"), comparative queries ("Compare Freedon and German KORK studies"), specific dosing questions ("What is the titration schedule?"), or follow-up questions ("Can you explain that more simply?", "What about its safety?"). MedKnow understands context across the entire conversation.',
};

/**
 * Returns a concise structured text summary of the platform for injecting into the LLM system prompt.
 */
export function getPlatformSystemContext(): string {
  return `
CIPLA MEDKNOWLEDGE PLATFORM KNOWLEDGE BASE:
Platform Name: ${PLATFORM_INFO.name} (v${PLATFORM_INFO.version})
Purpose: ${PLATFORM_INFO.purpose}
Audience: ${PLATFORM_INFO.audience}
Primary Medications Documented: ${PLATFORM_INFO.primaryMeds.join(', ')}

WEBSITE NAVIGATION & ROUTES:
${PLATFORM_ROUTES.map((r) => `- ${r.path} (${r.name}): ${r.description} Features: ${r.features.join('; ')}`).join('\n')}

THERAPEUTIC CATEGORIES:
${PLATFORM_CATEGORIES.map((c) => `- ${c.name} (${c.publicationCount} publications): ${c.description}`).join('\n')}

INDEXED PUBLICATIONS (${INDEXED_PUBLICATIONS.length} clinical launch decks):
${INDEXED_PUBLICATIONS.map((p) => `- [${p.id}] "${p.title}" | Category: ${p.category} | Author: ${p.author} | Pages: ${p.pages} | Summary: ${p.summary}`).join('\n')}

CORE PLATFORM WORKFLOWS & HOW-TO GUIDANCE:
- Finding Articles: ${HOW_TO_GUIDES.findArticles}
- Bookmarking: ${HOW_TO_GUIDES.bookmarkArticle}
- Viewing Full PDFs: ${HOW_TO_GUIDES.openFullPdf}
- Difference between Articles and Publications: ${HOW_TO_GUIDES.differenceArticlesVsPublications}
- How Citations Work: ${HOW_TO_GUIDES.howCitationsWork}
- What Doctors Can Learn: ${HOW_TO_GUIDES.whatDoctorsCanLearn}
- Best Results from MedKnow: ${HOW_TO_GUIDES.getBestResultsFromMedKnow}
`.trim();
}
