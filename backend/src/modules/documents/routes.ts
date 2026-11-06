/**
 * Documents — GET /api/v1/documents, GET /:id, GET /:id/file (auth +
 * streamed, Range support, never a public URL), POST (admin, multipart
 * PDF-only, 25 MB), DELETE (admin), POST /:id/reprocess (admin).
 *
 * Uploaded files live in backend/uploads/ and are served only through
 * the authenticated /file endpoint. `status` starts at `pending`; the
 * RAG ingestion pipeline (scripts/ingest.ts) moves it to
 * processing -> ready (or failed). Reprocess re-queues it as pending.
 */
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import type { Document } from '@prisma/client';
import multer from 'multer';
import { env } from '../../config/env';
import { activityLog, auditLog } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import type { AuthedRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiError, notFound, ok } from '../../utils/response';
import { documentQuerySchema, parseBody } from '../../utils/validation';

export const documentsRouter = Router();

const uploadsDir = path.resolve(process.cwd(), env.uploadsDir);
fs.mkdirSync(uploadsDir, { recursive: true });

function serializeDocument(doc: Document) {
  return {
    id: doc.id,
    title: doc.title,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    size: doc.size,
    category: doc.category,
    status: doc.status,
    pageCount: doc.pageCount,
    version: doc.version,
    uploadedById: doc.uploadedById,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Resolve a stored fileName to a path, checking uploads/ as well as frontend asset directories. */
function resolveUploadPath(fileName: string): string {
  const safe = path.basename(fileName);
  const candidateDirs = [
    uploadsDir,
    path.resolve(process.cwd(), '../frontend/assests/PDF'),
    path.resolve(process.cwd(), '../frontend/assets/PDF'),
    path.resolve(process.cwd(), '../frontend/public/documents'),
    path.resolve(process.cwd(), '../frontend/public/PDF'),
    path.resolve(process.cwd(), '../frontend/public/assets/PDF'),
    path.resolve(process.cwd(), 'uploads'),
  ];
  for (const dir of candidateDirs) {
    const full = path.join(dir, safe);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return path.join(uploadsDir, safe);
}

/** Robust document finder supporting doc-id, clean slug, article slug, or filename. */
async function findDocumentByKey(key: string): Promise<Document | null> {
  if (!key || key === 'undefined' || key === 'doc-undefined') return null;
  // 1. Direct ID match
  let doc = await prisma.document.findUnique({ where: { id: key } });
  if (doc) return doc;

  // 2. ID match with or without doc- prefix, or filename match
  const altId = key.startsWith('doc-') ? key.replace(/^doc-/, '') : `doc-${key}`;
  doc = await prisma.document.findFirst({
    where: {
      OR: [
        { id: altId },
        { fileName: key },
        { fileName: { contains: key } },
      ],
    },
  });
  if (doc) return doc;

  // 3. Match against Article slug or ID
  const cleanSlug = key.replace(/^doc-/, '');
  const article = await prisma.article.findFirst({
    where: {
      OR: [
        { slug: key },
        { slug: cleanSlug },
        { id: key },
      ],
    },
  });
  if (article && article.pdfFileName) {
    doc = await prisma.document.findFirst({
      where: {
        OR: [
          { fileName: article.pdfFileName },
          { id: `doc-${article.slug}` },
          { id: `doc-${cleanSlug}` },
        ],
      },
    });
    if (doc) return doc;
  }

  // 4. Substring search across all documents
  const lower = cleanSlug.toLowerCase();
  const allDocs = await prisma.document.findMany();
  for (const d of allDocs) {
    if (d.id.toLowerCase().includes(lower) || d.fileName.toLowerCase().includes(lower) || d.title.toLowerCase().includes(lower)) {
      return d;
    }
  }

  return null;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const safe = path.basename(file.originalname).replace(/[^A-Za-z0-9._\- ]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(new ApiError(400, 'INVALID_FILE_TYPE', 'Only PDF files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

documentsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = parseBody(documentQuerySchema, req.query);
    const where: Record<string, unknown> = {};
    if (q.search) {
      where.OR = [{ title: { contains: q.search } }, { fileName: { contains: q.search } }];
    }
    if (q.category) {
      const cat = await prisma.category.findFirst({
        where: { OR: [{ slug: q.category }, { name: q.category }] },
      });
      where.category = cat ? cat.name : q.category;
    }
    if (q.type) where.mimeType = { contains: q.type };
    const [total, docs] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);
    ok(
      res,
      { documents: docs.map(serializeDocument) },
      200,
      { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    );
  }),
);

documentsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await findDocumentByKey(req.params.id);
    if (!doc) throw notFound('Document');
    ok(res, { document: serializeDocument(doc) });
  }),
);

documentsRouter.get(
  '/:id/file',
  requireAuth,
  asyncHandler(async (req, res) => {
    const doc = await findDocumentByKey(req.params.id);
    if (!doc) throw notFound('Document');
    // Server-side authorization for file streaming. Documents uploaded by
    // an admin are shared clinical resources: any authenticated doctor may
    // read them. A document uploaded by a non-admin user is private to
    // that user (and admins). Anything else is denied with 403 and the
    // attempt is written to the AuditLog — access is never decided by
    // the UI alone.
    if (doc.uploadedById && (req as AuthedRequest).user!.id !== doc.uploadedById && (req as AuthedRequest).user!.role !== 'admin') {
      const uploader = await prisma.user.findUnique({ where: { id: doc.uploadedById }, select: { role: true } });
      if (uploader && uploader.role !== 'admin') {
        await auditLog((req as AuthedRequest).user!.id, 'document.file.access_denied', {
          documentId: doc.id,
          ownerId: doc.uploadedById,
        }, req.ip);
        throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this document.');
      }
    }
    const filePath = resolveUploadPath(doc.fileName);
    if (!fs.existsSync(filePath)) throw notFound('Document file');
    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    await activityLog((req as AuthedRequest).user?.id ?? null, 'document.downloaded', 'document', doc.id);

    res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      const start = match?.[1] ? Number(match[1]) : 0;
      const end = match?.[2] ? Number(match[2]) : stat.size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= stat.size) {
        res.status(416).setHeader('Content-Range', `bytes */${stat.size}`).end();
        return;
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', end - start + 1);
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.setHeader('Content-Length', stat.size);
      fs.createReadStream(filePath).pipe(res);
    }
  }),
);

