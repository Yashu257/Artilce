"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import LoadingState from "./LoadingState";
import { getCurrentUser } from "../lib/auth";
import type { User } from "../lib/types";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (isLogin) { setChecked(true); return; }
    getCurrentUser().then((u) => {
      if (!u) router.replace("/login");
      else { setUser(u); setChecked(true); }
    });
  }, [pathname, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!checked) return <div className="flex min-h-screen items-center justify-center bg-background"><LoadingState message="Checking your session…" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block"><Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} user={user} /></div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-64"><Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} user={user} /></div>
        </div>
      )}
      <div className={`transition-all ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
