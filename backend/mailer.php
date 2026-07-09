<?php
// Movings - envio real de emails de recuperação de palavra-passe.
// Estratégia atual:
// 1) Tenta SMTP real via Brevo SMTP Relay, com várias portas.
// 2) Se o SMTP falhar, devolve erro e regista em mail_errors.log.
// 3) Não guarda fallback local por defeito, para evitar fluxos de teste em recuperação.

$configPath = __DIR__ . DIRECTORY_SEPARATOR . 'smtp_config.php';
if (file_exists($configPath)) {
    require_once $configPath;
}

if (!defined('SMTP_HOST')) define('SMTP_HOST', 'sandbox.smtp.mailtrap.io');
if (!defined('SMTP_PORT')) define('SMTP_PORT', 587);
if (!defined('SMTP_USER')) define('SMTP_USER', '');
if (!defined('SMTP_PASS')) define('SMTP_PASS', '');
if (!defined('SMTP_FROM')) define('SMTP_FROM', 'movings@test.local');
if (!defined('SMTP_FROM_NAME')) define('SMTP_FROM_NAME', 'Movings');
if (!defined('SMTP_REPLY_TO')) define('SMTP_REPLY_TO', '');
if (!defined('SMTP_REPLY_TO_NAME')) define('SMTP_REPLY_TO_NAME', 'Movings');
if (!defined('SMTP_SECURE')) define('SMTP_SECURE', 'tls');
if (!defined('SMTP_TIMEOUT')) define('SMTP_TIMEOUT', 8);
if (!defined('SMTP_ALT_PORTS')) define('SMTP_ALT_PORTS', '587:tls,465:ssl');

// Produção/envio real: por defeito não há fallback local nem cópia de teste.
if (!defined('MAIL_LOCAL_FALLBACK')) define('MAIL_LOCAL_FALLBACK', false);
if (!defined('MAIL_ALWAYS_SAVE_LOCAL_COPY')) define('MAIL_ALWAYS_SAVE_LOCAL_COPY', false);
if (!defined('MAIL_FORCE_LOCAL_ONLY')) define('MAIL_FORCE_LOCAL_ONLY', false);
if (!defined('MAIL_LOCAL_INBOX_DIR')) define('MAIL_LOCAL_INBOX_DIR', __DIR__ . DIRECTORY_SEPARATOR . 'local_mailbox');

$GLOBALS['MOVINGS_LAST_MAIL_DELIVERY'] = null;

function movings_mail_log($message) {
    $safe = preg_replace('/(Password|SMTP_PASS|pass|senha|Username|SMTP_USER)([^\r\n]*)/i', '$1: [oculto]', (string)$message);
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $safe . PHP_EOL;
    @file_put_contents(__DIR__ . DIRECTORY_SEPARATOR . 'mail_errors.log', $line, FILE_APPEND);
    error_log('[Movings mailer] ' . $safe);
}

function movings_set_last_mail_delivery($info) {
    $GLOBALS['MOVINGS_LAST_MAIL_DELIVERY'] = is_array($info) ? $info : array('info' => $info);
}

function movings_get_last_mail_delivery() {
    return isset($GLOBALS['MOVINGS_LAST_MAIL_DELIVERY']) ? $GLOBALS['MOVINGS_LAST_MAIL_DELIVERY'] : null;
}

function movings_explain_smtp_error($error) {
    $error = trim((string)$error);
    if ($error === '') return $error;

    if (stripos($error, 'Unauthorized IP address') !== false || stripos($error, '5.7.1 Unauthorized IP') !== false) {
        return $error . ' | A Brevo está a bloquear o IP da tua internet/WAMP. Resolve em Brevo > Settings > Security > Authorized IPs: autoriza o IP atual ou desativa o bloqueio para SMTP keys durante desenvolvimento local.';
    }

    if (stripos($error, 'Authentication failed') !== false || stripos($error, 'Username and Password not accepted') !== false) {
        return $error . ' | O login SMTP ou a SMTP key da Brevo estão errados/revogados. Cria uma nova SMTP key em Brevo > SMTP & API > SMTP.';
    }

    if (stripos($error, 'Sender') !== false || stripos($error, 'From') !== false) {
        return $error . ' | Confirma que o SMTP_FROM existe como Sender/remetente verificado na Brevo.';
    }

    return $error;
}

