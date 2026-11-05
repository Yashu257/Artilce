import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { auditLog } from '../lib/audit';
import { logger } from '../lib/logger';
import { ApiError, forbidden, unauthorized } from '../utils/response';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

// Attach the session user to Express's Request type so every handler can
// read req.user after requireAuth/optionalAuth without a cast.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

export function signSessionToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role } satisfies JwtPayload,
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(env.cookieName, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8h, matches JWT expiry
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.cookieName, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
  });
}

/** Read (but do not require) the session cookie. Used for optional-auth routes. */
export function readSession(req: Request): AuthUser | null {
  const token = req.cookies?.[env.cookieName] as string | undefined;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    return { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

/** Require a valid `mkp_session` httpOnly cookie. No localStorage tokens,
 *  no Gmail-domain auto-auth, no public registration anywhere in this app. */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const user = readSession(req);
  if (!user) return next(unauthorized());
  req.user = user;
  next();
}

/** Attach req.user when a valid cookie is present; never fails the request. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const user = readSession(req);
  if (user) req.user = user;
  next();
}

export function requireRole(role: 'admin' | 'doctor') {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (req.user.role !== role) {
      logger.warn('Forbidden role access', { userId: req.user.id, role: req.user.role, required: role });
      // Server-side authorization failure — recorded in the audit log,
      // not just the application log.
      void auditLog(req.user.id, 'authz.forbidden', { requiredRole: role, path: req.path }, req.ip);
      return next(forbidden('Admin access is required.'));
    }
    next();
  };
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  return requireRole('admin')(req, res, next);
}

export { ApiError };
