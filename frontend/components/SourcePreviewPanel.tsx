"use client";
import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import type { Citation } from "../lib/types";
import { relevancePercent } from "./CitationPanel";
import EmptyState from "./EmptyState";

export default function SourcePreviewPanel({ citations, selected, onSelect }: {
  citations: Citation[];
  selected: Citation | null;
  onSelect: (c: Citation) => void;
}) {
  const rel = selected ? relevancePercent(selected.relevance) : null;
  return (
    <aside className="flex w-full shrink-0 flex-col rounded-lg border border-border bg-surface lg:w-80">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-heading">Source preview</h2>
        <p className="text-xs text-body">Every answer is traceable to a document, page and section.</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {!selected ? (
          <EmptyState title="No source selected" message="Ask a question and the retrieved sources will appear here. Select one to preview its excerpt and open the exact PDF page." />
        ) : (
          <div className="space-y-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10"><FileText className="h-5 w-5 text-primary" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-body">Document</p>
              <p className="text-sm font-medium text-heading">{selected.documentName}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-xs text-body">Page</dt><dd className="font-medium text-heading">{selected.page}</dd></div>
              <div><dt className="text-xs text-body">Relevance</dt><dd className="font-medium text-heading">{rel !== null ? `${rel}%` : "—"}</dd></div>
              {selected.section && <div className="col-span-2"><dt className="text-xs text-body">Section</dt><dd className="font-medium text-heading">{selected.section}</dd></div>}
            </dl>
            {selected.excerpt && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-body">Excerpt</p>
                <blockquote className="mt-1 rounded-md bg-background p-3 text-sm leading-relaxed text-body">{selected.excerpt}</blockquote>
              </div>
            )}
            <Link href={`/documents/${selected.documentId}?page=${selected.page}`} className="flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-white hover:bg-secondary">
              <ExternalLink className="h-4 w-4" /> Open PDF at page {selected.page}
            </Link>
          </div>
        )}
        {citations.length > 1 && (
          <div className="mt-5 border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-heading">All sources for this answer</p>
            <ul className="space-y-1">
              {citations.map((c, i) => (
                <li key={`${c.documentId}-${c.page}-${i}`}>
                  <button onClick={() => onSelect(c)} className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${selected?.documentId === c.documentId && selected?.page === c.page ? "bg-primary/10 font-medium text-heading" : "text-body hover:bg-background"}`}>
                    {c.documentName} — p.{c.page}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
