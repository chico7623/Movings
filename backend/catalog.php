<?php
require_once __DIR__ . '/db.php';

function catalog_title($row) {
    return isset($row['title']) && trim((string)$row['title']) !== '' ? trim((string)$row['title']) : (isset($row['name']) ? trim((string)$row['name']) : '');
}

function catalog_clean_trailer_url($value) {
    $url = clean_text($value, 500);
    if ($url === '') return '';

    if (!preg_match('/^https?:\/\//i', $url)) {
        $url = 'https://' . $url;
    }

    if (!preg_match('/^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i', $url)) {
        json_response(array(
            'ok' => false,
            'error' => 'invalid_trailer_url',
            'message' => 'O trailer tem de ser um link válido do YouTube.'
        ), 400);
    }

    return $url;
}

function catalog_find_index($store, $id, $mediaType = null) {
    if (!isset($store['custom_catalog']) || !is_array($store['custom_catalog'])) return null;
    foreach ($store['custom_catalog'] as $i => $row) {
        $rowId = isset($row['movie_id']) ? intval($row['movie_id']) : (isset($row['id']) ? intval($row['id']) : 0);
        $rowType = isset($row['media_type']) && $row['media_type'] === 'tv' ? 'tv' : 'movie';
        if ($rowId === intval($id) && ($mediaType === null || $rowType === $mediaType)) return $i;
    }
    return null;
}

function catalog_sync_media_title(&$store, $movieId, $mediaType, $title, $newMediaType = null) {
    foreach (array('ratings', 'comments', 'pending_comments', 'favorites', 'watchlist', 'movie_genres', 'movie_requests') as $table) {
        if (!isset($store[$table]) || !is_array($store[$table])) continue;
        foreach ($store[$table] as &$row) {
            if (!is_array($row)) continue;
            $rowId = isset($row['movie_id']) ? intval($row['movie_id']) : 0;
            $rowType = isset($row['media_type']) && $row['media_type'] === 'tv' ? 'tv' : 'movie';
            if ($rowId === intval($movieId) && $rowType === $mediaType) {
                if ($newMediaType !== null && $table !== 'movie_requests') {
                    $row['media_type'] = $newMediaType;
                }
                if ($table === 'movie_requests') {
                    $row['title'] = $title;
                } else {
                    $row['media_title'] = $title;
                }
            }
        }
        unset($row);
    }
}

