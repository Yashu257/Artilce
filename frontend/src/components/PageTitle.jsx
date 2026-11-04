import React from 'react';

export default function PageTitle({ title, subtitle, badge, action }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 pb-8 mb-8 border-b border-slate-100">
      <div className="space-y-1.5 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/70">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-3 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
