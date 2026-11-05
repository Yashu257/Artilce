"use client";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut, Menu } from "lucide-react";
import { logout } from "../lib/auth";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard", articles: "Articles", documents: "Documents",
  "ai-assistant": "AI Assistant", admin: "Admin", bookmarks: "Bookmarks", login: "Login",
};

export default function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const segments = pathname.split("/").filter(Boolean);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-surface px-4">
      {onMenuClick && (
        <button onClick={onMenuClick} className="rounded-md p-2 text-body hover:bg-background lg:hidden" aria-label="Toggle menu"><Menu className="h-5 w-5" /></button>
      )}
      <nav className="flex items-center gap-1 text-sm text-body" aria-label="Breadcrumb">
        <button onClick={() => router.push("/dashboard")} className="hover:text-heading">Home</button>
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-border" />
            {i < segments.length - 1 ? (
              <button onClick={() => router.push("/" + segments.slice(0, i + 1).join("/"))} className="hover:text-heading">{LABELS[seg] || decodeURIComponent(seg)}</button>
            ) : (
              <span className="font-medium text-heading">{LABELS[seg] || decodeURIComponent(seg)}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <button onClick={() => logout()} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-body hover:bg-background">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </header>
  );
}
