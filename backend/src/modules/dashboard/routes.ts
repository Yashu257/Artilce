/**
 * Dashboard — GET /api/v1/dashboard. Every number comes from the DB:
 * totalArticles, totalDocuments, categories with counts, recentlyViewed
 * (this user's), popular (most-viewed articles), recentActivity.
 */
import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok } from '../../utils/response';
import { serializeArticle } from '../articles/routes';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const [totalArticles, totalDocuments, totalUsers, categories, recentViewedLogs, popularLogs, recentActivity] =
      await Promise.all([
        prisma.article.count({ where: { status: 'published' } }),
        prisma.document.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.category.findMany({ orderBy: { name: 'asc' } }),
        prisma.activityLog.findMany({
          where: { userId, action: 'article.viewed' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.activityLog.groupBy({
          by: ['entityId'],
          where: { action: 'article.viewed' },
          _count: { _all: true },
          orderBy: { _count: { entityId: 'desc' } },
          take: 5,
        }),
        prisma.activityLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    const categoryCounts = await prisma.article.groupBy({
      by: ['category'],
      where: { status: 'published' },
      _count: { _all: true },
    });
    const countByName = new Map(categoryCounts.map((c) => [c.category, c._count._all]));

    const viewedIds = [...new Set(recentViewedLogs.map((l) => l.entityId))];
    const popularIds = popularLogs.map((l) => l.entityId);
    const [viewedArticles, popularArticles] = await Promise.all([
      viewedIds.length
        ? prisma.article.findMany({ where: { id: { in: viewedIds } } })
        : Promise.resolve([]),
      popularIds.length
        ? prisma.article.findMany({ where: { id: { in: popularIds }, status: 'published' } })
        : Promise.resolve([]),
    ]);
    const viewedById = new Map(viewedArticles.map((a) => [a.id, a]));
    const popularById = new Map(popularArticles.map((a) => [a.id, a]));
    const viewCount = new Map(popularLogs.map((l) => [l.entityId, l._count._all]));

    ok(res, {
      totalArticles,
      totalDocuments,
      totalUsers,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        articleCount: countByName.get(c.name) ?? 0,
      })),
      recentlyViewed: viewedIds
        .map((id) => viewedById.get(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => serializeArticle(a)),
      popular: popularIds
        .map((id) => popularById.get(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({ ...serializeArticle(a), viewCount: viewCount.get(a.id) ?? 0 })),
      recentActivity: recentActivity.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        createdAt: l.createdAt,
      })),
    });
  }),
);
