import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';

export default function ArticleCard({ article }) {
  if (!article) return null;

  const targetPath = `/articles/${article.slug || article.id}`;

  return (
    <article className="group flex flex-col justify-between bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-300/80 transition-all duration-200 overflow-hidden">
      <div>
        {/* Publication Visual Cover Image Preview */}
        {article.thumbnail_url && (
          <Link
            to={targetPath}
            tabIndex={-1}
            className="block relative h-48 sm:h-52 w-full overflow-hidden bg-slate-50 border-b border-slate-100 group/img"
          >
            <img
              src={article.thumbnail_url}
              alt={article.title}
              loading="lazy"
              className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-103"
            />
            {/* Subtle Gradient & Category Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-xs text-white border border-white/20">
                {article.category}
              </span>
              {article.pdf_pages && (
                <span className="text-[10px] font-semibold bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-slate-200 border border-white/10">
                  {article.pdf_pages} Slides
                </span>
              )}
            </div>
          </Link>
        )}

        <div className="p-6 sm:p-7 space-y-4">
          {/* Metadata if no thumbnail */}
          {!article.thumbnail_url && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/60">
                {article.category}
              </span>
              {article.reading_time && (
                <span className="inline-flex items-center gap-1 font-medium text-slate-500 text-xs">
                  <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  {article.reading_time}
                </span>
              )}
            </div>
          )}

          {/* Real Clinical PDF Source Badge */}
          {article.pdf_name && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 font-medium">
              <FileText className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="truncate font-mono text-[10.5px] text-slate-700">{article.pdf_name}</span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug line-clamp-2">
            <Link
              to={targetPath}
              className="focus:outline-none focus:underline"
            >
              {article.title}
            </Link>
          </h3>

          {/* Excerpt / Summary */}
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-3">
            {article.summary}
          </p>
        </div>
      </div>

      {/* Footer info & Actions */}
      <div className="px-6 sm:px-7 pb-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          <time dateTime={article.published_at} className="font-medium text-slate-500">
            {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : 'Published 2026'}
          </time>
        </div>

        <div className="flex items-center gap-2">
          {article.pdf_url && (
            <a
              href={article.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open PDF: ${article.pdf_name || article.title}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              title="Open Original PDF"
            >
              <ExternalLink className="w-3 h-3" />
              <span>PDF</span>
            </a>
          )}
          <Link
            to={targetPath}
            aria-label={`Read article: ${article.title}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <span>Read</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
