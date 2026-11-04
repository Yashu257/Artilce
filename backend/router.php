<?php
/**
 * Local Development Router for PHP Built-in Server
 * Usage: php -S 127.0.0.1:8000 backend/router.php
 */

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Strip leading /api or /backend if present from request path
$relativePath = preg_replace('#^/(api|backend)/#', '/', $uri);
if ($relativePath === '' || $relativePath === '/') {
    $relativePath = '/index.php';
}

$targetFile = __DIR__ . $relativePath;

if (file_exists($targetFile) && !is_dir($targetFile)) {
    // If it's a PHP file, execute it
    if (pathinfo($targetFile, PATHINFO_EXTENSION) === 'php') {
        require $targetFile;
        return true;
    }
    // Return false to serve static file
    return false;
}

// Default to backend index.php
require __DIR__ . '/index.php';
