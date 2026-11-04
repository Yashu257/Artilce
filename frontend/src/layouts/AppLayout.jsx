import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { ShieldCheck, Heart } from 'lucide-react';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Header */}
        <Header onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Content Body - Generous spacing & typography hierarchy */}
        <main className="flex-1 px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12 max-w-7xl w-full mx-auto bg-white">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-6 px-8 border-t border-slate-100 bg-white text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span className="font-medium text-slate-600">
                Cipla MedKnowledge Platform &copy; 2026. Strictly reserved for verified healthcare professionals.
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
                Evidence-Based Medicine
              </span>
              <span>Peer-Reviewed Clinical Core</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
