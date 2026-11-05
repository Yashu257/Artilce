/**
 * Admin — GET /api/v1/admin/users, GET /admin/documents/status,
 * GET /admin/documents/report (indexing report), GET /admin/activity.
 * Admin role only (requireAuth + requireRole('admin')).
 * User rows never include passwordHash.
 */
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { ok } from '../../utils/response';
import { paginationSchema, parseBody } from '../../utils/validation';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    ok(res, { users });
  }),
);

adminRouter.get(
  '/documents/status',
  asyncHandler(async (_req, res) => {
    const [byStatus, documents] = await Promise.all([
      prisma.document.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.document.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true, title: true, fileName: true, category: true, status: true,
          pageCount: true, version: true, createdAt: true, updatedAt: true,
          _count: { select: { chunks: true } },
        },
      }),
    ]);
    ok(res, {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      documents: documents.map((d) => ({ ...d, chunkCount: d._count.chunks })),
    });
  }),
);

adminRouter.get(
  '/documents/report',
  asyncHandler(async (_req, res) => {
    // Indexing report (also produced by scripts/indexing-report.ts):
    // one row per document with page count, chunk count, status and
    // whether the source PDF is present on disk. The RAG agent uses this
    // to verify ingestion coverage per PDF.
    const uploadsDir = path.resolve(process.cwd(), env.uploadsDir);
    const documents = await prisma.document.findMany({
      orderBy: { title: 'asc' },
      include: { _count: { select: { chunks: true } } },
    });
    const byStatus = await prisma.document.groupBy({ by: ['status'], _count: { _all: true } });
    const rows = documents.map((d) => ({
      documentId: d.id,
      title: d.title,
      fileName: d.fileName,
      category: d.category,
      status: d.status,
      pageCount: d.pageCount,
      chunkCount: d._count.chunks,
      sizeBytes: d.size,
      fileExists: fs.existsSync(path.join(uploadsDir, path.basename(d.fileName))),
      updatedAt: d.updatedAt,
    }));
    ok(res, {
      summary: {
        total: rows.length,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
        totalChunks: rows.reduce((sum, r) => sum + r.chunkCount, 0),
        totalPages: rows.reduce((sum, r) => sum + r.pageCount, 0),
        missingFiles: rows.filter((r) => !r.fileExists).map((r) => r.fileName),
      },
      documents: rows,
    });
  }),
);

adminRouter.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const q = parseBody(paginationSchema, req.query);
    const [total, activity, audit] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);
    ok(
      res,
      { activity, audit },
      200,
      { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    );
  }),
);
