"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Bookmark, BookmarkCheck, Calendar, FileText, Printer, Share2 } from "lucide-react";
import { api, apiErrorMessage } from "../../../lib/api";
import type { Article } from "../../../lib/types";
import ArticleCard from "../../../components/ArticleCard";
import LoadingState from "../../../components/LoadingState";

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [error, setError] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => {
    if (!slug) return;
    api.getArticle(slug).then((a) => {
      setArticle(a);
      api.markViewed(a.id).catch(() => undefined);
      api.getArticles({ category: a.category, limit: 4 }).then((r) => setRelated(r.items.filter((x) => x.id !== a.id).slice(0, 3))).catch(() => undefined);
    }).catch((e) => setError(apiErrorMessage(e)));
  }, [slug]);

  const toggleBookmark = async () => {
    if (!article) return;
    try {
      const r = await api.bookmarkArticle(article.id);
      setBookmarked(r.bookmarked);
    } catch (e) { setShareMsg(apiErrorMessage(e)); }
  };

  const share = async () => {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); setShareMsg("Link copied to clipboard."); }
    catch { setShareMsg(url); }
  };

  if (error) return <div className="rounded-lg border border-error/30 bg-red-50 p-6 text-sm text-error"><p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Article not found</p><p className="mt-1">{error}</p></div>;
  if (!article) return <LoadingState message="Loading article…" />;

  const pdfUrl = article.pdfFileName ? "/documents" : null;

  return (
    <article className="space-y-6">
      <div>
        <span className="rounded bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">{article.category}</span>
        <h1 className="mt-3 text-2xl font-semibold leading-snug text-heading sm:text-3xl">{article.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-body">
          {article.publishedAt && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(article.publishedAt).toLocaleDateString()}</span>}
          {article.pdfPages ? <span>{article.pdfPages} pages</span> : null}
        </div>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-body">{article.summary}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={toggleBookmark} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-heading hover:bg-background">
          {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
          {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        {pdfUrl && (
          <Link href={pdfUrl} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-secondary">
            <FileText className="h-4 w-4" /> View source documents
          </Link>
        )}
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-heading hover:bg-background"><Printer className="h-4 w-4" /> Print</button>
        <button onClick={share} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-heading hover:bg-background"><Share2 className="h-4 w-4" /> Share</button>
      </div>
      {shareMsg && <p className="text-sm text-secondary">{shareMsg}</p>}

      {article.content && (
        <div className="prose-chat max-w-3xl rounded-lg border border-border bg-surface p-6 text-sm leading-relaxed text-body">
          <div className="whitespace-pre-wrap">{article.content}</div>
        </div>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-heading">Related articles</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {related.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      )}
    </article>
  );
}
