"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Bot, Loader2, Plus, Search, Send, Square, Trash2 } from "lucide-react";
import { API_BASE, api, apiErrorMessage } from "../../lib/api";
import type { ChatMessageItem, Citation, Conversation, DocumentItem, RetrievalMode } from "../../lib/types";
import ChatMessage from "../../components/ChatMessage";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import RetrievalModeBadge from "../../components/RetrievalModeBadge";
import SourcePreviewPanel from "../../components/SourcePreviewPanel";

/** Fallback questions only when no indexed documents can be loaded. */
const FALLBACK_SUGGESTED = [
  "What does the evidence say about early initiation of treatment?",
  "Summarise the Phase III long-term extension safety data.",
  "What are the titration and dosing guidelines?",
  "When can monotherapy be considered, and how is concomitant ASM deprescribing approached?",
];

interface StreamResult {
  answer: string; citations: Citation[]; conversationId?: string;
  mode?: RetrievalMode | string; messageId?: string;
}

async function streamChat(question: string, conversationId: string | null, onToken: (t: string) => void, signal: AbortSignal): Promise<StreamResult> {
  const res = await fetch(`${API_BASE}/assistant/chat`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ question, conversationId: conversationId ?? undefined }),
    signal,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    const msg = j?.error?.message || `Chat failed (${res.status})`;
    throw new Error(res.status === 401 ? `401 Unauthorized — ${msg}` : res.status === 403 ? `403 Forbidden — ${msg}` : msg);
  }
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    const j = await res.json();
    const d = j.data ?? j;
    return { answer: d.answer ?? "", citations: d.citations ?? [], conversationId: d.conversationId, mode: d.mode ?? d.retrievalMode, messageId: d.messageId ?? d.assistantMessageId };
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let citations: Citation[] = [];
  let convId = conversationId ?? undefined;
  let mode: RetrievalMode | string | undefined;
  let messageId: string | undefined;
  const handleEvent = (raw: string) => {
    for (const line of raw.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const j = JSON.parse(payload);
        if (typeof j.token === "string") { answer += j.token; onToken(j.token); }
        else if (typeof j.answer === "string") { const delta = j.answer.slice(answer.length); answer = j.answer; if (delta) onToken(delta); }
        else if (typeof j.content === "string") { answer += j.content; onToken(j.content); }
        if (Array.isArray(j.citations)) citations = j.citations;
        if (j.conversationId) convId = j.conversationId;
        if (j.mode || j.retrievalMode) mode = j.mode ?? j.retrievalMode;
        if (j.messageId || j.assistantMessageId) messageId = j.messageId ?? j.assistantMessageId;
      } catch { /* ignore partial SSE lines */ }
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      handleEvent(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
  if (buffer.trim()) handleEvent(buffer);
  return { answer, citations, conversationId: convId, mode, messageId };
}

/** Suggested questions derived from the actually indexed documents. */
function suggestionsFromDocs(docs: DocumentItem[]): string[] {
  const qs: string[] = [];
  for (const d of docs.slice(0, 4)) {
    qs.push(`Summarise the key findings of "${d.title}".`);
  }
  if (docs.length > 0) qs.push("What evidence across the indexed documents supports early initiation of treatment?");
  return qs.slice(0, 4);
}

export default function AiAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<RetrievalMode | string | null>(null);
  const [suggested, setSuggested] = useState<string[]>(FALLBACK_SUGGESTED);
  const [suggestedFromDocs, setSuggestedFromDocs] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = () => api.getConversations().then(setConversations).catch((e) => {
    if (/401/.test(apiErrorMessage(e))) setError("Your session has expired. Please sign in again.");
  });

  useEffect(() => {
    Promise.all([loadHistory(), api.getDocuments({}).then((docs) => {
      if (docs.length > 0) { setSuggested(suggestionsFromDocs(docs)); setSuggestedFromDocs(true); }
    }).catch(() => undefined)]).finally(() => setLoading(false));
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  const latestCitations: Citation[] = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].citations?.length) return messages[i].citations!;
    }
    return [];
  })();

  const openConversation = async (id: string) => {
    setActiveId(id); setError(""); setSelectedCitation(null);
    try {
      const c = await api.getConversation(id);
      setMessages(c.messages ?? []);
      const last = [...(c.messages ?? [])].reverse().find((m) => m.role === "assistant");
      if (last?.citations?.length) setSelectedCitation(last.citations[0]);
      if (last?.mode) setMode(last.mode);
    } catch (e) {
      const msg = apiErrorMessage(e);
      setError(/403/.test(msg) ? "You don't have access to this conversation (403). Conversations are private to their owner." : msg);
    }
  };

  const newConversation = () => { setActiveId(null); setMessages([]); setInput(""); setSelectedCitation(null); setMode(null); setError(""); };

  const deleteConversation = async (id: string) => {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    const r = await api.deleteConversation(id);
    if (!r.success) { setError(r.error?.message || "Could not delete the conversation."); return; }
    setConversations((cs) => cs.filter((c) => c.id !== id));
    if (activeId === id) newConversation();
  };

  const ask = async (question: string, opts: { appendUser?: boolean } = {}) => {
    const q = question.trim();
    if (!q || streaming) return;
    setError(""); setInput("");
    const appendUser = opts.appendUser !== false;
    setMessages((m) => appendUser ? [...m, { role: "user", content: q }, { role: "assistant", content: "" }] : [...m, { role: "assistant", content: "" }]);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let convId: string | null = activeId;
    try {
      const result = await streamChat(q, activeId, (token) => {
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") copy[copy.length - 1] = { ...last, content: last.content + token };
          return copy;
        });
      }, ctrl.signal);
      if (result.mode) setMode(result.mode);
      if (result.citations.length) setSelectedCitation(result.citations[0]);
      convId = result.conversationId ?? convId;
      if (convId) {
        setActiveId(convId);
        // Reload the persisted conversation so assistant messages carry their
        // real ids (needed for feedback), stored citations and mode.
        try {
          const saved = await api.getConversation(convId);
          if (saved.messages?.length) setMessages(saved.messages);
          else throw new Error("empty");
        } catch {
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") copy[copy.length - 1] = { role: "assistant", content: result.answer || last.content, citations: result.citations, mode: result.mode, id: result.messageId };
            return copy;
          });
        }
        loadHistory();
      } else {
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") copy[copy.length - 1] = { role: "assistant", content: result.answer || last.content, citations: result.citations, mode: result.mode, id: result.messageId };
          return copy;
        });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setMessages((m) => {
          const last = m[m.length - 1];
          return last?.role === "assistant" && !last.content ? m.slice(0, -1) : m;
        });
      } else {
        const msg = apiErrorMessage(e);
        if (/401/.test(msg)) { setError("Your session has expired. Redirecting to sign-in…"); setTimeout(() => { window.location.href = "/login"; }, 1200); }
        else if (/403/.test(msg)) setError("You don't have access to this conversation (403). Conversations are private to their owner.");
        else setError(msg);
        setMessages((m) => m.slice(0, appendUser ? -2 : -1));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const regenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || streaming) return;
    // Drop the previous assistant answer, then re-ask the same question.
    setMessages((m) => {
      const copy = [...m];
      if (copy[copy.length - 1]?.role === "assistant") copy.pop();
      return copy;
    });
    ask(lastUser.content, { appendUser: false });
  };

  if (loading) return <LoadingState message="Loading assistant…" />;

  return (
    <div className="space-y-4">
      {/* Premium research header — not a generic chatbot. */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-heading"><Bot className="h-6 w-6 text-primary" /> Medical Knowledge Assistant</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-body">
              Ask clinical questions about epilepsy and anti-seizure medication evidence. Every answer is retrieved
              from Cipla&apos;s indexed launch decks and publications — never from memory — and each claim is traceable
              to a document, page and section. If the available resources don&apos;t contain enough information, the
              assistant will say so rather than guess.
            </p>
          </div>
          {mode && <RetrievalModeBadge mode={mode} />}
        </div>
        {!mode && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs text-body">
            <Search className="h-3.5 w-3.5" /> Retrieval mode will be shown here once the backend answers — local retrieval or LLM, as reported by the server.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 xl:flex-row">
        {/* Recent conversations */}
        <aside className="w-full shrink-0 rounded-lg border border-border bg-surface p-4 xl:w-64">
          <button onClick={newConversation} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-secondary"><Plus className="h-4 w-4" /> New conversation</button>
          <h2 className="mt-4 text-xs font-semibold uppercase tracking-wide text-heading">Recent conversations</h2>
          {conversations.length === 0 ? (
            <p className="mt-2 text-sm text-body">No conversations yet. Your conversations are private to your account.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {conversations.map((c) => (
                <li key={c.id} className={`group flex items-center gap-2 rounded-md px-2 py-2 text-sm ${activeId === c.id ? "bg-background font-medium text-heading" : "text-body hover:bg-background"}`}>
                  <button onClick={() => openConversation(c.id)} className="min-w-0 flex-1 truncate text-left">{c.title}</button>
                  <button onClick={() => deleteConversation(c.id)} className="rounded p-1 text-body opacity-0 hover:text-error group-hover:opacity-100" aria-label={`Delete ${c.title}`}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-border pt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-heading"><BookOpen className="h-3.5 w-3.5" /> Suggested questions</p>
            <p className="mt-1 text-xs text-body">{suggestedFromDocs ? "Derived from the documents currently indexed." : "General evidence questions (documents could not be loaded)."}</p>
            <ul className="mt-2 space-y-2">
              {suggested.map((s) => (
                <li key={s}><button onClick={() => ask(s)} disabled={streaming} className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-left text-xs leading-relaxed text-heading hover:border-secondary disabled:opacity-50">{s}</button></li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Chat */}
        <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-border bg-surface">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <EmptyState title="Ask about the evidence" message="Try a suggested question from the indexed documents, or ask your own. Answers include page-level citations you can click to open the exact PDF page." />
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {suggested.map((s) => (
                    <button key={s} onClick={() => ask(s)} disabled={streaming} className="rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm text-heading hover:border-secondary disabled:opacity-50">{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <ChatMessage key={m.id || i} message={m} streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                  isLast={i === messages.length - 1} onRegenerate={m.role === "assistant" ? regenerate : undefined}
                  onSelectCitation={setSelectedCitation} selectedCitation={selectedCitation} />
              ))
            )}
            {streaming && <p className="flex items-center gap-2 text-sm text-body"><Loader2 className="h-4 w-4 animate-spin" /> Generating answer — streaming from the backend…</p>}
            <div ref={bottomRef} />
          </div>

          {error && <p className="border-t border-border bg-red-50 px-4 py-2 text-sm text-error" role="alert">{error}</p>}

          {/* Prominent input */}
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="border-t border-border p-3">
            <div className="rounded-lg border-2 border-primary/30 bg-background p-2 focus-within:border-primary">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder="Ask a clinical question — e.g. what does the Phase III LTE data show on long-term safety?" aria-label="Your question"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
                className="w-full resize-none bg-transparent px-2 py-1 text-sm focus:outline-none" />
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-xs text-body">Enter to send · Shift+Enter for a new line · Answers cite exact PDF pages</span>
                {streaming ? (
                  <button type="button" onClick={() => abortRef.current?.abort()} className="flex items-center gap-1 rounded-md bg-error px-4 py-2 text-sm text-white"><Square className="h-4 w-4" /> Stop</button>
                ) : (
                  <button type="submit" disabled={!input.trim()} className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-secondary disabled:opacity-50"><Send className="h-4 w-4" /> Ask</button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Source preview panel */}
        <SourcePreviewPanel citations={latestCitations} selected={selectedCitation} onSelect={setSelectedCitation} />
      </div>
    </div>
  );
}
