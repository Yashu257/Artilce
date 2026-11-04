import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Unable to load clinical resources',
  message = 'An unexpected error occurred while communicating with the medical knowledge backend.',
  onRetry
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white rounded-3xl border border-red-200 shadow-2xs space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-2xs">
        <AlertTriangle className="w-7 h-7" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 max-w-md">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-700"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Retry Clinical Request</span>
        </button>
      )}
    </div>
  );
}