function movings_bool_constant($name) {
    if (!defined($name)) return false;
    $value = constant($name);
    if (is_bool($value)) return $value;
    $value = strtolower(trim((string)$value));
    return in_array($value, array('1', 'true', 'yes', 'sim', 'on'), true);
}

function movings_smtp_configured(&$error = null) {
    $host = trim((string)SMTP_HOST);
    $user = trim((string)SMTP_USER);
    $pass = trim((string)SMTP_PASS);
    $from = trim((string)SMTP_FROM);

    $placeholders = array(
        'o.teu.email@gmail.com',
        'teuemail@gmail.com',
        'TEU_EMAIL@gmail.com',
        'app_password_aqui',
        'APP_PASSWORD_AQUI',
        'COLOCA_AQUI_A_TUA_APP_PASSWORD_DO_GMAIL',
        'USERNAME_QUE_O_MAILTRAP_DER',
        'PASSWORD_QUE_O_MAILTRAP_DER',
        'AQUI_METES_A_APP_PASSWORD',
        'MAILTRAP_USERNAME_AQUI',
        'MAILTRAP_PASSWORD_AQUI',
        'COLOCA_AQUI_O_SMTP_LOGIN_DA_BREVO',
        'COLOCA_AQUI_A_SMTP_KEY_DA_BREVO',
        'COLOCA_AQUI_O_EMAIL_VERIFICADO_NA_BREVO',
        'O_TEU_SMTP_LOGIN_DA_BREVO',
        'A_TUA_SMTP_KEY_DA_BREVO',
        'EMAIL_VERIFICADO_NA_BREVO'
    );

    if ($host === '' || $user === '' || $pass === '' || $from === '' || in_array($user, $placeholders, true) || in_array($pass, $placeholders, true) || in_array($from, $placeholders, true)) {
        $error = 'SMTP não está configurado. Abre movings-api/smtp_config.php e mete os dados reais da Brevo: SMTP_USER, SMTP_PASS e SMTP_FROM. Como fallback, o projeto guarda o email em movings-api/local_mailbox.';
        return false;
    }

    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        $error = 'SMTP_FROM inválido em smtp_config.php. Usa um remetente verificado na Brevo, por exemplo o teu email confirmado.';
        return false;
    }

    return true;
}

function movings_smtp_attempts() {
    $attempts = array();
    $seen = array();

    $add = function($port, $secure) use (&$attempts, &$seen) {
        $port = intval($port);
        $secure = strtolower(trim((string)$secure));
        if ($port <= 0) return;
        if ($secure === '') $secure = ($port === 465 ? 'ssl' : 'tls');
        $key = $port . ':' . $secure;
        if (isset($seen[$key])) return;
        $seen[$key] = true;
        $attempts[] = array('host' => SMTP_HOST, 'port' => $port, 'secure' => $secure);
    };

    $add(SMTP_PORT, SMTP_SECURE);

    $list = defined('SMTP_ALT_PORTS') ? trim((string)SMTP_ALT_PORTS) : '';
    if ($list !== '') {
        foreach (explode(',', $list) as $item) {
            $item = trim($item);
            if ($item === '') continue;
            $parts = explode(':', $item, 2);
            $add($parts[0], isset($parts[1]) ? $parts[1] : '');
        }
    }

    if (empty($attempts)) {
        $add(587, 'tls');
        $add(2525, 'tls');
        $add(465, 'ssl');
    }

    return $attempts;
}

function movings_try_load_phpmailer() {
    $autoload = __DIR__ . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';
    if (file_exists($autoload)) {
        require_once $autoload;
    }
    return class_exists('PHPMailer\\PHPMailer\\PHPMailer');
}

