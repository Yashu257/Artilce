import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Bot,
  Sparkles,
  Layers,
  LogOut,
  X,
  ShieldCheck,
  ChevronRight,
  Database
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import CiplaLogo from './CiplaLogo';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose?.();
    await logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Clinical Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      to: '/articles',
      label: 'Clinical Publications',
      icon: FileText,
      badge: '9'
    },
    {
      to: '/ai-assistant',
      label: 'Clinical AI Assistant',
      icon: Bot,
      badge: 'Online'
    }
  ];

  const quickCategories = [
    { label: 'Real-World Evidence (RWE)', cat: 'Real-World Evidence (RWE)' },
    { label: 'Clinical Trials & Efficacy', cat: 'Clinical Trials & Efficacy' },
    { label: 'Titration & Dosing Guidelines', cat: 'Titration & Dosing Guidelines' },
    { label: 'Monotherapy & Deprescribing', cat: 'Monotherapy & Concomitant ASM Reduction' },
    { label: 'Pharmacology & Interactions', cat: 'Pharmacology & Drug Interactions' }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100">
        <Link to="/dashboard" className="flex items-center gap-3.5 focus:outline-none group">
          <CiplaLogo size="md" />
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 group-hover:text-teal-800 transition-colors block font-sans">
              CIPLA MEDKNOWLEDGE
            </span>
            <span className="text-[10px] text-teal-700 font-bold tracking-wider uppercase block">
              Clinical Platform
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        {isOpen && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation sidebar"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg lg:hidden hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-6 space-y-7 overflow-y-auto">
        {/* Main Section */}
        <div>
          <div className="px-3 pb-2.5 text-[11px] font-bold tracking-wider uppercase text-slate-400">
            Navigation
          </div>
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3.5 py-3 text-xs font-semibold rounded-xl transition-all duration-150 ${
                      isActive
                        ? 'bg-teal-50/80 text-teal-800 shadow-xs border border-teal-200/60'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 transition-colors text-teal-700 group-hover:text-teal-800" aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-teal-800 shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Quick Specialties */}
        <div>
          <div className="px-3 pb-2.5 text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center justify-between">
            <span>Specialty Areas</span>
            <Layers className="w-3 h-3 text-slate-400" />
          </div>
          <div className="space-y-1">
            {quickCategories.map((c, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onClose?.();
                  navigate(`/articles?category=${encodeURIComponent(c.cat)}`);
                }}
                className="w-full text-left flex items-center justify-between px-3.5 py-2 text-[12px] font-medium text-slate-600 hover:text-teal-800 hover:bg-slate-50 rounded-lg transition-colors group"
              >
                <span className="truncate">{c.label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-700 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Clinical Platform Status Card */}
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2 text-teal-800 font-semibold mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
            </span>
            <span>Clinical Knowledge Core</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
            Evidence-based medical reference database active with 12 structured protocols.
          </p>
        </div>
      </div>

      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0 border border-teal-200">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'DR'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.name || 'Authorized Doctor'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.email || 'doctor@portal.org'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-200 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block lg:w-72 lg:shrink-0 sticky top-0 h-screen z-20">
        {sidebarContent}
      </aside>

      {/* Mobile drawer backdrop and overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white transform transition-transform duration-200 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
