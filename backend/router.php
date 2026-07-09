<?php
// backend/router.php
// Router seguro para o servidor PHP embutido no Railway.
// Substitui a proteção que antes dependia do Apache/.htaccess.

$uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uriPath = is_string($uriPath) ? rawurldecode($uriPath) : '/';
$uriPath = '/' . ltrim($uriPath, '/');

function movings_router_json($payload, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: DENY');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return true;
}

if ($uriPath === '/' || $uriPath === '') {
    return movings_router_json(array(
        'ok' => true,
        'service' => 'Movings PHP API',
        'status' => 'running',
        'health' => '/health.php'
    ));
}

// Bloqueia dotfiles, documentação, configurações, dumps, logs e pastas internas.
// O PHP built-in server não lê .htaccess, por isso esta camada é obrigatória.
$blockedPattern = '~(^|/)(\.|docker/|data/|local_mailbox/)|\.(md|sql|log|bak|tmp|sh|example)$|/(composer\.(json|lock))$|/(db_config\.php|smtp_config\.local\.php)$~i';
if (preg_match($blockedPattern, $uriPath)) {
    return movings_router_json(array(
        'ok' => false,
        'error' => 'not_found'
    ), 404);
}

$file = __DIR__ . $uriPath;

// Permite que o servidor PHP execute endpoints .php existentes e sirva apenas ficheiros públicos reais.
// Endpoints inexistentes devolvem JSON 404 em vez de listagem/HTML genérico.
if (is_file($file)) {
    return false;
}

return movings_router_json(array(
    'ok' => false,
    'error' => 'not_found'
), 404);
?>