function movings_password_reset_email_html($resetLink, $displayName) {
    $safeLink = htmlspecialchars($resetLink, ENT_QUOTES, 'UTF-8');
    $safeName = htmlspecialchars($displayName ?: 'utilizador', ENT_QUOTES, 'UTF-8');

    return '<!doctype html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0f0f;color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0f0f0f;padding:32px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#171717;border:1px solid #2a2a2a;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;">
              <div style="display:inline-block;background:#F5C518;color:#111;border-radius:14px;padding:10px 14px;font-weight:800;font-size:22px;letter-spacing:.3px;">Movings</div>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 32px 0;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;line-height:1.25;">Recuperação de palavra-passe</h1>
              <p style="margin:14px 0 0;color:#b9b9b9;font-size:15px;line-height:1.6;">Olá ' . $safeName . ', recebemos um pedido para redefinir a palavra-passe da tua conta Movings.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 32px 18px;">
              <a href="' . $safeLink . '" style="display:inline-block;background:#F5C518;color:#111111;text-decoration:none;font-weight:800;border-radius:999px;padding:14px 24px;font-size:15px;">Redefinir palavra-passe</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 20px;">
              <p style="margin:0;color:#a3a3a3;font-size:13px;line-height:1.6;text-align:center;">Este link expira em <strong style="color:#ffffff;">30 minutos</strong> e só pode ser usado uma vez.</p>
              <p style="margin:18px 0 0;color:#777;font-size:12px;line-height:1.6;word-break:break-all;">Se o botão não funcionar, copia e cola este link no browser:<br><a href="' . $safeLink . '" style="color:#F5C518;">' . $safeLink . '</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 28px;border-top:1px solid #2a2a2a;">
              <p style="margin:0;color:#8b8b8b;font-size:12px;line-height:1.5;text-align:center;">Se não pediste isto, ignora este email. A tua palavra-passe atual continua igual.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
}

function movings_password_reset_email_text($resetLink, $displayName) {
    $name = $displayName ?: 'utilizador';
    return "Movings - Recuperação de palavra-passe\n\n" .
        "Olá {$name},\n\n" .
        "Recebemos um pedido para redefinir a palavra-passe da tua conta Movings.\n" .
        "Abre este link para criar uma nova palavra-passe:\n{$resetLink}\n\n" .
        "O link expira em 30 minutos e só pode ser usado uma vez.\n\n" .
        "Se não pediste isto, ignora este email.";
}

function movings_smtp_read($socket) {
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') {
            break;
        }
    }
    return $data;
}

function movings_smtp_code($response) {
    if (preg_match('/^(\d{3})/m', (string)$response, $m)) {
        return intval($m[1]);
    }
    return 0;
}

function movings_smtp_cmd($socket, $command, $expectedCodes, &$lastResponse) {
    fwrite($socket, $command . "\r\n");
    $lastResponse = movings_smtp_read($socket);
    $code = movings_smtp_code($lastResponse);
    if (!in_array($code, (array)$expectedCodes, true)) {
        $shown = preg_match('/^(AUTH|MAIL|RCPT|DATA|EHLO|HELO|STARTTLS|QUIT)/i', $command, $m) ? $m[1] : 'COMANDO';
        throw new Exception('SMTP respondeu ' . $code . ' depois de "' . $shown . '": ' . trim($lastResponse));
    }
    return $lastResponse;
}

function movings_smtp_escape_data($message) {
    $message = str_replace(array("\r\n", "\r"), "\n", $message);
    $lines = explode("\n", $message);
    foreach ($lines as &$line) {
        if (isset($line[0]) && $line[0] === '.') {
            $line = '.' . $line;
        }
    }
    return implode("\r\n", $lines);
}

function movings_encode_header($text) {
    $text = (string)$text;
    if (preg_match('/[^\x20-\x7E]/', $text)) {
        return '=?UTF-8?B?' . base64_encode($text) . '?=';
    }
    return $text;
}

function movings_format_mailbox_header($email, $name = '') {
    $email = trim((string)$email);
    $name = trim((string)$name);

    if ($name === '') {
        return '<' . $email . '>';
    }

    return movings_encode_header($name) . ' <' . $email . '>';
}

