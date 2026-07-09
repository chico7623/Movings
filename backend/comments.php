<?php
require_once __DIR__ . '/db.php';

// Endpoint de comentários.
// Cria comentários pendentes, lista apenas comentários aprovados e permite editar
// comentários próprios. Edições feitas por utilizadores voltam para aprovação do admin.

try {
    $store = load_store();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $movieId = isset($_GET['movie_id']) ? intval($_GET['movie_id']) : 0;
        $mediaType = isset($_GET['media_type']) && $_GET['media_type'] === 'tv' ? 'tv' : 'movie';
        $rows = array();
        foreach ($store['comments'] as $comment) {
            $rowType = isset($comment['media_type']) && $comment['media_type'] === 'tv' ? 'tv' : 'movie';
            if (intval($comment['movie_id']) === $movieId && $rowType === $mediaType && (!isset($comment['status']) || $comment['status'] === 'approved')) {
                $rows[] = $comment;
            }
        }
        $rows = decorated_media_rows($store, $rows);
        usort($rows, function($a, $b) { return strcmp($b['created_at'], $a['created_at']); });
        json_response(array('ok' => true, 'rows' => array_values($rows)));
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    }

    $data = read_json_body();
    $action = isset($data['action']) ? trim((string)$data['action']) : 'create';

    if ($action === 'update') {
        $currentUser = require_user_from_store($store);
        $commentId = isset($data['comment_id']) ? intval($data['comment_id']) : (isset($data['id']) ? intval($data['id']) : 0);
        $content = isset($data['content']) ? clean_text($data['content'], 2000) : '';
        $isSpoiler = !empty($data['is_spoiler']);

        if ($commentId <= 0 || text_length($content) < 2) {
            json_response(array('ok' => false, 'error' => 'invalid_input', 'message' => 'Comentário inválido.'), 400);
        }

        $foundIndex = null;
        foreach ($store['comments'] as $i => $existingComment) {
            if (intval($existingComment['id']) === $commentId) {
                $foundIndex = $i;
                break;
            }
        }

        if ($foundIndex === null) {
            json_response(array('ok' => false, 'error' => 'comment_not_found', 'message' => 'Comentário não encontrado ou ainda pendente de aprovação.'), 404);
        }

        $commentOwnerId = isset($store['comments'][$foundIndex]['user_id']) ? (string)$store['comments'][$foundIndex]['user_id'] : '';
        $commentOwnerUsername = isset($store['comments'][$foundIndex]['username']) ? (string)$store['comments'][$foundIndex]['username'] : '';
        $currentUserId = isset($currentUser['id']) ? (string)$currentUser['id'] : '';
        $currentUsername = isset($currentUser['username']) ? (string)$currentUser['username'] : '';
        $currentRole = isset($currentUser['role']) ? (string)$currentUser['role'] : 'user';

        $ownsById = $commentOwnerId !== '' && $currentUserId !== '' && hash_equals($commentOwnerId, $currentUserId);
        $ownsByUsername = $commentOwnerUsername !== '' && $currentUsername !== '' && norm_username($commentOwnerUsername) === norm_username($currentUsername);

        if ($currentRole !== 'admin' && !$ownsById && !$ownsByUsername) {
            json_response(array('ok' => false, 'error' => 'forbidden', 'message' => 'Só podes editar os teus próprios comentários.'), 403);
        }

        // Compatibilidade com comentários antigos da PAP: se o username confirma autoria,
        // repara o user_id para que a UI passe a reconhecer o dono pelo id real da sessão.
        if ($ownsByUsername && $currentUserId !== '') {
            $store['comments'][$foundIndex]['user_id'] = $currentUserId;
        }

        // Moderação correta para a PAP:
        // - O admin pode corrigir um comentário diretamente e mantê-lo aprovado.
        // - Um utilizador normal, ao editar um comentário já aprovado, não deve conseguir
        //   publicar imediatamente texto novo sem validação. A alteração fica como revisão
        //   pendente, para o admin aprovar ou rejeitar.
        if ($currentRole === 'admin') {
            $store['comments'][$foundIndex]['content'] = $content;
            $store['comments'][$foundIndex]['is_spoiler'] = $isSpoiler;
            $store['comments'][$foundIndex]['status'] = 'approved';
            $store['comments'][$foundIndex]['edited_at'] = now_iso();

            if ($currentUserId !== '') {
                update_user_stats($store, $currentUserId);
            }

            save_store($store);
            json_response(array(
                'ok' => true,
                'pending_review' => false,
                'message' => 'Comentário atualizado pelo admin.',
                'comment' => $store['comments'][$foundIndex]
            ));
        }

        // Remove revisões pendentes antigas do mesmo comentário para evitar duplicados no admin.
        $nextPendingComments = array();
        foreach ($store['pending_comments'] as $pendingComment) {
            $originalId = isset($pendingComment['original_comment_id']) ? intval($pendingComment['original_comment_id']) : 0;
            if ($originalId !== $commentId) {
                $nextPendingComments[] = $pendingComment;
            }
        }
        $store['pending_comments'] = $nextPendingComments;

        $revision = $store['comments'][$foundIndex];
        $revision['id'] = next_id($store, table_exists(pdo_db(), 'pending_comments') ? 'pending_comment' : 'comment');
        $revision['original_comment_id'] = $commentId;
        $revision['original_created_at'] = isset($store['comments'][$foundIndex]['created_at']) ? $store['comments'][$foundIndex]['created_at'] : null;
        $revision['content'] = $content;
        $revision['is_spoiler'] = $isSpoiler;
        $revision['status'] = 'pending';
        $revision['created_at'] = now_iso();
        $revision['edited_at'] = now_iso();
        $revision['approved_at'] = null;
        $revision['likes'] = isset($store['comments'][$foundIndex]['likes']) ? intval($store['comments'][$foundIndex]['likes']) : 0;
        $revision['dislikes'] = isset($store['comments'][$foundIndex]['dislikes']) ? intval($store['comments'][$foundIndex]['dislikes']) : 0;

        $store['pending_comments'][] = $revision;

        if ($currentUserId !== '') {
            update_user_stats($store, $currentUserId);
        }

        save_store($store);
        json_response(array(
            'ok' => true,
            'pending_review' => true,
            'message' => 'A alteração foi enviada para aprovação do admin.',
            'comment' => $revision
        ));
    }

    if ($action !== 'create' && $action !== 'add') {
        json_response(array('ok' => false, 'error' => 'invalid_action'), 400);
    }

    $providedUserId = isset($data['user_id']) ? clean_text($data['user_id'], 80) : '';
    $userId = authenticated_user_id($store, $providedUserId);
    $currentUser = find_user_by_id($store, $userId);
    $movieId = isset($data['movie_id']) ? intval($data['movie_id']) : 0;
    $mediaType = isset($data['media_type']) && $data['media_type'] === 'tv' ? 'tv' : 'movie';
    $username = $currentUser && isset($currentUser['username']) ? clean_text($currentUser['username'], 120) : 'Utilizador';
    $mediaTitle = resolve_media_title($store, $movieId, $mediaType, isset($data['media_title']) ? clean_text($data['media_title'], 200) : (isset($data['title']) ? clean_text($data['title'], 200) : ''));
    $content = isset($data['content']) ? clean_text($data['content'], 2000) : '';
    $parentId = isset($data['parent_id']) && $data['parent_id'] !== '' ? intval($data['parent_id']) : null;
    $isSpoiler = !empty($data['is_spoiler']);

    if ($userId === '' || $movieId <= 0 || $content === '') {
        json_response(array('ok' => false, 'error' => 'missing_fields'), 400);
    }

    $pendingIdKey = table_exists(pdo_db(), 'pending_comments') ? 'pending_comment' : 'comment';
    $pending = array(
        'id' => next_id($store, $pendingIdKey),
        'user_id' => $userId,
        'movie_id' => $movieId,
        'media_type' => $mediaType,
        'username' => $username,
        'media_title' => $mediaTitle,
        'content' => $content,
        'is_spoiler' => $isSpoiler,
        'parent_id' => $parentId,
        'status' => 'pending',
        'created_at' => now_iso()
    );
    $store['pending_comments'][] = $pending;
    update_user_stats($store, $userId);
    save_store($store);
    json_response(array('ok' => true, 'pending' => true, 'message' => 'Comentário enviado para aprovação do admin.'));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
