<?php
// Movings — proteção central para endpoints locais de manutenção.
// Mantém a PAP simples em WAMP, mas evita expor reset/debug/migração fora do ambiente local.

if (!function_exists('movings_guard_is_local_request')) {
    function movings_guard_is_local_request() {
        if (function_exists('movings_is_local_request')) {
            return movings_is_local_request();
        }

        $host = isset($_SERVER['HTTP_HOST']) ? strtolower((string)$_SERVER['HTTP_HOST']) : '';
        $remote = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';

        return strpos($host, 'localhost') !== false
            || strpos($host, '127.0.0.1') !== false
            || strpos($host, '::1') !== false
            || $remote === '127.0.0.1'
            || $remote === '::1';
    }
}

if (!function_exists('movings_guard_env')) {
    function movings_guard_env($name, $default = '') {
        if (defined($name)) {
            return constant($name);
        }

        $value = getenv($name);
        return $value === false ? $default : $value;
    }
}

if (!function_exists('movings_guard_request_token')) {
    function movings_guard_request_token() {
        $headers = function_exists('getallheaders') ? getallheaders() : array();

        foreach ($headers as $name => $value) {
            if (strtolower((string)$name) === 'x-movings-maintenance-token') {
                return trim((string)$value);
            }
        }

        $authorization = isset($_SERVER['HTTP_AUTHORIZATION']) ? trim((string)$_SERVER['HTTP_AUTHORIZATION']) : '';
        if (stripos($authorization, 'Bearer ') === 0) {
            return trim(substr($authorization, 7));
        }

        if (isset($_POST['maintenance_token'])) {
            return trim((string)$_POST['maintenance_token']);
        }

        if (isset($_GET['maintenance_token'])) {
            return trim((string)$_GET['maintenance_token']);
        }

        return '';
    }
}

if (!function_exists('movings_require_maintenance_access')) {
    function movings_require_maintenance_access($options = array()) {
        $allowLocalWithoutToken = array_key_exists('allow_local_without_token', $options)
            ? (bool)$options['allow_local_without_token']
            : true;

        $configuredToken = trim((string)movings_guard_env('MOVINGS_MAINTENANCE_TOKEN', ''));
        $providedToken = movings_guard_request_token();

        if ($configuredToken !== '') {
            if ($providedToken !== '' && hash_equals($configuredToken, $providedToken)) {
                return;
            }

            json_response(array(
                'ok' => false,
                'error' => 'maintenance_token_required',
                'message' => 'Endpoint de manutenção protegido. Envia o token em X-Movings-Maintenance-Token.'
            ), 403);
        }

        if ($allowLocalWithoutToken && movings_guard_is_local_request()) {
            return;
        }

        json_response(array(
            'ok' => false,
            'error' => 'forbidden',
            'message' => 'Endpoint de manutenção disponível apenas em localhost/WAMP.'
        ), 403);
    }
}
?>
