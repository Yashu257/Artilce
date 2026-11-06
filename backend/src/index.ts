import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { mountApiDocs } from './config/swagger';
import { dbIsUp } from './lib/prisma';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { adminRouter } from './modules/admin/routes';
import { articlesRouter } from './modules/articles/routes';
import { authRouter } from './modules/auth/routes';
import { dashboardRouter } from './modules/dashboard/routes';
import { documentsRouter } from './modules/documents/routes';
import { assistantRouter } from './routes/assistant';
import { fail } from './utils/response';

export function createApp(): Express {
  const app = express();

  app.use(
    helmet({
      frameguard: false, // Allow iframe embedding for PDF viewer
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.frontendOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/v1', apiLimiter);

  // Health — always 200 so load balancers / smoke checks pass even when
  // MySQL is down; the `db` field reports the real database state.
  const health = async (_req: Request, res: Response): Promise<void> => {
    const dbUp = await dbIsUp();
    res.status(200).json({
      success: true,
      data: { status: 'ok', db: dbUp ? 'up' : 'down', version: '2.0.0' },
    });
  };
  app.get('/health', health);
  app.get('/api/v1/health', health);

  mountApiDocs(app);

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/articles', articlesRouter);
  app.use('/api/v1/documents', documentsRouter);
  app.use('/api/v1/assistant', assistantRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use((_req, res) => fail(res, 404, 'NOT_FOUND', 'Route not found.'));

  // Multer errors (e.g. file too large) arrive here as plain Errors.
  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  const app = createApp();
  if (!env.jwtSecretConfigured) {
    logger.warn('JWT_SECRET is not set — using a dev-only placeholder. Set JWT_SECRET in backend/.env before any real use.');
  }
  if (!env.databaseUrl) {
    logger.warn('DATABASE_URL is not set — /health will report db: down until it is configured.');
  }
  app.listen(env.port, () => {
    logger.info(`Cipla MedKnowledge backend listening on http://localhost:${env.port}`);
    logger.info(`API docs at http://localhost:${env.port}/api-docs`);
  });
}
