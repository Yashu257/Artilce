/**
 * Shared RAG types — the plug-in contract between the backend routes
 * (src/routes/assistant.ts) and the RAG implementation (src/rag/).
 *
 * The RAG agent owns src/rag/assistant.ts: it must export
 * `ASSISTANT_AVAILABLE = true` and `handleChat(req)` matching the
 * signature below. Until then the stub in src/rag/assistant.ts reports
 * unavailable and the route returns an honest 503 — never a fake answer.
 */

export interface Citation {
  documentId: string;
  documentName: string;
  page: number;
  section: string;
  excerpt: string;
  relevance: number;
}

export interface ChatRequest {
  userId: string;
  conversationId?: string;
  question: string;
}

export interface ChatResult {
  answer: string;
  citations: Citation[];
  conversationId: string;
}

export interface AssistantHandler {
  (req: ChatRequest): Promise<ChatResult>;
}

/** Single source of truth for fallback/disclaimer text lives in prompts.ts
 *  — re-exported here so routes/types import one canonical wording.
 *  Do NOT define a second wording here. */
export { INSUFFICIENT_INFORMATION as INSUFFICIENT_INFORMATION_ANSWER, MEDICAL_DISCLAIMER } from './prompts';
