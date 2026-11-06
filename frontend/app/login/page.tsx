"use client";
import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import LoadingState from "../../components/LoadingState";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const fillDemo = () => { setEmail("doctor@example.com"); setPassword("Doctor123!"); setErrors({}); setServerError(""); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true); setServerError("");
    const r = await api.login(email.trim(), password);
    setLoading(false);
    if (!r.success) {
      const msg = r.error?.message || "Login failed.";
      // Rate-limit (429) surfaces here verbatim from the backend.
      setServerError(msg);
      return;
    }
    router.replace(search.get("next") || "/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/cipla-logo.png" alt="Cipla" width={160} height={52} className="h-12 w-auto object-contain" priority />
          <h1 className="mt-4 text-xl font-bold text-heading">MedKnowledge</h1>
          <p className="mt-1 text-xs text-body">Clinical Knowledge Platform — For Healthcare Professionals</p>
        </div>
        {serverError && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-error/30 bg-red-50 px-3 py-2 text-sm text-error" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{serverError}</span>
          </div>
        )}
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-heading">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.email ? "border-error" : "border-border"}`} placeholder="doctor@example.com" />
            {errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-heading">Password</label>
            <div className="relative">
              <input id="password" type={showPw ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-md border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.password ? "border-error" : "border-border"}`} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-body" aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-error">{errors.password}</p>}
          </div>
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <button onClick={fillDemo} className="mt-3 w-full rounded-md border border-border px-4 py-2 text-sm text-body hover:bg-background">
          Fill demo credentials (doctor@example.com)
        </button>
        <p className="mt-4 text-center text-xs text-body">Demo account: doctor@example.com / Doctor123! — for evaluation only.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><LoadingState message="Loading sign-in…" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
