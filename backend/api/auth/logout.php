<?php
require __DIR__ . '/../../includes/bootstrap.php';
require_method('POST');
require_csrf();
$_SESSION = [];
$cookie = session_get_cookie_params();
setcookie(session_name(), '', [
    'expires' => time() - 3600, 'path' => $cookie['path'],
    'secure' => $cookie['secure'], 'httponly' => true, 'samesite' => 'Lax',
]);
session_destroy();
respond(200, ['message' => 'You have signed out.']);
