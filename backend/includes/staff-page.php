<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/hospital.php';

require_method('GET');
$user = current_user();
if (!$user) {
    header('Location: login.html', true, 302);
    exit;
}
if ($module !== 'dashboard' && !in_array($user['Role'], module_roles($module), true)) {
    header('Location: dashboard.php', true, 302);
    exit;
}

$session = json_encode([
    'user' => public_user($user),
    'csrfToken' => $_SESSION['csrf'],
    'data' => module_data($module, $user),
], JSON_HEX_TAG | JSON_THROW_ON_ERROR);

header('Content-Type: text/html; charset=utf-8');
$page = file_get_contents(__DIR__ . "/../../frontend/$module.html");
echo str_replace('<!-- Staff session -->',
    '<script type="application/json" id="staff-session">' . $session . '</script>', $page);
