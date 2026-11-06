"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Plus,
  Search,
  ArrowUp,
  Square,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  LayoutDashboard,
  ShieldAlert,
} from "lucide-react";
import { API_BASE, api, apiErrorMessage } from "../../lib/api";
import type { ChatMessageItem, Citation, Conversation, DocumentItem } from "../../lib/types";
import ChatMessage from "../../components/ChatMessage";
import LoadingState from "../../components/LoadingState";

const DEFAULT_SUGGESTIONS = [
  {
    title: "Early Initiation Evidence",
    desc: "Retention rates & seizure freedom in early vs later therapy lines",
    query: "What clinical evidence is available for early initiation of cenobamate?",
  },
  {
    title: "Phase III LTE Safety",
    desc: "Long-term extension findings & absence of DRESS cases",
    query: "Summarise the Phase III long-term extension safety data and DRESS findings.",
  },
  {
    title: "Concomitant ASM Reduction",
    desc: "Spanish consensus on tapering and deprescribing baseline ASMs",
    query: "What does the Spanish consensus recommend about reducing concomitant ASMs when using cenobamate?",
  },
  {
    title: "Real-World Evidence (RWE)",
    desc: "German KORK study comparing cenobamate with other ASMs",
    query: "What did the German KORK study find when comparing cenobamate with other ASMs?",
  },
];

interface StreamResult {
  answer: string;
  citations: Citation[];
  conversationId?: string;
  mode?: string;
  messageId?: string;
}

