"use client";
import Link from "next/link";
import { FileText } from "lucide-react";
import type { Citation } from "../lib/types";

/** Relevance may arrive as 0–1 or 0–100; normalise to a whole percent. */
export function relevancePercent(r?: number): number | null {
  if (r === undefined || r === null || Number.isNaN(r)) return null;
  return Math.round(r > 1 ? r : r * 100);
}

export default function CitationPanel({ citations, selected, onSelect }: {
  citations: Citation[];
  selected?: Citation | null;
  onSelect?: (c: Citation) => void;
}) {
  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-heading">Sources — click to open the exact PDF page</p>
      <ul className="space-y-2">
        {citations.map((c, i) => {
          const rel = relevancePercent(c.relevance);
          const isSelected = selected?.documentId === c.documentId && selected?.page === c.page;
          return (
            <li key={`${c.documentId}-${c.page}-${i}`} className={`rounded-md p-2 ${isSelected ? "bg-primary/10 ring-1 ring-primary" : "bg-background"}`}>
              <div className="flex items-start justify-between gap-2">
                {/* Deep link (mandatory): /documents/:id?page=N — PdfViewer honours ?page=. */}
                <Link href={`/documents/${c.documentId}?page=${c.page}`} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>{c.documentName} — Page {c.page}{c.section ? ` · ${c.section}` : ""}</span>
                </Link>
                {rel !== null && <span className="shrink-0 rounded bg-secondary/10 px-1.5 py-0.5 text-xs font-medium text-secondary">Relevance {rel}%</span>}
              </div>
              {c.excerpt && <p className="mt-1 text-xs leading-relaxed text-body">{c.excerpt}</p>}
              {onSelect && (
                <button onClick={() => onSelect(c)} className="mt-1.5 text-xs font-medium text-primary hover:underline">
                  {isSelected ? "Showing in source preview" : "Preview this source"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-body">This information is for healthcare professionals only and does not replace clinical judgement. Verify against the full source document before acting.</p>
    </div>
  );
}
