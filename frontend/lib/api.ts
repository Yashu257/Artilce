import type { ApiResponse, Article, Category, Conversation, DashboardData, DocumentItem, User } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok) {
    // Honest auth handling (req. 4): a 401 means the session is gone — send the
    // user to sign in again instead of silently showing empty data. 403 is a
    // real authorisation denial for this user/resource: surface it, don't redirect.
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && !path.startsWith("/auth/")) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    return {
      success: false,
      error: json?.error || { code: `HTTP_${res.status}`, message: `Request failed (${res.status})` },
    };
  }
  return json ?? { success: true, data: undefined as T };
}

function unwrap<T>(r: ApiResponse<T>): T {
  if (!r.success || r.data === undefined) throw new Error(r.error?.message || "Request failed");
  return r.data;
}

export function apiErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

/** Normalise list responses: backend may return an array directly or { items, total } / { data, meta }. */
function asList<T>(data: unknown): { items: T[]; total: number } {
  if (Array.isArray(data)) return { items: data as T[], total: data.length };
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.items)) return { items: d.items as T[], total: Number(d.total ?? d.items.length) };
    if (Array.isArray(d.articles)) return { items: d.articles as T[], total: Number(d.total ?? d.articles.length) };
    if (Array.isArray(d.documents)) return { items: d.documents as T[], total: Number(d.total ?? d.documents.length) };
  }
  return { items: [], total: 0 };
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<User>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),
  forgotPassword: (email: string) =>
    request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),

  // Dashboard
  getDashboard: async (): Promise<DashboardData> => unwrap(await request<DashboardData>("/dashboard")),

  // Articles
  getArticles: async (params: { search?: string; category?: string; sort?: string; page?: number; limit?: number }): Promise<{ items: Article[]; total: number; meta?: { page: number; total: number } }> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.category) q.set("category", params.category);
    if (params.sort) q.set("sort", params.sort);
    q.set("page", String(params.page ?? 1));
    q.set("limit", String(params.limit ?? 12));
    const r = await request<unknown>(`/articles?${q.toString()}`);
    if (!r.success) throw new Error(r.error?.message || "Failed to load articles");
    const list = asList<Article>(r.data);
    return { items: list.items, total: r.meta?.total ?? list.total, meta: r.meta };
  },
  getArticle: async (slugOrId: string): Promise<Article> => unwrap(await request<Article>(`/articles/${encodeURIComponent(slugOrId)}`)),
  getCategories: async (): Promise<Category[]> => {
    const r = await request<unknown>("/articles/categories");
    if (!r.success) throw new Error(r.error?.message || "Failed to load categories");
    return asList<Category>(r.data).items;
  },
  bookmarkArticle: async (id: string) => unwrap(await request<{ bookmarked: boolean }>(`/articles/${id}/bookmark`, { method: "POST" })),
  getBookmarks: async (): Promise<Article[]> => {
    const r = await request<unknown>("/articles/bookmarks");
    if (!r.success) throw new Error(r.error?.message || "Failed to load bookmarks");
    return asList<Article>(r.data).items;
  },
  markViewed: (id: string) => request(`/articles/${id}/viewed`, { method: "POST" }),

  // Documents
  getDocuments: async (params: { search?: string; category?: string; type?: string }): Promise<DocumentItem[]> => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.category) q.set("category", params.category);
    if (params.type) q.set("type", params.type);
    const r = await request<unknown>(`/documents?${q.toString()}`);
    if (!r.success) throw new Error(r.error?.message || "Failed to load documents");
    return asList<DocumentItem>(r.data).items;
  },
  getDocument: async (id: string): Promise<DocumentItem> => unwrap(await request<DocumentItem>(`/documents/${encodeURIComponent(id)}`)),
  documentFileUrl: (id: string) => `${API_BASE}/documents/${encodeURIComponent(id)}/file`,
  uploadDocument: async (form: FormData): Promise<DocumentItem> => {
    const res = await fetch(`${API_BASE}/documents`, { method: "POST", credentials: "include", body: form });
    const json = (await res.json().catch(() => null)) as ApiResponse<DocumentItem> | null;
    if (!res.ok) throw new Error(json?.error?.message || `Upload failed (${res.status})`);
    return unwrap(json ?? { success: false });
  },
  deleteDocument: (id: string) => request(`/documents/${id}`, { method: "DELETE" }),
  reprocessDocument: (id: string) => request(`/documents/${id}/reprocess`, { method: "POST" }),

  // AI Assistant — SSE streaming via fetch
  getConversations: async (): Promise<Conversation[]> => {
    const r = await request<unknown>("/assistant/conversations");
    if (!r.success) throw new Error(r.error?.message || "Failed to load conversations");
    return asList<Conversation>(r.data).items;
  },
  getConversation: async (id: string): Promise<Conversation> => {
    const c = unwrap(await request<Conversation>(`/assistant/conversations/${encodeURIComponent(id)}`));
    // Backend stores citations as a JSON string (citationsJson) on Message;
    // normalise to the typed citations array the UI renders.
    if (c.messages) {
      c.messages = c.messages.map((m) => {
        let citations = m.citations;
        if (!citations && m.citationsJson) {
          try { const parsed = JSON.parse(m.citationsJson); if (Array.isArray(parsed)) citations = parsed; } catch { /* keep undefined */ }
        }
        return { ...m, citations };
      });
    }
    return c;
  },
  deleteConversation: (id: string) => request(`/assistant/conversations/${id}`, { method: "DELETE" }),
  renameConversation: (id: string, title: string) => request(`/assistant/conversations/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ title }) }),
  sendFeedback: (messageId: string, helpful: boolean) => {
    if (!messageId) return Promise.resolve({ success: false, error: { code: "NO_MESSAGE_ID", message: "This answer has no saved message id yet — open the conversation again to leave feedback." } } as ApiResponse<unknown>);
    return request("/assistant/feedback", { method: "POST", body: JSON.stringify({ messageId, helpful }) });
  },

  // Admin
  getAdminUsers: async (): Promise<User[]> => {
    const r = await request<unknown>("/admin/users");
    if (!r.success) throw new Error(r.error?.message || "Failed to load users");
    return asList<User>(r.data).items;
  },
  getAdminDocumentStatus: async (): Promise<DocumentItem[]> => {
    const r = await request<unknown>("/admin/documents/status");
    if (!r.success) throw new Error(r.error?.message || "Failed to load document status");
    return asList<DocumentItem>(r.data).items;
  },
  getAdminActivity: async (): Promise<unknown[]> => {
    const r = await request<unknown>("/admin/activity");
    if (!r.success) throw new Error(r.error?.message || "Failed to load activity");
    return asList<unknown>(r.data).items;
  },
  health: () => request("/health"),
};
