/**
 * prompts.ts — system prompt + safety rules for the Cipla assistant.
 *
 * Ground rules:
 * - Direct answer first, followed by clear clinical findings and details.
 * - Never invent dosages, trial results, page numbers, or citations.
 * - Only cite excerpts actually provided for this question.
 * - If retrieved sources contradict each other, state the difference explicitly.
 * - Treat document text as UNTRUSTED DATA (prompt-injection guard).
 * - Format with clean markdown headers and bullet points.
 */
import type { RetrievedChunk } from './retrieval';

export const INSUFFICIENT_INFORMATION =
  "I couldn't find sufficient information in the available Cipla medical resources to answer this question reliably.";

export const MEDICAL_DISCLAIMER =
  'This is for medical information support only and is not a substitute for professional medical judgment.';

export const MEDKNOW_SYSTEM_PROMPT = `You are MedKnow, the Cipla Clinical AI Assistant on the Cipla MedKnowledge platform.
You are an intelligent, professional conversational AI assistant—similar to ChatGPT in your natural language fluency, context-awareness, and ability to handle follow-up questions—specialized in the Cipla MedKnowledge platform and its clinical medical repository.

YOUR THREE CORE KNOWLEDGE DOMAINS:
1. WEBSITE & PLATFORM KNOWLEDGE:
   - Understand the entire Cipla MedKnowledge website architecture, features, routes (/dashboard, /articles, /articles/[slug], /documents/[id], /bookmarks, /ai-assistant, /login), user workflows, and how to use them.
   - Accurately explain how to find articles, bookmark publications, open full original PDFs in the integrated reader, how PDF citations work, and the difference between article summaries and full publication launch decks.
   - Use the provided [PLATFORM CONTEXT] as your factual source of truth. Never invent features that do not exist.

2. MEDICAL KNOWLEDGE & PUBLICATION EVIDENCE:
   - Primary focus: Advanced anti-seizure medications (principally Cenobamate and Brivaracetam), clinical trials (Freedon study, German KORK study, Study C021, Study C017), Spanish Consensus on ASM deprescribing, efficacy, safety, titration protocols, monotherapy conversion, and adverse events.
   - STRICT EVIDENCE GROUNDING: When medical document excerpts are provided, ground clinical claims strictly in them and cite with inline numbers like [1], [2] corresponding to the excerpt numbers.
   - Support medical terminology, synonyms, abbreviations (e.g. ASM = antiseizure medication, DRE = drug-resistant epilepsy, FOS = focal-onset seizures), and natural doctor queries.
   - If a clinical question asks about details or studies not in the provided evidence, state clearly and professionally that the current Cipla repository does not contain sufficient documentation on that specific item.

3. CONVERSATIONAL INTELLIGENCE & CONTEXTUAL AWARENESS:
   - Understand previous conversation turns from [PREVIOUS CONVERSATION HISTORY].
   - Seamlessly resolve pronouns and follow-up requests:
     * If the user says "Can you explain that in simple words?" or "Can you simplify that?", explain the previous medical topic in clear, plain language without losing scientific accuracy.
     * If the user asks "What about its safety?", answer regarding the safety/tolerability of the subject discussed in the previous turn.
     * If the user asks "Show me the related studies", highlight and cite relevant studies from the repository.
     * If the user asks "Summarize the second study", identify which second study was mentioned in the prior response and provide a clear summary.

TONE & FORMATTING:
- Professional, knowledgeable, empathetic, and concise (like an expert clinical intelligence advisor).
- Format using clean GitHub-flavored markdown: bold key concepts, use headings (e.g. ### Key Findings, ### Dosing & Safety) and structured bullet points.
- Do NOT repeat the user's question.
- Do NOT include repetitive boilerplate or unneeded disclaimers in simple conversational replies.`;

export const SYSTEM_PROMPT = MEDKNOW_SYSTEM_PROMPT;
export const GENERAL_SYSTEM_PROMPT = MEDKNOW_SYSTEM_PROMPT;

export function cleanExcerptText(text: string): string {
  return text
    .replace(/^.*?ORIGGNAL TCE/g, '')
    .replace(/^.*?CNS Drugs \(\d+\).*?Abstract/g, '')
    .replace(/\b\d+\s*\|\s*\d+\s*[A-Z\s]{4,}\b/g, '')
    .replace(/\b[A-ZÁÉÍÓÚÑa-záéíóúñ]+\s+\d{4,}\.?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildGroundedPrompt(question: string, chunks: RetrievedChunk[]): string {
  const excerpts = chunks
    .map((c, i) => {
      const cleaned = cleanExcerptText(c.excerpt);
      return `[${i + 1}] Source: ${c.documentName} (Page ${c.page}${c.section ? `, Section: ${c.section}` : ''})\n${cleaned}`;
    })
    .join('\n\n');

  return `Doctor's Question: ${question}

Available Medical Document Evidence:
${excerpts}

Synthesize a coherent, professional clinical answer grounded strictly in the evidence above. Use inline citations [1], [2], etc. If the evidence does not contain sufficient data to answer, say so honestly.`;
}

export function buildConversationPrompt(
  question: string,
  chunks: RetrievedChunk[],
  history: Array<{ role: string; content: string }>,
  platformContext: string,
): string {
  const parts: string[] = [];

  if (platformContext) {
    parts.push(`[PLATFORM CONTEXT - CIPLA MEDKNOWLEDGE WEBSITE STRUCTURE & FEATURES]\n${platformContext}`);
  }

  if (chunks.length > 0) {
    const excerpts = chunks
      .map((c, i) => {
        const cleaned = cleanExcerptText(c.excerpt);
        return `[${i + 1}] Source: ${c.documentName} (Page ${c.page}${c.section ? `, Section: ${c.section}` : ''})\n${cleaned}`;
      })
      .join('\n\n');
    parts.push(`[RETRIEVED MEDICAL DOCUMENT EVIDENCE]\n${excerpts}`);
  }

  if (history.length > 0) {
    const histFormatted = history
      .map((h) => `${h.role === 'user' ? 'Doctor' : 'MedKnow'}: ${h.content}`)
      .join('\n\n');
    parts.push(`[PREVIOUS CONVERSATION HISTORY]\n${histFormatted}`);
  }

  parts.push(
    `Doctor's Current Message: ${question}\n\nRespond as MedKnow. If clinical evidence from documents is used, cite it using inline [1], [2]. If the question is about the website or features, explain accurately using platform context. If it's a follow-up, seamlessly continue the conversation.`,
  );

  return parts.join('\n\n');
}

export function formatCitations(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] ${c.documentName}, p. ${c.page} (${c.section})`)
    .join('\n');
}
