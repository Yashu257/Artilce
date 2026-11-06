"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BookOpen, Bot, FileText, LayoutDashboard, PanelLeftClose, PanelLeftOpen, ShieldCheck, Bookmark } from "lucide-react";
import type { User } from "../lib/types";

const NAV = [
  { href: "/dashboard", label: "Clinical Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/articles", label: "Clinical Publications", icon: BookOpen, badge: "9" },
  { href: "/ai-assistant", label: "Clinical AI Assistant", icon: Bot, badge: "Online" },
  { href: "/bookmarks", label: "Saved Bookmarks", icon: Bookmark, badge: null },
];

export default function Sidebar({ collapsed, onToggle, user }: { collapsed: boolean; onToggle: () => void; user: User | null }) {
  const pathname = usePathname();
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-all ${collapsed ? "w-16" : "w-64"}`}>
      <div className="flex h-16 items-center gap-2 border-b border-border px-3">
        <Image src="/cipla-logo.svg" alt="Cipla" width={collapsed ? 32 : 96} height={32} className="h-8 w-auto shrink-0" priority />
        {!collapsed && <span className="text-sm font-semibold text-heading">MedKnowledge</span>}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} title={item.label}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${active ? "bg-primary text-white" : "text-body hover:bg-background hover:text-heading"}`}>
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  item.badge === "Online" ? "bg-emerald-100/80 text-emerald-800" : active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
        {user?.role === "admin" && (
          <Link href="/admin" title="Admin"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${pathname.startsWith("/admin") ? "bg-primary text-white" : "text-body hover:bg-background hover:text-heading"}`}>
            <ShieldCheck className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
      </nav>
      <div className="border-t border-border p-2">
        <button onClick={onToggle} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-body hover:bg-background" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
        {!collapsed && user && (
          <div className="mt-2 rounded-md bg-background px-3 py-2">
            <p className="truncate text-sm font-medium text-heading">{user.name}</p>
            <p className="truncate text-xs text-body">{user.email}</p>
            <p className="mt-1 inline-block rounded bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">{user.role}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
