<?php
require_once __DIR__ . '/db.php';

try {
    $store = load_store();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $rows = decorated_media_rows($store, array_values($store['movie_genres']));
        json_response(array('ok' => true, 'rows' => $rows));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);

    require_user_from_store($store);
    $data = read_json_body();
    $movieId = isset($data['movie_id']) ? intval($data['movie_id']) : 0;
    $mediaType = isset($data['media_type']) && $data['media_type'] === 'tv' ? 'tv' : 'movie';
    $mediaTitle = isset($data['media_title']) ? clean_text($data['media_title'], 200) : (isset($data['title']) ? clean_text($data['title'], 200) : '');
    $genreIds = isset($data['genre_ids']) && is_array($data['genre_ids']) ? array_values($data['genre_ids']) : array();

    if ($movieId <= 0) json_response(array('ok' => false, 'error' => 'missing_movie'), 400);

    $cleanGenres = array();
    foreach ($genreIds as $genreId) {
        $genreId = intval($genreId);
        if ($genreId > 0) $cleanGenres[] = $genreId;
    }
    $cleanGenres = array_values(array_unique($cleanGenres));
    $genreNames = array_map('genre_name_by_id', $cleanGenres);
    $resolvedTitle = resolve_media_title($store, $movieId, $mediaType, $mediaTitle);

    $store['movie_genres'][media_key($movieId, $mediaType)] = array(
        'movie_id' => $movieId,
        'media_type' => $mediaType,
        'media_title' => $resolvedTitle,
        'genre_ids' => $cleanGenres,
        'genre_names' => $genreNames,
        'updated_at' => now_iso(),
        'created_at' => now_iso()
    );

    update_users_for_media($store, $movieId, $mediaType);
    save_store($store);
    json_response(array('ok' => true, 'row' => $store['movie_genres'][media_key($movieId, $mediaType)]));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
