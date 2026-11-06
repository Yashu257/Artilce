"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { api, apiErrorMessage } from "../../../lib/api";
import type { DocumentItem } from "../../../lib/types";
import PdfViewer from "../../../components/PdfViewer";
import LoadingState from "../../../components/LoadingState";

function DocumentDetailContent() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const id = String(params.id || "");
  const initialPage = Number(search.get("page") || "1") || 1;
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || id === "doc-undefined" || id === "undefined") {
      router.replace("/articles");
      return;
    }
    api
      .getDocument(id)
      .then(setDoc)
      .catch((e) => setError(apiErrorMessage(e)));
  }, [id, router]);

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
          <p className="flex items-center gap-2 font-bold">
            <AlertCircle className="h-4 w-4 text-rose-600" /> Document Not Found
          </p>
          <p className="mt-1 text-xs text-rose-700">{error}</p>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-rose-300 text-rose-800 hover:bg-rose-100/50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Go Back
            </button>
            <button
              onClick={() => router.push("/articles")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" /> Browse Clinical Publications
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="py-20">
        <LoadingState message="Loading original clinical document…" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Back button and metadata header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
              {doc.title}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{doc.category}</span>
              <span>•</span>
              <span>{doc.pageCount ? `${doc.pageCount} Pages` : "PDF Document"}</span>
              {initialPage > 1 && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                    Opened at Page {initialPage}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
            <span>Cipla Verified Clinical Publication</span>
          </span>
        </div>
      </div>

      {/* Integrated In-App PDF Viewer */}
      <PdfViewer
        documentId={doc.id}
        title={doc.title}
        fileName={doc.fileName}
        pageCount={doc.pageCount}
        initialPage={initialPage}
      />
    </div>
  );
}

export default function DocumentDetailPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading clinical document…" />}>
      <DocumentDetailContent />
    </Suspense>
  );
}
