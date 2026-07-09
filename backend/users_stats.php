<?php
require_once __DIR__ . '/db.php';

try {
    $store = load_store();
    $providedUserId = isset($_GET['user_id']) ? clean_text($_GET['user_id'], 80) : '';
    $userId = authenticated_user_id($store, $providedUserId);
    if ($userId === '') json_response(array('ok' => false, 'error' => 'missing_user_id'), 400);

    update_user_stats($store, $userId);
    save_store($store);

    $stats = isset($store['user_stats'][$userId]) ? $store['user_stats'][$userId] : array(
        'user_id' => $userId,
        'ratings_total' => 0,
        'comments_total' => 0,
        'pending_comments_total' => 0,
        'favorites_total' => 0,
        'ratings_avg' => 0,
        'movies_watched' => 0,
        'movies_rated' => 0,
        'comments_posted' => 0,
        'favorite_genre_id' => null,
        'favorite_genre_name' => null,
        'top_genre_id' => null,
        'top_genre_name' => null,
        'genre_distribution' => array(),
        'genre_distribution_labels' => array(),
        'genre_distribution_rows' => array(),
        'updated_at' => now_iso()
    );

    json_response(array_merge(array('ok' => true), $stats));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
