import Link from "next/link";
import Image from "next/image";
import { Calendar, FileText } from "lucide-react";
import type { Article } from "../lib/types";

function thumb(a: Article): string | null {
  if (a.thumbnailUrl) return a.thumbnailUrl.startsWith("/") ? a.thumbnailUrl : `/${a.thumbnailUrl}`;
  return null;
}

export default function ArticleCard({ article }: { article: Article }) {
  const t = thumb(article);
  return (
    <Link href={`/articles/${article.slug}`} className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition hover:border-secondary hover:shadow-sm">
      {t ? (
        <div className="relative h-40 w-full overflow-hidden bg-background">
          <Image src={t} alt={article.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center bg-primary/5"><FileText className="h-10 w-10 text-secondary" /></div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <span className="mb-2 inline-block w-fit rounded bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">{article.category}</span>
        <h3 className="text-base font-semibold leading-snug text-heading group-hover:text-primary">{article.title}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-body">{article.summary}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-body">
          {article.publishedAt && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(article.publishedAt).toLocaleDateString()}</span>}
          {article.pdfPages ? <span>{article.pdfPages} pages</span> : null}
        </div>
      </div>
    </Link>
  );
}
