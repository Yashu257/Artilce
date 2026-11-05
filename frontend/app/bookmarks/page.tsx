"use client";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { Article } from "../../lib/types";
import ArticleCard from "../../components/ArticleCard";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";

export default function BookmarksPage() {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getBookmarks().then(setItems).catch((e) => setError(apiErrorMessage(e))).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold text-heading">Bookmarks</h1><p className="mt-1 text-sm text-body">Articles you saved for later.</p></div>
      {error && <div className="flex items-start gap-2 rounded-md border border-error/30 bg-red-50 px-3 py-2 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {loading ? <LoadingState message="Loading bookmarks…" /> : items.length === 0 ? (
        <EmptyState title="No bookmarks yet" message="Open an article and tap Bookmark to save it here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
      )}
    </div>
  );
}
