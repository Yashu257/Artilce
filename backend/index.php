<?php
/**
 * Medical Knowledge Platform - Backend API Router / Health Check
 * GET /backend/
 */

declare(strict_types=1);

require_once __DIR__ . '/middleware/auth.php';

handleCors();

sendJsonResponse(true, 'Medical Knowledge Platform API — Phase 1', [
    'version'   => '1.0.0',
    'status'    => 'active',
    'theme'     => 'pure-white',
    'endpoints' => [
        'POST /auth/login.php'    => 'Authenticate doctor credentials with session cookie',
        'POST /auth/logout.php'   => 'Terminate session and clear cookie',
        'GET  /auth/me.php'       => 'Check current authenticated user session',
        'GET  /articles/list.php' => 'List articles with search, category filtering & sorting',
        'GET  /articles/get.php'  => 'Retrieve article details and related articles (by id or slug)',
        'POST /chatbot/ask.php'   => 'AI Assistant (Status: DISABLED until Phase 2)'
    ],
    'phase1_notice' => 'Placeholder data active. Real clinical articles will be inserted in Phase 2.'
], 200);
