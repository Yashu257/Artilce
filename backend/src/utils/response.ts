import type { Response } from 'express';

/** Standard envelope from shared/API_CONTRACT.md */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}
export interface ApiFailure {
  success: false;
  error: { code: string; message: string };
}

export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>): void {
  const body: ApiSuccess<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(status).json(body);
}

export function fail(res: Response, status: number, code: string, message: string): void {
  const body: ApiFailure = { success: false, error: { code, message } };
  res.status(status).json(body);
}

/** Error carrying an HTTP status + stable machine code. The error handler
 *  renders it through `fail()` and never leaks a stack trace in production. */
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (what = 'Resource'): ApiError =>
  new ApiError(404, 'NOT_FOUND', `${what} not found.`);
export const unauthorized = (message = 'Authentication required.'): ApiError =>
  new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have permission to do that.'): ApiError =>
  new ApiError(403, 'FORBIDDEN', message);
export const badRequest = (message: string): ApiError =>
  new ApiError(400, 'BAD_REQUEST', message);
export const unavailable = (message: string): ApiError =>
  new ApiError(503, 'SERVICE_UNAVAILABLE', message);
