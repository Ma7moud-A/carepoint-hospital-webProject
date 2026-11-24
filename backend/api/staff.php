<?php
require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/hospital.php';

$module = $_GET['module'] ?? '';
if (!is_string($module) || !isset(hospital_modules()[$module])) {
    respond(404, ['message' => 'Page not found.']);
}
$user = require_user(module_roles($module));
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['search'])) respond(200, ['data' => module_data($module, $user)]);
    foreach ($_GET as $value) {
        if (!is_string($value) || strlen($value) > 255) invalid_field('search or filter');
    }
    respond(200, ['ids' => array_column(module_rows($module, $user, $_GET), 'id')]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['message' => 'Request method not allowed.']);
}
require_csrf();
$body = read_json();
respond(($body['action'] ?? '') === 'create' ? 201 : 200, change_module($module, $user, $body));
