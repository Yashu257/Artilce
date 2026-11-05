"use client";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";
import type { DocumentItem, User } from "../../lib/types";
import LoadingState from "../../components/LoadingState";
import { getCurrentUser } from "../../lib/auth";

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [activity, setActivity] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true); setError(""); setForbidden(false);
    try {
      const me = await getCurrentUser();
      if (!me || me.role !== "admin") { setForbidden(true); setLoading(false); return; }
      const [u, d, a] = await Promise.all([api.getAdminUsers(), api.getAdminDocumentStatus(), api.getAdminActivity()]);
      setUsers(u); setDocs(d); setActivity(a);
    } catch (e) { setError(apiErrorMessage(e)); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) { setNotice("Title and a PDF file are required."); return; }
    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim());
    if (category.trim()) form.append("category", category.trim());
    setUploading(true); setNotice("");
    try {
      await api.uploadDocument(form);
      setNotice("Document uploaded. It will be processed for search and the AI assistant.");
      setTitle(""); setCategory(""); setFile(null);
      load();
    } catch (err) { setNotice(apiErrorMessage(err)); }
    setUploading(false);
  };

  const reprocess = async (id: string) => {
    const r = await api.reprocessDocument(id);
    setNotice(r.success ? "Reprocessing started." : r.error?.message || "Reprocess failed.");
    load();
  };

  const removeDoc = async (id: string) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    const r = await api.deleteDocument(id);
    setNotice(r.success ? "Document deleted." : r.error?.message || "Delete failed.");
    load();
  };

  if (loading) return <LoadingState message="Loading admin panel…" />;
  if (forbidden) return <div className="rounded-lg border border-error/30 bg-red-50 p-6 text-sm text-error">Admin access only. Sign in with an admin account to view this page.</div>;
  if (error) return <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-red-50 px-3 py-3 text-sm text-error"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold text-heading">Admin</h1><p className="mt-1 text-sm text-body">Users, document processing status, and uploads.</p></div>
      {notice && <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-heading">{notice}</div>}

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-heading"><Upload className="h-5 w-5 text-primary" /> Upload document</h2>
        <form onSubmit={upload} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" aria-label="Document title" className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" aria-label="Category" className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label="PDF file" className="rounded-md border border-border px-3 py-2 text-sm" />
          <button type="submit" disabled={uploading} className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-secondary disabled:opacity-60">
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />} Upload
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-heading">Document status ({docs.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-body"><th className="py-2 pr-2">Title</th><th className="py-2 pr-2">Category</th><th className="py-2 pr-2">Status</th><th className="py-2 pr-2">Pages</th><th className="py-2">Actions</th></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-2 font-medium text-heading">{d.title}</td>
                  <td className="py-2 pr-2 text-body">{d.category}</td>
                  <td className="py-2 pr-2 text-body">{d.status}</td>
                  <td className="py-2 pr-2 text-body">{d.pageCount ?? "—"}</td>
                  <td className="flex gap-2 py-2">
                    <button onClick={() => reprocess(d.id)} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-heading hover:bg-background"><RefreshCw className="h-3.5 w-3.5" /> Reprocess</button>
                    <button onClick={() => removeDoc(d.id)} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs text-error hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && <tr><td colSpan={5} className="py-4 text-body">No documents yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-heading">Users ({users.length})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-body"><th className="py-2 pr-2">Name</th><th className="py-2 pr-2">Email</th><th className="py-2 pr-2">Role</th><th className="py-2">Created</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-2 font-medium text-heading">{u.name}</td>
                  <td className="py-2 pr-2 text-body">{u.email}</td>
                  <td className="py-2 pr-2 text-body">{u.role}</td>
                  <td className="py-2 text-body">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={4} className="py-4 text-body">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-heading">Recent activity ({activity.length})</h2>
        <pre className="mt-3 max-h-64 overflow-auto rounded bg-background p-3 text-xs text-body">{JSON.stringify(activity.slice(0, 20), null, 2)}</pre>
      </section>
    </div>
  );
}
