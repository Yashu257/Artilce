/**
 * Assistant routes — POST /api/v1/assistant/chat (SSE),
 * GET /conversations, GET /conversations/:id, DELETE /conversations/:id,
 * POST /feedback.
 *
 * Chat delegates to src/rag/assistant.ts (owned by the RAG agent).
 * Until that module reports ASSISTANT_AVAILABLE, POST /chat returns an
 * honest 503 and NEVER a fabricated answer. Conversation history and
 * feedback are real DB operations and work regardless of RAG status.
 */
import { Router, type Request } from 'express';
import { auditLog } from '../lib/audit';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError, notFound, ok } from '../utils/response';
import { chatSchema, feedbackSchema, parseBody } from '../utils/validation';
import { ASSISTANT_AVAILABLE, answerQuestionStream } from '../rag/assistant';

export const assistantRouter = Router();

assistantRouter.use(requireAuth);

/**
 * asyncHandler types handlers with plain express Request, while
 * requireAuth (mounted above) has already attached req.user. Narrow it
 * here instead of weakening the middleware's types.
 */
const authed = (req: Request): AuthedRequest => req as AuthedRequest;

assistantRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const body = parseBody(chatSchema, req.body);
    if (!ASSISTANT_AVAILABLE) {
      throw new ApiError(
        503,
        'ASSISTANT_UNAVAILABLE',
        'The AI assistant is not available yet. Document ingestion and retrieval are still being set up.',
      );
    }
    // SSE headers must be set before the first token is written.
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const result = await answerQuestionStream(
      authed(req).user!.id,
      body.conversationId,
      body.question,
      (token) => {
        res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
      },
    );
    // SSE streaming (contract). Token events above carry the answer text;
    // the done event carries the full result including `mode`
    // ('llm' | 'local-retrieval') so clients can label the answer honestly.
    res.write(
      `event: done\ndata: ${JSON.stringify({
        answer: result.answer,
        citations: result.citations,
        conversationId: result.conversationId,
        mode: result.mode,
      })}\n\n`,
    );
    res.write('data: [DONE]\n\n');
    res.end();
  }),
);

assistantRouter.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const conversations = await prisma.conversation.findMany({
      where: { userId: authed(req).user!.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
    ok(res, {
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        messageCount: c._count.messages,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  }),
);

assistantRouter.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw notFound('Conversation');
    // Server-side authorization: conversations are per-user. A doctor
    // asking for another doctor's conversation gets 403 (not 404 — the
    // existence check above already ran) and the attempt is audit-logged.
    if (conversation.userId !== authed(req).user!.id) {
      await auditLog(authed(req).user!.id, 'assistant.conversation.access_denied', {
        conversationId: conversation.id,
        ownerId: conversation.userId,
      }, req.ip);
      throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this conversation.');
    }
    ok(res, {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citationsJson ? JSON.parse(m.citationsJson) : null,
          createdAt: m.createdAt,
        })),
      },
    });
  }),
);

assistantRouter.delete(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
    });
    if (!conversation) throw notFound('Conversation');
    if (conversation.userId !== authed(req).user!.id) {
      await auditLog(authed(req).user!.id, 'assistant.conversation.delete_denied', {
        conversationId: conversation.id,
        ownerId: conversation.userId,
      }, req.ip);
      throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this conversation.');
    }
    await prisma.conversation.delete({ where: { id: conversation.id } });
    ok(res, { deleted: true, id: conversation.id });
  }),
);

assistantRouter.patch(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const title = String(req.body.title || '').trim();
    if (!title) throw new ApiError(400, 'VALIDATION_ERROR', 'Title cannot be empty');
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
    });
    if (!conversation) throw notFound('Conversation');
    if (conversation.userId !== authed(req).user!.id) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have access to this conversation.');
    }
    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title },
    });
    ok(res, { conversation: updated });
  }),
);

assistantRouter.post(
  '/feedback',
  asyncHandler(async (req, res) => {
    const body = parseBody(feedbackSchema, req.body);
    // Per-user authorization: feedback may only reference the caller's own
    // conversation. A conversationId belonging to another user is treated
    // as not found (no existence leak).
    if (body.conversationId) {
      const owned = await prisma.conversation.findFirst({
        where: { id: body.conversationId, userId: authed(req).user!.id },
      });
      if (!owned) throw notFound('Conversation');
    }
    await auditLog(authed(req).user!.id, 'assistant.feedback', {
      conversationId: body.conversationId ?? null,
      messageId: body.messageId ?? null,
      rating: body.rating,
      comment: body.comment ?? null,
    }, req.ip);
    ok(res, { received: true });
  }),
);
