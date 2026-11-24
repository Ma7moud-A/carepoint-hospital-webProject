<?php
// Router for PHP's local development server.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
if ($path === '/') {
    header('Location: /frontend/index.html');
    exit;
}

$public = preg_match('~\A/(?:frontend/|backend/api/)~', $path);
if (!$public || preg_match('~(?:^|/)\.|[\\\\:]~', $path)) {
    http_response_code(404);
    exit;
}

return false;
