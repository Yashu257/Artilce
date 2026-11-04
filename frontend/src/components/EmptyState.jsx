import React from 'react';
import { SearchX } from 'lucide-react';

export default function EmptyState({
  title = 'No clinical protocols found',
  description = 'No clinical records matched your search query or selected specialty filter.',
  actionText = 'Reset Filters',
  onAction
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 shadow-2xs">
        <SearchX className="w-7 h-7" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 max-w-md">{description}</p>
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
