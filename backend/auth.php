<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

function movings_reset_frontend_url($data) {
    $frontend = isset($data['frontend_url']) ? trim((string)$data['frontend_url']) : '';
    if ($frontend === '' && isset($_SERVER['HTTP_ORIGIN'])) {
        $frontend = trim((string)$_SERVER['HTTP_ORIGIN']);
    }
    if ($frontend === '') {
        $frontend = 'http://localhost:5173';
    }
    return rtrim($frontend, '/');
}

function movings_client_ip() {
    foreach (array('HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR') as $key) {
        if (!empty($_SERVER[$key])) {
            $value = explode(',', (string)$_SERVER[$key])[0];
            return trim($value);
        }
    }
    return null;
}

function password_resets_ready(PDO $pdo) {
    return table_exists($pdo, 'password_resets');
}

function password_resets_has_column(PDO $pdo, $column) {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $stmt->execute(array('password_resets', $column));
    return intval($stmt->fetchColumn()) > 0;
}

function update_password_reset_email_status(PDO $pdo, $resetId, $sent, $error = null) {
    if (!$resetId) return;
    try {
        if (!password_resets_has_column($pdo, 'email_sent') || !password_resets_has_column($pdo, 'email_error')) {
            return;
        }
        $stmt = $pdo->prepare('UPDATE password_resets SET email_sent = ?, email_error = ? WHERE id = ?');
        $stmt->execute(array($sent ? 1 : 0, $error ? text_substr((string)$error, 0, 2000) : null, $resetId));
    } catch (Throwable $e) {
        error_log('[Movings reset email status] ' . $e->getMessage());
    }
}

function find_user_by_email_for_reset($store, $email) {
    $needle = text_lower($email);
    if ($needle === '') return null;
    foreach ($store['users'] as $candidate) {
        $candidateEmail = isset($candidate['email']) ? text_lower($candidate['email']) : '';
        if ($candidateEmail !== '' && $candidateEmail === $needle && empty($candidate['blocked'])) {
            return $candidate;
        }
    }
    return null;
}

function password_reset_generic_message() {
    return 'Se existir uma conta com esse email, enviámos instruções de recuperação.';
}

function movings_signup_password_issues($password) {
    $password = (string)$password;
    $issues = array();

    if (strlen($password) < 8) {
        $issues[] = 'min_length';
    }
    if (!preg_match('/[A-Z]/', $password)) {
        $issues[] = 'uppercase';
    }
    if (!preg_match('/[a-z]/', $password)) {
        $issues[] = 'lowercase';
    }
    if (!preg_match('/[0-9]/', $password)) {
        $issues[] = 'number';
    }

    return $issues;
}

function movings_password_requirements_message() {
    return 'A password deve ter pelo menos 8 caracteres, 1 letra maiúscula, 1 letra minúscula e 1 número.';
}

if (!function_exists('movings_is_local_request')) {
    function movings_is_local_request() {
        $host = isset($_SERVER['HTTP_HOST']) ? strtolower((string)$_SERVER['HTTP_HOST']) : '';
        $remote = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
        return strpos($host, 'localhost') !== false
            || strpos($host, '127.0.0.1') !== false
            || strpos($host, '::1') !== false
            || $remote === '127.0.0.1'
            || $remote === '::1';
    }
}

function movings_password_reset_verbose() {
    return movings_is_local_request();
}

