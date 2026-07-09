<?php
require_once __DIR__ . '/db.php';

function clean_media_title_from_payload($data) {
    if (isset($data['media_title'])) return clean_text($data['media_title'], 200);
    if (isset($data['title'])) return clean_text($data['title'], 200);
    return '';
}

try {
    $store = load_store();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = isset($_GET['action']) ? clean_text($_GET['action'], 40) : '';

        if ($action === 'summary') {
            $summary = array();
            foreach ($store['ratings'] as $rating) {
                ensure_row_media_title($store, $rating);
                $mediaType = isset($rating['media_type']) && $rating['media_type'] === 'tv' ? 'tv' : 'movie';
                $key = intval($rating['movie_id']) . ':' . $mediaType;
                if (!isset($summary[$key])) {
                    $summary[$key] = array(
                        'movie_id' => intval($rating['movie_id']),
                        'media_type' => $mediaType,
                        'media_title' => isset($rating['media_title']) ? $rating['media_title'] : '',
                        'rating_sum' => 0,
                        'rating_count' => 0
                    );
                }
                if ($summary[$key]['media_title'] === '' && isset($rating['media_title'])) {
                    $summary[$key]['media_title'] = $rating['media_title'];
                }
                $summary[$key]['rating_sum'] += floatval($rating['rating']);
                $summary[$key]['rating_count'] += 1;
            }

            $rows = array();
            foreach ($summary as $item) {
                $count = intval($item['rating_count']);
                $rows[] = array(
                    'movie_id' => intval($item['movie_id']),
                    'media_type' => $item['media_type'],
                    'media_title' => $item['media_title'],
                    'rating_avg' => $count > 0 ? round(floatval($item['rating_sum']) / $count, 1) : 0,
                    'rating_count' => $count
                );
            }
            usort($rows, function($a, $b) {
                return strcmp(isset($a['media_title']) ? $a['media_title'] : '', isset($b['media_title']) ? $b['media_title'] : '');
            });
            json_response(array('ok' => true, 'rows' => array_values($rows)));
        }

        if ($action === 'list') {
            $providedUserId = isset($_GET['user_id']) ? clean_text($_GET['user_id'], 80) : '';
            $userId = authenticated_user_id($store, $providedUserId);
            $sourceRows = array_values($store['ratings']);

            $sourceRows = array_values(array_filter($sourceRows, function($rating) use ($userId) {
                return isset($rating['user_id']) && $rating['user_id'] === $userId;
            }));

            $rows = decorated_media_rows($store, $sourceRows);
            usort($rows, function($a, $b) {
                $ad = isset($a['updated_at']) ? $a['updated_at'] : (isset($a['created_at']) ? $a['created_at'] : '');
                $bd = isset($b['updated_at']) ? $b['updated_at'] : (isset($b['created_at']) ? $b['created_at'] : '');
                return strcmp($bd, $ad);
            });
            json_response(array('ok' => true, 'rows' => $rows));
        }

        $movieId = isset($_GET['movie_id']) ? intval($_GET['movie_id']) : 0;
        $mediaType = isset($_GET['media_type']) && $_GET['media_type'] === 'tv' ? 'tv' : 'movie';
        $providedUserId = isset($_GET['user_id']) ? clean_text($_GET['user_id'], 80) : '';
        $userId = $providedUserId !== '' ? authenticated_user_id($store, $providedUserId) : '';
        $rows = array();
        foreach ($store['ratings'] as $rating) {
            ensure_row_media_title($store, $rating);
            $rowMediaType = isset($rating['media_type']) && $rating['media_type'] === 'tv' ? 'tv' : 'movie';
            if (intval($rating['movie_id']) === $movieId && $rowMediaType === $mediaType) {
                if ($userId !== '' && $rating['user_id'] === $userId) {
                    json_response(array(
                        'ok' => true,
                        'rating' => floatval($rating['rating']),
                        'username' => isset($rating['username']) ? $rating['username'] : null,
                        'media_title' => isset($rating['media_title']) ? $rating['media_title'] : ''
                    ));
                }
                $rows[] = $rating;
            }
        }
        if ($userId !== '') {
            json_response(array('ok' => true, 'rating' => null));
        }
        json_response(array('ok' => true, 'rows' => array_values($rows)));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $data = read_json_body();
    $providedUserId = isset($data['user_id']) ? clean_text($data['user_id'], 80) : '';
    $userId = authenticated_user_id($store, $providedUserId);
    $movieId = isset($data['movie_id']) ? intval($data['movie_id']) : 0;
    $mediaType = isset($data['media_type']) && $data['media_type'] === 'tv' ? 'tv' : 'movie';
    $mediaTitle = resolve_media_title($store, $movieId, $mediaType, clean_media_title_from_payload($data));
    $ratingValue = isset($data['rating']) ? floatval($data['rating']) : 0;
    $ratingValue = round($ratingValue * 2) / 2;

    if ($userId === '' || $movieId <= 0 || $ratingValue <= 0) {
        json_response(array('ok' => false, 'error' => 'missing_fields'), 400);
    }
    if ($ratingValue < 0.5 || $ratingValue > 5) {
        json_response(array('ok' => false, 'error' => 'invalid_rating', 'message' => 'A avaliação tem de estar entre 0.5 e 5.0 estrelas.'), 400);
    }

    $user = find_user_by_id($store, $userId);
    $username = $user ? $user['username'] : 'Utilizador';
    $updated = false;
    foreach ($store['ratings'] as &$rating) {
        $rowMediaType = isset($rating['media_type']) && $rating['media_type'] === 'tv' ? 'tv' : 'movie';
        if ($rating['user_id'] === $userId && intval($rating['movie_id']) === $movieId && $rowMediaType === $mediaType) {
            $rating['rating'] = $ratingValue;
            $rating['username'] = $username;
            if ($mediaTitle !== '') $rating['media_title'] = $mediaTitle;
            $rating['updated_at'] = now_iso();
            $updated = true;
            break;
        }
    }
    unset($rating);
    if (!$updated) {
        $store['ratings'][] = array(
            'id' => next_id($store, 'rating'),
            'user_id' => $userId,
            'username' => $username,
            'movie_id' => $movieId,
            'media_type' => $mediaType,
            'media_title' => $mediaTitle,
            'rating' => $ratingValue,
            'created_at' => now_iso(),
            'updated_at' => now_iso()
        );
    }
    update_user_stats($store, $userId);
    save_store($store);
    json_response(array('ok' => true));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
