<?php
declare(strict_types=1);

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

set_exception_handler(function (Throwable $error): void {
    // Do not return SQL, connection details, or request bodies to the browser.
    respond(503, ['message' => 'The service is unavailable. Please try again later.']);
});

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        header('Allow: ' . $method);
        respond(405, ['message' => 'Request method not allowed.']);
    }
}

function read_json(): array
{
    $type = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($type !== 'application/json') {
        respond(415, ['message' => 'Send an application/json request.']);
    }
    $raw = file_get_contents('php://input', false, null, 0, 65537);
    if (strlen($raw) > 65536) {
        respond(413, ['message' => 'Request is too large.']);
    }
    $body = json_decode($raw, true);
    if (!is_array($body) || !str_starts_with(ltrim($raw), '{')) {
        respond(400, ['message' => 'Send a valid JSON object.']);
    }
    return $body;
}

function database(): mysqli
{
    static $connection = null;
    if ($connection === null) {
        $settings = require __DIR__ . '/../config/database.local.php';
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
        $connection = mysqli_connect($settings['host'], $settings['username'],
            $settings['password'], $settings['database'], $settings['port'] ?? 3306);
        mysqli_set_charset($connection, 'utf8mb4');
    }
    return $connection;
}

if (defined('CAREPOINT_PUBLIC_API')) return;

ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name('carepoint_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax',
]);
if (!session_start()) {
    respond(503, ['message' => 'The sign-in service is temporarily unavailable.']);
}
if (!isset($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function require_csrf(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf'], $token)) {
        respond(403, ['message' => 'Your session changed. Refresh and try again.']);
    }
}

function find_user(string $field, $value): ?array
{
    // Column names are selected internally, never taken from the request.
    $column = $field === 'id' ? 'u.UserID' : 'u.Username';
    $stmt = mysqli_prepare(database(), 'SELECT u.UserID, u.Username, u.PasswordHash,
        u.FullName, u.Role, u.IsActive, d.DoctorID FROM Users u
        LEFT JOIN Doctor d ON d.DoctorID = u.DoctorID WHERE ' . $column . ' = ?');
    mysqli_stmt_bind_param($stmt, 's', $value);
    mysqli_stmt_execute($stmt);
    $user = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    mysqli_stmt_close($stmt);
    return $user ?: null;
}

function public_user(array $user): array
{
    return ['id' => (int) $user['UserID'], 'username' => $user['Username'],
        'fullName' => $user['FullName'], 'role' => $user['Role'],
        'doctorId' => $user['DoctorID'] === null ? null : (int) $user['DoctorID']];
}

function current_user(): ?array
{
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    $user = find_user('id', $_SESSION['user_id']);
    if (!$user || !$user['IsActive'] ||
        !hash_equals(hash('sha256', $user['PasswordHash']), $_SESSION['password_version'] ?? '') ||
        ($user['Role'] === 'Doctor' && $user['DoctorID'] === null)) {
        unset($_SESSION['user_id'], $_SESSION['password_version']);
        return null;
    }
    return $user;
}

function require_user(array $roles = []): array
{
    $user = current_user();
    if (!$user) {
        respond(401, ['message' => 'Please sign in.']);
    }
    if ($roles && !in_array($user['Role'], $roles, true)) {
        respond(403, ['message' => 'You do not have permission for this action.']);
    }
    return $user;
}
