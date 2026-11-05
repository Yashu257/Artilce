import { prisma } from './prisma';
import { logger } from './logger';

/** Best-effort audit write: a logging failure must never break the request. */
export async function auditLog(
  userId: string | null,
  action: string,
  details: Record<string, unknown>,
  ip?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action, details: JSON.stringify(details), ip: ip ?? null },
    });
  } catch (err) {
    logger.warn('Audit log write failed', { action, error: String(err) });
  }
}

export async function activityLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string,
): Promise<void> {
  try {
    await prisma.activityLog.create({ data: { userId, action, entityType, entityId } });
  } catch (err) {
    logger.warn('Activity log write failed', { action, error: String(err) });
  }
}
