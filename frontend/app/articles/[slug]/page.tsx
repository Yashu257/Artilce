"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Printer,
  Share2,
  Bookmark,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  AlertCircle,
  Eye,
  Layers,
} from "lucide-react";
import { api, apiErrorMessage } from "../../../lib/api";
import type { Article } from "../../../lib/types";
import ArticleCard from "../../../components/ArticleCard";
import LoadingState from "../../../components/LoadingState";

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug || "");
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError("");

    api
      .getArticle(slug)
      .then((a) => {
        setArticle(a);
        setBookmarked(Boolean(a.bookmarked));
        api.markViewed(a.id).catch(() => undefined);

        api
          .getArticles({ category: a.category, limit: 4 })
          .then((r) => setRelated(r.items.filter((x) => x.id !== a.id).slice(0, 3)))
          .catch(() => undefined);
      })
      .catch((e) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [slug]);

  const toggleBookmark = async () => {
    if (!article) return;
    try {
      const r = await api.bookmarkArticle(article.id);
      setBookmarked(r.bookmarked);
    } catch (e) {
      setShareMsg(apiErrorMessage(e));
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Reference link copied to clipboard!");
      setTimeout(() => setShareMsg(""), 3000);
    } catch {
      setShareMsg(url);
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingState message="Retrieving clinical publication details…" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-rose-900">
          <p className="flex items-center gap-2 font-bold text-base">
            <AlertCircle className="h-5 w-5 text-rose-600" /> Publication Not Found
          </p>
          <p className="mt-2 text-sm text-rose-700">{error || "The requested clinical resource could not be found."}</p>
          <button
            onClick={() => router.push("/articles")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-teal-800 bg-white border border-teal-200 hover:bg-teal-50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Clinical Publications
          </button>
        </div>
      </div>
    );
  }

  const docId = article.documentId || `doc-${article.slug}`;
  const pdfViewerUrl = `/documents/${docId}?page=1`;

  // Generate 4 slide image paths for this publication
  const slideImages =
    article.slideImages && article.slideImages.length > 0
      ? article.slideImages
      : [
          `/slides/${article.slug}/page-1.png`,
          `/slides/${article.slug}/page-2.png`,
          `/slides/${article.slug}/page-3.png`,
          `/slides/${article.slug}/page-4.png`,
        ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-xs font-bold text-teal-800 hover:text-teal-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Publications</span>
        </Link>

        <div className="flex items-center gap-2.5">
          {/* Integrated In-App PDF Viewer Link */}
          <Link
            href={pdfViewerUrl}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-all shadow-xs"
            title="Open full interactive PDF viewer"
          >
            <FileText className="w-4 h-4" />
            <span>Open Full PDF Viewer</span>
          </Link>

          <button
            type="button"
            onClick={toggleBookmark}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
              bookmarked
                ? "bg-teal-50 text-teal-800 border-teal-200"
                : "text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
            }`}
            title="Bookmark Protocol"
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "fill-teal-700 text-teal-700" : "text-slate-400"}`} />
            <span>{bookmarked ? "Saved" : "Save"}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs"
            title="Copy link"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-2xs"
            title="Print publication"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {shareMsg && (
        <div className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-xs font-medium text-teal-800">
          {shareMsg}
        </div>
      )}

      {/* Main Publication Article Card */}
      <article className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 lg:p-12 shadow-2xs space-y-8">
        {/* Header Metadata */}
        <header className="space-y-4 pb-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200/60">
              {article.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "2026 Clinical Edition"}
            </span>
            {article.readingTime && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {article.readingTime}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 ml-auto">
              <CheckCircle2 className="w-4 h-4" />
              <span>Peer-Reviewed Standard</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {article.title}
          </h1>

          {/* Executive Summary Callout Box */}
          <div className="p-6 bg-slate-50/90 rounded-2xl border-l-4 border-teal-700 space-y-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-teal-900 block">
              Executive Clinical Summary
            </span>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-sans">
              {article.summary}
            </p>
          </div>

          {/* Original PDF Reference Callout with Integrated Link */}
          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Original Clinical Publication (PDF)
                </h4>
                <p className="text-xs text-slate-500">
                  {article.pdfFileName || "Verified Launch Deck"} • {article.pdfPages || 10} Pages
                </p>
              </div>
            </div>

            <Link
              href={pdfViewerUrl}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-all shadow-xs shrink-0"
            >
              <span>View in App Viewer</span>
              <FileText className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Publication Presentation Slides & Visual Figures Carousel */}
        {slideImages.length > 0 && (
          <section className="space-y-4 rounded-2xl bg-slate-50/80 p-5 sm:p-7 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-2xs">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Presentation Slides & Visual Figures
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-resolution publication figures and trial flowcharts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  Slide {activeSlideIndex + 1} of {slideImages.length}
                </span>
                <Link
                  href={pdfViewerUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View All in PDF</span>
                </Link>
              </div>
            </div>

            {/* Main Featured Slide Image Display */}
            <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center">
              <Image
                src={slideImages[activeSlideIndex]}
                alt={`Slide ${activeSlideIndex + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 800px"
              />

              {/* Prev / Next Carousel Controls */}
              <button
                onClick={() =>
                  setActiveSlideIndex((prev) => (prev > 0 ? prev - 1 : slideImages.length - 1))
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-slate-700 hover:text-slate-950 shadow-md hover:bg-white transition-all"
                title="Previous Slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() =>
                  setActiveSlideIndex((prev) => (prev < slideImages.length - 1 ? prev + 1 : 0))
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 text-slate-700 hover:text-slate-950 shadow-md hover:bg-white transition-all"
                title="Next Slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Thumbnail Strip */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {slideImages.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`relative aspect-16/10 rounded-lg overflow-hidden border-2 transition-all ${
                    activeSlideIndex === idx
                      ? "border-teal-700 ring-2 ring-teal-700/20 shadow-xs"
                      : "border-slate-200 opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Structured Publication Content & Sections */}
        {article.sections && article.sections.length > 0 ? (
          <div className="space-y-6 pt-2">
            {article.sections.map((sec: any, idx: number) => (
              <div key={idx} className="space-y-3">
                {sec.heading && (
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                    {sec.heading}
                  </h3>
                )}
                {sec.paragraphs &&
                  sec.paragraphs.map((p: string, pIdx: number) => (
                    <p key={pIdx} className="text-sm leading-relaxed text-slate-700">
                      {p}
                    </p>
                  ))}
                {sec.bullet_points && sec.bullet_points.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                    {sec.bullet_points.map((pt: string, ptIdx: number) => (
                      <li key={ptIdx}>{pt}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : article.content ? (
          <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
            <div className="whitespace-pre-wrap">{article.content}</div>
          </div>
        ) : null}
      </article>

      {/* Related Publications */}
      {related.length > 0 && (
        <section className="space-y-4 pt-4">
          <h2 className="text-lg font-bold text-slate-900">
            Related Clinical Publications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
