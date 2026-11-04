import React from 'react';

export default function CiplaLogo({ size = 'md', className = '', showText = false, textTheme = 'dark' }) {
  const sizeMap = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14'
  };

  const chosenSize = sizeMap[size] || size;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Brand Icon Badge */}
      <img
        src="/cipla-logo.svg"
        alt="Cipla MedKnowledge"
        className={`${chosenSize} shrink-0 object-contain drop-shadow-xs transition-transform hover:scale-105`}
        onError={(e) => {
          // Graceful fallback to png if svg fails
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/cipla-logo.png';
        }}
      />

      {showText && (
        <div className="flex flex-col text-left">
          <span className={`font-black text-sm tracking-tight leading-tight block ${textTheme === 'light' ? 'text-white' : 'text-slate-900'}`}>
            CIPLA MEDKNOWLEDGE
          </span>
          <span className={`text-[10px] font-bold tracking-wider uppercase block ${textTheme === 'light' ? 'text-teal-400' : 'text-teal-700'}`}>
            Clinical Intelligence Hub
          </span>
        </div>
      )}
    </div>
  );
}
