/**
 * OpenAPI spec for /api-docs. Kept as a hand-written spec (rather than
 * swagger-jsdoc annotations scattered through routes) so the documented
 * surface stays in one place and matches shared/API_CONTRACT.md.
 */
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Cipla MedKnowledge API',
    version: '2.0.0',
    description:
      'Clinical Intelligence Platform API for physicians / HCPs. Auth is a httpOnly cookie (`mkp_session`, JWT, 8h). All responses use the standard envelope `{ success, data, error, meta }`.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local development' }],
  tags: [
    { name: 'Auth', description: 'Login, logout, session, password reset' },
    { name: 'Articles', description: 'Clinical publications / launch decks' },
    { name: 'Documents', description: 'Source PDFs (authenticated streaming only)' },
    { name: 'Assistant', description: 'RAG chat (SSE) and conversation history' },
    { name: 'Dashboard', description: 'DB-derived counts' },
    { name: 'Admin', description: 'Admin-only user / document / activity views' },
  ],
  paths: {
    '/api/v1/health': {
      get: { tags: ['Auth'], summary: 'Health check (also available at /health)', responses: { '200': { description: 'OK' } } },
    },
    '/api/v1/auth/login': {
      post: { tags: ['Auth'], summary: 'Log in (sets mkp_session cookie)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email', 'password'] } } } }, responses: { '200': { description: 'Logged in' }, '401': { description: 'Invalid credentials' }, '429': { description: 'Account locked after 5 failed attempts' } } },
    },
    '/api/v1/auth/logout': { post: { tags: ['Auth'], summary: 'Log out (clears cookie)', responses: { '200': { description: 'Logged out' } } } },
    '/api/v1/auth/me': { get: { tags: ['Auth'], summary: 'Current session user', responses: { '200': { description: 'User' }, '401': { description: 'Not authenticated' } } } },
    '/api/v1/auth/forgot-password': { post: { tags: ['Auth'], summary: 'Request a password-reset token (1h, hashed, single-use)', responses: { '200': { description: 'Generic confirmation (never reveals whether the email exists)' } } } },
    '/api/v1/auth/reset-password': { post: { tags: ['Auth'], summary: 'Reset password with a token', responses: { '200': { description: 'Password reset' }, '400': { description: 'Invalid or expired token' } } } },
    '/api/v1/articles': { get: { tags: ['Articles'], summary: 'List articles (?search=&category=&sort=newest|oldest|title&page=&limit=)', responses: { '200': { description: 'Articles + pagination meta' } } } },
    '/api/v1/articles/categories': { get: { tags: ['Articles'], summary: 'Categories with article counts', responses: { '200': { description: 'Categories' } } } },
    '/api/v1/articles/bookmarks': { get: { tags: ['Articles'], summary: 'Current user bookmarks', responses: { '200': { description: 'Bookmarked articles' } } } },
    '/api/v1/articles/{slugOrId}': { get: { tags: ['Articles'], summary: 'One article by slug or id', parameters: [{ name: 'slugOrId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Article' }, '404': { description: 'Not found' } } } },
    '/api/v1/articles/{id}/bookmark': { post: { tags: ['Articles'], summary: 'Toggle bookmark', responses: { '200': { description: 'bookmarked: true|false' } } } },
    '/api/v1/articles/{id}/viewed': { post: { tags: ['Articles'], summary: 'Record an article view', responses: { '200': { description: 'Recorded' } } } },
    '/api/v1/documents': {
      get: { tags: ['Documents'], summary: 'List documents (?search=&category=&type=)', responses: { '200': { description: 'Documents' } } },
      post: { tags: ['Documents'], summary: 'Upload a PDF (admin, multipart, 25 MB max)', responses: { '201': { description: 'Created (status pending)' }, '403': { description: 'Admin only' } } },
    },
    '/api/v1/documents/{id}': {
      get: { tags: ['Documents'], summary: 'One document', responses: { '200': { description: 'Document' } } },
      delete: { tags: ['Documents'], summary: 'Delete a document (admin)', responses: { '200': { description: 'Deleted' } } },
    },
    '/api/v1/documents/{id}/file': { get: { tags: ['Documents'], summary: 'Stream the PDF (auth, Range support)', responses: { '200': { description: 'PDF bytes' }, '206': { description: 'Partial content' } } } },
    '/api/v1/documents/{id}/reprocess': { post: { tags: ['Documents'], summary: 'Re-queue a document for ingestion (admin)', responses: { '200': { description: 'Queued as pending' } } } },
    '/api/v1/assistant/chat': { post: { tags: ['Assistant'], summary: 'Chat (SSE). Returns 503 until the RAG implementation is in place.', responses: { '200': { description: 'SSE stream {answer, citations, conversationId}' }, '503': { description: 'Assistant unavailable' } } } },
    '/api/v1/assistant/conversations': { get: { tags: ['Assistant'], summary: 'List my conversations', responses: { '200': { description: 'Conversations' } } } },
    '/api/v1/assistant/conversations/{id}': {
      get: { tags: ['Assistant'], summary: 'One conversation with messages', responses: { '200': { description: 'Conversation' } } },
      delete: { tags: ['Assistant'], summary: 'Delete a conversation', responses: { '200': { description: 'Deleted' } } },
    },
    '/api/v1/assistant/feedback': { post: { tags: ['Assistant'], summary: 'Submit chat feedback', responses: { '200': { description: 'Received' } } } },
    '/api/v1/dashboard': { get: { tags: ['Dashboard'], summary: 'DB-derived counts, recently viewed, popular, activity', responses: { '200': { description: 'Dashboard data' } } } },
    '/api/v1/admin/users': { get: { tags: ['Admin'], summary: 'All users (no password hashes)', responses: { '200': { description: 'Users' }, '403': { description: 'Admin only' } } } },
    '/api/v1/admin/documents/status': { get: { tags: ['Admin'], summary: 'Document counts by status + list (with chunk counts)', responses: { '200': { description: 'Status overview' } } } },
    '/api/v1/admin/documents/report': { get: { tags: ['Admin'], summary: 'Indexing report: per-PDF pages, chunks, status, file presence', responses: { '200': { description: 'Indexing report' } } } },
    '/api/v1/admin/activity': { get: { tags: ['Admin'], summary: 'Recent activity + audit logs', responses: { '200': { description: 'Activity' } } } },
  },
};

export function mountApiDocs(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
}
