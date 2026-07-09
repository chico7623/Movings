<?php
require_once __DIR__ . '/db.php';

try {
    $store = load_store();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $providedUserId = isset($_GET['user_id']) ? clean_text($_GET['user_id'], 80) : '';
        $userId = authenticated_user_id($store, $providedUserId);
        if ($userId === '') json_response(array('ok' => false, 'error' => 'missing_user_id'), 400);

        update_user_stats($store, $userId);
        save_store($store);

        $row = isset($store['user_favorite_genre'][$userId]) ? $store['user_favorite_genre'][$userId] : null;
        json_response(array(
            'ok' => true,
            'genre_id' => $row ? $row['genre_id'] : null,
            'genre_name' => $row ? $row['genre_name'] : null,
            'row' => $row
        ));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);

    $data = read_json_body();
    $providedUserId = isset($data['user_id']) ? clean_text($data['user_id'], 80) : '';
    $userId = authenticated_user_id($store, $providedUserId);
    $genreId = isset($data['genre_id']) ? intval($data['genre_id']) : 0;
    $genreName = isset($data['genre_name']) ? clean_text($data['genre_name'], 80) : '';

    if ($userId === '' || $genreId <= 0) json_response(array('ok' => false, 'error' => 'missing_fields'), 400);
    if ($genreName === '') $genreName = genre_name_by_id($genreId);

    $store['user_favorite_genre'][$userId] = array(
        'user_id' => $userId,
        'genre_id' => $genreId,
        'genre_name' => $genreName,
        'score' => null,
        'source' => 'manual',
        'updated_at' => now_iso(),
        'created_at' => now_iso()
    );

    update_user_stats($store, $userId);
    save_store($store);
    json_response(array('ok' => true, 'row' => $store['user_favorite_genre'][$userId]));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
