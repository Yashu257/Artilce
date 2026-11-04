import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, FileText, CheckCircle2, Award } from 'lucide-react';
import CiplaLogo from '../components/CiplaLogo';

export default function LoginPage() {
  const { user, login, loading, authError, setAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleLoginSubmit = async ({ email, password }) => {
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      // Error handled by AuthContext state
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Feature & Clinical Branding Column (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden">
        {/* Ambient decorative glow */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <CiplaLogo size="xl" />
          <div>
            <span className="font-black text-lg tracking-tight block text-white">
              CIPLA MEDKNOWLEDGE
            </span>
            <span className="text-xs text-teal-300 font-bold tracking-wider uppercase block">
              Clinical Reference Platform
            </span>
          </div>
        </div>

        {/* Center Clinical Mission Statement */}
        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 text-teal-300 text-xs font-semibold border border-teal-400/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Authorized Clinical Knowledge Core</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Evidence-Based Medicine For Confident Clinical Practice.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Directly designed for verified physicians and healthcare specialists. Search, review, and reference 9 real clinical publications, trial launch decks, and therapeutic matrix guidelines.
          </p>

          <div className="space-y-3.5 pt-4">
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <span>Peer-reviewed therapeutic protocol definitions</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <span>Comparative dosage, triage & diagnostic matrices</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <span>Instant one-click demo login for healthcare evaluators</span>
            </div>
          </div>

          {/* Visual publication deck previews */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-slate-800/80 p-2 shadow-xs">
              <img
                src="/thumbnails/launch-deck-early-initiation-better.png"
                alt="Early Initiation Clinical Deck"
                className="w-full h-24 object-cover object-top rounded-lg bg-slate-900"
              />
              <p className="mt-2 text-[10px] font-bold text-slate-300 truncate">Freedon Study (2026)</p>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-slate-800/80 p-2 shadow-xs">
              <img
                src="/thumbnails/reduce-1-asm-spanish-consensus.png"
                alt="Spanish Consensus Clinical Deck"
                className="w-full h-24 object-cover object-top rounded-lg bg-slate-900"
              />
              <p className="mt-2 text-[10px] font-bold text-slate-300 truncate">Spanish Consensus (2024)</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-6">
          <span>&copy; 2026 Cipla MedKnowledge Hub</span>
          <span className="flex items-center gap-1.5 text-teal-400 font-medium">
            <Award className="w-4 h-4" />
            <span>Standardized Medical Schema</span>
          </span>
        </div>
      </div>

      {/* Right Login Authentication Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-6 sm:px-12 lg:px-16 bg-white">
        <LoginForm
          onSubmit={handleLoginSubmit}
          loading={loading}
          error={authError}
          clearError={() => setAuthError(null)}
        />
      </div>
    </div>
  );
}
