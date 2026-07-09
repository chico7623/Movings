<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');

echo json_encode(array(
    'ok' => true,
    'service' => 'Movings PHP API',
    'status' => 'running',
    'health' => '/health.php'
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