async function streamChat(
  question: string,
  conversationId: string | null,
  onToken: (t: string) => void,
  signal: AbortSignal
): Promise<StreamResult> {
  const res = await fetch(`${API_BASE}/assistant/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ question, conversationId: conversationId ?? undefined }),
    signal,
  });

  if (!res.ok) {
    const j = await res.json().catch(() => null);
    const msg = j?.error?.message || `Chat failed (${res.status})`;
    throw new Error(msg);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    const j = await res.json();
    const d = j.data ?? j;
    return {
      answer: d.answer ?? "",
      citations: d.citations ?? [],
      conversationId: d.conversationId,
      mode: d.mode ?? d.retrievalMode,
      messageId: d.messageId ?? d.assistantMessageId,
    };
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let citations: Citation[] = [];
  let convId = conversationId ?? undefined;
  let mode: string | undefined;
  let messageId: string | undefined;

  const handleEvent = (raw: string) => {
    for (const line of raw.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const j = JSON.parse(payload);
        if (typeof j.token === "string") {
          answer += j.token;
          onToken(j.token);
        } else if (typeof j.answer === "string") {
          const delta = j.answer.slice(answer.length);
          answer = j.answer;
          if (delta) onToken(delta);
        } else if (typeof j.content === "string") {
          answer += j.content;
          onToken(j.content);
        }
        if (Array.isArray(j.citations)) citations = j.citations;
        if (j.conversationId) convId = j.conversationId;
        if (j.mode) mode = j.mode;
        if (j.messageId || j.assistantMessageId) messageId = j.messageId ?? j.assistantMessageId;
      } catch {
        /* ignore partial SSE lines */
      }
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

export default function AiAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Conversation renaming state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const loadConversations = async () => {
    try {
      const list = await api.getConversations();
      setConversations(list);
    } catch (e) {
      const msg = apiErrorMessage(e);
      if (/401/.test(msg)) setError("Your session has expired. Please sign in again.");
    }
  };

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
  }, []);

  // Track if user is at bottom so streaming auto-scrolls only when appropriate
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 100;
    isAtBottomRef.current = atBottom;
  };

  // Scroll to bottom when streaming or messages update
  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streaming]);

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const newConversation = () => {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setError("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const openConversation = async (id: string) => {
    setActiveId(id);
    setError("");
    try {
      const c = await api.getConversation(id);
      setMessages(c.messages ?? []);
      isAtBottomRef.current = true;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  const startRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = async (id: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await api.renameConversation(id, editTitle.trim());
      setConversations((cs) =>
        cs.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c))
      );
    } catch {
      // Ignore error
    } finally {
      setEditingId(null);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this clinical conversation?")) return;
    try {
      await api.deleteConversation(id);
      setConversations((cs) => cs.filter((c) => c.id !== id));
      if (activeId === id) newConversation();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const ask = async (question: string, opts: { appendUser?: boolean } = {}) => {
    const q = question.trim();
    if (!q || streaming) return;
    setError("");
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const appendUser = opts.appendUser !== false;
    setMessages((m) =>
      appendUser
        ? [...m, { role: "user", content: q }, { role: "assistant", content: "" }]
        : [...m, { role: "assistant", content: "" }]
    );
    setStreaming(true);
    isAtBottomRef.current = true;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let convId: string | null = activeId;

    // Smooth ChatGPT-style typewriter queue
    let queue: string[] = [];
    let displayedText = "";
    let isStreamDone = false;
    let typingTimer: NodeJS.Timeout | null = null;

    const drainPromise = new Promise<void>((resolve) => {
      typingTimer = setInterval(() => {
        if (queue.length > 0) {
          // Adaptive typing pace: if backlog is large, type more characters; otherwise 2-4 chars per frame
          const takeCount = queue.length > 80 ? 6 : queue.length > 30 ? 4 : queue.length > 10 ? 2 : 1;
          const chunk = queue.splice(0, takeCount).join("");
          displayedText += chunk;
          setMessages((m) => {
            const copy = [...m];
            const last = copy[copy.length - 1];
            if (last && last.role === "assistant") {
              copy[copy.length - 1] = { ...last, content: displayedText };
            }
            return copy;
          });
        } else if (isStreamDone) {
          if (typingTimer) clearInterval(typingTimer);
          resolve();
        }
      }, 16); // ~60fps typewriter tick
    });

    try {
      const result = await streamChat(
        q,
        activeId,
        (token) => {
          // Push incoming characters into typewriter queue
          for (const char of token) {
            queue.push(char);
          }
        },
        ctrl.signal
      );

      // Signal stream done and wait for typewriter to finish typing all remaining text
      isStreamDone = true;
      await drainPromise;

      convId = result.conversationId ?? convId;
      if (convId) {
        setActiveId(convId);
      }

      // Finalize assistant message with citations and metadata
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          copy[copy.length - 1] = {
            role: "assistant",
            content: result.answer || displayedText || last.content,
            citations: result.citations,
            mode: result.mode,
            id: result.messageId,
          };
        }
        return copy;
      });

      loadConversations();
    } catch (e) {
      isStreamDone = true;
      if (typingTimer) clearInterval(typingTimer);
      queue = [];

      if ((e as Error).name === "AbortError") {
        setMessages((m) => {
          const last = m[m.length - 1];
          return last?.role === "assistant" && !last.content ? m.slice(0, -1) : m;
        });
      } else {
        const msg = apiErrorMessage(e);
        if (/401/.test(msg)) {
          setError("Your session has expired. Redirecting to sign in…");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1200);
        } else {
          setError(msg);
        }
        setMessages((m) => m.slice(0, appendUser ? -2 : -1));
      }
    } finally {
      if (typingTimer) clearInterval(typingTimer);
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const regenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || streaming) return;
    setMessages((m) => {
      const copy = [...m];
      if (copy[copy.length - 1]?.role === "assistant") copy.pop();
      return copy;
    });
    ask(lastUser.content, { appendUser: false });
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingState message="Loading clinical intelligence assistant…" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-white select-none">
      {/* 1. ChatGPT-Style Left Conversation Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-200 bg-[#F9FBFA] transition-all duration-200 shrink-0 ${
          sidebarOpen ? "w-72" : "w-0 overflow-hidden border-r-0"
        }`}
      >
        {/* Sidebar Header: New Chat */}
        <div className="p-3 border-b border-slate-200/80 space-y-2">
          <button
            onClick={newConversation}
            className="flex w-full items-center justify-between px-3.5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs shadow-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>New consultation</span>
            </div>
            <Sparkles className="h-3.5 w-3.5 text-teal-200" />
          </button>

          {/* Search Conversations */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-white border border-slate-200/90 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700"
            />
          </div>
        </div>

        {/* Conversations History List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Consultation History
          </div>

          {filteredConversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-400">
              {searchQuery ? "No matching consultations." : "No saved consultations yet."}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const active = activeId === c.id;
              const isEditing = editingId === c.id;

              if (isEditing) {
                return (
                  <form
                    key={c.id}
                    onSubmit={(e) => saveRename(c.id, e)}
                    className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-teal-600"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-transparent focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="p-1 text-teal-700 hover:text-teal-900"
                      title="Save"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </form>
                );
              }

              return (
                <div
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    active
                      ? "bg-teal-50/80 text-teal-900 font-semibold border border-teal-200/70 shadow-2xs"
                      : "text-slate-700 hover:bg-slate-200/60 font-normal"
                  }`}
                >
                  <span className="truncate pr-8">{c.title}</span>

                  {/* Actions on hover */}
                  <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startRename(c, e)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white/80"
                      title="Rename"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => deleteConversation(c.id, e)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white/80"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer with Quick Links */}
        <div className="p-3 border-t border-slate-200/80 space-y-1 text-xs">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-teal-800 hover:bg-slate-200/50 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Clinical Dashboard</span>
          </Link>
          <Link
            href="/articles"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-teal-800 hover:bg-slate-200/50 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Clinical Publications</span>
          </Link>
        </div>
      </aside>

      {/* 2. Main ChatGPT-Style Conversation Viewport */}
      <section className="flex flex-1 flex-col h-full min-w-0 bg-white relative">
        {/* Top Floating Control Bar */}
        <header className="flex items-center justify-between h-14 px-4 border-b border-slate-100 bg-white/90 backdrop-blur-xs z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 truncate max-w-sm sm:max-w-md">
                {activeId
                  ? conversations.find((c) => c.id === activeId)?.title || "Consultation"
                  : "Clinical AI Assistant"}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/60">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse" />
                Evidence Grounded
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={newConversation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-800 hover:bg-teal-50 border border-teal-200 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </header>

        {/* Scrollable Conversation Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
        >
          <div className="max-w-3xl sm:max-w-4xl mx-auto w-full">
            {/* Initial Welcome Screen (When no active conversation) */}
            {messages.length === 0 ? (
              <div className="py-12 sm:py-16 space-y-8 animate-fade-in">
                {/* Emblem & Hero */}
                <div className="text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-md">
                    <Bot className="w-7 h-7" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    How can I help you today?
                  </h1>
                  <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    Explore clinical evidence and medical information from the available Cipla knowledge resources.
                  </p>
                </div>

                {/* 4 Suggested Question Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  {DEFAULT_SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => ask(s.query)}
                      disabled={streaming}
                      className="group flex flex-col items-start p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-teal-50/50 hover:border-teal-600/50 text-left transition-all shadow-2xs hover:shadow-xs disabled:opacity-50"
                    >
                      <span className="text-xs font-bold text-slate-800 group-hover:text-teal-900">
                        {s.title}
                      </span>
                      <span className="text-xs text-slate-500 group-hover:text-teal-800/80 mt-1 line-clamp-2 leading-relaxed">
                        {s.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Active Messages */
              messages.map((m, i) => (
                <ChatMessage
                  key={m.id || i}
                  message={m}
                  streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
                  isLast={i === messages.length - 1}
                  onRegenerate={m.role === "assistant" ? regenerate : undefined}
                />
              ))
            )}

            {/* Error Message */}
            {error && (
              <div className="my-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 3. Sticky Bottom Composer */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-3 pb-5 px-4 shrink-0">
          <div className="max-w-3xl sm:max-w-4xl mx-auto w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="relative flex flex-col rounded-2xl sm:rounded-3xl border border-slate-300/80 bg-white shadow-md focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700/20 transition-all"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                rows={1}
                placeholder="Ask clinical questions on cenobamate evidence, dosing, titration..."
                className="w-full resize-none bg-transparent px-5 pt-3.5 pb-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none min-h-[48px] max-h-[160px]"
              />

              <div className="flex items-center justify-between px-4 pb-2.5 pt-1">
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Enter to send · Shift+Enter for new line · Grounded in verified publications
                </span>
                <span className="sm:hidden" />

                {streaming ? (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-xs"
                    title="Stop generating"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-30 disabled:hover:bg-teal-700 transition-all shadow-xs"
                    title="Send message"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              Cipla MedKnowledge AI is an evidence support tool. Clinical decisions must be verified against original publications.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
