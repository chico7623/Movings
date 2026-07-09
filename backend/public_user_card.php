<?php
require_once __DIR__ . '/db.php';

// Cartão público de utilizador.
// Expõe apenas estatísticas de comunidade e badges; nunca devolve email,
// password_hash, tokens de reset ou configurações privadas.

function movings_public_card_find_user($store, $userId, $username) {
    $userId = trim((string)$userId);
    $username = trim((string)$username);

    if ($userId !== '') {
        $found = find_user_by_id($store, $userId);
        if ($found) return $found;
    }

    if ($username !== '') {
        $found = find_user_by_username($store, $username);
        if ($found) return $found;
    }

    return null;
}

function movings_public_card_fallback_badges() {
    return array(
        'first_rating' => array('badge_key' => 'first_rating', 'name' => 'Primeira avaliação', 'description' => 'Avaliou o primeiro filme ou série.', 'icon' => '⭐', 'rarity' => 'Comum', 'points' => 10, 'sort_order' => 10),
        'first_comment' => array('badge_key' => 'first_comment', 'name' => 'Primeiro comentário', 'description' => 'Teve um comentário aprovado.', 'icon' => '💬', 'rarity' => 'Comum', 'points' => 10, 'sort_order' => 20),
        'five_ratings' => array('badge_key' => 'five_ratings', 'name' => 'Crítico em Aquecimento', 'description' => 'Chegou às 5 avaliações.', 'icon' => '🎬', 'rarity' => 'Incomum', 'points' => 25, 'sort_order' => 30),
        'ten_ratings' => array('badge_key' => 'ten_ratings', 'name' => 'Crítico Movings', 'description' => 'Chegou às 10 avaliações.', 'icon' => '🍿', 'rarity' => 'Rara', 'points' => 50, 'sort_order' => 40),
        'five_favorites' => array('badge_key' => 'five_favorites', 'name' => 'Colecionador', 'description' => 'Guardou 5 favoritos.', 'icon' => '❤️', 'rarity' => 'Incomum', 'points' => 25, 'sort_order' => 70),
        'quiz_done' => array('badge_key' => 'quiz_done', 'name' => 'Perfil Cinemático', 'description' => 'Terminou o quiz de personalidade.', 'icon' => '🧠', 'rarity' => 'Comum', 'points' => 15, 'sort_order' => 90),
        'helpful_voter' => array('badge_key' => 'helpful_voter', 'name' => 'Juiz dos Comentários', 'description' => 'Reagiu a comentários da comunidade.', 'icon' => '⚖️', 'rarity' => 'Comum', 'points' => 10, 'sort_order' => 120)
    );
}

function movings_public_card_badge_meta($store, $badgeKey) {
    $badgeKey = (string)$badgeKey;

    if (isset($store['badges']) && is_array($store['badges'])) {
        foreach ($store['badges'] as $badge) {
            if (isset($badge['badge_key']) && (string)$badge['badge_key'] === $badgeKey) {
                return array(
                    'badge_key' => $badgeKey,
                    'name' => isset($badge['name']) ? $badge['name'] : 'Badge Movings',
                    'description' => isset($badge['description']) ? $badge['description'] : '',
                    'icon' => isset($badge['icon']) ? $badge['icon'] : '🏆',
                    'rarity' => isset($badge['rarity']) ? $badge['rarity'] : 'common',
                    'points' => isset($badge['points']) ? intval($badge['points']) : 0,
                    'sort_order' => isset($badge['sort_order']) ? intval($badge['sort_order']) : 999
                );
            }
        }
    }

    $fallbacks = movings_public_card_fallback_badges();
    if (isset($fallbacks[$badgeKey])) return $fallbacks[$badgeKey];

    return array(
        'badge_key' => $badgeKey,
        'name' => 'Badge Movings',
        'description' => 'Conquista desbloqueada no Movings.',
        'icon' => '🏆',
        'rarity' => 'Conquista',
        'points' => 0,
        'sort_order' => 999
    );
}

function movings_public_card_add_badge(&$badges, $store, $badgeKey, $awardedAt = null) {
    $badgeKey = (string)$badgeKey;
    if ($badgeKey === '' || isset($badges[$badgeKey])) return;

    $badge = movings_public_card_badge_meta($store, $badgeKey);
    $badge['awarded_at'] = $awardedAt ?: now_iso();
    $badges[$badgeKey] = $badge;
}

