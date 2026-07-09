<?php
require_once __DIR__ . '/db.php';

try {
    $store = load_store();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = isset($_GET['action']) ? $_GET['action'] : 'list';
        $providedUserId = isset($_GET['user_id']) ? clean_text($_GET['user_id'], 80) : '';
        $userId = authenticated_user_id($store, $providedUserId);
        if ($action === 'list') {
            $rows = array();
            foreach ($store['favorites'] as $fav) {
                if ($fav['user_id'] === $userId) $rows[] = $fav;
            }
            $rows = decorated_media_rows($store, $rows);
            json_response(array('ok' => true, 'rows' => array_values($rows)));
        }
        json_response(array('ok' => false, 'error' => 'invalid_action'), 400);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $data = read_json_body();
    $providedUserId = isset($data['user_id']) ? clean_text($data['user_id'], 80) : '';
    $userId = authenticated_user_id($store, $providedUserId);
    $movieId = isset($data['movie_id']) ? intval($data['movie_id']) : 0;
    $mediaType = isset($data['media_type']) && $data['media_type'] === 'tv' ? 'tv' : 'movie';
    $mediaTitle = isset($data['media_title']) ? clean_text($data['media_title'], 200) : (isset($data['title']) ? clean_text($data['title'], 200) : '');

    if ($userId === '' || $movieId <= 0) {
        json_response(array('ok' => false, 'error' => 'missing_fields'), 400);
    }

    foreach ($store['favorites'] as $i => $fav) {
        if ($fav['user_id'] === $userId && intval($fav['movie_id']) === $movieId && $fav['media_type'] === $mediaType) {
            array_splice($store['favorites'], $i, 1);
            update_user_stats($store, $userId);
            save_store($store);
            json_response(array('ok' => true, 'favorited' => false));
        }
    }

    $resolvedTitle = resolve_media_title($store, $movieId, $mediaType, $mediaTitle);

    $store['favorites'][] = array(
        'id' => next_id($store, 'favorite'),
        'user_id' => $userId,
        'movie_id' => $movieId,
        'media_type' => $mediaType,
        'media_title' => $resolvedTitle,
        'created_at' => now_iso()
    );
    update_user_stats($store, $userId);
    save_store($store);
    json_response(array('ok' => true, 'favorited' => true));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
