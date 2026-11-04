import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Retrieving clinical knowledge protocols...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
      <Loader2 className="w-9 h-9 text-teal-700 animate-spin" aria-hidden="true" />
      <p className="text-base font-bold text-slate-800">{message}</p>
      <span className="text-xs text-slate-400">Verifying session and clinical repository records</span>
    </div>
  );
}
