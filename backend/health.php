<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/maintenance_guard.php';

movings_require_maintenance_access();

try {
    $cfg = movings_config();
    $pdo = pdo_db();
    install_schema($pdo);
    $store = load_store();

    json_response(array(
        'ok' => true,
        'status' => 'ok',
        'backend' => 'connected',
        'mode' => 'mysql_wamp_auto_repair',
        'db_name' => $cfg['name'],
        'php_version' => PHP_VERSION,
        'users' => count($store['users']),
        'ratings' => count($store['ratings']),
        'comments' => count($store['comments']),
        'requests' => isset($store['movie_requests']) && is_array($store['movie_requests']) ? count($store['movie_requests']) : 0,
        'custom_catalog' => isset($store['custom_catalog']) && is_array($store['custom_catalog']) ? count($store['custom_catalog']) : 0,
        'message' => 'Backend Movings operacional. Se o frontend ainda disser offline, confirma o .env e reinicia npm run dev.'
    ));
} catch (Throwable $e) {
    json_response(array(
        'ok' => false,
        'status' => 'error',
        'backend' => 'offline',
        'message' => 'Backend encontrado, mas falhou ao preparar MySQL.',
        'details' => $e->getMessage()
    ), 500);
}
?>