function movings_public_card_badges($store, $userId, $stats, $quiz) {
    $badges = array();

    if (isset($store['user_badges']) && is_array($store['user_badges'])) {
        foreach ($store['user_badges'] as $userBadge) {
            if (!isset($userBadge['user_id']) || (string)$userBadge['user_id'] !== (string)$userId) continue;
            $badgeKey = isset($userBadge['badge_key']) ? (string)$userBadge['badge_key'] : '';
            movings_public_card_add_badge($badges, $store, $badgeKey, isset($userBadge['awarded_at']) ? $userBadge['awarded_at'] : null);
        }
    }

    $ratingsTotal = isset($stats['ratings_total']) ? intval($stats['ratings_total']) : 0;
    $commentsTotal = isset($stats['comments_total']) ? intval($stats['comments_total']) : 0;
    $favoritesTotal = isset($stats['favorites_total']) ? intval($stats['favorites_total']) : 0;

    $commentVotesTotal = 0;
    if (isset($store['comment_votes']) && is_array($store['comment_votes'])) {
        foreach ($store['comment_votes'] as $vote) {
            if (isset($vote['user_id']) && (string)$vote['user_id'] === (string)$userId) $commentVotesTotal++;
        }
    }

    if ($ratingsTotal >= 1) movings_public_card_add_badge($badges, $store, 'first_rating');
    if ($ratingsTotal >= 5) movings_public_card_add_badge($badges, $store, 'five_ratings');
    if ($ratingsTotal >= 10) movings_public_card_add_badge($badges, $store, 'ten_ratings');
    if ($commentsTotal >= 1) movings_public_card_add_badge($badges, $store, 'first_comment');
    if ($commentsTotal >= 5) movings_public_card_add_badge($badges, $store, 'approved_comments_5');
    if ($favoritesTotal >= 5) movings_public_card_add_badge($badges, $store, 'five_favorites');
    if ($quiz) movings_public_card_add_badge($badges, $store, 'quiz_done', isset($quiz['created_at']) ? $quiz['created_at'] : null);
    if ($commentVotesTotal >= 1) movings_public_card_add_badge($badges, $store, 'helpful_voter');

    $rows = array_values($badges);
    usort($rows, function($a, $b) {
        $ap = isset($a['sort_order']) ? intval($a['sort_order']) : 999;
        $bp = isset($b['sort_order']) ? intval($b['sort_order']) : 999;
        if ($ap === $bp) return strcmp(isset($a['name']) ? $a['name'] : '', isset($b['name']) ? $b['name'] : '');
        return $ap - $bp;
    });

    return $rows;
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        json_response(array('ok' => true));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $store = load_store();
    $userId = isset($_GET['user_id']) ? clean_text($_GET['user_id'], 80) : '';
    $username = isset($_GET['username']) ? clean_text($_GET['username'], 120) : '';
    $user = movings_public_card_find_user($store, $userId, $username);

    if (!$user || !isset($user['id']) || !empty($user['blocked'])) {
        json_response(array('ok' => false, 'error' => 'user_not_found', 'message' => 'Utilizador não encontrado.'), 404);
    }

    $resolvedUserId = (string)$user['id'];
    update_user_stats($store, $resolvedUserId);
    save_store($store);

    $stats = isset($store['user_stats'][$resolvedUserId]) ? $store['user_stats'][$resolvedUserId] : array(
        'user_id' => $resolvedUserId,
        'ratings_total' => 0,
        'comments_total' => 0,
        'favorites_total' => 0,
        'ratings_avg' => 0,
        'movies_watched' => 0,
        'movies_rated' => 0,
        'comments_posted' => 0,
        'favorite_genre_name' => null,
        'top_genre_name' => null
    );

    $favoriteGenreName = null;
    if (isset($store['user_favorite_genre'][$resolvedUserId]) && isset($store['user_favorite_genre'][$resolvedUserId]['genre_name'])) {
        $favoriteGenreName = $store['user_favorite_genre'][$resolvedUserId]['genre_name'];
    }
    if (!$favoriteGenreName && isset($stats['favorite_genre_name'])) $favoriteGenreName = $stats['favorite_genre_name'];
    if (!$favoriteGenreName && isset($stats['top_genre_name'])) $favoriteGenreName = $stats['top_genre_name'];

    $quiz = isset($store['quiz_results'][$resolvedUserId]) ? $store['quiz_results'][$resolvedUserId] : null;

    json_response(array(
        'ok' => true,
        'user' => array(
            'id' => $resolvedUserId,
            'username' => isset($user['username']) ? $user['username'] : 'Utilizador'
        ),
        'stats' => array(
            'ratings_total' => isset($stats['ratings_total']) ? intval($stats['ratings_total']) : 0,
            'comments_total' => isset($stats['comments_total']) ? intval($stats['comments_total']) : 0,
            'favorites_total' => isset($stats['favorites_total']) ? intval($stats['favorites_total']) : 0,
            'ratings_avg' => isset($stats['ratings_avg']) ? floatval($stats['ratings_avg']) : 0,
            'movies_watched' => isset($stats['movies_watched']) ? intval($stats['movies_watched']) : 0
        ),
        'favorite_genre_name' => $favoriteGenreName,
        'quiz' => $quiz ? array(
            'result_label' => isset($quiz['result_label']) ? $quiz['result_label'] : null,
            'result_desc' => isset($quiz['result_desc']) ? $quiz['result_desc'] : null
        ) : null,
        'badges' => movings_public_card_badges($store, $resolvedUserId, $stats, $quiz)
    ));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
