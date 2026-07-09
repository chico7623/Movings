<?php
function movings_outbox_is_local_request() {
    $host = isset($_SERVER['HTTP_HOST']) ? strtolower((string)$_SERVER['HTTP_HOST']) : '';
    $remote = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
    return strpos($host, 'localhost') !== false
        || strpos($host, '127.0.0.1') !== false
        || strpos($host, '::1') !== false
        || $remote === '127.0.0.1'
        || $remote === '::1';
}

if (!movings_outbox_is_local_request()) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('ok' => false, 'error' => 'forbidden', 'message' => 'Endpoint disponível apenas em localhost/WAMP.'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Caixa local de emails para WAMP.
// Abre: http://127.0.0.1/movings-api/email_outbox.php

$dir = __DIR__ . DIRECTORY_SEPARATOR . 'local_mailbox';
if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
}

$items = array();
foreach (glob($dir . DIRECTORY_SEPARATOR . '*.json') ?: array() as $metaPath) {
    $json = json_decode((string)@file_get_contents($metaPath), true);
    if (!is_array($json)) continue;
    $json['_mtime'] = filemtime($metaPath) ?: 0;
    $items[] = $json;
}
usort($items, function($a, $b) {
    return intval($b['_mtime']) <=> intval($a['_mtime']);
});

function h($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Movings - Emails locais</title>
    <style>
        :root { color-scheme: dark; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #101010; color: #f3f3f3; }
        .wrap { max-width: 1100px; margin: 0 auto; padding: 28px 18px; }
        .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
        h1 { margin: 0; font-size: 28px; }
        .badge { background: #f5c518; color: #111; font-weight: 800; padding: 8px 12px; border-radius: 999px; }
        .note { color: #bdbdbd; line-height: 1.55; margin: 8px 0 22px; }
        .card { background: #181818; border: 1px solid #2b2b2b; border-radius: 16px; padding: 18px; margin: 12px 0; }
        .subject { font-weight: 800; font-size: 17px; margin-bottom: 6px; }
        .meta { color: #aaa; font-size: 13px; line-height: 1.5; margin-bottom: 12px; }
        a { color: #f5c518; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; }
        .btn { display:inline-block; background:#f5c518; color:#111; font-weight:800; border-radius:999px; padding:10px 14px; }
        .ghost { display:inline-block; border:1px solid #555; color:#eee; border-radius:999px; padding:9px 13px; }
        .empty { background:#181818; border:1px dashed #444; border-radius:16px; padding:28px; color:#bbb; }
        code { background:#242424; padding:2px 6px; border-radius:6px; }
    </style>
</head>
<body>
<div class="wrap">
    <div class="top">
        <h1>Movings - Emails locais</h1>
        <span class="badge"><?php echo count($items); ?> email(s)</span>
    </div>
    <p class="note">
        Esta página mostra os emails que o projeto guardou localmente quando estás em WAMP. É o fallback para quando o SMTP externo, como Mailtrap, fica bloqueado pela firewall/rede.
        Para testar, usa “Esqueci-me da password” no site.
    </p>

    <?php if (empty($items)): ?>
        <div class="empty">
            Ainda não há emails locais. Usa “Esqueci-me da password” no site para gerar um email de recuperação.
        </div>
    <?php else: ?>
        <?php foreach ($items as $item): ?>
            <div class="card">
                <div class="subject"><?php echo h($item['subject'] ?? 'Sem assunto'); ?></div>
                <div class="meta">
                    Para: <strong><?php echo h($item['to'] ?? ''); ?></strong><br>
                    Criado em: <?php echo h($item['created_at'] ?? ''); ?><br>
                    Ficheiro: <code><?php echo h($item['html_file'] ?? ''); ?></code>
                </div>
                <div class="actions">
                    <?php if (!empty($item['html_file'])): ?>
                        <a class="btn" href="local_mailbox/<?php echo rawurlencode($item['html_file']); ?>" target="_blank">Abrir email</a>
                    <?php endif; ?>
                    <?php if (!empty($item['first_link'])): ?>
                        <a class="ghost" href="<?php echo h($item['first_link']); ?>" target="_blank">Abrir link de reset</a>
                    <?php endif; ?>
                    <?php if (!empty($item['txt_file'])): ?>
                        <a class="ghost" href="local_mailbox/<?php echo rawurlencode($item['txt_file']); ?>" target="_blank">Ver texto</a>
                    <?php endif; ?>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>
</body>
</html>
