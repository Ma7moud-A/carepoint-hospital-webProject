<?php
require __DIR__ . '/../../includes/bootstrap.php';
require_method('GET');
$user = current_user();
respond(200, ['user' => $user ? public_user($user) : null, 'csrfToken' => $_SESSION['csrf']]);
