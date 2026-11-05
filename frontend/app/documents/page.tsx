"use client";
import { useEffect, useState } from "react";
import { AlertCircle, Search } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { DocumentItem } from "../../lib/types";
import DocumentCard from "../../components/DocumentCard";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api.getDocuments({ search: search || undefined, category: category || undefined })
        .then((d) => { setDocs(status ? d.filter((x) => x.status === status) : d); setError(""); })
        .catch((e) => setError(apiErrorMessage(e)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, category, status]);

  const categories = Array.from(new Set(docs.map((d) => d.category))).filter(Boolean);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold text-heading">Documents</h1><p className="mt-1 text-sm text-body">Launch decks and clinical publications. PDFs open only for signed-in users, via the authenticated backend file endpoint.</p></div>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…" aria-label="Search documents"
            className="w-full rounded-md border border-border py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All statuses</option>
          <option value="ready">Ready</option>
          <option value="processing">Processing</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      {error && <div className="flex items-start gap-2 rounded-md border border-error/30 bg-red-50 px-3 py-2 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {loading ? <LoadingState message="Loading documents…" /> : docs.length === 0 ? (
        <EmptyState title="No documents found" message="Try a different search term or clear the filters." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{docs.map((d) => <DocumentCard key={d.id} doc={d} />)}</div>
      )}
    </div>
  );
}
