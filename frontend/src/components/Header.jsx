import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, LogOut, FileText, ChevronDown, ShieldCheck, BookOpen, Bot, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import CiplaLogo from './CiplaLogo';

export default function Header({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  // Generate breadcrumb info
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return { title: 'Clinical Dashboard', category: 'Overview' };
    if (path.startsWith('/articles/')) return { title: 'Protocol Details', category: 'Clinical Reference' };
    if (path.startsWith('/articles')) return { title: 'Medical Protocols', category: 'Library' };
    if (path.startsWith('/ai-assistant')) return { title: 'Clinical AI Assistant', category: 'Intelligence' };
    return { title: 'Clinical Portal', category: 'Knowledge Hub' };
  };

  const breadcrumb = getBreadcrumb();

  const getInitials = (name) => {
    if (!name) return 'DR';
    return name
      .replace(/^Dr\.\s*/i, '')
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'DR';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-20 px-6 sm:px-8 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open navigation sidebar"
          className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-lg lg:hidden hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="lg:hidden shrink-0">
          <CiplaLogo size="xs" />
        </div>

        {/* Page title / Breadcrumb */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Clinical Knowledge</span>
            <span>/</span>
            <span className="text-teal-700">{breadcrumb.category}</span>
          </div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            {breadcrumb.title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Quick Database Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
          <ShieldCheck className="w-4 h-4 text-teal-700" />
          <span>9 Verified Publications</span>
          <span className="text-slate-300">•</span>
          <span className="text-teal-700 font-semibold">4 Categories</span>
        </div>

        {/* AI Assistant Quick Nav Pill */}
        <Link
          to="/ai-assistant"
          className={`inline-flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl border transition-all ${
            location.pathname === '/ai-assistant'
              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
              : 'text-teal-800 bg-teal-50 hover:bg-teal-100/80 border-teal-200/80'
          }`}
        >
          <Bot className="w-4 h-4 text-teal-700" />
          <span className="hidden sm:inline">AI Assistant</span>
        </Link>

        {/* User initials & profile menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            className="flex items-center gap-3 p-1.5 pl-2.5 rounded-xl hover:bg-slate-50 border border-slate-200/80 transition-all focus:outline-none focus:ring-2 focus:ring-teal-700"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200">
              {getInitials(user?.name)}
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-bold text-slate-900 leading-tight">
                {user?.name || 'Dr. Physician'}
              </span>
              <span className="block text-[10px] text-teal-700 font-medium capitalize">
                {user?.role || 'Doctor'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
          </button>

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2.5 z-50 transform origin-top-right animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">
                  {user?.name || 'Dr. Physician'}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {user?.email || 'doctor@portal.org'}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-semibold border border-teal-100">
                  <ShieldCheck className="w-3 h-3 text-teal-700" />
                  <span>Verified Medical Access</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-teal-800 transition-colors"
                >
                  Dashboard Overview
                </Link>
                <Link
                  to="/ai-assistant"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 transition-colors"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Clinical AI Assistant</span>
                </Link>
                <Link
                  to="/articles"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-teal-800 transition-colors"
                >
                  Clinical Protocols Index
                </Link>
              </div>

              <div className="pt-1.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
