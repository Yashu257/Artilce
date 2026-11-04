import React from 'react';
import { ArrowRight, Stethoscope, HeartPulse, Pill, Activity, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export default function CategoryCard({ category, count = 0, onSelect }) {
  // Determine suitable medical icon based on name or slug
  const getCategoryIcon = () => {
    const name = (category.name || '').toLowerCase();
    if (name.includes('real-world') || name.includes('rwe')) return Activity;
    if (name.includes('clinical trials') || name.includes('efficacy')) return FileSpreadsheet;
    if (name.includes('titration') || name.includes('dosing')) return HeartPulse;
    if (name.includes('monotherapy') || name.includes('concomitant')) return ShieldCheck;
    if (name.includes('pharmacol') || name.includes('interaction')) return Pill;
    return Stethoscope;
  };

  const Icon = getCategoryIcon();

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className="group relative flex flex-col justify-between p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all duration-200 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-teal-700"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 group-hover:bg-teal-700 group-hover:text-white transition-all duration-200 shadow-2xs">
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80">
            {count} {count === 1 ? 'protocol' : 'protocols'}
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors mb-2">
          {category.name}
        </h3>

        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
          {category.description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold text-teal-700">
        <span>Explore Protocols</span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </div>
    </div>
  );
}
