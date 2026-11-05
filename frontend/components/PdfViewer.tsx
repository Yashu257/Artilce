"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Maximize, Minus, Plus, Search } from "lucide-react";
import { api } from "../lib/api";

export default function PdfViewer({ documentId, title, pageCount, initialPage = 1 }: { documentId: string; title: string; pageCount?: number | null; initialPage?: number }) {
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxPage = pageCount && pageCount > 0 ? pageCount : 999;
  const src = `${api.documentFileUrl(documentId)}#page=${page}&zoom=${zoom}`;

  const go = (p: number) => setPage(Math.min(Math.max(1, p), maxPage));
  const fullscreen = () => { containerRef.current?.requestFullscreen?.().catch(() => undefined); };
  const download = async () => {
    const res = await fetch(api.documentFileUrl(documentId), { credentials: "include" });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={containerRef} className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <button onClick={() => go(page - 1)} disabled={page <= 1} className="rounded p-1.5 text-body hover:bg-background disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-5 w-5" /></button>
        <span className="text-sm text-heading">Page
          <input type="number" min={1} max={maxPage === 999 ? undefined : maxPage} value={page}
            onChange={(e) => go(Number(e.target.value) || 1)}
            className="mx-1 w-14 rounded border border-border px-1 py-0.5 text-center text-sm" aria-label="Page number" />
          {pageCount ? `of ${pageCount}` : ""}
        </span>
        <button onClick={() => go(page + 1)} disabled={pageCount ? page >= pageCount : false} className="rounded p-1.5 text-body hover:bg-background disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-5 w-5" /></button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button onClick={() => setZoom(Math.max(50, zoom - 25))} className="rounded p-1.5 text-body hover:bg-background" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
        <span className="w-12 text-center text-sm text-heading">{zoom}%</span>
        <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="rounded p-1.5 text-body hover:bg-background" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button onClick={fullscreen} className="flex items-center gap-1 rounded px-2 py-1.5 text-sm text-body hover:bg-background"><Maximize className="h-4 w-4" /> Fullscreen</button>
        <button onClick={download} className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-white hover:bg-secondary"><Download className="h-4 w-4" /> Download</button>
      </div>
      <p className="flex items-center gap-1.5 border-b border-border bg-background px-3 py-1.5 text-xs text-body">
        <Search className="h-3.5 w-3.5" />
        In-document search: use your browser&apos;s find (Ctrl/Cmd + F) inside the PDF viewer. The AI Assistant can also locate exact pages and sections.
      </p>
      <iframe key={src} src={src} title={title} className="h-[75vh] w-full bg-white" />
    </div>
  );
}
