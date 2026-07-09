<?php
require_once __DIR__ . '/db.php';

function movings_default_badges() {
    return array(
        array('badge_key' => 'first_rating', 'name' => 'Primeira avaliação', 'description' => 'Avaliaste o teu primeiro filme ou série.', 'icon' => '⭐', 'type' => 'rating', 'category' => 'participacao', 'rarity' => 'common', 'level' => 1, 'xp_reward' => 10, 'points' => 10, 'color' => '#facc15', 'criteria_json' => array('min_ratings' => 1), 'sort_order' => 10, 'requirement_label' => 'Avaliar 1 título', 'unlock_hint' => 'Entra num filme ou série e deixa uma avaliação.', 'is_secret' => 0, 'rarity_weight' => 1),
        array('badge_key' => 'first_comment', 'name' => 'Primeiro comentário', 'description' => 'Tiveste um comentário aprovado pelo admin.', 'icon' => '💬', 'type' => 'comment', 'category' => 'comunidade', 'rarity' => 'common', 'level' => 1, 'xp_reward' => 10, 'points' => 10, 'color' => '#38bdf8', 'criteria_json' => array('min_approved_comments' => 1), 'sort_order' => 20, 'requirement_label' => 'Ter 1 comentário aprovado', 'unlock_hint' => 'Comenta num título e aguarda aprovação.', 'is_secret' => 0, 'rarity_weight' => 1),
        array('badge_key' => 'five_ratings', 'name' => 'Crítico em Aquecimento', 'description' => 'Chegaste às 5 avaliações.', 'icon' => '🎬', 'type' => 'rating', 'category' => 'critica', 'rarity' => 'uncommon', 'level' => 2, 'xp_reward' => 25, 'points' => 25, 'color' => '#a78bfa', 'criteria_json' => array('min_ratings' => 5), 'sort_order' => 30, 'requirement_label' => 'Avaliar 5 títulos', 'unlock_hint' => 'Continua a avaliar filmes e séries.', 'is_secret' => 0, 'rarity_weight' => 2),
        array('badge_key' => 'ten_ratings', 'name' => 'Crítico Movings', 'description' => 'Chegaste às 10 avaliações.', 'icon' => '🍿', 'type' => 'rating', 'category' => 'critica', 'rarity' => 'rare', 'level' => 3, 'xp_reward' => 50, 'points' => 50, 'color' => '#fb7185', 'criteria_json' => array('min_ratings' => 10), 'sort_order' => 40, 'requirement_label' => 'Avaliar 10 títulos', 'unlock_hint' => 'Chega às 10 avaliações.', 'is_secret' => 0, 'rarity_weight' => 3),
        array('badge_key' => 'twenty_five_ratings', 'name' => 'Crítico de Elite', 'description' => 'Chegaste às 25 avaliações registadas.', 'icon' => '🎞️', 'type' => 'rating', 'category' => 'critica', 'rarity' => 'epic', 'level' => 4, 'xp_reward' => 100, 'points' => 100, 'color' => '#f97316', 'criteria_json' => array('min_ratings' => 25), 'sort_order' => 50, 'requirement_label' => 'Avaliar 25 títulos', 'unlock_hint' => 'Mantém o ritmo até às 25 avaliações.', 'is_secret' => 0, 'rarity_weight' => 4),
        array('badge_key' => 'fifty_ratings', 'name' => 'Arquivo Vivo', 'description' => 'Chegaste às 50 avaliações. Isto já é serviço público.', 'icon' => '🏛️', 'type' => 'rating', 'category' => 'critica', 'rarity' => 'legendary', 'level' => 5, 'xp_reward' => 250, 'points' => 250, 'color' => '#f5c518', 'criteria_json' => array('min_ratings' => 50), 'sort_order' => 60, 'requirement_label' => 'Avaliar 50 títulos', 'unlock_hint' => 'Só os teimosos chegam aqui.', 'is_secret' => 0, 'rarity_weight' => 5),
        array('badge_key' => 'five_favorites', 'name' => 'Colecionador', 'description' => 'Adicionaste 5 títulos aos favoritos.', 'icon' => '❤️', 'type' => 'favorite', 'category' => 'colecao', 'rarity' => 'uncommon', 'level' => 2, 'xp_reward' => 25, 'points' => 25, 'color' => '#ef4444', 'criteria_json' => array('min_favorites' => 5), 'sort_order' => 70, 'requirement_label' => 'Adicionar 5 favoritos', 'unlock_hint' => 'Marca os teus favoritos no catálogo.', 'is_secret' => 0, 'rarity_weight' => 2),
        array('badge_key' => 'ten_favorites', 'name' => 'Prateleira Dourada', 'description' => 'Adicionaste 10 títulos aos favoritos.', 'icon' => '💛', 'type' => 'favorite', 'category' => 'colecao', 'rarity' => 'rare', 'level' => 3, 'xp_reward' => 60, 'points' => 60, 'color' => '#eab308', 'criteria_json' => array('min_favorites' => 10), 'sort_order' => 80, 'requirement_label' => 'Adicionar 10 favoritos', 'unlock_hint' => 'Constrói a tua lista de favoritos.', 'is_secret' => 0, 'rarity_weight' => 3),
        array('badge_key' => 'quiz_done', 'name' => 'Perfil Cinemático', 'description' => 'Terminaste o quiz de personalidade.', 'icon' => '🧠', 'type' => 'quiz', 'category' => 'quiz', 'rarity' => 'common', 'level' => 1, 'xp_reward' => 15, 'points' => 15, 'color' => '#22c55e', 'criteria_json' => array('quiz_completed' => true), 'sort_order' => 90, 'requirement_label' => 'Completar o quiz', 'unlock_hint' => 'Vai ao quiz e descobre o teu perfil.', 'is_secret' => 0, 'rarity_weight' => 1),
        array('badge_key' => 'approved_comments_5', 'name' => 'Comentador Ativo', 'description' => 'Tiveste 5 comentários aprovados.', 'icon' => '🗣️', 'type' => 'comment', 'category' => 'comunidade', 'rarity' => 'rare', 'level' => 3, 'xp_reward' => 60, 'points' => 60, 'color' => '#06b6d4', 'criteria_json' => array('min_approved_comments' => 5), 'sort_order' => 100, 'requirement_label' => 'Ter 5 comentários aprovados', 'unlock_hint' => 'Continua a comentar com qualidade.', 'is_secret' => 0, 'rarity_weight' => 3),
        array('badge_key' => 'approved_comments_10', 'name' => 'Voz da Comunidade', 'description' => 'Tiveste 10 comentários aprovados.', 'icon' => '📣', 'type' => 'comment', 'category' => 'comunidade', 'rarity' => 'epic', 'level' => 4, 'xp_reward' => 120, 'points' => 120, 'color' => '#0ea5e9', 'criteria_json' => array('min_approved_comments' => 10), 'sort_order' => 110, 'requirement_label' => 'Ter 10 comentários aprovados', 'unlock_hint' => 'A comunidade precisa das tuas opiniões questionáveis.', 'is_secret' => 0, 'rarity_weight' => 4),
        array('badge_key' => 'helpful_voter', 'name' => 'Juiz dos Comentários', 'description' => 'Deste like ou dislike num comentário.', 'icon' => '⚖️', 'type' => 'vote', 'category' => 'comunidade', 'rarity' => 'common', 'level' => 1, 'xp_reward' => 10, 'points' => 10, 'color' => '#94a3b8', 'criteria_json' => array('min_comment_votes' => 1), 'sort_order' => 120, 'requirement_label' => 'Votar em 1 comentário', 'unlock_hint' => 'Dá like ou dislike num comentário.', 'is_secret' => 0, 'rarity_weight' => 1),
        array('badge_key' => 'genre_explorer', 'name' => 'Explorador de Géneros', 'description' => 'Interagiste com vários géneros diferentes.', 'icon' => '🧭', 'type' => 'genre', 'category' => 'exploracao', 'rarity' => 'rare', 'level' => 3, 'xp_reward' => 75, 'points' => 75, 'color' => '#14b8a6', 'criteria_json' => array('min_unique_genres' => 5), 'sort_order' => 130, 'requirement_label' => 'Interagir com 5 géneros', 'unlock_hint' => 'Avalia e guarda títulos de géneros diferentes.', 'is_secret' => 0, 'rarity_weight' => 3),
        array('badge_key' => 'balanced_user', 'name' => 'Movinger Completo', 'description' => 'Tens avaliações, comentários, favoritos e quiz registados.', 'icon' => '🏆', 'type' => 'mixed', 'category' => 'especial', 'rarity' => 'epic', 'level' => 4, 'xp_reward' => 120, 'points' => 120, 'color' => '#f97316', 'criteria_json' => array('min_ratings' => 1, 'min_approved_comments' => 1, 'min_favorites' => 1, 'quiz_completed' => true), 'sort_order' => 140, 'requirement_label' => 'Avaliar, comentar, favoritar e completar quiz', 'unlock_hint' => 'Usa todas as áreas principais do Movings.', 'is_secret' => 0, 'rarity_weight' => 4),
        array('badge_key' => 'legend_movings', 'name' => 'Lenda Movings', 'description' => 'Um perfil completo com atividade forte em todas as áreas.', 'icon' => '👑', 'type' => 'mixed', 'category' => 'especial', 'rarity' => 'legendary', 'level' => 5, 'xp_reward' => 300, 'points' => 300, 'color' => '#f5c518', 'criteria_json' => array('min_ratings' => 50, 'min_approved_comments' => 10, 'min_favorites' => 10, 'quiz_completed' => true), 'sort_order' => 150, 'requirement_label' => '50 avaliações, 10 comentários, 10 favoritos e quiz', 'unlock_hint' => 'Badge lendária para quem praticamente mora no Movings.', 'is_secret' => 0, 'rarity_weight' => 5)
    );
}

function seed_movings_badges(&$store) {
    $defaults = movings_default_badges();
    foreach ($defaults as $badge) {
        $found = false;
        foreach ($store['badges'] as &$existing) {
            if (isset($existing['badge_key']) && $existing['badge_key'] === $badge['badge_key']) {
                $existing = array_merge($existing, $badge, array(
                    'id' => isset($existing['id']) ? $existing['id'] : next_id($store, 'badge'),
                    'active' => true,
                    'created_at' => isset($existing['created_at']) ? $existing['created_at'] : now_iso(),
                    'updated_at' => now_iso()
                ));
                $found = true;
                break;
            }
        }
        unset($existing);
        if (!$found) {
            $badge['id'] = next_id($store, 'badge');
            $badge['active'] = true;
            $badge['created_at'] = now_iso();
            $badge['updated_at'] = now_iso();
            $store['badges'][] = $badge;
        }
    }
}

try {
    $store = load_store();
    seed_movings_badges($store);
    save_store($store);
    json_response(array('ok' => true, 'rows' => array_values($store['badges'])));
} catch (Throwable $e) {
    json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500);
}
?>
