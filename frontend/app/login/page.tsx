"use client";
import React, { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RotateCcw,
  ShieldCheck,
  User,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { api } from "../../lib/api";
import LoadingState from "../../components/LoadingState";

function AuthForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPw, setLoginShowPw] = useState(false);

  // Register form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPw, setRegConfirmPw] = useState("");
  const [regShowPw, setRegShowPw] = useState(false);

  // OTP state
  const [regStep, setRegStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // General state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const fillDemo = () => {
    setTab("login");
    setLoginEmail("doctor@example.com");
    setLoginPassword("Doctor123!");
    setErrors({});
    setServerError("");
    setServerSuccess("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!loginEmail.trim()) errs.loginEmail = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail))
      errs.loginEmail = "Enter a valid email address.";
    if (!loginPassword) errs.loginPassword = "Password is required.";
    else if (loginPassword.length < 8)
      errs.loginPassword = "Password must be at least 8 characters.";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setServerError("");
    setServerSuccess("");

    const r = await api.login(loginEmail.trim(), loginPassword);
    setLoading(false);

    if (!r.success) {
      setServerError(r.error?.message || "Sign in failed. Please verify your credentials.");
      return;
    }

    router.replace(search.get("next") || "/dashboard");
    router.refresh();
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!regName.trim() || regName.trim().length < 2)
      errs.regName = "Please enter your full professional name.";
    if (!regEmail.trim()) errs.regEmail = "Professional email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail))
      errs.regEmail = "Enter a valid email address.";
    if (!regPassword) errs.regPassword = "Password is required.";
    else if (regPassword.length < 8)
      errs.regPassword = "Password must be at least 8 characters.";
    if (regPassword !== regConfirmPw)
      errs.regConfirmPw = "Passwords do not match.";

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    setServerError("");
    setServerSuccess("");

    try {
      const res = await api.requestRegisterOtp({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });

      setLoading(false);
      if (!res.success) {
        setServerError(res.error?.message || "Unable to send verification code.");
        return;
      }

      setRegStep("otp");
      setResendCooldown(60);
      setServerSuccess(`Verification code sent to ${regEmail.trim()}`);
      if (res.data?.devOtp) {
        setDevOtp(res.data.devOtp);
      }
    } catch (err) {
      setLoading(false);
      setServerError(err instanceof Error ? err.message : "Failed to send code.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrors({ otpCode: "Enter the full 6-digit verification code." });
      return;
    }

    setLoading(true);
    setServerError("");
    setServerSuccess("");

    try {
      const res = await api.verifyRegisterOtp({
        email: regEmail.trim(),
        otp: otpCode.trim(),
      });

      setLoading(false);
      if (!res.success) {
        setServerError(res.error?.message || "Verification failed. Please check code.");
        return;
      }

      // Successfully verified and created!
      setServerSuccess("Account verified successfully! Redirecting…");
      setTimeout(() => {
        router.replace(search.get("next") || "/dashboard");
        router.refresh();
      }, 800);
    } catch (err) {
      setLoading(false);
      setServerError(err instanceof Error ? err.message : "Verification failed.");
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setServerError("");
    try {
      const res = await api.resendRegisterOtp(regEmail.trim());
      setLoading(false);
      if (!res.success) {
        setServerError(res.error?.message || "Failed to resend code.");
        return;
      }
      setResendCooldown(60);
      setServerSuccess("New verification code sent to your email.");
      if (res.data?.devOtp) setDevOtp(res.data.devOtp);
    } catch {
      setLoading(false);
      setServerError("Failed to resend code.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/80 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-sm">
        {/* Cipla Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/cipla-logo.png"
            alt="Cipla"
            width={160}
            height={52}
            className="h-11 w-auto object-contain"
            priority
          />
          <h1 className="mt-3 text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            MedKnowledge Platform
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Clinical Knowledge & Evidence for Healthcare Professionals
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Create Account */}
        <div className="mb-6 flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setServerError("");
              setServerSuccess("");
              setErrors({});
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "login"
                ? "bg-white text-teal-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setRegStep("form");
              setServerError("");
              setServerSuccess("");
              setErrors({});
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              tab === "register"
                ? "bg-white text-teal-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Global Alerts */}
        {serverError && (
          <div
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span className="font-medium">{serverError}</span>
          </div>
        )}

        {serverSuccess && (
          <div
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-teal-200 bg-teal-50/90 p-3 text-xs text-teal-900"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
            <span className="font-medium">{serverSuccess}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {tab === "login" && (
          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Professional Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className={`w-full rounded-xl border py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700/20 ${
                    errors.loginEmail ? "border-rose-400" : "border-slate-200"
                  }`}
                  placeholder="doctor@example.com"
                />
              </div>
              {errors.loginEmail && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.loginEmail}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="login-password"
                  type={loginShowPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full rounded-xl border py-2 pl-9 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700/20 ${
                    errors.loginPassword ? "border-rose-400" : "border-slate-200"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setLoginShowPw(!loginShowPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={loginShowPw ? "Hide password" : "Show password"}
                >
                  {loginShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.loginPassword && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.loginPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-800 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-teal-900 transition-colors disabled:opacity-60 shadow-2xs"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? "Signing in…" : "Sign In"}</span>
            </button>

            <button
              type="button"
              onClick={fillDemo}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Fill demo credentials (doctor@example.com)
            </button>
          </form>
        )}

        {/* TAB 2: CREATE ACCOUNT (STEP 1: Registration Form) */}
        {tab === "register" && regStep === "form" && (
          <form onSubmit={handleRequestOtp} noValidate className="space-y-3.5">
            <div>
              <label
                htmlFor="reg-name"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Full Name / Title
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className={`w-full rounded-xl border py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700/20 ${
                    errors.regName ? "border-rose-400" : "border-slate-200"
                  }`}
                  placeholder="Dr. Rajesh Sharma"
                />
              </div>
              {errors.regName && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.regName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className={`w-full rounded-xl border py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700/20 ${
                    errors.regEmail ? "border-rose-400" : "border-slate-200"
                  }`}
                  placeholder="doctor@hospital.org"
                />
              </div>
              {errors.regEmail && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.regEmail}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Create Password (min. 8 characters)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="reg-password"
                  type={regShowPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className={`w-full rounded-xl border py-2 pl-9 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700/20 ${
                    errors.regPassword ? "border-rose-400" : "border-slate-200"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setRegShowPw(!regShowPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={regShowPw ? "Hide password" : "Show password"}
                >
                  {regShowPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.regPassword && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.regPassword}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-confirm"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Confirm Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="reg-confirm"
                  type={regShowPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={regConfirmPw}
                  onChange={(e) => setRegConfirmPw(e.target.value)}
                  className={`w-full rounded-xl border py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700/20 ${
                    errors.regConfirmPw ? "border-rose-400" : "border-slate-200"
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {errors.regConfirmPw && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.regConfirmPw}</p>
              )}
            </div>

            <div className="rounded-xl bg-teal-50/70 border border-teal-100 p-3 text-[11px] text-teal-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                A 6-digit OTP verification code will be dispatched to your email to verify your identity.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-800 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-teal-900 transition-colors disabled:opacity-60 shadow-2xs"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? "Sending verification code…" : "Send Verification Code"}</span>
            </button>
          </form>
        )}

        {/* TAB 2: CREATE ACCOUNT (STEP 2: OTP Verification) */}
        {tab === "register" && regStep === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setRegStep("form");
                setServerError("");
                setServerSuccess("");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Edit Details</span>
            </button>

            <div className="text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 mb-2.5 shadow-2xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Verify Your Email Address
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Please enter the 6-digit code sent to <strong className="text-slate-800">{regEmail}</strong>
              </p>
            </div>

            {/* Dev OTP Quick-Fill Badge (shown in local/dev environments) */}
            {devOtp && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>Dev Code: <strong>{devOtp}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtp)}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200/80 hover:bg-amber-300 transition-colors"
                >
                  Auto-Fill
                </button>
              </div>
            )}

            <div>
              <label
                htmlFor="otp-code"
                className="mb-1 block text-center text-xs font-semibold text-slate-700"
              >
                6-Digit Security Code
              </label>
              <input
                id="otp-code"
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="123456"
                className="w-full text-center tracking-[0.4em] font-mono text-xl sm:text-2xl font-bold py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700/20 text-teal-950"
              />
              {errors.otpCode && (
                <p className="mt-1 text-center text-xs text-rose-600 font-medium">
                  {errors.otpCode}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-800 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-teal-900 transition-colors disabled:opacity-50 shadow-2xs"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? "Verifying code…" : "Verify & Sign In"}</span>
            </button>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-900 disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setRegStep("form");
                }}
                className="text-slate-500 hover:text-slate-800"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Security Footer Note */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
          <span>Protected by Cipla enterprise access controls and session security.</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <LoadingState message="Loading authentication portal…" />
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
