<?php
require __DIR__ . '/../../includes/bootstrap.php';
require_method('POST');
require_csrf();
$body = read_json();
$username = $body['username'] ?? null;
$password = $body['password'] ?? null;
if (!is_string($username) || !is_string($password) ||
    trim($username) === '' || strlen($username) > 50 ||
    $password === '' || strlen($password) > 1024) {
    respond(422, ['message' => 'Enter a valid username and password.']);
}
$user = find_user('username', trim($username));
// Verify a fixed dummy hash as well when the account does not exist.
$hash = $user['PasswordHash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
$valid = password_verify($password, $hash);
if (!$user || !$valid || !$user['IsActive'] ||
    ($user['Role'] === 'Doctor' && $user['DoctorID'] === null)) {
    respond(401, ['message' => 'Incorrect username or password, or account unavailable.']);
}
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['UserID'];
$_SESSION['password_version'] = hash('sha256', $user['PasswordHash']);
$_SESSION['csrf'] = bin2hex(random_bytes(32));
respond(200, ['user' => public_user($user), 'csrfToken' => $_SESSION['csrf']]);
