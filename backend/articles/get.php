<?php
/**
 * Single Article Detail Endpoint
 * GET /backend/articles/get.php?id=1 or ?slug=sample-article-01
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

handleCors();
$currentUser = requireAuth();

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$slug = isset($_GET['slug']) ? trim((string)$_GET['slug']) : null;

if (empty($id) && empty($slug)) {
    sendJsonResponse(false, 'Article ID or slug is required.', null, 400);
}

try {
    $pdo = getDbConnection();

    if (!empty($slug)) {
        $stmt = $pdo->prepare("SELECT * FROM articles WHERE slug = :slug AND status = 'published' LIMIT 1");
        $stmt->execute([':slug' => $slug]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM articles WHERE id = :id AND status = 'published' LIMIT 1");
        $stmt->execute([':id' => $id]);
    }

    $article = $stmt->fetch();

    if (!$article) {
        sendJsonResponse(false, 'Article not found.', null, 404);
    }

    // Fetch related articles in the same category
    $relatedStmt = $pdo->prepare("
        SELECT id, title, slug, summary, category, published_at
        FROM articles
        WHERE category = :category AND id != :current_id AND status = 'published'
        ORDER BY published_at DESC
        LIMIT 3
    ");
    $relatedStmt->execute([
        ':category'   => $article['category'],
        ':current_id' => $article['id']
    ]);
    $related = $relatedStmt->fetchAll();

    sendJsonResponse(true, 'Article retrieved successfully.', [
        'article' => $article,
        'related' => $related
    ]);

} catch (PDOException $e) {
    sendJsonResponse(false, 'Failed to retrieve article details.', null, 500);
}
