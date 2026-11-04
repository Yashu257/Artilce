<?php
/**
 * Current User Session Endpoint
 * GET /backend/auth/me.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../middleware/auth.php';

handleCors();
$user = requireAuth();

sendJsonResponse(true, 'Session active.', [
    'user' => $user
], 200);
