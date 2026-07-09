<?php
require_once __DIR__ . '/db.php';

// Endpoint administrativo.
// Todas as operações passam por require_admin_from_store(), por isso a permissão
// real fica no backend e não apenas nos botões protegidos do React.

try {
    $store = load_store();

    // Segurança final PAP: o backend também valida o token JWT.
    // A proteção do React é apenas UX; autorização real fica na API.
    $admin = require_admin_from_store($store);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        if ($action === 'comments') {
            $status = isset($_GET['status']) ? $_GET['status'] : 'pending';
            $comments = array();

            if ($status === 'pending') {
                $comments = $store['pending_comments'];
            } elseif ($status === 'approved') {
                foreach ($store['comments'] as $c) {
                    if (!isset($c['status']) || $c['status'] === 'approved') $comments[] = $c;
                }
            } elseif ($status === 'all') {
                foreach ($store['pending_comments'] as $c) $comments[] = $c;
                foreach ($store['comments'] as $c) $comments[] = $c;
            } else {
                foreach ($store['comments'] as $c) {
                    if (isset($c['status']) && $c['status'] === $status) $comments[] = $c;
                }
            }

            usort($comments, function($a, $b) {
                $ad = isset($a['created_at']) ? $a['created_at'] : '';
                $bd = isset($b['created_at']) ? $b['created_at'] : '';
                return strcmp($bd, $ad);
            });

            json_response(array('ok' => true, 'comments' => decorated_media_rows($store, array_values($comments))));
        }

        if ($action === 'ratings') {
            $ratings = decorated_media_rows($store, array_values($store['ratings']));
            usort($ratings, function($a, $b) {
                $ad = isset($a['updated_at']) ? $a['updated_at'] : (isset($a['created_at']) ? $a['created_at'] : '');
                $bd = isset($b['updated_at']) ? $b['updated_at'] : (isset($b['created_at']) ? $b['created_at'] : '');
                return strcmp($bd, $ad);
            });
            json_response(array('ok' => true, 'ratings' => $ratings));
        }

        if ($action === 'logs') {
            json_response(array('ok' => true, 'logs' => array_values($store['admin_logs'])));
        }

        if ($action === 'stats') {
            $requestsPending = 0;
            $requestsInProgress = 0;
            $requestsCompleted = 0;
            if (isset($store['movie_requests']) && is_array($store['movie_requests'])) {
                foreach ($store['movie_requests'] as $request) {
                    $requestStatus = isset($request['status']) ? $request['status'] : 'pending';
                    if ($requestStatus === 'pending') $requestsPending++;
                    if ($requestStatus === 'in_progress') $requestsInProgress++;
                    if ($requestStatus === 'completed') $requestsCompleted++;
                }
            }

            json_response(array(
                'ok' => true,
                'stats' => array(
                    'users' => count($store['users']),
                    'pending_comments' => count($store['pending_comments']),
                    'approved_comments' => count($store['comments']),
                    'ratings' => count($store['ratings']),
                    'favorites' => count($store['favorites']),
                    'watchlist' => isset($store['watchlist']) && is_array($store['watchlist']) ? count($store['watchlist']) : 0,
                    'user_favorite_genre' => count($store['user_favorite_genre']),
                    'user_stats' => count($store['user_stats']),
                    'requests_pending' => $requestsPending,
                    'requests_in_progress' => $requestsInProgress,
                    'requests_completed' => $requestsCompleted
                )
            ));
        }

        json_response(array('ok' => false, 'error' => 'invalid_action'), 400);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $data = read_json_body();
    $action = isset($data['action']) ? $data['action'] : '';

    if ($action === 'update_comment') {
        $commentId = isset($data['comment_id']) ? intval($data['comment_id']) : 0;
        $status = isset($data['status']) ? $data['status'] : '';
        if ($commentId <= 0 || !in_array($status, array('approved', 'rejected'), true)) {
            json_response(array('ok' => false, 'error' => 'invalid_input'), 400);
        }

        $foundIndex = null;
        foreach ($store['pending_comments'] as $i => $comment) {
            if (intval($comment['id']) === $commentId) {
                $foundIndex = $i;
                break;
            }
        }
        if ($foundIndex === null) {
            json_response(array('ok' => false, 'error' => 'comment_not_found'), 404);
        }

        $pending = $store['pending_comments'][$foundIndex];
        array_splice($store['pending_comments'], $foundIndex, 1);

        if ($status === 'approved') {
            $originalCommentId = isset($pending['original_comment_id']) ? intval($pending['original_comment_id']) : 0;

            if ($originalCommentId > 0) {
                // Aprovação de uma edição feita pelo utilizador:
                // mantém o mesmo comentário original, preservando likes, dislikes, replies
                // e links existentes. Só o conteúdo aprovado é substituído.
                $approvedRevisionApplied = false;
                foreach ($store['comments'] as $i => $approvedComment) {
                    if (intval($approvedComment['id']) === $originalCommentId) {
                        $store['comments'][$i]['content'] = isset($pending['content']) ? $pending['content'] : '';
                        $store['comments'][$i]['is_spoiler'] = !empty($pending['is_spoiler']);
                        $store['comments'][$i]['status'] = 'approved';
                        $store['comments'][$i]['edited_at'] = now_iso();
                        $store['comments'][$i]['approved_at'] = now_iso();

                        // Repara metadados de autoria caso o comentário venha de dados antigos da PAP.
                        if (isset($pending['user_id'])) $store['comments'][$i]['user_id'] = $pending['user_id'];
                        if (isset($pending['username'])) $store['comments'][$i]['username'] = $pending['username'];
                        if (isset($pending['media_title'])) $store['comments'][$i]['media_title'] = $pending['media_title'];

                        update_user_stats($store, $store['comments'][$i]['user_id']);
                        $approvedRevisionApplied = true;
                        break;
                    }
                }

                // Fallback defensivo: se por algum motivo o comentário original já não existir,
                // publica a revisão como comentário aprovado novo para não perder conteúdo.
                if (!$approvedRevisionApplied) {
                    $approved = $pending;
                    $approved['id'] = next_id($store, 'comment');
                    unset($approved['original_comment_id']);
                    $approved['status'] = 'approved';
                    $approved['likes'] = isset($approved['likes']) ? intval($approved['likes']) : 0;
                    $approved['dislikes'] = isset($approved['dislikes']) ? intval($approved['dislikes']) : 0;
                    $approved['approved_at'] = now_iso();
                    $store['comments'][] = $approved;
                    update_user_stats($store, $approved['user_id']);
                }
            } else {
                // Aprovação de comentário novo: continua a criar um ID novo na tabela final,
                // evitando colisões entre IDs de pendentes e aprovados.
                $approved = $pending;
                $approved['id'] = next_id($store, 'comment');
                $approved['status'] = 'approved';
                $approved['likes'] = isset($approved['likes']) ? intval($approved['likes']) : 0;
                $approved['dislikes'] = isset($approved['dislikes']) ? intval($approved['dislikes']) : 0;
                $approved['approved_at'] = now_iso();
                $store['comments'][] = $approved;
                update_user_stats($store, $approved['user_id']);
            }
        }

        log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', $status === 'approved' ? 'approve_comment' : 'reject_comment', 'comment', $commentId, isset($pending['content']) ? $pending['content'] : '');
        save_store($store);
        json_response(array('ok' => true, 'status' => $status));
    }

    if ($action === 'edit_comment') {
        $commentId = isset($data['comment_id']) ? intval($data['comment_id']) : 0;
        $list = isset($data['list']) && $data['list'] === 'pending' ? 'pending' : 'approved';
        $content = clean_text(isset($data['content']) ? $data['content'] : '', 2000);
        $isSpoiler = !empty($data['is_spoiler']);

        if ($commentId <= 0 || text_length($content) < 2) {
            json_response(array('ok' => false, 'error' => 'invalid_input', 'message' => 'Comentário inválido.'), 400);
        }

        $targetTable = $list === 'pending' ? 'pending_comments' : 'comments';
        $foundIndex = null;

        foreach ($store[$targetTable] as $i => $comment) {
            if (intval($comment['id']) === $commentId) {
                $foundIndex = $i;
                break;
            }
        }

        if ($foundIndex === null) {
            json_response(array('ok' => false, 'error' => 'comment_not_found'), 404);
        }

        $store[$targetTable][$foundIndex]['content'] = $content;
        $store[$targetTable][$foundIndex]['is_spoiler'] = $isSpoiler;
        if ($targetTable === 'comments') {
            $store[$targetTable][$foundIndex]['status'] = 'approved';
        } else {
            $store[$targetTable][$foundIndex]['status'] = 'pending';
        }

        log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', 'edit_comment', 'comment', $commentId, $content);
        save_store($store);
        json_response(array('ok' => true, 'comment' => $store[$targetTable][$foundIndex]));
    }

    if ($action === 'clear_interactions') {
        $store['ratings'] = array();
        $store['comments'] = array();
        $store['pending_comments'] = array();
        $store['comment_votes'] = array();
        foreach ($store['users'] as $user) {
            if (isset($user['id'])) update_user_stats($store, $user['id']);
        }
        log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', 'clear_interactions', 'system', 'ratings_comments', 'Dados de ratings e comentários limpos.');
        save_store($store);
        json_response(array('ok' => true, 'status' => 'cleared'));
    }

    if ($action === 'update_rating') {
        $ratingId = isset($data['rating_id']) ? intval($data['rating_id']) : 0;
        $ratingValue = isset($data['rating']) ? floatval($data['rating']) : -1;

        $ratingValue = round($ratingValue * 2) / 2;

        if ($ratingId <= 0 || $ratingValue < 0.5 || $ratingValue > 5) {
            json_response(array('ok' => false, 'error' => 'invalid_input', 'message' => 'A avaliação tem de estar entre 0.5 e 5.0 estrelas.'), 400);
        }

        $foundIndex = null;
        foreach ($store['ratings'] as $i => $rating) {
            if (intval($rating['id']) === $ratingId) {
                $foundIndex = $i;
                break;
            }
        }

        if ($foundIndex === null) {
            json_response(array('ok' => false, 'error' => 'rating_not_found', 'message' => 'Avaliação não encontrada.'), 404);
        }

        $store['ratings'][$foundIndex]['rating'] = $ratingValue;
        $store['ratings'][$foundIndex]['updated_at'] = now_iso();
        if (isset($store['ratings'][$foundIndex]['user_id'])) {
            update_user_stats($store, $store['ratings'][$foundIndex]['user_id']);
        }

        log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', 'update_rating', 'rating', $ratingId, strval($ratingValue));
        save_store($store);
        json_response(array('ok' => true, 'rating' => $store['ratings'][$foundIndex]));
    }

    if ($action === 'delete_rating') {
        $ratingId = isset($data['rating_id']) ? intval($data['rating_id']) : 0;
        if ($ratingId <= 0) {
            json_response(array('ok' => false, 'error' => 'invalid_input'), 400);
        }

        $deleted = null;
        $newRatings = array();
        foreach ($store['ratings'] as $rating) {
            if (intval($rating['id']) === $ratingId) {
                $deleted = $rating;
                continue;
            }
            $newRatings[] = $rating;
        }

        if (!$deleted) {
            json_response(array('ok' => false, 'error' => 'rating_not_found', 'message' => 'Avaliação não encontrada.'), 404);
        }

        $store['ratings'] = $newRatings;
        if (isset($deleted['user_id'])) update_user_stats($store, $deleted['user_id']);

        log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', 'delete_rating', 'rating', $ratingId, isset($deleted['media_title']) ? $deleted['media_title'] : '');
        save_store($store);
        json_response(array('ok' => true, 'status' => 'deleted'));
    }

    if ($action === 'delete_movie') {
        $movieId = isset($data['movie_id']) ? intval($data['movie_id']) : 0;
        $mediaType = (isset($data['media_type']) && $data['media_type'] === 'tv') ? 'tv' : 'movie';
        if ($movieId <= 0) {
            json_response(array('ok' => false, 'error' => 'invalid_input', 'message' => 'Filme/série inválido.'), 400);
        }

        $pdo = pdo_db();
        $stmtUsers = $pdo->prepare('SELECT DISTINCT user_id FROM ratings WHERE movie_id = ? AND media_type = ?');
        $stmtUsers->execute(array($movieId, $mediaType));
        $affectedUsers = $stmtUsers->fetchAll(PDO::FETCH_COLUMN);

        $stmtDelete = $pdo->prepare('DELETE FROM ratings WHERE movie_id = ? AND media_type = ?');
        $stmtDelete->execute(array($movieId, $mediaType));
        $deletedRatings = $stmtDelete->rowCount();

        foreach ($affectedUsers as $userId) {
            $ratingsTotalStmt = $pdo->prepare('SELECT COUNT(*), COALESCE(AVG(rating), 0) FROM ratings WHERE user_id = ?');
            $ratingsTotalStmt->execute(array($userId));
            $ratingStats = $ratingsTotalStmt->fetch(PDO::FETCH_NUM);

            $commentsStmt = $pdo->prepare('SELECT COUNT(*) FROM comments WHERE user_id = ?');
            $commentsStmt->execute(array($userId));
            $commentsTotal = intval($commentsStmt->fetchColumn());

            if (table_exists($pdo, 'pending_comments')) {
                $pendingStmt = $pdo->prepare('SELECT COUNT(*) FROM pending_comments WHERE user_id = ?');
                $pendingStmt->execute(array($userId));
                $pendingTotal = intval($pendingStmt->fetchColumn());
            } else {
                $pendingStmt = $pdo->prepare("SELECT COUNT(*) FROM comments WHERE user_id = ? AND status = 'pending'");
                $pendingStmt->execute(array($userId));
                $pendingTotal = intval($pendingStmt->fetchColumn());
            }

            $favoritesStmt = $pdo->prepare('SELECT COUNT(*) FROM favorites WHERE user_id = ?');
            $favoritesStmt->execute(array($userId));
            $favoritesTotal = intval($favoritesStmt->fetchColumn());

            if (table_exists($pdo, 'user_stats')) {
                $stmtStats = $pdo->prepare('INSERT INTO user_stats (user_id, ratings_total, comments_total, pending_comments_total, favorites_total, ratings_avg, movies_watched, movies_rated, comments_posted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE ratings_total = VALUES(ratings_total), comments_total = VALUES(comments_total), pending_comments_total = VALUES(pending_comments_total), favorites_total = VALUES(favorites_total), ratings_avg = VALUES(ratings_avg), movies_watched = VALUES(movies_watched), movies_rated = VALUES(movies_rated), comments_posted = VALUES(comments_posted), updated_at = NOW()');
                $ratingsTotal = intval(isset($ratingStats[0]) ? $ratingStats[0] : 0);
                $ratingsAvg = floatval(isset($ratingStats[1]) ? $ratingStats[1] : 0);
                $stmtStats->execute(array($userId, $ratingsTotal, $commentsTotal, $pendingTotal, $favoritesTotal, $ratingsAvg, $ratingsTotal, $ratingsTotal, $commentsTotal));
            }
        }

        log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', 'delete_movie_from_ratings', 'movie', $mediaType . ':' . $movieId, 'Ratings removidos: ' . $deletedRatings);
        json_response(array('ok' => true, 'status' => 'deleted', 'deleted_ratings' => $deletedRatings));
    }

    if ($action === 'update_movie_title') {
        $movieId = isset($data['movie_id']) ? intval($data['movie_id']) : 0;
        $mediaType = (isset($data['media_type']) && $data['media_type'] === 'tv') ? 'tv' : 'movie';
        $mediaTitle = clean_text(isset($data['media_title']) ? $data['media_title'] : '', 200);

        if ($movieId <= 0 || strlen($mediaTitle) < 2) {
            json_response(array('ok' => false, 'error' => 'invalid_input', 'message' => 'Título inválido.'), 400);
        }

        $pdo = pdo_db();
        $tables = array('ratings', 'comments', 'pending_comments', 'favorites', 'watchlist', 'movie_genres');
        foreach ($tables as $table) {
            if (table_exists($pdo, $table)) {
                $stmt = $pdo->prepare("UPDATE `$table` SET media_title = ? WHERE movie_id = ? AND media_type = ?");
                $stmt->execute(array($mediaTitle, $movieId, $mediaType));
            }
        }

        if (table_exists($pdo, 'custom_catalog')) {
            $stmtCatalog = $pdo->prepare('UPDATE custom_catalog SET title = ?, name = ? WHERE movie_id = ? AND media_type = ?');
            $stmtCatalog->execute(array($mediaTitle, $mediaTitle, $movieId, $mediaType));
        }

        if (table_exists($pdo, 'media_assets')) {
            $stmtAssets = $pdo->prepare('UPDATE media_assets SET media_title = ?, updated_at = NOW() WHERE movie_id = ? AND media_type = ?');
            $stmtAssets->execute(array($mediaTitle, $movieId, $mediaType));
        }

        if (table_exists($pdo, 'movie_genre_links')) {
            $stmtLinks = $pdo->prepare('UPDATE movie_genre_links SET media_title = ?, updated_at = NOW() WHERE movie_id = ? AND media_type = ?');
            $stmtLinks->execute(array($mediaTitle, $movieId, $mediaType));
        }

        log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', 'update_movie_title', 'movie', $mediaType . ':' . $movieId, $mediaTitle);
        json_response(array('ok' => true, 'status' => 'updated', 'movie_id' => $movieId, 'media_type' => $mediaType, 'media_title' => $mediaTitle));
    }

    if ($action === 'delete_comment') {
        $commentId = isset($data['comment_id']) ? intval($data['comment_id']) : 0;
        $list = isset($data['list']) ? $data['list'] : 'approved';
        if ($commentId <= 0) {
            json_response(array('ok' => false, 'error' => 'invalid_input'), 400);
        }

        $deleted = null;

        if ($list === 'pending') {
            $newPending = array();
            foreach ($store['pending_comments'] as $comment) {
                if (intval($comment['id']) === $commentId) {
                    $deleted = $comment;
                    continue;
                }
                $newPending[] = $comment;
            }
            $store['pending_comments'] = $newPending;
        } else {
            $newComments = array();
            foreach ($store['comments'] as $comment) {
                if (intval($comment['id']) === $commentId) {
                    $deleted = $comment;
                    continue;
                }
                $newComments[] = $comment;
            }
            $store['comments'] = $newComments;

            $newVotes = array();
            foreach ($store['comment_votes'] as $vote) {
                if (intval(isset($vote['comment_id']) ? $vote['comment_id'] : 0) !== $commentId) $newVotes[] = $vote;
            }
            $store['comment_votes'] = $newVotes;
        }

        if (!$deleted) {
            json_response(array('ok' => false, 'error' => 'comment_not_found'), 404);
        }

        if (isset($deleted['user_id'])) update_user_stats($store, $deleted['user_id']);
        log_admin_action($store, isset($admin['id']) ? $admin['id'] : 'admin_1', 'delete_comment', 'comment', $commentId, isset($deleted['content']) ? $deleted['content'] : '');
        save_store($store);
        json_response(array('ok' => true, 'status' => 'deleted'));
    }

    json_response(array('ok' => false, 'error' => 'invalid_action'), 400);
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
