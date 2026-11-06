"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  FileText,
} from "lucide-react";
import { api } from "../lib/api";

interface PdfViewerProps {
  documentId: string;
  title: string;
  pageCount?: number | null;
  initialPage?: number;
}

export default function PdfViewer({
  documentId,
  title,
  pageCount,
  initialPage = 1,
}: PdfViewerProps) {
  const [page, setPage] = useState(initialPage);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxPage = pageCount && pageCount > 0 ? pageCount : 999;

  // Sync initialPage when it changes via URL
  useEffect(() => {
    if (initialPage && initialPage >= 1) {
      setPage(initialPage);
    }
  }, [initialPage]);

  // Track fullscreen state
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const go = (p: number) => {
    setPage(Math.min(Math.max(1, p), maxPage));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => undefined);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
    }
  };

  const download = async () => {
    try {
      const res = await fetch(api.documentFileUrl(documentId), { credentials: "include" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download failed
    }
  };

  const src = `${api.documentFileUrl(documentId)}#page=${page}&zoom=${zoom}`;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden ${
        isFullscreen ? "h-screen w-screen rounded-none" : "h-[80vh]"
      }`}
    >
      {/* Viewer Header / Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={maxPage === 999 ? undefined : maxPage}
              value={page}
              onChange={(e) => go(Number(e.target.value) || 1)}
              className="mx-1.5 w-10 text-center font-bold text-teal-900 bg-slate-50 rounded border border-slate-200 py-0.5 focus:outline-none focus:border-teal-700"
            />
            <span className="text-slate-400 font-normal">of {pageCount || "?"}</span>
          </div>

          <button
            onClick={() => go(page + 1)}
            disabled={pageCount ? page >= pageCount : false}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
            title="Zoom Out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <span className="w-12 text-center text-xs font-semibold text-slate-700">
            {zoom}%
          </span>

          <button
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
            title="Zoom In"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {zoom !== 100 && (
            <button
              onClick={() => setZoom(100)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
              title="Reset Zoom to 100%"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Utility Actions (Fullscreen & Download) */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200/70 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>

          <button
            onClick={download}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-2xs"
            title="Download PDF"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      {/* Quick In-Document Search Bar Hint */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-teal-50/60 border-b border-teal-100 text-[11px] text-teal-900 shrink-0">
        <div className="flex items-center gap-1.5 font-medium">
          <Search className="w-3.5 h-3.5 text-teal-700" />
          <span>Quick find: Press <strong>Ctrl+F</strong> (or <strong>Cmd+F</strong> on Mac) to search text inside the document.</span>
        </div>
        <span className="text-[10px] text-teal-800 font-semibold bg-teal-100/70 px-2 py-0.5 rounded-md">
          Authenticated Stream
        </span>
      </div>

      {/* Embedded PDF Viewer Iframe */}
      <div className="flex-1 w-full h-full bg-slate-100 relative">
        <iframe
          key={src}
          src={src}
          title={title}
          className="w-full h-full border-0 bg-white"
        />
      </div>
    </div>
  );
}
