<?php
// Movings — exemplo de configuração MySQL local.
// Copia este ficheiro para db_config.php e ajusta se o teu WAMP usar outros dados.

define('MOVINGS_DB_HOST', '127.0.0.1');
define('MOVINGS_DB_PORT', '3306');
define('MOVINGS_DB_NAME', 'movings');
define('MOVINGS_DB_USER', 'root');
define('MOVINGS_DB_PASS', '');

// Produção opcional:
// - Se publicares o frontend, adiciona aqui o domínio exato que pode chamar a API.
// - Se definires MOVINGS_JWT_SECRET, usa uma string longa e privada.
define('MOVINGS_ALLOWED_ORIGINS', 'https://teu-dominio.pt');
// define('MOVINGS_JWT_SECRET', 'troca-por-uma-string-grande-aleatoria-com-mais-de-32-caracteres');

// Opcional: se definires este token, os endpoints de manutenção/debug passam a exigir:
// Header: X-Movings-Maintenance-Token: o_teu_token
// define('MOVINGS_MAINTENANCE_TOKEN', 'muda_isto_para_um_token_grande');
?>
