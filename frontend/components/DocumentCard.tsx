import Link from "next/link";
import { FileText } from "lucide-react";
import type { DocumentItem } from "../lib/types";

const STATUS_STYLE: Record<string, string> = {
  ready: "bg-green-50 text-success", processing: "bg-amber-50 text-warning",
  pending: "bg-amber-50 text-warning", failed: "bg-red-50 text-error",
};

export default function DocumentCard({ doc }: { doc: DocumentItem }) {
  return (
    <Link href={`/documents/${doc.id}`} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition hover:border-secondary hover:shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10"><FileText className="h-5 w-5 text-primary" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-heading">{doc.title}</span>
        <span className="mt-1 block truncate text-sm text-body">{doc.fileName}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-body">
          <span className="rounded bg-secondary/10 px-2 py-0.5 font-medium text-secondary">{doc.category}</span>
          {doc.pageCount ? <span>{doc.pageCount} pages</span> : null}
          {doc.size ? <span>{(doc.size / 1024).toFixed(0)} KB</span> : null}
          <span className={`rounded px-2 py-0.5 font-medium ${STATUS_STYLE[doc.status] || "bg-background text-body"}`}>{doc.status}</span>
        </span>
      </span>
    </Link>
  );
}
