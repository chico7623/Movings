<?php
// Movings - configuração local de SMTP/Brevo.
//
// COMO USAR:
// 1) Copia este ficheiro para:
//      movings-api/smtp_config.local.php
// 2) Preenche SMTP_USER e SMTP_PASS com os dados reais da Brevo.
// 3) Mantém as 3 flags finais em false para o email ir para a caixa real.
//
// NOTA:
// - SMTP_PASS é a SMTP key da Brevo, não é a password normal da tua conta.
// - SMTP_FROM tem de ser um sender/remetente criado/verificado na Brevo.
// - Sem domínio próprio, a Brevo pode continuar a mostrar @brevosend.com no Gmail.

define('SMTP_HOST', 'smtp-relay.brevo.com');
define('SMTP_PORT', 587);
define('SMTP_SECURE', 'tls');
define('SMTP_ALT_PORTS', '587:tls,465:ssl');
define('SMTP_TIMEOUT', 12);

// Brevo > SMTP & API > SMTP
define('SMTP_USER', 'COLOCA_AQUI_O_SMTP_LOGIN_DA_BREVO');
define('SMTP_PASS', 'COLOCA_AQUI_A_NOVA_SMTP_KEY_DA_BREVO');

// Usa aqui o email que já tens criado/verificado como Sender na Brevo.
// Pelo teu teste anterior, provavelmente será o teu Gmail verificado na Brevo.
define('SMTP_FROM', 'movings.app@gmail.com');
define('SMTP_FROM_NAME', 'Movings');

// Quando alguém responder ao email, a resposta vai para aqui.
define('SMTP_REPLY_TO', 'movings.app@gmail.com');
define('SMTP_REPLY_TO_NAME', 'Movings');

// ENVIO REAL: não guardar localmente e não usar modo de teste.
define('MAIL_LOCAL_FALLBACK', false);
define('MAIL_ALWAYS_SAVE_LOCAL_COPY', false);
define('MAIL_FORCE_LOCAL_ONLY', false);
?>
