"use client";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import type { Citation } from "../lib/types";

export function relevancePercent(r?: number): number | null {
  if (r === undefined || r === null || Number.isNaN(r)) return null;
  return Math.round(r > 1 ? r : r * 100);
}

interface CitationPanelProps {
  citations: Citation[];
}

export default function CitationPanel({ citations }: CitationPanelProps) {
  if (!citations || citations.length === 0) return null;

  // Deduplicate sources by documentId and page
  const uniqueCitations = citations.reduce<Citation[]>((acc, current) => {
    const exists = acc.some(
      (c) => c.documentId === current.documentId && c.page === current.page
    );
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  return (
    <div className="mt-4 pt-3.5 border-t border-slate-100">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-xs font-bold text-slate-700 tracking-tight">Sources</span>
        <span className="text-[11px] text-slate-400 font-normal">({uniqueCitations.length} verified clinical reference{uniqueCitations.length === 1 ? '' : 's'})</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueCitations.map((c, i) => {
          const docName = c.documentName || "Clinical Document";
          const pageNum = c.page || 1;
          const href = `/documents/${c.documentId || ''}?page=${pageNum}`;

          return (
            <Link
              key={`${c.documentId}-${pageNum}-${i}`}
              href={href}
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-teal-50/80 border border-slate-200/90 hover:border-teal-600/60 transition-all text-xs text-slate-700 hover:text-teal-900 shadow-2xs"
              title={`Open ${docName} at Page ${pageNum} in the in-app viewer`}
            >
              <FileText className="w-3.5 h-3.5 text-teal-700 shrink-0 group-hover:scale-105 transition-transform" />
              <span className="font-semibold text-slate-800 group-hover:text-teal-900 truncate max-w-[260px] sm:max-w-[340px]">
                {docName}
              </span>
              <span className="shrink-0 font-medium text-teal-800 bg-teal-100/60 px-1.5 py-0.5 rounded-md text-[10px]">
                Page {pageNum}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-teal-700 transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