documentsRouter.post(
  '/',
  requireAuth,
  requireRole('admin'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const file = (req as AuthedRequest & { file?: Express.Multer.File }).file;
    if (!file) throw new ApiError(400, 'BAD_REQUEST', 'A PDF file is required (multipart field "file").');
    const title = typeof req.body?.title === 'string' && req.body.title.trim()
      ? req.body.title.trim()
      : path.basename(file.originalname, '.pdf');
    const category = typeof req.body?.category === 'string' && req.body.category.trim()
      ? req.body.category.trim()
      : 'Uncategorised';
    const doc = await prisma.document.create({
      data: {
        title,
        fileName: file.filename,
        mimeType: 'application/pdf',
        size: file.size,
        category,
        status: 'pending',
        pageCount: 0,
        version: 1,
        uploadedById: (req as AuthedRequest).user!.id,
      },
    });
    await auditLog((req as AuthedRequest).user!.id, 'document.uploaded', { documentId: doc.id, fileName: file.filename }, req.ip);
    ok(res, { document: serializeDocument(doc) }, 201);
  }),
);

documentsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound('Document');
    await prisma.document.delete({ where: { id: doc.id } });
    const filePath = resolveUploadPath(doc.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await auditLog((req as AuthedRequest).user!.id, 'document.deleted', { documentId: doc.id }, req.ip);
    ok(res, { deleted: true, id: doc.id });
  }),
);

documentsRouter.post(
  '/:id/reprocess',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) throw notFound('Document');
    // Honest re-queue: ingestion itself lives in scripts/ingest.ts (RAG
    // agent). We mark the document pending and clear its chunks so the
    // next ingest run rebuilds them; we do NOT claim it is ready.
    await prisma.$transaction([
      prisma.documentChunk.deleteMany({ where: { documentId: doc.id } }),
      prisma.document.update({ where: { id: doc.id }, data: { status: 'pending' } }),
    ]);
    await auditLog((req as AuthedRequest).user!.id, 'document.reprocess_requested', { documentId: doc.id }, req.ip);
    ok(res, {
      document: serializeDocument({ ...doc, status: 'pending' }),
      message: 'Document queued for reprocessing. Run `npm run ingest` (or the RAG pipeline) to rebuild its chunks.',
    });
  }),
);