function movings_public_delivery_summary($delivery) {
    if (!is_array($delivery)) {
        return null;
    }

    $safe = array(
        'ok' => !empty($delivery['ok']),
        'method' => isset($delivery['method']) ? $delivery['method'] : null,
        'message' => isset($delivery['message']) ? $delivery['message'] : null,
        'host' => isset($delivery['host']) ? $delivery['host'] : null,
        'port' => isset($delivery['port']) ? intval($delivery['port']) : null,
        'secure' => isset($delivery['secure']) ? $delivery['secure'] : null,
        'outbox_url' => isset($delivery['outbox_url']) ? $delivery['outbox_url'] : null,
        'open_url' => isset($delivery['open_url']) ? $delivery['open_url'] : null,
        'first_link' => isset($delivery['first_link']) ? $delivery['first_link'] : null,
        'smtp_failed' => !empty($delivery['smtp_failed']),
        'smtp_error' => isset($delivery['smtp_error']) ? $delivery['smtp_error'] : null
    );

    return array_filter($safe, function($value) {
        return $value !== null && $value !== '';
    });
}



try {
    $store = load_store();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        json_response(array(
            'ok' => true,
            'endpoint' => 'auth.php',
            'message' => 'Auth API online.'
        ));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $data = read_json_body();
    $action = isset($data['action']) ? trim((string)$data['action']) : '';

    if ($action === 'check_username') {
        $username = isset($data['username']) ? trim((string)$data['username']) : '';
        if ($username === '' || text_length($username) < 3) {
            json_response(array('ok' => true, 'available' => false));
        }
        json_response(array('ok' => true, 'available' => find_user_by_username($store, $username) === null));
    }

    if ($action === 'admin_demo_login') {
        // Acesso rápido permitido apenas em ambiente local de apresentação/PAP.
        if (!movings_is_local_request()) {
            json_response(array('ok' => false, 'error' => 'forbidden', 'message' => 'Login demo disponível apenas localmente.'), 403);
        }

        // Mantém o admin sempre sincronizado com admin/admin123 e evita bloqueios por dados antigos no navegador.
        $store = ensure_admin($store);
        $admin = find_user_by_username($store, 'admin');

        if (!$admin || (isset($admin['role']) ? $admin['role'] : 'user') !== 'admin') {
            json_response(array(
                'ok' => false,
                'error' => 'admin_unavailable',
                'message' => 'Não foi possível preparar o utilizador admin.'
            ), 500);
        }

        update_user_stats($store, $admin['id']);
        save_store($store);

        $csrf = bin2hex(random_bytes(16));
        json_response(array(
            'ok' => true,
            'token' => generate_token($admin),
            'csrf_token' => $csrf,
            'user' => public_user($admin),
            'message' => 'Admin ativado para apresentação local.'
        ));
    }

    if ($action === 'forgot_password') {
        $email = isset($data['email']) ? text_lower($data['email']) : '';
        $frontendUrl = movings_reset_frontend_url($data);
        $genericMessage = password_reset_generic_message();

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_response(array('ok' => true, 'message' => $genericMessage));
        }

        $pdo = pdo_db();
        if (!password_resets_ready($pdo)) {
            json_response(array(
                'ok' => false,
                'error' => 'password_resets_missing',
                'message' => 'Falta a tabela password_resets. Executa upgrade_password_reset.sql no phpMyAdmin.'
            ), 500);
        }

        $user = find_user_by_email_for_reset($store, $email);
        $verboseReset = movings_password_reset_verbose();
        $response = array('ok' => true, 'message' => $genericMessage);

        if (!$user) {
            // Em produção mantemos a resposta genérica. Em WAMP/local mostramos o motivo real,
            // porque isto é a causa mais comum: a conta foi criada sem email ou com outro email.
            if ($verboseReset) {
                json_response(array(
                    'ok' => false,
                    'error' => 'account_email_not_found',
                    'message' => 'Não encontrei nenhuma conta Movings com esse email. Cria a conta com esse email ou entra com a conta certa antes de tentares recuperar a password.'
                ), 404);
            }

            json_response($response);
        }

        // Limita pedidos recentes por email para evitar spam acidental no WAMP/local.
        $rateStmt = $pdo->prepare('SELECT COUNT(*) FROM password_resets WHERE email = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)');
        $rateStmt->execute(array($email));
        if (intval($rateStmt->fetchColumn()) >= 5) {
            $rateResponse = array('ok' => true, 'message' => $genericMessage);
            if ($verboseReset) {
                $rateResponse = array(
                    'ok' => false,
                    'error' => 'rate_limited',
                    'message' => 'Já pediste demasiados emails de recuperação nos últimos 10 minutos. Espera um pouco e tenta novamente.'
                );
            }
            json_response($rateResponse, $verboseReset ? 429 : 200);
        }

        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $invalidate = $pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL');
        $invalidate->execute(array($user['id']));

        $stmt = $pdo->prepare('INSERT INTO password_resets (user_id, email, token_hash, expires_at, request_ip, user_agent, created_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), ?, ?, NOW())');
        $stmt->execute(array(
            $user['id'],
            $email,
            $tokenHash,
            movings_client_ip(),
            isset($_SERVER['HTTP_USER_AGENT']) ? text_substr((string)$_SERVER['HTTP_USER_AGENT'], 0, 255) : null
        ));
        $resetId = $pdo->lastInsertId();

        $resetLink = $frontendUrl . '/reset-password?token=' . rawurlencode($token);
        $mailError = null;
        $mailSent = movings_send_password_reset_email(
            $email,
            isset($user['username']) ? (string)$user['username'] : '',
            $resetLink,
            $mailError
        );

        $delivery = movings_get_last_mail_delivery();
        $deliveryMethod = is_array($delivery) && isset($delivery['method']) ? (string)$delivery['method'] : '';
        $emailSentBySmtp = $mailSent && strpos($deliveryMethod, 'smtp') === 0 && empty($delivery['smtp_failed']);
        $deliverySummary = movings_public_delivery_summary($delivery);

        update_password_reset_email_status($pdo, $resetId, $emailSentBySmtp, $mailError);

        $response['expires_in_minutes'] = 30;
        $response['email_sent'] = $emailSentBySmtp;
        $response['email_processed'] = $mailSent;
        if ($deliverySummary) {
            $response['delivery'] = $deliverySummary;
        }

        if ($emailSentBySmtp) {
            $response['message'] = 'Email de recuperação enviado. Confirma a caixa de entrada e também o spam/promoções.';
        } else {
            $response['message'] = $genericMessage;
            if ($verboseReset) {
                $response['ok'] = false;
                $response['error'] = 'smtp_failed';
                $response['message'] = 'A conta existe, mas o envio SMTP falhou. Confirma a Brevo e vê o detalhe técnico abaixo.';
                $response['mail_error'] = $mailError;
                $response['local_outbox_url'] = is_array($delivery) && isset($delivery['outbox_url']) ? $delivery['outbox_url'] : 'http://127.0.0.1/movings-api/email_outbox.php';
                if (is_array($delivery)) {
                    if (isset($delivery['open_url'])) $response['local_email_url'] = $delivery['open_url'];
                    if (isset($delivery['first_link'])) $response['debug_reset_link'] = $delivery['first_link'];
                }
                json_response($response, 500);
            }
        }

        json_response($response);
    }

    if ($action === 'reset_password') {
        $token = isset($data['token']) ? trim((string)$data['token']) : '';
        $password = isset($data['password']) ? (string)$data['password'] : '';

        if ($token === '' || $password === '') {
            json_response(array('ok' => false, 'error' => 'missing_fields', 'message' => 'Falta token ou nova password.'), 400);
        }
        if (strlen($password) < 6) {
            json_response(array('ok' => false, 'error' => 'password_too_short', 'message' => 'A password deve ter pelo menos 6 caracteres.'), 400);
        }

        $pdo = pdo_db();
        if (!password_resets_ready($pdo)) {
            json_response(array(
                'ok' => false,
                'error' => 'password_resets_missing',
                'message' => 'Falta a tabela password_resets. Executa upgrade_password_reset.sql no phpMyAdmin.'
            ), 500);
        }

        $tokenHash = hash('sha256', $token);
        $stmt = $pdo->prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1');
        $stmt->execute(array($tokenHash));
        $reset = $stmt->fetch();

        if (!$reset) {
            json_response(array('ok' => false, 'error' => 'invalid_or_expired_token', 'message' => 'Link inválido ou expirado. Pede uma nova recuperação.'), 400);
        }

        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $update = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $update->execute(array($newHash, $reset['user_id']));

        $mark = $pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE id = ?');
        $mark->execute(array($reset['id']));

        $invalidate = $pdo->prepare('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL');
        $invalidate->execute(array($reset['user_id']));

        json_response(array('ok' => true, 'message' => 'Password atualizada com sucesso. Já podes fazer login.'));
    }

    if ($action === 'signup' || $action === 'login') {
        $username = isset($data['username']) ? trim((string)$data['username']) : '';
        $identifier = isset($data['identifier']) ? trim((string)$data['identifier']) : '';
        if ($identifier === '') $identifier = $username;
        if ($identifier === '' && isset($data['email'])) $identifier = trim((string)$data['email']);

        $password = isset($data['password']) ? (string)$data['password'] : '';
        $email = isset($data['email']) && trim((string)$data['email']) !== '' ? text_lower($data['email']) : null;

        if ($action === 'signup') {
            if ($username === '' || $password === '') {
                json_response(array('ok' => false, 'error' => 'missing_fields'), 400);
            }
            if (text_length($username) < 3) {
                json_response(array('ok' => false, 'error' => 'username_too_short'), 400);
            }
            if ($email === null || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                json_response(array('ok' => false, 'error' => 'invalid_email', 'message' => 'Indica um email válido para poderes recuperar a password.'), 400);
            }

            $passwordIssues = movings_signup_password_issues($password);
            if (!empty($passwordIssues)) {
                json_response(array(
                    'ok' => false,
                    'error' => 'weak_password',
                    'message' => movings_password_requirements_message(),
                    'requirements' => $passwordIssues
                ), 400);
            }

            if (find_user_by_username($store, $username)) {
                json_response(array('ok' => false, 'error' => 'username_taken'), 409);
            }
            foreach ($store['users'] as $existing) {
                if (isset($existing['email']) && text_lower($existing['email']) === $email) {
                    json_response(array('ok' => false, 'error' => 'email_taken'), 409);
                }
            }

            $user = array(
                'id' => 'user_' . bin2hex(random_bytes(8)),
                'email' => $email,
                'username' => $username,
                'username_norm' => norm_username($username),
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'role' => 'user',
                'blocked' => false,
                'created_at' => now_iso()
            );
            $store['users'][] = $user;
            update_user_stats($store, $user['id']);
            save_store($store);
        } else {
            if ($identifier === '' || $password === '') {
                json_response(array('ok' => false, 'error' => 'missing_fields'), 400);
            }

            // Login aceita username OU email. Não valida força da password aqui para não bloquear contas antigas.
            $user = find_user_by_identifier($store, $identifier);
            if (!$user || !empty($user['blocked']) || !user_password_matches($user, $password)) {
                json_response(array('ok' => false, 'error' => 'invalid_credentials'), 401);
            }
            update_user_stats($store, $user['id']);
            save_store($store);
        }

        $csrf = bin2hex(random_bytes(16));
        json_response(array(
            'ok' => true,
            'token' => generate_token($user),
            'csrf_token' => $csrf,
            'user' => public_user($user)
        ));
    }

    if ($action === 'refresh') {
        $user = current_user_from_store($store);
        if (!$user) {
            json_response(array('ok' => false, 'error' => 'unauthorized'), 401);
        }
        update_user_stats($store, $user['id']);
        save_store($store);
        json_response(array(
            'ok' => true,
            'token' => generate_token($user),
            'user' => public_user($user)
        ));
    }

    json_response(array('ok' => false, 'error' => 'invalid_action'), 400);
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
