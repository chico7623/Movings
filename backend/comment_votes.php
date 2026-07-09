<?php
require_once __DIR__ . '/db.php';

// Endpoint de votos nos comentários.
// Mantém a tabela comment_votes como fonte de verdade e recalcula os contadores
// likes/dislikes para evitar divergências no phpMyAdmin.

function movings_find_comment_in_store($store, $commentId) {
    foreach (array('comments', 'pending_comments') as $listName) {
        if (!isset($store[$listName]) || !is_array($store[$listName])) continue;

        foreach ($store[$listName] as $comment) {
            if (isset($comment['id']) && intval($comment['id']) === intval($commentId)) {
                return $comment;
            }
        }
    }

    return null;
}

function movings_recalculate_comment_vote_counts(&$store, $commentId) {
    $likes = 0;
    $dislikes = 0;

    if (isset($store['comment_votes']) && is_array($store['comment_votes'])) {
        foreach ($store['comment_votes'] as $vote) {
            if (!isset($vote['comment_id']) || intval($vote['comment_id']) !== intval($commentId)) {
                continue;
            }

            if (isset($vote['vote_type']) && $vote['vote_type'] === 'dislike') {
                $dislikes++;
            } else {
                $likes++;
            }
        }
    }

    foreach (array('comments', 'pending_comments') as $listName) {
        if (!isset($store[$listName]) || !is_array($store[$listName])) continue;

        foreach ($store[$listName] as &$comment) {
            if (isset($comment['id']) && intval($comment['id']) === intval($commentId)) {
                $comment['likes'] = $likes;
                $comment['dislikes'] = $dislikes;
            }
        }
        unset($comment);
    }

    return array('likes' => $likes, 'dislikes' => $dislikes);
}

try {
    $store = load_store();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $providedUserId = isset($_GET['user_id']) ? clean_text($_GET['user_id'], 80) : '';
        $userId = authenticated_user_id($store, $providedUserId);
        $movieId = isset($_GET['movie_id']) ? intval($_GET['movie_id']) : 0;
        $mediaType = isset($_GET['media_type']) && $_GET['media_type'] === 'tv' ? 'tv' : 'movie';

        $commentIds = array();
        foreach ($store['comments'] as $comment) {
            if (intval($comment['movie_id']) === $movieId && $comment['media_type'] === $mediaType) {
                $commentIds[] = intval($comment['id']);
            }
        }

        $rows = array();
        foreach ($store['comment_votes'] as $vote) {
            if ($vote['user_id'] === $userId && in_array(intval($vote['comment_id']), $commentIds, true)) {
                $rows[] = $vote;
            }
        }

        json_response(array('ok' => true, 'rows' => array_values($rows)));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $data = read_json_body();
    $providedUserId = isset($data['user_id']) ? clean_text($data['user_id'], 80) : '';
    $userId = authenticated_user_id($store, $providedUserId);
    $commentId = isset($data['comment_id']) ? intval($data['comment_id']) : 0;
    $voteType = isset($data['vote_type']) && $data['vote_type'] === 'dislike' ? 'dislike' : 'like';

    if ($userId === '' || $commentId <= 0) {
        json_response(array('ok' => false, 'error' => 'missing_fields'), 400);
    }

    $comment = movings_find_comment_in_store($store, $commentId);
    if (!$comment) {
        json_response(array('ok' => false, 'error' => 'comment_not_found'), 404);
    }

    $existingIndex = null;
    foreach ($store['comment_votes'] as $index => $vote) {
        if ($vote['user_id'] === $userId && intval($vote['comment_id']) === $commentId) {
            $existingIndex = $index;
            break;
        }
    }

    $activeVote = $voteType;
    if ($existingIndex !== null) {
        $currentVoteType = isset($store['comment_votes'][$existingIndex]['vote_type'])
            && $store['comment_votes'][$existingIndex]['vote_type'] === 'dislike'
                ? 'dislike'
                : 'like';

        if ($currentVoteType === $voteType) {
            array_splice($store['comment_votes'], $existingIndex, 1);
            $activeVote = null;
        } else {
            $store['comment_votes'][$existingIndex]['vote_type'] = $voteType;
            $store['comment_votes'][$existingIndex]['created_at'] = now_iso();
        }
    } else {
        $store['comment_votes'][] = array(
            'id' => next_id($store, 'vote'),
            'user_id' => $userId,
            'comment_id' => $commentId,
            'vote_type' => $voteType,
            'created_at' => now_iso()
        );
    }

    $counts = movings_recalculate_comment_vote_counts($store, $commentId);
    save_store($store);

    json_response(array(
        'ok' => true,
        'comment_id' => $commentId,
        'user_vote' => $activeVote,
        'likes' => $counts['likes'],
        'dislikes' => $counts['dislikes']
    ));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
