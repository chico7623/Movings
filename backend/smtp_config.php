<?php
// Movings - configuração de email real via Brevo SMTP Relay.
//
// IMPORTANTE:
// - Este ficheiro não deve guardar credenciais reais.
// - Para configurar a tua conta, copia smtp_config.local.example.php para smtp_config.local.php
//   e preenche SMTP_USER, SMTP_PASS e SMTP_FROM nesse ficheiro local.
// - SMTP_FROM tem de ser um remetente verificado na Brevo.
// - Para evitar aparecer @brevosend.com no Gmail, usa um domínio próprio autenticado
//   na Brevo, por exemplo noreply@movings.pt.

// Carrega primeiro a configuração local, se existir.
// Assim as tuas credenciais ficam fora deste ficheiro principal.
$localConfigPath = __DIR__ . DIRECTORY_SEPARATOR . 'smtp_config.local.php';
if (file_exists($localConfigPath)) {
    require_once $localConfigPath;
}

if (!function_exists('movings_define_if_missing')) {
    function movings_define_if_missing($name, $value) {
        if (!defined($name)) {
            define($name, $value);
        }
    }
}

if (!function_exists('movings_env_or_default')) {
    function movings_env_or_default($name, $default) {
        $value = getenv($name);
        return $value !== false && trim((string)$value) !== '' ? $value : $default;
    }
}

// Brevo SMTP Relay
movings_define_if_missing('SMTP_HOST', movings_env_or_default('SMTP_HOST', 'smtp-relay.brevo.com'));
movings_define_if_missing('SMTP_PORT', intval(movings_env_or_default('SMTP_PORT', '587')));
movings_define_if_missing('SMTP_SECURE', movings_env_or_default('SMTP_SECURE', 'tls'));

// Portas alternativas caso a rede/WAMP bloqueie a 587. A 2525 foi removida porque costuma bloquear no WAMP/rede local.
movings_define_if_missing('SMTP_ALT_PORTS', movings_env_or_default('SMTP_ALT_PORTS', '587:tls,465:ssl'));
movings_define_if_missing('SMTP_TIMEOUT', intval(movings_env_or_default('SMTP_TIMEOUT', '12')));

// Dados SMTP da Brevo.
// SMTP_USER = SMTP login da Brevo.
// SMTP_PASS = SMTP key da Brevo, não é a password normal da conta nem API key.
movings_define_if_missing('SMTP_USER', movings_env_or_default('SMTP_USER', 'COLOCA_AQUI_O_SMTP_LOGIN_DA_BREVO'));
movings_define_if_missing('SMTP_PASS', movings_env_or_default('SMTP_PASS', 'COLOCA_AQUI_A_SMTP_KEY_DA_BREVO'));

// Remetente mostrado no Gmail.
// Produção recomendada: usa um email de domínio próprio autenticado, ex.: noreply@movings.pt.
// Evita Gmail/Yahoo/Outlook gratuitos como From, porque a Brevo pode substituir por @brevosend.com.
movings_define_if_missing('SMTP_FROM', movings_env_or_default('SMTP_FROM', 'COLOCA_AQUI_O_EMAIL_VERIFICADO_NA_BREVO'));
movings_define_if_missing('SMTP_FROM_NAME', movings_env_or_default('SMTP_FROM_NAME', 'Movings'));

// Opcional: email que recebe respostas.
// Podes usar aqui um Gmail, porque isto é Reply-To, não é o From autenticado.
movings_define_if_missing('SMTP_REPLY_TO', movings_env_or_default('SMTP_REPLY_TO', ''));
movings_define_if_missing('SMTP_REPLY_TO_NAME', movings_env_or_default('SMTP_REPLY_TO_NAME', 'Movings'));

// Produção/envio real: se o SMTP falhar, não cria fallback local nem finge sucesso.
// O erro fica registado em mail_errors.log.
movings_define_if_missing('MAIL_LOCAL_FALLBACK', false);

// Não guarda cópias locais por defeito. Os emails devem ir para a caixa real.
movings_define_if_missing('MAIL_ALWAYS_SAVE_LOCAL_COPY', false);

// Tem de ficar false para enviar por Brevo. true só serviria para testes locais.
movings_define_if_missing('MAIL_FORCE_LOCAL_ONLY', false);
?>
