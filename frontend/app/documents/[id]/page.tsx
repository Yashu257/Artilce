"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AlertCircle, Download } from "lucide-react";
import { api, apiErrorMessage } from "../../../lib/api";
import type { DocumentItem } from "../../../lib/types";
import PdfViewer from "../../../components/PdfViewer";
import LoadingState from "../../../components/LoadingState";

function DocumentDetailContent() {
  const params = useParams();
  const search = useSearchParams();
  const id = String(params.id || "");
  const initialPage = Number(search.get("page") || "1") || 1;
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getDocument(id).then(setDoc).catch((e) => setError(apiErrorMessage(e)));
  }, [id]);

  if (error) return <div className="rounded-lg border border-error/30 bg-red-50 p-6 text-sm text-error"><p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Document not found</p><p className="mt-1">{error}</p></div>;
  if (!doc) return <LoadingState message="Loading document…" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-heading">{doc.title}</h1>
        <p className="mt-1 flex flex-wrap gap-3 text-sm text-body">
          <span>{doc.fileName}</span><span>·</span><span>{doc.category}</span>
          {doc.pageCount ? <><span>·</span><span>{doc.pageCount} pages</span></> : null}
          {doc.size ? <><span>·</span><span>{(doc.size / 1024).toFixed(0)} KB</span></> : null}
          <span>·</span><span className="font-medium">{doc.status}</span>
          {initialPage > 1 && <><span>·</span><span className="font-medium text-primary">Opened at page {initialPage} (from citation)</span></>}
        </p>
      </div>
      {doc.status !== "ready" && (
        <div className="rounded-md border border-warning/30 bg-amber-50 px-3 py-2 text-sm text-warning">
          This document is currently <strong>{doc.status}</strong>. The viewer will become available once processing completes.
        </div>
      )}
      <PdfViewer documentId={doc.id} title={doc.title} pageCount={doc.pageCount} initialPage={initialPage} />
      <p className="flex items-center gap-1.5 text-xs text-body"><Download className="h-3.5 w-3.5" /> Downloads go through the authenticated backend file endpoint — the PDF is never served from a public URL.</p>
    </div>
  );
}

export default function DocumentDetailPage() {
  return <Suspense fallback={<LoadingState message="Loading document…" />}><DocumentDetailContent /></Suspense>;
}
