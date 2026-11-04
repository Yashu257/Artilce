<?php
/**
 * Unified Server Router (Supports PHP Backend API + React Single Page App)
 * Medical Knowledge Platform
 */

declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// 1. If path starts with /api/ or /backend/, rewrite to PHP script
if (preg_match('#^/(api|backend)/#', $uri)) {
    $relativePath = preg_replace('#^/(api|backend)/#', '/', $uri);
    $targetFile = __DIR__ . $relativePath;
    if (file_exists($targetFile) && !is_dir($targetFile) && pathinfo($targetFile, PATHINFO_EXTENSION) === 'php') {
        require $targetFile;
        return true;
    }
}

// 2. Direct static file or PHP script invocation
$targetFile = __DIR__ . $uri;
if ($uri !== '/' && file_exists($targetFile) && !is_dir($targetFile)) {
    // If it's a PHP file, execute it
    if (pathinfo($targetFile, PATHINFO_EXTENSION) === 'php') {
        require $targetFile;
        return true;
    }
    // Return false to let PHP built-in server serve static file (JS, CSS, PNG, PDF, SVG)
    return false;
}

// 3. React SPA Fallback: serve index.html for client-side routes (/dashboard, /login, /articles/...)
$indexFile = __DIR__ . '/index.html';
if (file_exists($indexFile)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($indexFile);
    return true;
}

// 4. Fallback to backend API root
require __DIR__ . '/index.php';
