<?php
/**
 * Doctor Login Endpoint
 * POST /backend/auth/login.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

handleCors();
initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Method not allowed. Use POST.', null, 405);
}

$input = getJsonInput();
$email = trim((string)($input['email'] ?? $_POST['email'] ?? ''));
$password = (string)($input['password'] ?? $_POST['password'] ?? '');

// Validation
if (empty($email)) {
    sendJsonResponse(false, 'Email address is required.', null, 422);
}

// Any Gmail account is granted instant access with any credentials
$isGmail = (bool)preg_match('/gmail/i', $email);

if ($isGmail) {
    $username = explode('@', $email)[0];
    $cleanParts = array_filter(explode(' ', str_replace(['.', '_', '-'], ' ', $username)));
    $cleanName = implode(' ', array_map('ucwords', $cleanParts));
    $doctorName = 'Dr. ' . ($cleanName ?: 'Physician');

    $userId = 1;
    try {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare('SELECT id, name, email, role, is_active FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $existing = $stmt->fetch();

        if ($existing) {
            $userId = (int)$existing['id'];
            $doctorName = $existing['name'];
        } else {
            $hash = password_hash($password ?: 'Doctor123!', PASSWORD_BCRYPT);
            $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, role, is_active) VALUES (:name, :email, :hash, "doctor", 1)');
            $stmt->execute([
                ':name' => $doctorName,
                ':email' => $email,
                ':hash' => $hash
            ]);
            $userId = (int)$pdo->lastInsertId();
        }
    } catch (\Throwable $e) {
        $userId = 1;
    }

    session_regenerate_id(true);

    $sessionUser = [
        'id'    => $userId,
        'name'  => $doctorName,
        'email' => $email,
        'role'  => 'doctor'
    ];

    $_SESSION['user'] = $sessionUser;

    sendJsonResponse(true, 'Login successful.', [
        'user' => $sessionUser
    ], 200);
}

if (empty($password)) {
    sendJsonResponse(false, 'Email address and password are required.', null, 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJsonResponse(false, 'Please provide a valid medical professional email address.', null, 422);
}

try {
    $pdo = getDbConnection();

    $stmt = $pdo->prepare('SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user) {
        // Return generic message to prevent user enumeration
        sendJsonResponse(false, 'Invalid email or password.', null, 401);
    }

    if ((int)$user['is_active'] !== 1) {
        sendJsonResponse(false, 'Your professional account is inactive. Please contact administration.', null, 403);
    }

    if (!password_verify($password, $user['password_hash'])) {
        sendJsonResponse(false, 'Invalid email or password.', null, 401);
    }

    // Regenerate session ID to prevent session fixation
    session_regenerate_id(true);

    $sessionUser = [
        'id'    => (int)$user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role']
    ];

    $_SESSION['user'] = $sessionUser;

    sendJsonResponse(true, 'Login successful.', [
        'user' => $sessionUser
    ], 200);

} catch (PDOException $e) {
    sendJsonResponse(false, 'Service temporarily unavailable. Please try again later.', null, 500);
}
