"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Check, Copy, RefreshCw, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { useState } from "react";
import type { ChatMessageItem, Citation } from "../lib/types";
import CitationPanel from "./CitationPanel";
import { api } from "../lib/api";
import RetrievalModeBadge from "./RetrievalModeBadge";

export default function ChatMessage({ message, streaming = false, isLast = false, onRegenerate, onSelectCitation, selectedCitation }: {
  message: ChatMessageItem;
  streaming?: boolean;
  isLast?: boolean;
  onRegenerate?: () => void;
  onSelectCitation?: (c: Citation) => void;
  selectedCitation?: Citation | null;
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null);
  const [feedbackError, setFeedbackError] = useState("");
  const isUser = message.role === "user";

  const copy = async () => {
    try { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  };

  const sendFeedback = async (helpful: boolean) => {
    if (!message.id) { setFeedbackError("Feedback needs a saved message — reopen this conversation and try again."); return; }
    setFeedbackError("");
    const r = await api.sendFeedback(message.id, helpful);
    if (r.success) setFeedback(helpful ? "helpful" : "not-helpful");
    else setFeedbackError(r.error?.message || "Could not save feedback.");
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white"><Bot className="h-4 w-4" /></span>}
      <div className={`w-full max-w-3xl rounded-lg border px-4 py-3 ${isUser ? "border-primary bg-primary text-white" : "border-border bg-surface"}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <>
            {message.mode && <div className="mb-2"><RetrievalModeBadge mode={message.mode} /></div>}
            <div className="prose-chat text-sm text-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              {streaming && <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-secondary" />}
            </div>
          </>
        )}
        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationPanel citations={message.citations} selected={selectedCitation} onSelect={onSelectCitation} />
        )}
        {!isUser && !streaming && (
          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border pt-2">
            <button onClick={copy} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-body hover:bg-background hover:text-heading">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
            {isLast && onRegenerate && (
              <button onClick={onRegenerate} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-body hover:bg-background hover:text-heading">
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
              </button>
            )}
            <span className="mx-1 h-4 w-px bg-border" />
            <span className="text-xs text-body">Was this helpful?</span>
            <button onClick={() => sendFeedback(true)} disabled={feedback !== null} aria-label="Helpful"
              className={`rounded p-1.5 ${feedback === "helpful" ? "bg-green-50 text-success" : "text-body hover:bg-background hover:text-heading"} disabled:opacity-60`}>
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button onClick={() => sendFeedback(false)} disabled={feedback !== null} aria-label="Not helpful"
              className={`rounded p-1.5 ${feedback === "not-helpful" ? "bg-red-50 text-error" : "text-body hover:bg-background hover:text-heading"} disabled:opacity-60`}>
              <ThumbsDown className="h-4 w-4" />
            </button>
            {feedback && <span className="text-xs text-success">Thanks for your feedback.</span>}
            {feedbackError && <span className="text-xs text-error">{feedbackError}</span>}
          </div>
        )}
      </div>
      {isUser && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-white"><User className="h-4 w-4" /></span>}
    </div>
  );
}