function movings_reply_to_configured() {
    $replyTo = defined('SMTP_REPLY_TO') ? trim((string)SMTP_REPLY_TO) : '';
    return $replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL);
}

function movings_build_mime_message($fromEmail, $fromName, $toEmail, $toName, $subject, $htmlBody, $textBody) {
    $boundary = 'movings_' . bin2hex(random_bytes(12));
    $from = movings_format_mailbox_header($fromEmail, $fromName);
    $to = ($toName ? movings_encode_header($toName) . ' ' : '') . '<' . $toEmail . '>';

    $headers = array(
        'Date: ' . date('r'),
        'From: ' . $from,
        'To: ' . $to,
        'Subject: ' . movings_encode_header($subject),
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        'X-Mailer: Movings WAMP Mailer'
    );

    if (movings_reply_to_configured()) {
        $headers[] = 'Reply-To: ' . movings_format_mailbox_header(SMTP_REPLY_TO, defined('SMTP_REPLY_TO_NAME') ? SMTP_REPLY_TO_NAME : '');
    }

    return implode("\r\n", $headers) . "\r\n\r\n" .
        '--' . $boundary . "\r\n" .
        "Content-Type: text/plain; charset=UTF-8\r\n" .
        "Content-Transfer-Encoding: 8bit\r\n\r\n" .
        $textBody . "\r\n\r\n" .
        '--' . $boundary . "\r\n" .
        "Content-Type: text/html; charset=UTF-8\r\n" .
        "Content-Transfer-Encoding: 8bit\r\n\r\n" .
        $htmlBody . "\r\n\r\n" .
        '--' . $boundary . "--\r\n";
}

function movings_safe_filename_part($value) {
    $value = strtolower(trim((string)$value));
    $value = preg_replace('/[^a-z0-9._-]+/i', '_', $value);
    return trim($value, '_') ?: 'email';
}

function movings_extract_first_link($htmlBody, $textBody) {
    if (preg_match('/href=["\']([^"\']+)["\']/i', (string)$htmlBody, $m)) {
        return html_entity_decode($m[1], ENT_QUOTES, 'UTF-8');
    }
    if (preg_match('~https?://\S+~', (string)$textBody, $m)) {
        return trim($m[0]);
    }
    return null;
}

