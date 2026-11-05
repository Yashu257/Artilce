"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { Article, Category } from "../../lib/types";
import ArticleCard from "../../components/ArticleCard";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";

const PAGE_SIZE = 12;

function ArticlesContent() {
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await api.getArticles({ search: search || undefined, category: category || undefined, sort, page, limit: PAGE_SIZE });
      setArticles(r.items); setTotal(r.total);
    } catch (e) { setError(apiErrorMessage(e)); }
    setLoading(false);
  }, [search, category, sort, page]);

  useEffect(() => { api.getCategories().then(setCategories).catch(() => undefined); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category, sort]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold text-heading">Articles</h1><p className="mt-1 text-sm text-body">{total} article{total === 1 ? "" : "s"}</p></div>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles…" aria-label="Search articles"
            className="w-full rounded-md border border-border py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category"
          className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug || c.name} value={c.slug || c.name}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort articles"
          className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
      {error && <div className="flex items-start gap-2 rounded-md border border-error/30 bg-red-50 px-3 py-2 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {loading ? <LoadingState message="Loading articles…" /> : articles.length === 0 ? (
        <EmptyState title="No articles found" message="Try a different search term or clear the category filter." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
          <span className="text-sm text-body">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="flex items-center gap-1 rounded-md border border-border bg-surface px-3 py-2 text-sm disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

export default function ArticlesPage() {
  return <Suspense fallback={<LoadingState message="Loading articles…" />}><ArticlesContent /></Suspense>;
}
