"use client";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp, Sparkles } from "lucide-react";
import type { ChatMessageItem, Citation } from "../lib/types";
import CitationPanel from "./CitationPanel";
import { api } from "../lib/api";

interface ChatMessageProps {
  message: ChatMessageItem;
  streaming?: boolean;
  isLast?: boolean;
  onRegenerate?: () => void;
}

export default function ChatMessage({
  message,
  streaming = false,
  isLast = false,
  onRegenerate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const isUser = message.role === "user";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const sendFeedback = async (helpful: boolean) => {
    if (!message.id || feedbackLoading) return;
    setFeedbackLoading(true);
    try {
      const r = await api.sendFeedback(message.id, helpful);
      if (r.success) {
        setFeedback(helpful ? "helpful" : "not-helpful");
      }
    } catch {
      // Ignore feedback error silently
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-4">
        <div className="max-w-[85%] sm:max-w-xl rounded-3xl bg-slate-100/90 text-slate-900 px-5 py-3 text-sm leading-relaxed border border-slate-200/70 shadow-2xs">
          <p className="whitespace-pre-wrap font-normal">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message (ChatGPT-style)
  return (
    <div className="flex gap-4 my-6 group">
      {/* Cipla Assistant Avatar */}
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-white shadow-2xs">
        <Sparkles className="h-4 w-4 text-teal-200" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Markdown Content */}
        <div className="prose prose-slate max-w-none text-slate-800 text-sm sm:text-[15px] leading-relaxed
          prose-headings:text-slate-900 prose-headings:font-bold prose-headings:tracking-tight
          prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-teal-950
          prose-h4:text-sm prose-h4:mt-3 prose-h4:mb-1
          prose-p:my-2 prose-p:leading-relaxed
          prose-ul:my-2 prose-ul:pl-5 prose-li:my-1
          prose-strong:text-slate-900 prose-strong:font-semibold">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Style inline citations like [1], [2] nicely
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="font-medium text-teal-700 hover:text-teal-900 underline decoration-teal-300 underline-offset-2"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
          {streaming && (
            <span className="inline-block h-4 w-1.5 ml-1 bg-teal-700 animate-pulse align-middle" />
          )}
        </div>

        {/* Deduplicated Source Citations */}
        {message.citations && message.citations.length > 0 && (
          <CitationPanel citations={message.citations} />
        )}

        {/* Message Actions (Copy, Regenerate, Feedback) */}
        {!streaming && message.content && (
          <div className="mt-3 flex items-center gap-1.5 pt-1 text-slate-400">
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Copy answer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-teal-700" />
                  <span className="text-teal-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Regenerate answer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Regenerate</span>
              </button>
            )}

            <span className="mx-1 h-3.5 w-px bg-slate-200" />

            <button
              onClick={() => sendFeedback(true)}
              disabled={feedback !== null || feedbackLoading}
              className={`p-1.5 rounded-lg transition-colors ${
                feedback === "helpful"
                  ? "bg-teal-50 text-teal-700"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title="Helpful response"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => sendFeedback(false)}
              disabled={feedback !== null || feedbackLoading}
              className={`p-1.5 rounded-lg transition-colors ${
                feedback === "not-helpful"
                  ? "bg-rose-50 text-rose-600"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title="Not helpful"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>

            {feedback && (
              <span className="text-[11px] font-medium text-slate-500 ml-1">
                Feedback saved
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
