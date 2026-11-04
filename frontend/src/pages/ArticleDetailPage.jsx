import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Printer,
  Share2,
  Bookmark,
  CheckCircle2,
  FileText,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  BookOpen,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Eye
} from 'lucide-react';
import { articleService } from '../services/api';
import ArticleCard from '../components/ArticleCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    async function loadArticle() {
      try {
        setLoading(true);
        setError(null);
        const data = await articleService.getArticle(slug);
        setArticle(data.article);
        setRelatedArticles(data.related || []);
      } catch (err) {
        setError(err.message || 'Protocol could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    loadArticle();
    window.scrollTo(0, 0);
  }, [slug]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingState message="Retrieving clinical protocol documentation..." />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="py-20">
        <ErrorState
          title="Protocol Not Found"
          message={error || 'The requested clinical reference guideline could not be located.'}
          onRetry={() => navigate('/articles')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print border-b border-slate-100 pb-5">
        <Link
          to="/articles"
          className="inline-flex items-center gap-2 text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Protocols</span>
        </Link>

        <div className="flex items-center gap-3">
          {article.pdf_url && (
            <a
              href={article.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs"
              title="Open full original PDF in browser"
            >
              <FileText className="w-4 h-4" />
              <span>View Full PDF</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          )}

          <button
            type="button"
            onClick={() => setBookmarked(!bookmarked)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
              bookmarked
                ? 'bg-teal-50 text-teal-800 border-teal-200 shadow-2xs'
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
            }`}
            title="Bookmark Protocol"
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-teal-700 text-teal-700' : 'text-slate-400'}`} />
            <span>{bookmarked ? 'Bookmarked' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs"
            title="Copy reference link"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{copied ? 'Link Copied!' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs"
            title="Print this clinical protocol"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Protocol Journal Article */}
      <article className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 lg:p-16 shadow-2xs space-y-10">
        {/* Header Metadata */}
        <header className="space-y-6 pb-8 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/60">
              {article.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {article.published_at ? new Date(article.published_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              }) : 'Current 2026 Edition'}
            </span>
            {article.reading_time && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {article.reading_time}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 ml-auto">
              <CheckCircle2 className="w-4 h-4" />
              <span>Peer-Reviewed Standard</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {article.title}
          </h1>

          {/* Executive Summary Callout Box */}
          <div className="p-6 sm:p-8 bg-slate-50/80 rounded-2xl border-l-4 border-teal-700 space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800 block">
              Executive Clinical Summary
            </span>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-sans">
              {article.summary}
            </p>
          </div>

          {/* Original PDF Reference Callout */}
          {article.pdf_url && (
            <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Original Clinical Publication (PDF)
                  </h4>
                  <p className="text-xs text-slate-500">
                    {article.pdf_name || 'Launch Deck / Peer-Reviewed Manuscript'} • {article.pdf_pages || 10} Pages
                  </p>
                </div>
              </div>

              <a
                href={article.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-xs shrink-0"
              >
                <span>Open Original PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2">
            <span>Author / Reviewer: <strong className="text-slate-800">{article.author || 'Cipla Medical Advisory Panel'}</strong></span>
            <span className="font-medium text-slate-500">Clinical Protocol Standard ID: {article.slug || 'MED-2026-01'}</span>
          </div>
        </header>

        {/* Original Publication Visual Deck & Slide Viewer */}
        {article.slide_images && article.slide_images.length > 0 && (
          <section className="space-y-4 rounded-3xl bg-slate-50/70 p-6 sm:p-8 border border-slate-200/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-2xs">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Publication Presentation Slides & Visual Figures
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-resolution slides, patient titration flowcharts, and comparative outcome graphs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  Slide {activeSlideIndex + 1} of {article.slide_images.length}
                </span>
                {article.pdf_url && (
                  <a
                    href={article.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View All {article.pdf_pages || 12} Pages in PDF</span>
                  </a>
                )}
              </div>
            </div>

            {/* Main Active Slide Display */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-2 sm:p-4 min-h-[300px]">
              <img
                src={article.slide_images[activeSlideIndex]}
                alt={`Slide ${activeSlideIndex + 1} of ${article.title}`}
                className="w-full h-auto max-h-[560px] object-contain rounded-lg mx-auto shadow-2xs"
              />
            </div>

            {/* Thumbnail Navigation Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {article.slide_images.map((slideImg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all p-1.5 bg-white text-left ${
                    activeSlideIndex === idx
                      ? 'border-teal-700 ring-2 ring-teal-100 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={slideImg}
                    alt={`Slide thumbnail ${idx + 1}`}
                    className="w-full h-20 sm:h-24 object-cover object-top rounded-lg bg-slate-100"
                  />
                  <div className="mt-1.5 px-1 flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>Page {idx + 1}</span>
                    {activeSlideIndex === idx ? (
                      <span className="text-teal-700 font-extrabold text-[10px]">Active</span>
                    ) : (
                      <span className="text-slate-400 font-normal text-[10px]">View</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Table of Contents */}
        {article.sections && article.sections.length > 1 && (
          <nav aria-label="Table of Contents" className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-700" />
              <span>Table of Contents</span>
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {article.sections.map((section, idx) => (
                <li key={section.id || idx}>
                  <a
                    href={`#${section.id || `section-${idx}`}`}
                    className="group inline-flex items-center gap-2 text-slate-600 hover:text-teal-800 font-medium transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-teal-700 group-hover:translate-x-0.5 transition-transform" />
                    <span>{section.heading}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Structured Sections Content */}
        <div className="space-y-12 text-slate-800 leading-relaxed">
          {article.sections ? (
            article.sections.map((sec, sIdx) => (
              <section key={sec.id || sIdx} id={sec.id || `section-${sIdx}`} className="scroll-mt-24 space-y-4">
                <h2 className="text-xl font-extrabold text-slate-900 pb-3 border-b border-slate-100 tracking-tight">
                  {sec.heading}
                </h2>

                {sec.paragraphs && sec.paragraphs.map((para, pIdx) => (
                  <p key={pIdx} className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {para}
                  </p>
                ))}

                {sec.bullet_points && (
                  <div className="p-5 my-4 rounded-2xl bg-slate-50/60 border border-slate-200/60">
                    <ul className="space-y-2.5 text-sm sm:text-base text-slate-700">
                      {sec.bullet_points.map((pt, ptIdx) => (
                        <li key={ptIdx} className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-1" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sec.table && (
                  <div className="my-6 overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-bold">
                        <tr>
                          {sec.table.headers.map((th, thIdx) => (
                            <th key={thIdx} className="p-4 whitespace-nowrap">{th}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sec.table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-4 text-slate-700 font-medium">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))
          ) : (
            <div className="whitespace-pre-line text-sm sm:text-base text-slate-700 leading-relaxed font-sans">
              {article.content}
            </div>
          )}
        </div>

        {/* Institutional Governance Disclaimer */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Institutional Governance & Clinical Reference Notice</span>
          </div>
          <p className="leading-relaxed">
            This clinical protocol reflects the standardized structure for approved clinical guidelines. Always consult current institutional clinical pathways and institutional pharmacological directives before making treatment determinations.
          </p>
        </div>
      </article>

      {/* Related Protocols Grid */}
      {relatedArticles.length > 0 && (
        <section aria-labelledby="related-heading" className="pt-8 no-print space-y-6">
          <div className="flex items-end justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 id="related-heading" className="text-xl font-extrabold text-slate-900 tracking-tight">
                Related Clinical Protocols
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Complementary protocols from the same specialty area
              </p>
            </div>
            <Link to="/articles" className="text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-900 transition-colors">
              View All Protocols
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((rel) => (
              <ArticleCard key={rel.id} article={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