function movings_save_local_email($toEmail, $displayName, $subject, $htmlBody, $textBody, &$error = null) {
    $error = null;
    $dir = defined('MAIL_LOCAL_INBOX_DIR') ? MAIL_LOCAL_INBOX_DIR : (__DIR__ . DIRECTORY_SEPARATOR . 'local_mailbox');
    if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
        $error = 'Não consegui criar a pasta local_mailbox em movings-api.';
        movings_mail_log($error);
        return false;
    }

    $id = date('Ymd_His') . '_' . substr(hash('sha256', $toEmail . $subject . microtime(true) . random_int(1000, 9999)), 0, 10);
    $safeTo = movings_safe_filename_part($toEmail);
    $htmlFile = $id . '_' . $safeTo . '.html';
    $txtFile = $id . '_' . $safeTo . '.txt';
    $metaFile = $id . '_' . $safeTo . '.json';

    $htmlPath = $dir . DIRECTORY_SEPARATOR . $htmlFile;
    $txtPath = $dir . DIRECTORY_SEPARATOR . $txtFile;
    $metaPath = $dir . DIRECTORY_SEPARATOR . $metaFile;
    $link = movings_extract_first_link($htmlBody, $textBody);

    $htmlWrapper = '<!doctype html><html lang="pt"><head><meta charset="UTF-8"><title>' . htmlspecialchars($subject, ENT_QUOTES, 'UTF-8') . '</title></head><body>' .
        '<div style="font-family:Arial,Helvetica,sans-serif;background:#fff8d6;color:#222;padding:12px 16px;border:1px solid #e6cf74;margin:12px;border-radius:10px;">' .
        '<strong>Email local Movings/WAMP.</strong> Isto é uma cópia local porque o SMTP externo pode estar bloqueado. ' .
        ($link ? 'Link detetado: <a href="' . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '">' . htmlspecialchars($link, ENT_QUOTES, 'UTF-8') . '</a>' : '') .
        '</div>' . $htmlBody . '</body></html>';

    $meta = array(
        'created_at' => date('c'),
        'to' => $toEmail,
        'display_name' => $displayName,
        'subject' => $subject,
        'html_file' => $htmlFile,
        'txt_file' => $txtFile,
        'first_link' => $link,
        'open_in_browser' => 'http://127.0.0.1/movings-api/local_mailbox/' . rawurlencode($htmlFile)
    );

    if (@file_put_contents($htmlPath, $htmlWrapper) === false || @file_put_contents($txtPath, $textBody) === false || @file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        $error = 'Não consegui gravar o email local em movings-api/local_mailbox.';
        movings_mail_log($error);
        return false;
    }

    @file_put_contents($dir . DIRECTORY_SEPARATOR . 'ULTIMO_EMAIL_ABRIR.html', $htmlWrapper);
    if ($link) {
        @file_put_contents($dir . DIRECTORY_SEPARATOR . 'ULTIMO_LINK_RESET.txt', $link . PHP_EOL);
    }

    movings_set_last_mail_delivery(array(
        'method' => 'local_mailbox',
        'ok' => true,
        'message' => 'Email guardado localmente em movings-api/local_mailbox.',
        'html_file' => 'local_mailbox/' . $htmlFile,
        'txt_file' => 'local_mailbox/' . $txtFile,
        'outbox_url' => 'http://127.0.0.1/movings-api/email_outbox.php',
        'open_url' => 'http://127.0.0.1/movings-api/local_mailbox/' . rawurlencode($htmlFile),
        'first_link' => $link
    ));

    return true;
}

function movings_send_with_raw_smtp_attempt($attempt, $toEmail, $displayName, $subject, $htmlBody, $textBody, &$error = null) {
    $error = null;
    $host = trim((string)$attempt['host']);
    $port = intval($attempt['port']);
    $secure = strtolower(trim((string)$attempt['secure']));
    $timeout = intval(SMTP_TIMEOUT) > 0 ? intval(SMTP_TIMEOUT) : 8;
    $lastResponse = '';

    if (($secure === 'tls' || $secure === 'starttls' || $secure === 'ssl') && !extension_loaded('openssl')) {
        $error = 'A extensão openssl do PHP está desligada. No WAMP ativa PHP > PHP extensions > openssl e reinicia o WAMP.';
        movings_mail_log($error);
        return false;
    }

    $context = stream_context_create(array(
        'ssl' => array(
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
        )
    ));

    $target = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $errno = 0;
    $errstr = '';
    $socket = @stream_socket_client($target, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);

    if (!$socket) {
        $error = 'Não consegui ligar ao SMTP ' . $host . ':' . $port . ' (' . $secure . '). Erro: ' . $errstr . ' (' . $errno . ').';
        movings_mail_log($error);
        return false;
    }

    stream_set_timeout($socket, $timeout);

    try {
        $lastResponse = movings_smtp_read($socket);
        $code = movings_smtp_code($lastResponse);
        if ($code !== 220) {
            throw new Exception('SMTP não respondeu 220 ao ligar: ' . trim($lastResponse));
        }

        $ehloName = 'localhost';
        movings_smtp_cmd($socket, 'EHLO ' . $ehloName, array(250), $lastResponse);

        if ($secure === 'tls' || $secure === 'starttls') {
            movings_smtp_cmd($socket, 'STARTTLS', array(220), $lastResponse);
            $cryptoOk = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if ($cryptoOk !== true) {
                throw new Exception('STARTTLS falhou. Ativa openssl no WAMP ou usa porta 465/ssl.');
            }
            movings_smtp_cmd($socket, 'EHLO ' . $ehloName, array(250), $lastResponse);
        }

        movings_smtp_cmd($socket, 'AUTH LOGIN', array(334), $lastResponse);
        movings_smtp_cmd($socket, base64_encode(SMTP_USER), array(334), $lastResponse);
        movings_smtp_cmd($socket, base64_encode(SMTP_PASS), array(235), $lastResponse);

        movings_smtp_cmd($socket, 'MAIL FROM:<' . SMTP_FROM . '>', array(250), $lastResponse);
        movings_smtp_cmd($socket, 'RCPT TO:<' . $toEmail . '>', array(250, 251), $lastResponse);
        movings_smtp_cmd($socket, 'DATA', array(354), $lastResponse);

        $message = movings_build_mime_message(SMTP_FROM, SMTP_FROM_NAME, $toEmail, $displayName ?: $toEmail, $subject, $htmlBody, $textBody);
        fwrite($socket, movings_smtp_escape_data($message) . "\r\n.\r\n");
        $lastResponse = movings_smtp_read($socket);
        $code = movings_smtp_code($lastResponse);
        if (!in_array($code, array(250), true)) {
            throw new Exception('SMTP não aceitou o email: ' . trim($lastResponse));
        }

        @movings_smtp_cmd($socket, 'QUIT', array(221), $lastResponse);
        fclose($socket);

        movings_set_last_mail_delivery(array(
            'method' => 'smtp_raw',
            'ok' => true,
            'host' => $host,
            'port' => $port,
            'secure' => $secure,
            'message' => 'Email enviado via SMTP.'
        ));
        return true;
    } catch (Throwable $e) {
        if (is_resource($socket)) {
            @fwrite($socket, "QUIT\r\n");
            @fclose($socket);
        }
        $error = $host . ':' . $port . ' (' . $secure . ') - ' . $e->getMessage();
        movings_mail_log($error);
        return false;
    }
}

