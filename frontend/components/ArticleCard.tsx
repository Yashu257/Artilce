"use client";
import Link from "next/link";
import Image from "next/image";
import { Calendar, FileText, ChevronRight } from "lucide-react";
import type { Article } from "../lib/types";

function getThumbnail(a: Article): string {
  if (a.thumbnailUrl) return a.thumbnailUrl.startsWith("/") ? a.thumbnailUrl : `/${a.thumbnailUrl}`;
  if (a.slug === "launch-deck-phase-iii-lte-safety-study") return "/thumbnails/launch-deck-phase-iii-lte.png";
  if (a.slug === "launch-deck-rwe-german-comparative-kork-study") return "/thumbnails/launch-deck-rwe-german-comparative.png";
  return `/thumbnails/${a.slug}.png`;
}

export default function ArticleCard({ article }: { article: Article }) {
  const thumbnail = getThumbnail(article);

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-200 hover:border-teal-600/70 hover:shadow-md"
    >
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        <Image
          src={thumbnail}
          alt={article.title}
          fill
          className="object-cover group-hover:scale-102 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-block rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200/50 shadow-2xs">
            {article.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-sm sm:text-base font-bold leading-snug text-slate-900 group-hover:text-teal-800 transition-colors">
          {article.title}
        </h3>

        <p className="mt-2 line-clamp-2 flex-1 text-xs text-slate-600 leading-relaxed font-normal">
          {article.summary}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span>
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })
                : "2026 Edition"}
            </span>
          </div>

          <div className="flex items-center gap-1 text-teal-700 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Read Publication</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
