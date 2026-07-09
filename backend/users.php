<?php
require_once __DIR__ . '/db.php';

try {
    $store = load_store();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        require_admin_from_store($store);
        $rows = array_map('public_user', $store['users']);
        json_response(array('ok' => true, 'rows' => $rows));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $data = read_json_body();
    $action = isset($data['action']) ? $data['action'] : 'upsert';
    $id = isset($data['id']) ? clean_text($data['id'], 80) : '';

    if ($id === '') {
        json_response(array('ok' => false, 'error' => 'missing_id'), 400);
    }

    $currentUser = require_same_user_or_admin($store, $id);

    if ($action === 'delete') {
        $target = find_user_by_id($store, $id);
        if (!$target) {
            json_response(array('ok' => false, 'error' => 'user_not_found'), 404);
        }
        if (isset($target['username_norm']) && $target['username_norm'] === 'admin') {
            json_response(array('ok' => false, 'error' => 'admin_cannot_be_deleted'), 403);
        }

        $removedCommentIds = array();
        foreach ($store['comments'] as $comment) {
            if (isset($comment['user_id']) && $comment['user_id'] === $id) $removedCommentIds[] = intval($comment['id']);
        }
        foreach ($store['pending_comments'] as $comment) {
            if (isset($comment['user_id']) && $comment['user_id'] === $id) $removedCommentIds[] = intval($comment['id']);
        }

        $newUsers = array();
        foreach ($store['users'] as $u) if ($u['id'] !== $id) $newUsers[] = $u;
        $store['users'] = $newUsers;

        $newComments = array();
        foreach ($store['comments'] as $c) if (!isset($c['user_id']) || $c['user_id'] !== $id) $newComments[] = $c;
        $store['comments'] = $newComments;

        $newPending = array();
        foreach ($store['pending_comments'] as $c) if (!isset($c['user_id']) || $c['user_id'] !== $id) $newPending[] = $c;
        $store['pending_comments'] = $newPending;

        $newRatings = array();
        foreach ($store['ratings'] as $r) if (!isset($r['user_id']) || $r['user_id'] !== $id) $newRatings[] = $r;
        $store['ratings'] = $newRatings;

        $newFavorites = array();
        foreach ($store['favorites'] as $f) if (!isset($f['user_id']) || $f['user_id'] !== $id) $newFavorites[] = $f;
        $store['favorites'] = $newFavorites;

        $newWatchlist = array();
        if (!isset($store['watchlist']) || !is_array($store['watchlist'])) $store['watchlist'] = array();
        foreach ($store['watchlist'] as $w) if (!isset($w['user_id']) || $w['user_id'] !== $id) $newWatchlist[] = $w;
        $store['watchlist'] = $newWatchlist;

        $newQuiz = array();
        foreach ($store['quiz_results'] as $q) if (!isset($q['user_id']) || $q['user_id'] !== $id) $newQuiz[] = $q;
        $store['quiz_results'] = $newQuiz;

        $newVotes = array();
        foreach ($store['comment_votes'] as $v) {
            $voteUser = isset($v['user_id']) ? $v['user_id'] : '';
            $voteCommentId = intval(isset($v['comment_id']) ? $v['comment_id'] : 0);
            if ($voteUser === $id) continue;
            if (in_array($voteCommentId, $removedCommentIds, true)) continue;
            $newVotes[] = $v;
        }
        $store['comment_votes'] = $newVotes;

        if (isset($store['user_stats'][$id])) unset($store['user_stats'][$id]);
        if (isset($store['user_favorite_genre'][$id])) unset($store['user_favorite_genre'][$id]);

        $newUserBadges = array();
        foreach ($store['user_badges'] as $ub) if (!isset($ub['user_id']) || $ub['user_id'] !== $id) $newUserBadges[] = $ub;
        $store['user_badges'] = $newUserBadges;

        save_store($store);
        json_response(array('ok' => true, 'deleted_user_id' => $id, 'removed_comment_ids' => $removedCommentIds));
    }

    $username = isset($data['username']) ? clean_text($data['username'], 80) : 'utilizador';
    $email = isset($data['email']) ? clean_text($data['email'], 255) : null;
    $found = false;

    foreach ($store['users'] as &$user) {
        if ($user['id'] === $id) {
            if (!isset($user['username_norm']) || $user['username_norm'] !== 'admin') {
                $user['username'] = $username;
                $user['username_norm'] = norm_username($username);
                $user['email'] = $email;
            }
            $found = true;
            break;
        }
    }
    unset($user);

    if (!$found) {
        $store['users'][] = array(
            'id' => $id,
            'email' => $email,
            'username' => $username,
            'username_norm' => norm_username($username),
            'password_hash' => password_hash('123456', PASSWORD_DEFAULT),
            'role' => 'user',
            'blocked' => false,
            'created_at' => now_iso()
        );
    }

    update_user_stats($store, $id);
    save_store($store);
    json_response(array('ok' => true));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
