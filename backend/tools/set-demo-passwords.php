<?php
// CLI only. Reads passwords from a private PHP file; never prints them.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
if ($argc !== 2) {
    fwrite(STDERR, "Usage: php backend/tools/set-demo-passwords.php path/to/accounts.local.php\n");
    exit(1);
}
try {
    if (!is_file($argv[1]) || pathinfo($argv[1], PATHINFO_EXTENSION) !== 'php') {
        throw new RuntimeException();
    }
    $accounts = require $argv[1];
    if (!is_array($accounts) || !$accounts) {
        throw new RuntimeException();
    }
    $config = require __DIR__ . '/../config/database.local.php';
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $db = mysqli_connect($config['host'], $config['username'], $config['password'],
        $config['database'], $config['port'] ?? 3306);
    mysqli_set_charset($db, 'utf8mb4');
    mysqli_begin_transaction($db);
    foreach ($accounts as $username => $password) {
        if (!in_array($username, ['admin', 'receptionist', 'doctor1'], true) ||
            !is_string($password) || strlen($password) < 12 || strlen($password) > 72) {
            throw new RuntimeException();
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = mysqli_prepare($db, 'UPDATE Users SET PasswordHash = ? WHERE Username = ?');
        mysqli_stmt_bind_param($stmt, 'ss', $hash, $username);
        mysqli_stmt_execute($stmt);
        if (mysqli_stmt_affected_rows($stmt) !== 1) {
            throw new RuntimeException();
        }
        mysqli_stmt_close($stmt);
    }
    mysqli_commit($db);
    echo "Demo account hashes updated.\n";
} catch (Throwable $error) {
    if (isset($db)) {
        mysqli_rollback($db);
    }
    fwrite(STDERR, "Setup failed. Check configuration, database import, and private account file.\n");
    exit(1);
}
