/**
 * Articles — GET /api/v1/articles (search/category/sort/pagination),
 * GET /articles/categories, GET /articles/bookmarks,
 * GET /articles/:slugOrId, POST /articles/:id/bookmark (toggle),
 * POST /articles/:id/viewed (records activity).
 *
 * Article.content is stored as a JSON string:
 *   { author, readingTime, pdfFileName, pdfPages, thumbnailUrl,
 *     slideImages, sections: [{id, heading, paragraphs, bullet_points, table}] }
 * parsed verbatim from the original sampleArticles.js — no invented data.
 */
import { Router } from 'express';
import type { Article } from '@prisma/client';
import { activityLog } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import type { AuthedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { notFound, ok } from '../../utils/response';
import { articleQuerySchema, parseBody } from '../../utils/validation';

export const articlesRouter = Router();

export interface ArticleContent {
  author?: string;
  readingTime?: string;
  pdfFileName?: string;
  pdfPages?: number;
  thumbnailUrl?: string;
  slideImages?: string[];
  sections?: unknown[];
}

export function parseArticleContent(article: Article): ArticleContent {
  try {
    return JSON.parse(article.content) as ArticleContent;
  } catch {
    return {};
  }
}

export function serializeArticle(article: Article, bookmarked = false) {
  const content = parseArticleContent(article);
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    category: article.category,
    status: article.status,
    author: content.author ?? null,
    readingTime: content.readingTime ?? null,
    pdfFileName: article.pdfFileName ?? content.pdfFileName ?? null,
    pdfPages: article.pdfPages ?? content.pdfPages ?? null,
    thumbnailUrl: article.thumbnailUrl ?? content.thumbnailUrl ?? null,
    slideImages: content.slideImages ?? [],
    sections: content.sections ?? [],
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    bookmarked,
  };
}

async function bookmarkedIds(userId: string | undefined, articleIds: string[]): Promise<Set<string>> {
  if (!userId || articleIds.length === 0) return new Set();
  const rows = await prisma.bookmark.findMany({
    where: { userId, articleId: { in: articleIds } },
    select: { articleId: true },
  });
  return new Set(rows.map((r) => r.articleId));
}

articlesRouter.get(
  '/categories',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    const counts = await prisma.article.groupBy({
      by: ['category'],
      where: { status: 'published' },
      _count: { _all: true },
    });
    const countByName = new Map(counts.map((c) => [c.category, c._count._all]));
    ok(res, {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        articleCount: countByName.get(c.name) ?? 0,
      })),
    });
  }),
);

articlesRouter.get(
  '/bookmarks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await prisma.bookmark.findMany({
      where: { userId: req.user!.id },
      include: { article: true },
      orderBy: { createdAt: 'desc' },
    });
    ok(res, { bookmarks: rows.map((r) => serializeArticle(r.article, true)) });
  }),
);

articlesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = parseBody(articleQuerySchema, req.query);
    const where: Record<string, unknown> = { status: 'published' };
    if (q.search) {
      const s = q.search;
      where.OR = [
        { title: { contains: s } },
        { summary: { contains: s } },
        { content: { contains: s } },
        { category: { contains: s } },
      ];
    }
    if (q.category) {
      // Accept either a category slug (real-world-evidence) or the exact
      // category name (Real-World Evidence (RWE)).
      const cat = await prisma.category.findFirst({
        where: { OR: [{ slug: q.category }, { name: q.category }] },
      });
      where.category = cat ? cat.name : q.category;
    }
    const orderBy =
      q.sort === 'oldest'
        ? { publishedAt: 'asc' as const }
        : q.sort === 'title'
          ? { title: 'asc' as const }
          : { publishedAt: 'desc' as const };
    const [total, articles] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        orderBy,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);
    const marks = await bookmarkedIds((req as AuthedRequest).user?.id, articles.map((a) => a.id));
    ok(
      res,
      { articles: articles.map((a) => serializeArticle(a, marks.has(a.id))) },
      200,
      { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    );
  }),
);

articlesRouter.get(
  '/:slugOrId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const key = req.params.slugOrId as string;
    const article =
      (await prisma.article.findUnique({ where: { slug: key } })) ??
      (await prisma.article.findUnique({ where: { id: key } }));
    if (!article || article.status !== 'published') throw notFound('Article');
    const marks = await bookmarkedIds((req as AuthedRequest).user?.id, [article.id]);
    ok(res, { article: serializeArticle(article, marks.has(article.id)) });
  }),
);

articlesRouter.post(
  '/:id/bookmark',
  requireAuth,
  asyncHandler(async (req, res) => {
    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) throw notFound('Article');
    const existing = await prisma.bookmark.findUnique({
      where: { userId_articleId: { userId: req.user!.id, articleId: article.id } },
    });
    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      await activityLog(req.user!.id, 'article.unbookmarked', 'article', article.id);
      ok(res, { bookmarked: false, articleId: article.id });
    } else {
      await prisma.bookmark.create({ data: { userId: req.user!.id, articleId: article.id } });
      await activityLog(req.user!.id, 'article.bookmarked', 'article', article.id);
      ok(res, { bookmarked: true, articleId: article.id }, 201);
    }
  }),
);

articlesRouter.post(
  '/:id/viewed',
  requireAuth,
  asyncHandler(async (req, res) => {
    const article = await prisma.article.findUnique({ where: { id: req.params.id } });
    if (!article) throw notFound('Article');
    await activityLog(req.user!.id, 'article.viewed', 'article', article.id);
    ok(res, { viewed: true, articleId: article.id });
  }),
);
