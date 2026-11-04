import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Filter,
  ArrowUpDown,
  BookOpen,
  RotateCcw,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Clock,
  Calendar,
  ShieldCheck,
  FileText,
  ExternalLink
} from 'lucide-react';
import { articleService } from '../services/api';
import PageTitle from '../components/PageTitle';
import SearchBar from '../components/SearchBar';
import ArticleCard from '../components/ArticleCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [visibleCount, setVisibleCount] = useState(6);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await articleService.getArticles({
        search: searchQuery,
        category: selectedCategory,
        sort: sortBy
      });
      setArticles(res.articles || []);
      if (res.categories && res.categories.length > 0) {
        setCategories(res.categories);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, sortBy, searchQuery]);

  // Sync category state when URL changes
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && cat !== selectedCategory) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setVisibleCount(6);
    if (category === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('newest');
    setVisibleCount(6);
    setSearchParams({});
  };

  const visibleArticles = articles.slice(0, visibleCount);
  const hasMore = visibleCount < articles.length;

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <PageTitle
        title="Clinical Reference Protocols & Publications"
        subtitle="Comprehensive library of real peer-reviewed clinical guidelines, trial decks, and titration consensus."
        badge={`${articles.length} Publications Active`}
      />

      {/* Control Hub: Search, Sort, View Toggle, Filter Chips */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
        {/* Top Row: Search Input & Controls */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setVisibleCount(6);
              }}
              onClear={() => setSearchQuery('')}
              placeholder="Search protocol title, clinical summary, dosage, or keyword..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative inline-flex items-center">
              <label htmlFor="sort-select" className="sr-only">Sort Protocols</label>
              <div className="absolute left-3.5 pointer-events-none text-slate-400">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-9 pr-9 py-3 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-700 transition-all appearance-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title_asc">Title (A – Z)</option>
                <option value="title_desc">Title (Z – A)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-teal-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-teal-800 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Reset Button */}
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Specialty:
            </span>

            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              All Specialties
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Protocols Display */}
      {loading ? (
        <LoadingState message="Retrieving approved medical protocol records..." />
      ) : error ? (
        <ErrorState
          title="Could not load protocols"
          message={error}
          onRetry={fetchArticles}
        />
      ) : articles.length === 0 ? (
        <EmptyState
          title="No clinical protocols found"
          description={
            searchQuery || selectedCategory !== 'all'
              ? `No protocol found matching query "${searchQuery}" in category "${selectedCategory}".`
              : 'The clinical repository is currently ready for protocol ingestion.'
          }
          actionText="Clear All Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <div className="space-y-8">
          {/* Grid vs List View */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {visibleArticles.map((article) => (
                <div
                  key={article.id}
                  className="p-6 sm:p-7 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Article Thumbnail Preview */}
                  {article.thumbnail_url && (
                    <Link
                      to={`/articles/${article.slug || article.id}`}
                      className="w-28 h-24 sm:w-36 sm:h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 group/thumb hover:border-teal-400 transition-colors"
                      tabIndex={-1}
                    >
                      <img
                        src={article.thumbnail_url}
                        alt={article.title}
                        loading="lazy"
                        className="w-full h-full object-cover object-top group-hover/thumb:scale-105 transition-transform duration-300"
                      />
                    </Link>
                  )}

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200/60">
                        {article.category}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {article.reading_time || '4 min read'}
                      </span>
                      {article.pdf_name && (
                        <span className="hidden lg:inline text-[11px] font-mono text-slate-400 truncate max-w-xs">
                          {article.pdf_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 hover:text-teal-700 transition-colors">
                      <Link to={`/articles/${article.slug || article.id}`}>
                        {article.title}
                      </Link>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 max-w-3xl">
                      {article.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {article.pdf_url && (
                      <a
                        href={article.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                        title="Open PDF Document"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-700" />
                        <span>PDF</span>
                      </a>
                    )}
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-slate-400">Published</p>
                      <p className="text-xs font-semibold text-slate-600">
                        {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric'
                        }) : '2026'}
                      </p>
                    </div>
                    <Link
                      to={`/articles/${article.slug || article.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/70 transition-colors"
                    >
                      <span>Read Protocol</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination / Load More Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-900">{visibleArticles.length}</span> of{' '}
              <span className="font-bold text-slate-900">{articles.length}</span> verified protocols
            </p>

            {hasMore ? (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="inline-flex items-center justify-center px-6 py-3 text-xs font-bold text-teal-800 bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200 rounded-xl transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                Load More Protocols (+6)
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                All {articles.length} real clinical publications displayed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
