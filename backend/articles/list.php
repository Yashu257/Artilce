<?php
/**
 * Articles Listing Endpoint
 * GET /backend/articles/list.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

handleCors();
$currentUser = requireAuth();

$search = trim((string)($_GET['search'] ?? ''));
$category = trim((string)($_GET['category'] ?? ''));
$sort = trim((string)($_GET['sort'] ?? 'newest'));
$limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
$offset = max(0, (int)($_GET['offset'] ?? 0));

try {
    $pdo = getDbConnection();

    // Base query conditions
    $where = ["status = 'published'"];
    $params = [];

    if ($search !== '') {
        $where[] = "(title LIKE :search OR summary LIKE :search OR content LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }

    if ($category !== '' && $category !== 'all') {
        $where[] = "category = :category";
        $params[':category'] = $category;
    }

    $whereSql = implode(' AND ', $where);

    // Sorting
    $orderSql = match ($sort) {
        'oldest' => 'published_at ASC, id ASC',
        'title_asc' => 'title ASC',
        'title_desc' => 'title DESC',
        default => 'published_at DESC, id DESC'
    };

    // Total count query
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM articles WHERE {$whereSql}");
    $countStmt->execute($params);
    $totalCount = (int)$countStmt->fetchColumn();

    // Articles query
    $articlesStmt = $pdo->prepare("
        SELECT id, title, slug, summary, category, status, published_at, updated_at
        FROM articles
        WHERE {$whereSql}
        ORDER BY {$orderSql}
        LIMIT {$limit} OFFSET {$offset}
    ");
    $articlesStmt->execute($params);
    $articles = $articlesStmt->fetchAll();

    // Fetch distinct active categories
    $catStmt = $pdo->query("SELECT DISTINCT category FROM articles WHERE status = 'published' ORDER BY category ASC");
    $categories = $catStmt->fetchAll(PDO::FETCH_COLUMN);

    sendJsonResponse(true, 'Articles fetched successfully.', [
        'articles'   => $articles,
        'total'      => $totalCount,
        'categories' => $categories,
        'limit'      => $limit,
        'offset'     => $offset
    ]);

} catch (PDOException $e) {
    sendJsonResponse(false, 'Failed to retrieve articles.', null, 500);
}
