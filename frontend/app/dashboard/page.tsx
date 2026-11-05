"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Bot, FileText, Search, AlertCircle, Activity } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { DashboardData } from "../../lib/types";
import ArticleCard from "../../components/ArticleCard";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.getDashboard().then(setData).catch((e) => setError(apiErrorMessage(e)));
  }, []);

  if (error) return (
    <div className="rounded-lg border border-error/30 bg-red-50 p-6 text-sm text-error">
      <p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Could not load the dashboard</p>
      <p className="mt-1">{error}</p>
      <p className="mt-1 text-body">Check that the backend is running at http://localhost:4000 and you are signed in, then refresh.</p>
    </div>
  );
  if (!data) return <LoadingState message="Loading dashboard…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-heading">Dashboard</h1>
        <p className="mt-1 text-sm text-body">Evidence-based clinical knowledge, grounded in Cipla medical resources.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); router.push(`/articles?search=${encodeURIComponent(q)}`); }} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles, documents, topics…" aria-label="Search"
          className="w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-sm text-body"><BookOpen className="h-4 w-4 text-primary" /> Articles</p>
          <p className="mt-2 text-3xl font-semibold text-heading">{data.totalArticles}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-sm text-body"><FileText className="h-4 w-4 text-primary" /> Documents</p>
          <p className="mt-2 text-3xl font-semibold text-heading">{data.totalDocuments}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-sm text-body"><Activity className="h-4 w-4 text-primary" /> Categories</p>
          <p className="mt-2 text-3xl font-semibold text-heading">{data.categories.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-heading">Browse by category</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.categories.length === 0 && <p className="text-sm text-body">No categories yet.</p>}
            {data.categories.map((c) => (
              <Link key={c.slug || c.name} href={`/articles?category=${encodeURIComponent(c.slug || c.name)}`}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-heading hover:border-secondary hover:text-primary">
                {c.name} <span className="text-body">({c.count})</span>
              </Link>
            ))}
          </div>
          <Link href="/ai-assistant" className="mt-5 flex items-center gap-3 rounded-lg bg-primary p-4 text-white hover:bg-secondary">
            <Bot className="h-6 w-6 shrink-0" />
            <span><span className="block font-medium">Ask the AI Assistant</span>
            <span className="block text-sm text-white/80">Answers grounded in Cipla documents, with page-level citations.</span></span>
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-heading">Recent activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="mt-3 text-sm text-body">No recent activity yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.recentActivity.slice(0, 8).map((a) => (
                <li key={a.id} className="border-b border-border pb-2 last:border-0">
                  <span className="font-medium text-heading">{a.action}</span>
                  {a.entityType && <span className="text-body"> · {a.entityType}</span>}
                  <span className="block text-xs text-body">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Popular articles</h2>
          <Link href="/articles?sort=newest" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {data.popular.length === 0 ? <EmptyState title="No popular articles yet" message="Articles will appear here once they are viewed." /> : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.popular.slice(0, 3).map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-heading">Recently viewed</h2>
        {data.recentlyViewed.length === 0 ? <EmptyState title="Nothing viewed yet" message="Articles you open will show up here." /> : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.recentlyViewed.slice(0, 3).map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}
      </section>
    </div>
  );
}