try {
    $store = load_store();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $rows = isset($store['custom_catalog']) && is_array($store['custom_catalog']) ? $store['custom_catalog'] : array();

        try {
            $pdo = pdo_db();
            if (table_exists($pdo, 'media_assets')) {
                $assets = array();
                foreach ($pdo->query('SELECT * FROM media_assets')->fetchAll() as $asset) {
                    $assets[media_key($asset['movie_id'], $asset['media_type'])] = $asset;
                }
                foreach ($rows as &$row) {
                    $mid = isset($row['movie_id']) ? intval($row['movie_id']) : intval($row['id']);
                    $type = isset($row['media_type']) ? $row['media_type'] : 'movie';
                    $key = media_key($mid, $type);
                    if (isset($assets[$key])) {
                        if (empty($row['poster_path']) && !empty($assets[$key]['poster_path'])) $row['poster_path'] = $assets[$key]['poster_path'];
                        if (empty($row['backdrop_path']) && !empty($assets[$key]['backdrop_path'])) $row['backdrop_path'] = $assets[$key]['backdrop_path'];
                    }
                }
                unset($row);
            }
        } catch (Throwable $ignore) {}

        $seen = array();
        $deduped = array();
        foreach ($rows as $row) {
            $titleKey = text_lower(catalog_title($row));
            $typeKey = isset($row['media_type']) ? $row['media_type'] : 'movie';
            $key = $typeKey . ':' . $titleKey;
            if ($titleKey === '' || !isset($seen[$key])) {
                $seen[$key] = true;
                $deduped[] = $row;
            }
        }

        usort($deduped, function ($a, $b) {
            return strcmp(isset($b['created_at']) ? $b['created_at'] : '', isset($a['created_at']) ? $a['created_at'] : '');
        });
        json_response(array('ok' => true, 'rows' => array_values($deduped)));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $admin = require_admin_from_store($store);
    $data = read_json_body();
    $action = isset($data['action']) ? clean_text($data['action'], 30) : 'create';

    if (!isset($store['custom_catalog']) || !is_array($store['custom_catalog'])) {
        $store['custom_catalog'] = array();
    }

    if ($action === 'delete') {
        $id = isset($data['id']) ? intval($data['id']) : (isset($data['movie_id']) ? intval($data['movie_id']) : 0);
        $mediaType = isset($data['media_type']) && $data['media_type'] === 'tv' ? 'tv' : 'movie';
        if ($id <= 0) {
            json_response(array('ok' => false, 'error' => 'invalid_id', 'message' => 'Título inválido.'), 400);
        }

        $index = catalog_find_index($store, $id, null);
        if ($index === null) {
            json_response(array('ok' => false, 'error' => 'catalog_item_not_found', 'message' => 'Título não encontrado no catálogo extra.'), 404);
        }
        $deleted = $store['custom_catalog'][$index];
        $deletedMediaType = isset($deleted['media_type']) && $deleted['media_type'] === 'tv' ? 'tv' : 'movie';
        array_splice($store['custom_catalog'], $index, 1);
        save_store($store);

        try {
            $pdo = pdo_db();
            if (table_exists($pdo, 'media_assets')) {
                $stmt = $pdo->prepare('DELETE FROM media_assets WHERE movie_id = ? AND media_type = ?');
                $stmt->execute(array($id, $deletedMediaType));
            }
            if (table_exists($pdo, 'movie_genre_links')) {
                $stmt = $pdo->prepare('DELETE FROM movie_genre_links WHERE movie_id = ? AND media_type = ?');
                $stmt->execute(array($id, $deletedMediaType));
            }
        } catch (Throwable $ignore) {}

        json_response(array('ok' => true, 'deleted' => $deleted));
    }

    $id = isset($data['id']) ? intval($data['id']) : (isset($data['movie_id']) ? intval($data['movie_id']) : 0);
    $title = isset($data['title']) ? clean_text($data['title'], 140) : '';
    $mediaType = isset($data['media_type']) && $data['media_type'] === 'tv' ? 'tv' : 'movie';
    $overview = isset($data['overview']) ? clean_text($data['overview'], 1000) : '';
    $posterPath = isset($data['poster_path']) ? clean_text($data['poster_path'], 500) : '';
    $backdropPath = isset($data['backdrop_path']) ? clean_text($data['backdrop_path'], 500) : '';
    $trailerUrl = isset($data['trailer_url']) ? catalog_clean_trailer_url($data['trailer_url']) : '';
    $releaseDate = isset($data['release_date']) ? clean_text($data['release_date'], 20) : '';
    $genreIds = array();

    if (isset($data['genre_ids']) && is_array($data['genre_ids'])) {
        foreach ($data['genre_ids'] as $genreId) {
            $genreId = intval($genreId);
            if ($genreId > 0) $genreIds[] = $genreId;
        }
    }

    if ($title === '') {
        json_response(array('ok' => false, 'error' => 'missing_title', 'message' => 'O título é obrigatório.'), 400);
    }

    foreach ($store['custom_catalog'] as $existing) {
        $existingId = isset($existing['movie_id']) ? intval($existing['movie_id']) : (isset($existing['id']) ? intval($existing['id']) : 0);
        $existingType = isset($existing['media_type']) && $existing['media_type'] === 'tv' ? 'tv' : 'movie';
        if (($action === 'update' || $action === 'upsert') && $existingId === $id && $existingType === $mediaType) continue;
        if (text_lower(catalog_title($existing)) === text_lower($title) && $existingType === $mediaType) {
            json_response(array('ok' => false, 'error' => 'duplicate_title', 'message' => 'Esse título já está no catálogo extra.'), 409);
        }
    }

    if ($action === 'update' || $action === 'upsert') {
        if ($id <= 0) {
            json_response(array('ok' => false, 'error' => 'invalid_id', 'message' => 'Título inválido.'), 400);
        }
        $index = catalog_find_index($store, $id, null);
        if ($index === null) {
            if ($action === 'update') {
                json_response(array('ok' => false, 'error' => 'catalog_item_not_found', 'message' => 'Título não encontrado no catálogo extra.'), 404);
            }

            $item = array(
                'id' => $id,
                'movie_id' => $id,
                'title' => $mediaType === 'movie' ? $title : null,
                'name' => $mediaType === 'tv' ? $title : null,
                'poster_path' => $posterPath !== '' ? $posterPath : null,
                'backdrop_path' => $backdropPath !== '' ? $backdropPath : null,
                'trailer_url' => $trailerUrl !== '' ? $trailerUrl : null,
                'overview' => $overview,
                'vote_average' => 0,
                'vote_count' => 0,
                'release_date' => $mediaType === 'movie' ? $releaseDate : '',
                'first_air_date' => $mediaType === 'tv' ? $releaseDate : '',
                'media_type' => $mediaType,
                'genre_ids' => array_values(array_unique($genreIds)),
                'popularity' => 0,
                'created_at' => now_iso()
            );

            $store['custom_catalog'][] = $item;
            catalog_sync_media_title($store, $id, $mediaType, $title, $mediaType);
            log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', 'upsert_catalog_item', 'catalog', $id, $title);
            save_store($store);

            try {
                $pdo = pdo_db();
                if (table_exists($pdo, 'media_assets')) {
                    $stmt = $pdo->prepare('INSERT INTO media_assets (movie_id, media_type, media_title, poster_path, backdrop_path, updated_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE media_title = VALUES(media_title), poster_path = VALUES(poster_path), backdrop_path = VALUES(backdrop_path), updated_at = NOW()');
                    $stmt->execute(array($id, $mediaType, $title, $posterPath !== '' ? $posterPath : null, $backdropPath !== '' ? $backdropPath : null));
                }
            } catch (Throwable $ignore) {}

            json_response(array('ok' => true, 'item' => $item, 'created' => true));
        }

        $oldMediaType = isset($store['custom_catalog'][$index]['media_type']) && $store['custom_catalog'][$index]['media_type'] === 'tv' ? 'tv' : 'movie';
        $item = $store['custom_catalog'][$index];
        $item['title'] = $mediaType === 'movie' ? $title : null;
        $item['name'] = $mediaType === 'tv' ? $title : null;
        $item['poster_path'] = $posterPath !== '' ? $posterPath : null;
        $item['backdrop_path'] = $backdropPath !== '' ? $backdropPath : null;
        $item['trailer_url'] = $trailerUrl !== '' ? $trailerUrl : null;
        $item['overview'] = $overview;
        $item['release_date'] = $mediaType === 'movie' ? $releaseDate : '';
        $item['first_air_date'] = $mediaType === 'tv' ? $releaseDate : '';
        $item['media_type'] = $mediaType;
        if (!empty($genreIds)) $item['genre_ids'] = array_values(array_unique($genreIds));
        $store['custom_catalog'][$index] = $item;
        catalog_sync_media_title($store, $id, $oldMediaType, $title, $mediaType);
        log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', $action === 'upsert' ? 'upsert_catalog_item' : 'update_catalog_item', 'catalog', $id, $title);
        save_store($store);

        try {
            $pdo = pdo_db();
            if (table_exists($pdo, 'media_assets')) {
                $stmt = $pdo->prepare('INSERT INTO media_assets (movie_id, media_type, media_title, poster_path, backdrop_path, updated_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE media_title = VALUES(media_title), poster_path = VALUES(poster_path), backdrop_path = VALUES(backdrop_path), updated_at = NOW()');
                $stmt->execute(array($id, $mediaType, $title, $posterPath !== '' ? $posterPath : null, $backdropPath !== '' ? $backdropPath : null));
            }
        } catch (Throwable $ignore) {}

        json_response(array('ok' => true, 'item' => $item));
    }

    if ($action !== 'create') {
        json_response(array('ok' => false, 'error' => 'invalid_action'), 400);
    }

    $id = next_id($store, 'catalog_item');
    $item = array(
        'id' => $id,
        'movie_id' => $id,
        'title' => $mediaType === 'movie' ? $title : null,
        'name' => $mediaType === 'tv' ? $title : null,
        'poster_path' => $posterPath !== '' ? $posterPath : null,
        'backdrop_path' => $backdropPath !== '' ? $backdropPath : null,
        'trailer_url' => $trailerUrl !== '' ? $trailerUrl : null,
        'overview' => $overview,
        'vote_average' => 0,
        'vote_count' => 0,
        'release_date' => $mediaType === 'movie' ? $releaseDate : '',
        'first_air_date' => $mediaType === 'tv' ? $releaseDate : '',
        'media_type' => $mediaType,
        'genre_ids' => array_values(array_unique($genreIds)),
        'popularity' => 0,
        'created_at' => now_iso()
    );

    $store['custom_catalog'][] = $item;
    save_store($store);

    if ($posterPath !== '' || $backdropPath !== '') {
        try {
            $pdo = pdo_db();
            if (table_exists($pdo, 'media_assets')) {
                $stmt = $pdo->prepare('INSERT INTO media_assets (movie_id, media_type, media_title, poster_path, backdrop_path, updated_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE media_title = VALUES(media_title), poster_path = COALESCE(NULLIF(VALUES(poster_path), ""), poster_path), backdrop_path = COALESCE(NULLIF(VALUES(backdrop_path), ""), backdrop_path), updated_at = NOW()');
                $stmt->execute(array($id, $mediaType, $title, $posterPath !== '' ? $posterPath : null, $backdropPath !== '' ? $backdropPath : null));
            }
        } catch (Throwable $ignore) {}
    }

    json_response(array('ok' => true, 'item' => $item));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