function movings_send_with_phpmailer_attempt($attempt, $toEmail, $displayName, $subject, $htmlBody, $textBody, &$error = null) {
    $error = null;
    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $attempt['host'];
        $mail->Port = intval($attempt['port']);
        $mail->SMTPAuth = true;
        $mail->Username = SMTP_USER;
        $mail->Password = SMTP_PASS;
        $mail->Timeout = intval(SMTP_TIMEOUT) > 0 ? intval(SMTP_TIMEOUT) : 8;

        $secure = strtolower(trim((string)$attempt['secure']));
        if ($secure === 'ssl') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($secure === 'tls' || $secure === 'starttls') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        }

        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true,
            )
        );

        $mail->CharSet = 'UTF-8';
        $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
        if (movings_reply_to_configured()) {
            $mail->addReplyTo(SMTP_REPLY_TO, defined('SMTP_REPLY_TO_NAME') ? SMTP_REPLY_TO_NAME : SMTP_FROM_NAME);
        }
        $mail->addAddress($toEmail, $displayName ?: $toEmail);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = $textBody;
        $mail->send();

        movings_set_last_mail_delivery(array(
            'method' => 'smtp_phpmailer',
            'ok' => true,
            'host' => $attempt['host'],
            'port' => intval($attempt['port']),
            'secure' => $secure,
            'message' => 'Email enviado via PHPMailer.'
        ));
        return true;
    } catch (Throwable $e) {
        $errorInfo = isset($mail) && isset($mail->ErrorInfo) && $mail->ErrorInfo ? $mail->ErrorInfo : $e->getMessage();
        $error = $attempt['host'] . ':' . intval($attempt['port']) . ' (' . $attempt['secure'] . ') - ' . $errorInfo;
        movings_mail_log($error);
        return false;
    }
}

