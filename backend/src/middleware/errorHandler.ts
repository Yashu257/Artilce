import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { ApiError, fail } from '../utils/response';

/** Central error handler. ApiErrors render as the standard envelope.
 *  Everything else becomes a generic 500 — the stack trace is logged
 *  server-side and NEVER sent to the client in production. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    fail(res, err.status, err.code, err.message);
    return;
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  const errName = err instanceof Error ? err.name : '';
  logger.error('Unhandled error', { error: message, stack: err instanceof Error ? err.stack : undefined });
  // Prisma failures (missing DATABASE_URL, unreachable MySQL, bad schema)
  // always surface as a clean 503 — never the raw Prisma invocation dump,
  // in any environment. Full details stay in the server log above.
  if (
    errName.startsWith('PrismaClient') ||
    errName === 'PrismaClientInitializationError' ||
    /Environment variable not found: DATABASE_URL|Can't reach database server|database server/i.test(message)
  ) {
    fail(res, 503, 'DATABASE_UNAVAILABLE', 'The database is unavailable. Please try again later.');
    return;
  }
  fail(
    res,
    500,
    'INTERNAL_ERROR',
    env.isProd ? 'Something went wrong. Please try again later.' : message,
  );
}

/** Wrap async route handlers so rejected promises reach the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
}
