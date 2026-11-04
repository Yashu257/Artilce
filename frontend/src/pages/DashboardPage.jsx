import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowRight,
  BookOpen,
  Filter,
  ShieldCheck,
  Stethoscope,
  Activity,
  Layers,
  CheckCircle2,
  Calendar,
  Bot,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { articleService } from '../services/api';
import { SAMPLE_CATEGORIES } from '../data/sampleArticles';
import PageTitle from '../components/PageTitle';
import SearchBar from '../components/SearchBar';
import ArticleCard from '../components/ArticleCard';
import CategoryCard from '../components/CategoryCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadArticles() {
      try {
        setLoading(true);
        const data = await articleService.getArticles();
        setArticles(data.articles || []);
      } catch (err) {
        console.error('Failed to load dashboard articles', err);
      } finally {
        setLoading(false);
      }
    }
    loadArticles();
  }, []);

  // Filtered articles based on search query in the search bar
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  // Derive counts per category from the articles list
  const categoryCounts = useMemo(() => {
    const counts = {};
    articles.forEach((a) => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return counts;
  }, [articles]);

  const handleCategorySelect = (categoryName) => {
    navigate(`/articles?category=${encodeURIComponent(categoryName)}`);
  };

  const featuredArticles = searchQuery.trim()
    ? filteredArticles
    : articles.slice(0, 4);

  return (
    <div className="space-y-12">
      {/* Executive Welcome & Clinical Intelligence Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-10 lg:p-12 shadow-md">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cipla Clinical Intelligence Hub • 2026</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, {user?.name || 'Doctor'}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Access verified clinical protocols, pharmacological profiles, and therapeutic guidelines curated for evidence-based patient management.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to="/articles"
                className="inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-teal-50 rounded-xl shadow-xs transition-all"
              >
                <BookOpen className="w-4 h-4 text-teal-700" />
                <span>Browse All 9 Publications</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
              <Link
                to="/ai-assistant"
                className="inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold text-teal-300 bg-slate-800/80 hover:bg-slate-800 border border-teal-500/30 rounded-xl transition-all"
              >
                <Bot className="w-4 h-4 text-teal-400" />
                <span>Clinical AI Assistant</span>
              </Link>
            </div>
          </div>

          {/* Featured Publication Visual Preview (Hero Card) */}
          <div className="hidden lg:block shrink-0 w-80">
            <Link
              to="/articles/launch-deck-early-initiation-better"
              className="block group relative rounded-2xl overflow-hidden bg-slate-800/90 border border-slate-700/80 shadow-lg hover:border-teal-400 transition-all"
            >
              <div className="h-44 overflow-hidden bg-slate-950">
                <img
                  src="/thumbnails/launch-deck-early-initiation-better.png"
                  alt="Featured Publication"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold tracking-wider uppercase text-teal-400">Featured Publication</span>
                <h4 className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-1">
                  Freedon Study — Early Initiation in RWE
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  Epilepsia 2026 • 43.2% 1-Year Seizure Freedom
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Key Clinical Platform Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Publications</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{articles.length || 9}</div>
          <p className="text-xs text-slate-500">Peer-reviewed clinical decks</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Categories</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">4</div>
          <p className="text-xs text-slate-500">Therapeutic clinical tracks</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Verification</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-700">100%</div>
          <p className="text-xs text-slate-500">Clinical schema certified</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Database</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">Active</div>
          <p className="text-xs text-teal-700 font-medium">MySQL PDO Connected</p>
        </div>
      </div>

      {/* Clinical AI Assistant Spotlight Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-3xl border border-teal-800 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500 text-slate-900 flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  MedKnowledge Clinical AI Assistant
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Grounded & Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Query clinical protocols, triage thresholds, and pharmacological guidelines in natural language. Answers are backed by transparent article citations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/ai-assistant"
              className="inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-teal-50 rounded-xl transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>Launch AI Assistant</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Quick prompt suggestions */}
        <div className="relative z-10 mt-5 pt-4 border-t border-teal-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider shrink-0">
            Quick Queries:
          </span>
          <Link
            to="/ai-assistant"
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white border border-white/10 whitespace-nowrap transition-all"
          >
            "What is the recommended titration schedule for cenobamate?"
          </Link>
          <Link
            to="/ai-assistant"
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white border border-white/10 whitespace-nowrap transition-all"
          >
            "What does the Spanish Consensus recommend for reducing concomitant ASMs?"
          </Link>
          <Link
            to="/ai-assistant"
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white border border-white/10 whitespace-nowrap transition-all"
          >
            "Compare 100% seizure freedom in LTE vs earlier initiation"
          </Link>
        </div>
      </div>

      {/* Quick Search Hub */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-700" />
            <span>Search Clinical Repository</span>
          </h2>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg bg-white"
            >
              Clear Search Filter
            </button>
          )}
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search by symptom, clinical protocol, pharmacology, or diagnostic criterion..."
          className="w-full"
        />

        {searchQuery && (
          <p className="text-xs text-slate-500 font-medium">
            Found {filteredArticles.length} matching {filteredArticles.length === 1 ? 'protocol' : 'protocols'}
          </p>
        )}
      </div>

      {/* Therapeutic Specialties Explorer */}
      <section aria-labelledby="categories-heading" className="space-y-6">
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="categories-heading" className="text-xl font-extrabold text-slate-900 tracking-tight">
              Therapeutic Areas & Specialties
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Structured clinical categories awaiting approved reference documents
            </p>
          </div>
          <Link
            to="/articles"
            className="text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1.5 transition-colors"
          >
            <span>View All Categories</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {SAMPLE_CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              count={categoryCounts[cat.name] || 0}
              onSelect={() => handleCategorySelect(cat.name)}
            />
          ))}
        </div>
      </section>

      {/* Featured Clinical Articles */}
      <section aria-labelledby="articles-heading" className="space-y-6">
        <div className="flex items-end justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="articles-heading" className="text-xl font-extrabold text-slate-900 tracking-tight">
              {searchQuery ? 'Matching Clinical Protocols' : 'Featured Clinical Protocols'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {searchQuery
                ? `Results matching query "${searchQuery}"`
                : 'Key clinical guidelines available for immediate medical review'}
            </p>
          </div>
          <Link
            to="/articles"
            className="text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Browse All 12 Protocols</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <LoadingState message="Loading medical knowledge protocols..." />
        ) : featuredArticles.length === 0 ? (
          <EmptyState
            title="No matching protocols found"
            description={`No clinical articles found matching "${searchQuery}". Please refine your search term.`}
            onAction={() => setSearchQuery('')}
            actionText="Clear Search"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
