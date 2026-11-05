/**
 * Auth routes — POST /api/v1/auth/login|logout, GET /me,
 * POST /forgot-password, POST /reset-password.
 *
 * Security notes (contract):
 * - httpOnly cookie `mkp_session`, JWT 8h, Secure in prod, SameSite=Lax.
 * - No public registration, no Gmail-domain auto-auth.
 * - Lockout: 5 failed logins for an account -> 15-minute lockout.
 *   The lockout is tracked in memory (Map); it resets on server restart.
 *   That is acceptable for v2 single-instance deploys and is documented
 *   in backend/README.md. The per-IP rate limiter is an additional layer.
 * - Password-reset tokens are random, stored only as a SHA-256 hash,
 *   expire after 1h, and are single-use.
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Router } from 'express';
import { assertJwtSecret, env } from '../../config/env';
import { auditLog } from '../../lib/audit';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { clearSessionCookie, requireAuth, setSessionCookie, signSessionToken } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { loginLimiter } from '../../middleware/rateLimit';
import { ApiError, ok, unauthorized } from '../../utils/response';
import { forgotPasswordSchema, loginSchema, parseBody, resetPasswordSchema } from '../../utils/validation';

export const authRouter = Router();

const MAX_FAILED = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
interface LockoutEntry {
  failures: number;
  lockedUntil: number | null;
}
const lockouts = new Map<string, LockoutEntry>();

function lockoutKey(email: string): string {
  return email.trim().toLowerCase();
}
function isLocked(email: string): boolean {
  const entry = lockouts.get(lockoutKey(email));
  if (!entry?.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    lockouts.delete(lockoutKey(email));
    return false;
  }
  return true;
}
function recordFailure(email: string): void {
  const key = lockoutKey(email);
  const entry = lockouts.get(key) ?? { failures: 0, lockedUntil: null };
  entry.failures += 1;
  if (entry.failures >= MAX_FAILED) entry.lockedUntil = Date.now() + LOCKOUT_MS;
  lockouts.set(key, entry);
}
function clearFailures(email: string): void {
  lockouts.delete(lockoutKey(email));
}

function publicUser(user: { id: string; name: string; email: string; role: string; isActive: boolean }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
}

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = parseBody(loginSchema, req.body);
    assertJwtSecret();
    const normalizedEmail = email.trim().toLowerCase();

    if (isLocked(normalizedEmail)) {
      await auditLog(null, 'auth.login.locked', { email: normalizedEmail }, req.ip);
      throw new ApiError(
        429,
        'ACCOUNT_LOCKED',
        'Too many failed login attempts. Please try again in 15 minutes.',
      );
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    // Same generic message + same timing shape for unknown vs wrong password:
    // compare against a dummy hash so timing does not leak user existence.
    const hash = user?.passwordHash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinva';
    const passwordOk = await bcrypt.compare(password, hash);

    if (!user || !passwordOk || !user.isActive) {
      recordFailure(normalizedEmail);
      await auditLog(user?.id ?? null, 'auth.login.failed', { email: normalizedEmail }, req.ip);
      throw unauthorized('Invalid email or password.');
    }

    clearFailures(normalizedEmail);
    const token = signSessionToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    setSessionCookie(res, token);
    await auditLog(user.id, 'auth.login', { email: user.email }, req.ip);
    logger.info('Login', { userId: user.id, email: user.email });
    ok(res, { user: publicUser(user) });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    clearSessionCookie(res);
    ok(res, { loggedOut: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.isActive) throw unauthorized('Session is no longer valid.');
    ok(res, { user: publicUser(user) });
  }),
);

authRouter.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = parseBody(forgotPasswordSchema, req.body);
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return the same message so the endpoint does not reveal
    // whether an email address has an account.
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
        },
      });
      await auditLog(user.id, 'auth.password.reset_requested', { email: normalizedEmail }, req.ip);
      // No email provider is wired up in v2. In non-production the token
      // is written to the server log so a developer can complete the flow
      // during testing; in production it must be emailed (see README).
      if (!env.isProd) {
        logger.info('Password reset token (dev only — email this in production)', {
          email: normalizedEmail,
          token,
        });
      }
    }
    ok(res, { message: 'If an account exists for that email, a password reset link has been sent.' });
  }),
);

authRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = parseBody(resetPasswordSchema, req.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record || !record.user.isActive) {
      throw new ApiError(400, 'INVALID_TOKEN', 'The reset link is invalid or has expired.');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    await auditLog(record.userId, 'auth.password.reset', {}, req.ip);
    ok(res, { message: 'Password has been reset. You can now log in.' });
  }),
);