function movings_send_email($toEmail, $displayName, $subject, $htmlBody, $textBody, &$error = null) {
    $error = null;
    movings_set_last_mail_delivery(null);

    if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        $error = 'Email de destino inválido.';
        movings_mail_log($error);
        return false;
    }

    if (movings_bool_constant('MAIL_FORCE_LOCAL_ONLY')) {
        $error = 'MAIL_FORCE_LOCAL_ONLY está ativo. Desativa esta flag para enviar emails reais.';
        movings_mail_log($error);
        movings_set_last_mail_delivery(array(
            'method' => 'blocked_local_only',
            'ok' => false,
            'message' => $error
        ));
        return false;
    }

    $smtpConfigError = null;
    $smtpConfigured = movings_smtp_configured($smtpConfigError);
    $errors = array();

    if ($smtpConfigured) {
        $attempts = movings_smtp_attempts();
        $hasPhpMailer = movings_try_load_phpmailer();

        foreach ($attempts as $attempt) {
            $attemptError = null;
            if ($hasPhpMailer && movings_send_with_phpmailer_attempt($attempt, $toEmail, $displayName, $subject, $htmlBody, $textBody, $attemptError)) {
                if (movings_bool_constant('MAIL_ALWAYS_SAVE_LOCAL_COPY')) {
                    $copyError = null;
                    @movings_save_local_email($toEmail, $displayName, '[CÓPIA LOCAL] ' . $subject, $htmlBody, $textBody, $copyError);
                    movings_set_last_mail_delivery(array(
                        'method' => 'smtp_phpmailer',
                        'ok' => true,
                        'host' => $attempt['host'],
                        'port' => intval($attempt['port']),
                        'secure' => $attempt['secure'],
                        'message' => 'Email enviado via SMTP/PHPMailer. Também foi guardada uma cópia local.'
                    ));
                }
                return true;
            }
            if ($attemptError) $errors[] = $attemptError;

            $attemptError = null;
            if (movings_send_with_raw_smtp_attempt($attempt, $toEmail, $displayName, $subject, $htmlBody, $textBody, $attemptError)) {
                if (movings_bool_constant('MAIL_ALWAYS_SAVE_LOCAL_COPY')) {
                    $copyError = null;
                    @movings_save_local_email($toEmail, $displayName, '[CÓPIA LOCAL] ' . $subject, $htmlBody, $textBody, $copyError);
                    movings_set_last_mail_delivery(array(
                        'method' => 'smtp_raw',
                        'ok' => true,
                        'host' => $attempt['host'],
                        'port' => intval($attempt['port']),
                        'secure' => $attempt['secure'],
                        'message' => 'Email enviado via SMTP. Também foi guardada uma cópia local.'
                    ));
                }
                return true;
            }
            if ($attemptError) $errors[] = $attemptError;
        }
    } else {
        $errors[] = $smtpConfigError;
        movings_mail_log($smtpConfigError);
    }

    $smtpSummary = movings_explain_smtp_error(implode(' | ', array_unique(array_filter($errors))));

    if (movings_bool_constant('MAIL_LOCAL_FALLBACK')) {
        $localError = null;
        if (movings_save_local_email($toEmail, $displayName, $subject, $htmlBody, $textBody, $localError)) {
            $error = 'SMTP externo falhou/bloqueado, mas o email foi guardado localmente. Detalhe SMTP: ' . $smtpSummary;
            movings_mail_log($error);
            $delivery = movings_get_last_mail_delivery();
            if (is_array($delivery)) {
                $delivery['smtp_failed'] = true;
                $delivery['smtp_error'] = $smtpSummary;
                movings_set_last_mail_delivery($delivery);
            }
            return true;
        }
        $errors[] = $localError;
    }

    $error = movings_explain_smtp_error(implode(' | ', array_unique(array_filter($errors))));
    if ($error === '') $error = 'Falhou o envio de email.';
    movings_mail_log($error);
    movings_set_last_mail_delivery(array(
        'method' => 'failed',
        'ok' => false,
        'message' => $error
    ));
    return false;
}

function movings_send_password_reset_email($toEmail, $displayName, $resetLink, &$error = null) {
    $subject = 'Recuperação de palavra-passe — Movings';
    return movings_send_email(
        $toEmail,
        $displayName,
        $subject,
        movings_password_reset_email_html($resetLink, $displayName),
        movings_password_reset_email_text($resetLink, $displayName),
        $error
    );
}
?>
