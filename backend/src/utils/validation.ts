import { z } from 'zod';
import { ApiError } from './response';

export const loginSchema = z.object({
  email: z.string().email('A valid email address is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export const registerOtpRequestSchema = z.object({
  name: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(80),
  email: z.string().trim().email('A valid email address is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

export const registerOtpVerifySchema = z.object({
  email: z.string().trim().email('A valid email address is required.'),
  otp: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits.'),
});

export const resendOtpSchema = z.object({
  email: z.string().trim().email('A valid email address is required.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('A valid email address is required.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password is too long.'),
});

export const articleQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sort: z.enum(['newest', 'oldest', 'title']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const documentQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  type: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const chatSchema = z.object({
  conversationId: z.string().optional(),
  question: z.string().trim().min(1, 'Question is required.').max(4000),
});

export const feedbackSchema = z.object({
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  rating: z.enum(['up', 'down']),
  comment: z.string().max(1000).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/** Parse with zod; on failure throw a 400 ApiError with the first issue.
 *  Returns the schema's *output* type, so `.default()` values are
 *  non-optional in the result. */
export function parseBody<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ApiError(400, 'VALIDATION_ERROR', first?.message ?? 'Invalid request.');
  }
  return result.data;
}
