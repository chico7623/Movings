<?php
require_once __DIR__ . '/db.php';

function request_statuses() {
    return array('pending', 'in_progress', 'completed', 'cancelled');
}

function request_clean_url($value, $fieldName, $youtubeOnly = false) {
    $url = clean_text($value, 500);
    if ($url === '') return '';

    if (!preg_match('/^https?:\/\//i', $url)) {
        $url = 'https://' . $url;
    }

    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        json_response(array(
            'ok' => false,
            'error' => 'invalid_' . $fieldName,
            'message' => $fieldName === 'trailer_url'
                ? 'O URL do trailer não é válido.'
                : 'O URL da imagem não é válido.'
        ), 400);
    }

    if ($youtubeOnly && !preg_match('/^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i', $url)) {
        json_response(array(
            'ok' => false,
            'error' => 'invalid_trailer_url',
            'message' => 'O trailer tem de ser um link válido do YouTube.'
        ), 400);
    }

    return $url;
}

function public_movie_request($request) {
    return array(
        'id' => intval($request['id']),
        'user_id' => isset($request['user_id']) ? $request['user_id'] : '',
        'username' => isset($request['username']) ? $request['username'] : 'utilizador',
        'title' => isset($request['title']) ? $request['title'] : '',
        'media_type' => isset($request['media_type']) ? $request['media_type'] : 'movie',
        'note' => isset($request['note']) ? $request['note'] : null,
        'poster_url' => isset($request['poster_url']) ? $request['poster_url'] : null,
        'trailer_url' => isset($request['trailer_url']) ? $request['trailer_url'] : null,
        'synopsis' => isset($request['synopsis']) ? $request['synopsis'] : null,
        'admin_note' => isset($request['admin_note']) ? $request['admin_note'] : null,
        'status' => isset($request['status']) ? $request['status'] : 'pending',
        'created_at' => isset($request['created_at']) ? $request['created_at'] : '',
        'updated_at' => isset($request['updated_at']) ? $request['updated_at'] : '',
        'completed_at' => isset($request['completed_at']) ? $request['completed_at'] : null
    );
}

function requests_stats($requests) {
    $stats = array(
        'all' => count($requests),
        'pending' => 0,
        'in_progress' => 0,
        'completed' => 0,
        'cancelled' => 0
    );

    foreach ($requests as $request) {
        $status = isset($request['status']) ? $request['status'] : 'pending';
        if (isset($stats[$status])) $stats[$status]++;
    }

    return $stats;
}

