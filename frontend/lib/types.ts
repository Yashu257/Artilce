export interface User { id: string; name: string; email: string; role: "doctor" | "admin"; isActive?: boolean; createdAt?: string; }
export interface Category { id?: string; name: string; slug: string; description?: string; count?: number; _count?: { articles?: number }; }
export interface Article {
  id: string; title: string; slug: string; summary: string; category: string;
  content?: string; status?: string; pdfFileName?: string | null; pdfPages?: number | null;
  documentId?: string | null; slideImages?: string[]; sections?: any[];
  thumbnailUrl?: string | null; publishedAt?: string | null; createdAt?: string; updatedAt?: string;
  authors?: string; author?: string | null; readingTime?: string | null; bookmarked?: boolean;
}
export interface ArticleSection { heading: string; content: string; }
export interface DocumentItem {
  id: string; title: string; fileName: string; mimeType?: string; size?: number; category: string;
  status: "pending" | "processing" | "ready" | "failed"; pageCount?: number | null; version?: number;
  uploadedById?: string; createdAt?: string; updatedAt?: string;
}
export interface Citation { documentId: string; documentName: string; page: number; section?: string; excerpt: string; relevance?: number; }
export type RetrievalMode = "local-retrieval" | "llm";
export interface ChatMessageItem { id?: string; role: "user" | "assistant"; content: string; citations?: Citation[]; citationsJson?: string | null; mode?: RetrievalMode | string; createdAt?: string; }
export interface Conversation { id: string; title: string; createdAt: string; updatedAt?: string; messages?: ChatMessageItem[]; }
export interface DashboardData {
  totalArticles: number; totalDocuments: number;
  categories: { name: string; slug?: string; count: number }[];
  recentlyViewed: Article[]; popular: Article[];
  recentActivity: { id: string; action: string; entityType?: string; entityId?: string; createdAt: string; userId?: string | null }[];
}
export interface ApiResponse<T> { success: boolean; data?: T; error?: { code: string; message: string }; meta?: { page: number; total: number; limit?: number }; }
export interface Paginated<T> { items: T[]; page: number; total: number; limit?: number; }
