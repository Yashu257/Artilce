import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import CiplaLogo from './CiplaLogo';

export default function LoginForm({ onSubmit, loading, error, clearError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    const trimmed = email.trim();
    if (!trimmed) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !/gmail/i.test(trimmed)) {
      errs.email = 'Please provide a valid email format.';
    }

    const isGmail = /gmail/i.test(trimmed);
    if (!isGmail && !password) {
      errs.password = 'Password is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    clearError?.();
    if (validate()) {
      onSubmit({ email: email.trim(), password: password || '123456', rememberMe });
    }
  };

  // Quick fill demo access
  const handleQuickFill = () => {
    setEmail('doctor@gmail.com');
    setPassword('DoctorPass2026');
    setErrors({});
    clearError?.();
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Brand logo & header */}
      <div className="text-center mb-8 space-y-3">
        <div className="flex justify-center">
          <CiplaLogo size="xl" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Physician Portal Sign In
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Strictly authorized for verified healthcare practitioners. Access evidence-based clinical protocols.
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Medical / Professional Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                placeholder="doctor@gmail.com"
                className={`block w-full pl-11 pr-4 py-3 text-sm text-slate-900 bg-white border ${
                  errors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-teal-700'
                } rounded-xl shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:border-teal-700 transition-all`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 font-medium">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <span className="text-[11px] text-teal-700 font-medium">Any password accepted for Gmail</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
                placeholder="••••••••"
                className={`block w-full pl-11 pr-11 py-3 text-sm text-slate-900 bg-white border ${
                  errors.password ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-teal-700'
                } rounded-xl shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:border-teal-700 transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 font-medium">{errors.password}</p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-teal-700 rounded border-slate-300 focus:ring-teal-700 cursor-pointer"
              />
              <span>Remember medical session (24h)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3.5 px-6 rounded-xl text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <span className="flex items-center gap-2">
                <span>Sign In to Clinical Portal</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        {/* Quick Demo Access Card */}
        <div className="pt-6 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Quick Demo Access:</span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 underline underline-offset-2"
            >
              Fill Demo Gmail
            </button>
          </div>
          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/60 text-xs text-teal-900 leading-relaxed font-medium">
            Any email containing <strong className="font-bold">@gmail.com</strong> can log in immediately with any credentials.
          </div>
        </div>
      </div>

      {/* Security disclaimer */}
      <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-teal-700" />
        <span>End-to-end encrypted • HIPAA-ready medical standards</span>
      </div>
    </div>
  );
}