try {
    $store = load_store();
    if (!isset($store['movie_requests']) || !is_array($store['movie_requests'])) {
        $store['movie_requests'] = array();
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = isset($_GET['action']) ? $_GET['action'] : 'list';
        if ($action !== 'list') {
            json_response(array('ok' => false, 'error' => 'invalid_action'), 400);
        }

        $user = current_user_from_store($store);
        if (!$user) {
            json_response(array('ok' => false, 'error' => 'unauthorized', 'message' => 'É preciso iniciar sessão.'), 401);
        }

        $status = isset($_GET['status']) ? $_GET['status'] : 'all';
        $all = isset($_GET['all']) && strval($_GET['all']) === '1';
        $isAdmin = (isset($user['role']) ? $user['role'] : 'user') === 'admin';

        $base = array();
        foreach ($store['movie_requests'] as $request) {
            if ($isAdmin && $all) {
                $base[] = $request;
            } elseif (isset($request['user_id']) && $request['user_id'] === $user['id']) {
                $base[] = $request;
            }
        }

        $stats = requests_stats($base);
        $rows = array();
        foreach ($base as $request) {
            $requestStatus = isset($request['status']) ? $request['status'] : 'pending';
            if ($status === 'all' || $status === $requestStatus) {
                $rows[] = $request;
            }
        }

        usort($rows, function($a, $b) {
            $ad = isset($a['updated_at']) && $a['updated_at'] ? $a['updated_at'] : (isset($a['created_at']) ? $a['created_at'] : '');
            $bd = isset($b['updated_at']) && $b['updated_at'] ? $b['updated_at'] : (isset($b['created_at']) ? $b['created_at'] : '');
            return strcmp($bd, $ad);
        });

        $out = array();
        foreach ($rows as $request) $out[] = public_movie_request($request);
        json_response(array('ok' => true, 'requests' => $out, 'stats' => $stats));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $data = read_json_body();
    $action = isset($data['action']) ? $data['action'] : '';
    $user = current_user_from_store($store);

    if ($action === 'create') {
        if (!$user) {
            json_response(array('ok' => false, 'error' => 'unauthorized', 'message' => 'É preciso iniciar sessão.'), 401);
        }

        $title = clean_text(isset($data['title']) ? $data['title'] : '', 120);
        $note = clean_text(isset($data['note']) ? $data['note'] : '', 500);
        $posterUrl = request_clean_url(isset($data['poster_url']) ? $data['poster_url'] : '', 'poster_url', false);
        $trailerUrl = request_clean_url(isset($data['trailer_url']) ? $data['trailer_url'] : '', 'trailer_url', true);
        $synopsis = clean_text(isset($data['synopsis']) ? $data['synopsis'] : '', 1200);
        $mediaType = isset($data['media_type']) ? $data['media_type'] : 'movie';
        if (!in_array($mediaType, array('movie', 'tv', 'other'), true)) $mediaType = 'movie';

        if (text_length($title) < 2) {
            json_response(array('ok' => false, 'error' => 'invalid_title', 'message' => 'Título inválido.'), 400);
        }

        $request = array(
            'id' => next_id($store, 'movie_request'),
            'user_id' => $user['id'],
            'username' => isset($user['username']) ? $user['username'] : 'utilizador',
            'title' => $title,
            'media_type' => $mediaType,
            'note' => $note,
            'poster_url' => $posterUrl,
            'trailer_url' => $trailerUrl,
            'synopsis' => $synopsis,
            'admin_note' => '',
            'status' => 'pending',
            'created_at' => now_iso(),
            'updated_at' => now_iso(),
            'completed_at' => null
        );

        $store['movie_requests'][] = $request;
        save_store($store);
        json_response(array('ok' => true, 'request' => public_movie_request($request)));
    }

    if (!$user || (isset($user['role']) ? $user['role'] : 'user') !== 'admin') {
        json_response(array('ok' => false, 'error' => 'forbidden', 'message' => 'Só admin pode alterar pedidos.'), 403);
    }


    if ($action === 'update_details') {
        $requestId = isset($data['request_id']) ? intval($data['request_id']) : 0;
        if ($requestId <= 0) {
            json_response(array('ok' => false, 'error' => 'invalid_input'), 400);
        }

        $foundIndex = null;
        foreach ($store['movie_requests'] as $i => $request) {
            if (intval($request['id']) === $requestId) {
                $foundIndex = $i;
                break;
            }
        }

        if ($foundIndex === null) {
            json_response(array('ok' => false, 'error' => 'request_not_found'), 404);
        }

        $title = clean_text(isset($data['title']) ? $data['title'] : '', 120);
        $note = clean_text(isset($data['note']) ? $data['note'] : '', 500);
        $posterUrl = request_clean_url(isset($data['poster_url']) ? $data['poster_url'] : '', 'poster_url', false);
        $trailerUrl = request_clean_url(isset($data['trailer_url']) ? $data['trailer_url'] : '', 'trailer_url', true);
        $synopsis = clean_text(isset($data['synopsis']) ? $data['synopsis'] : '', 1200);
        $adminNote = clean_text(isset($data['admin_note']) ? $data['admin_note'] : '', 500);
        $mediaType = isset($data['media_type']) ? $data['media_type'] : 'movie';
        if (!in_array($mediaType, array('movie', 'tv', 'other'), true)) $mediaType = 'movie';

        if (text_length($title) < 2) {
            json_response(array('ok' => false, 'error' => 'invalid_title', 'message' => 'Título inválido.'), 400);
        }

        $store['movie_requests'][$foundIndex]['title'] = $title;
        $store['movie_requests'][$foundIndex]['media_type'] = $mediaType;
        $store['movie_requests'][$foundIndex]['note'] = $note;
        $store['movie_requests'][$foundIndex]['poster_url'] = $posterUrl;
        $store['movie_requests'][$foundIndex]['trailer_url'] = $trailerUrl;
        $store['movie_requests'][$foundIndex]['synopsis'] = $synopsis;
        $store['movie_requests'][$foundIndex]['admin_note'] = $adminNote;
        $store['movie_requests'][$foundIndex]['updated_at'] = now_iso();

        log_admin_action($store, $user['id'], 'update_movie_request_details', 'movie_request', $requestId, $title);
        save_store($store);
        json_response(array('ok' => true, 'request' => public_movie_request($store['movie_requests'][$foundIndex])));
    }

    if ($action === 'update_status') {
        $requestId = isset($data['request_id']) ? intval($data['request_id']) : 0;
        $status = isset($data['status']) ? $data['status'] : '';
        $adminNote = clean_text(isset($data['admin_note']) ? $data['admin_note'] : '', 500);

        if ($requestId <= 0 || !in_array($status, request_statuses(), true)) {
            json_response(array('ok' => false, 'error' => 'invalid_input'), 400);
        }

        $foundIndex = null;
        foreach ($store['movie_requests'] as $i => $request) {
            if (intval($request['id']) === $requestId) {
                $foundIndex = $i;
                break;
            }
        }

        if ($foundIndex === null) {
            json_response(array('ok' => false, 'error' => 'request_not_found'), 404);
        }

        $store['movie_requests'][$foundIndex]['status'] = $status;
        $store['movie_requests'][$foundIndex]['admin_note'] = $adminNote;
        $store['movie_requests'][$foundIndex]['updated_at'] = now_iso();
        $store['movie_requests'][$foundIndex]['completed_at'] = $status === 'completed' ? now_iso() : null;

        log_admin_action($store, $user['id'], 'update_movie_request', 'movie_request', $requestId, $status . ' · ' . $adminNote);
        save_store($store);
        json_response(array('ok' => true, 'request' => public_movie_request($store['movie_requests'][$foundIndex])));
    }

    if ($action === 'delete') {
        $requestId = isset($data['request_id']) ? intval($data['request_id']) : 0;
        if ($requestId <= 0) {
            json_response(array('ok' => false, 'error' => 'invalid_input'), 400);
        }

        $deleted = null;
        $newRequests = array();
        foreach ($store['movie_requests'] as $request) {
            if (intval($request['id']) === $requestId) {
                $deleted = $request;
                continue;
            }
            $newRequests[] = $request;
        }

        if (!$deleted) {
            json_response(array('ok' => false, 'error' => 'request_not_found'), 404);
        }

        $store['movie_requests'] = $newRequests;
        log_admin_action($store, $user['id'], 'delete_movie_request', 'movie_request', $requestId, isset($deleted['title']) ? $deleted['title'] : '');
        save_store($store);
        json_response(array('ok' => true));
    }

    json_response(array('ok' => false, 'error' => 'invalid_action'), 400);
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
