import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Prisma singleton — one client per process (avoids connection exhaustion
// under ts-node-dev respawns / hot reload).
declare global {
  // eslint-disable-next-line no-var
  var __mkpPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__mkpPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__mkpPrisma = prisma;
}

/** Cheap liveness probe. Returns false instead of throwing when MySQL is down. */
export async function dbIsUp(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.warn('DB health check failed', { error: String(err) });
    return false;
  }
}
