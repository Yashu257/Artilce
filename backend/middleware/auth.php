<?php
/**
 * Authentication and Request Middleware
 * Medical Knowledge Platform - Backend
 */

declare(strict_types=1);

/**
 * Configure secure cross-origin headers and handle preflight OPTIONS.
 */
function handleCors(): void
{
    $allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5175',
        'http://localhost:3000'
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $frontendOrigin = getenv('FRONTEND_ORIGIN') ?: '';
    if ($frontendOrigin && !str_starts_with($frontendOrigin, 'http')) {
        $frontendOrigin = 'https://' . $frontendOrigin;
    }

    $isAllowed = false;
    if ($origin !== '') {
        if (in_array($origin, $allowedOrigins, true) || ($frontendOrigin && $origin === $frontendOrigin)) {
            $isAllowed = true;
        } elseif (preg_match('#^https://[a-zA-Z0-9-]+\.onrender\.com$#', $origin)) {
            $isAllowed = true;
        }
    }

    if ($isAllowed && $origin !== '') {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Content-Type: application/json; charset=utf-8');

    // Handle preflight OPTIONS request immediately
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Starts or resumes a secure PHP session.
 */
function initSession(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

        session_set_cookie_params([
            'lifetime' => 86400, // 24 hours
            'path'     => '/',
            'domain'   => '',
            'secure'   => $isHttps,
            'httponly' => true,
            'samesite' => $isHttps ? 'None' : 'Lax'
        ]);

        session_start();
    }
}

/**
 * Sends a standardized JSON response.
 *
 * @param bool $success
 * @param string|null $message
 * @param mixed $data
 * @param int $statusCode
 */
function sendJsonResponse(bool $success, ?string $message = null, mixed $data = null, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode([
        'success'   => $success,
        'message'   => $message,
        'data'      => $data,
        'timestamp' => date('c')
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Ensures the incoming request is authenticated via active PHP session.
 * Rejects unauthenticated requests with HTTP 401.
 *
 * @return array Authenticated user array
 */
function requireAuth(): array
{
    initSession();

    if (empty($_SESSION['user']) || empty($_SESSION['user']['id'])) {
        sendJsonResponse(false, 'Unauthorized. Please log in to access medical knowledge resources.', null, 401);
    }

    return $_SESSION['user'];
}

/**
 * Reads and decodes JSON input from request body.
 *
 * @return array
 */
function getJsonInput(): array
{
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
