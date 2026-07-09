CREATE DATABASE IF NOT EXISTS movings CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE movings;

CREATE TABLE IF NOT EXISTS app_next_ids (
  name VARCHAR(64) NOT NULL PRIMARY KEY,
  next_value INT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NULL,
  username VARCHAR(120) NOT NULL,
  username_norm VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'user',
  blocked TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  UNIQUE KEY uniq_username_norm (username_norm),
  KEY idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ratings (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL,
  username VARCHAR(120) NULL,
  movie_id INT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  media_title VARCHAR(200) NULL,
  rating DECIMAL(3,1) NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_user_media_rating (user_id, movie_id, media_type),
  KEY idx_media (movie_id, media_type),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL,
  username VARCHAR(120) NULL,
  movie_id INT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  media_title VARCHAR(200) NULL,
  content TEXT NOT NULL,
  is_spoiler TINYINT(1) NOT NULL DEFAULT 0,
  parent_id INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'approved',
  likes INT NOT NULL DEFAULT 0,
  dislikes INT NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  approved_at DATETIME NULL,
  original_comment_id INT NULL,
  edited_at DATETIME NULL,
  KEY idx_media (movie_id, media_type),
  KEY idx_user (user_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pending_comments (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL,
  username VARCHAR(120) NULL,
  movie_id INT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  media_title VARCHAR(200) NULL,
  content TEXT NOT NULL,
  is_spoiler TINYINT(1) NOT NULL DEFAULT 0,
  parent_id INT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  likes INT NOT NULL DEFAULT 0,
  dislikes INT NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  approved_at DATETIME NULL,
  original_comment_id INT NULL,
  edited_at DATETIME NULL,
  KEY idx_media (movie_id, media_type),
  KEY idx_user (user_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorites (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL,
  movie_id INT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  media_title VARCHAR(200) NULL,
  created_at DATETIME NULL,
  UNIQUE KEY uniq_user_media_favorite (user_id, movie_id, media_type),
  KEY idx_user (user_id),
  KEY idx_media (movie_id, media_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS watchlist (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL,
  movie_id INT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  media_title VARCHAR(200) NULL,
  created_at DATETIME NULL,
  UNIQUE KEY uniq_user_media_watchlist (user_id, movie_id, media_type),
  KEY idx_user (user_id),
  KEY idx_media (movie_id, media_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comment_votes (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL,
  comment_id INT UNSIGNED NOT NULL,
  vote_type VARCHAR(20) NOT NULL DEFAULT 'like',
  created_at DATETIME NULL,
  UNIQUE KEY uniq_user_comment_vote (user_id, comment_id),
  KEY idx_comment (comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id INT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  media_title VARCHAR(200) NULL,
  genre_ids LONGTEXT NULL,
  genre_names LONGTEXT NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY (movie_id, media_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_favorite_genre (
  user_id VARCHAR(80) NOT NULL PRIMARY KEY,
  genre_id INT NULL,
  genre_name VARCHAR(120) NULL,
  score DECIMAL(10,2) NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'auto',
  created_at DATETIME NULL,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_stats (
  user_id VARCHAR(80) NOT NULL PRIMARY KEY,
  ratings_total INT NOT NULL DEFAULT 0,
  comments_total INT NOT NULL DEFAULT 0,
  pending_comments_total INT NOT NULL DEFAULT 0,
  favorites_total INT NOT NULL DEFAULT 0,
  ratings_avg DECIMAL(4,2) NOT NULL DEFAULT 0,
  movies_watched INT NOT NULL DEFAULT 0,
  movies_rated INT NOT NULL DEFAULT 0,
  comments_posted INT NOT NULL DEFAULT 0,
  favorite_genre_id INT NULL,
  favorite_genre_name VARCHAR(120) NULL,
  top_genre_id INT NULL,
  top_genre_name VARCHAR(120) NULL,
  genre_distribution LONGTEXT NULL,
  genre_distribution_labels LONGTEXT NULL,
  genre_distribution_rows LONGTEXT NULL,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_requests (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL,
  username VARCHAR(120) NULL,
  title VARCHAR(160) NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  note TEXT NULL,
  poster_url VARCHAR(500) NULL,
  trailer_url VARCHAR(500) NULL,
  synopsis TEXT NULL,
  admin_note TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  completed_at DATETIME NULL,
  KEY idx_user (user_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS custom_catalog (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  movie_id INT NOT NULL,
  title VARCHAR(200) NULL,
  name VARCHAR(200) NULL,
  poster_path VARCHAR(500) NULL,
  backdrop_path VARCHAR(500) NULL,
  trailer_url VARCHAR(500) NULL,
  overview TEXT NULL,
  vote_average DECIMAL(4,2) NOT NULL DEFAULT 0,
  vote_count INT NOT NULL DEFAULT 0,
  release_date VARCHAR(30) NULL,
  first_air_date VARCHAR(30) NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  genre_ids LONGTEXT NULL,
  popularity DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS badges (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  badge_key VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(20) NULL,
  type VARCHAR(40) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NULL,
  UNIQUE KEY uniq_badge_key (badge_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_badges (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL,
  badge_key VARCHAR(80) NOT NULL,
  awarded_at DATETIME NULL,
  UNIQUE KEY uniq_user_badge (user_id, badge_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_results (
  user_id VARCHAR(80) NOT NULL PRIMARY KEY,
  result_key VARCHAR(80) NULL,
  result_label VARCHAR(200) NULL,
  result_desc TEXT NULL,
  created_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_logs (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  admin_id VARCHAR(80) NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(80) NULL,
  target_id VARCHAR(120) NULL,
  details TEXT NULL,
  created_at DATETIME NULL,
  KEY idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE movings;

USE movings;

-- =========================================================
-- MOVINGS FINAL UPGRADE
-- Imagens, deduplicação, media_assets, movie_genres melhorado,
-- usernames visíveis e badges mais completas.
-- Seguro para correr numa BD existente sem apagar dados.
-- =========================================================

CREATE TABLE IF NOT EXISTS media_assets (
  movie_id INT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  media_title VARCHAR(200) NOT NULL,
  poster_path VARCHAR(500) NULL,
  backdrop_path VARCHAR(500) NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY (movie_id, media_type),
  KEY idx_media_title (media_title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_genre_links (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  movie_id INT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
  media_title VARCHAR(200) NULL,
  genre_id INT NOT NULL,
  genre_name VARCHAR(120) NULL,
  created_at DATETIME NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_media_genre (movie_id, media_type, genre_id),
  KEY idx_media (movie_id, media_type),
  KEY idx_genre (genre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_col_if_missing $$
CREATE PROCEDURE add_col_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

CALL add_col_if_missing('favorites', 'username', 'VARCHAR(120) NULL AFTER `user_id`');
CALL add_col_if_missing('quiz_results', 'username', 'VARCHAR(120) NULL AFTER `user_id`');

CALL add_col_if_missing('comment_votes', 'voter_username', 'VARCHAR(120) NULL AFTER `user_id`');
CALL add_col_if_missing('comment_votes', 'comment_author_id', 'VARCHAR(80) NULL AFTER `comment_id`');
CALL add_col_if_missing('comment_votes', 'comment_author_username', 'VARCHAR(120) NULL AFTER `comment_author_id`');
CALL add_col_if_missing('comment_votes', 'comment_movie_id', 'INT NULL AFTER `comment_author_username`');
CALL add_col_if_missing('comment_votes', 'comment_media_type', 'VARCHAR(20) NULL AFTER `comment_movie_id`');
CALL add_col_if_missing('comment_votes', 'comment_media_title', 'VARCHAR(200) NULL AFTER `comment_media_type`');

CALL add_col_if_missing('movie_genres', 'genre_count', 'INT NOT NULL DEFAULT 0 AFTER `genre_names`');
CALL add_col_if_missing('movie_genres', 'main_genre_id', 'INT NULL AFTER `genre_count`');
CALL add_col_if_missing('movie_genres', 'main_genre_name', 'VARCHAR(120) NULL AFTER `main_genre_id`');

ALTER TABLE badges MODIFY COLUMN icon VARCHAR(40) NULL;
CALL add_col_if_missing('badges', 'category', 'VARCHAR(60) NOT NULL DEFAULT ''general'' AFTER `type`');
CALL add_col_if_missing('badges', 'rarity', 'VARCHAR(30) NOT NULL DEFAULT ''common'' AFTER `category`');
CALL add_col_if_missing('badges', 'level', 'INT NOT NULL DEFAULT 1 AFTER `rarity`');
CALL add_col_if_missing('badges', 'xp_reward', 'INT NOT NULL DEFAULT 0 AFTER `level`');
CALL add_col_if_missing('badges', 'points', 'INT NOT NULL DEFAULT 0 AFTER `xp_reward`');
CALL add_col_if_missing('badges', 'color', 'VARCHAR(30) NULL AFTER `points`');
CALL add_col_if_missing('badges', 'criteria_json', 'JSON NULL AFTER `color`');
CALL add_col_if_missing('badges', 'sort_order', 'INT NOT NULL DEFAULT 0 AFTER `criteria_json`');
CALL add_col_if_missing('badges', 'updated_at', 'DATETIME NULL AFTER `created_at`');

DROP PROCEDURE IF EXISTS add_col_if_missing;

-- Imagens finais usadas pelo catálogo local e pela API.
INSERT INTO media_assets (movie_id, media_type, media_title, poster_path, backdrop_path, updated_at) VALUES
(800001, 'movie', 'Matrix', 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', 'https://image.tmdb.org/t/p/w1280/icmmSD4vTTDKOq2vvdulafOGw93.jpg', NOW()),
(800002, 'movie', 'Clube de Combate', 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 'https://image.tmdb.org/t/p/w1280/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', NOW()),
(800003, 'movie', 'Pulp Fiction', 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', 'https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2P4Vxx.jpg', NOW()),
(800004, 'movie', 'Tudo Bons Rapazes', 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', 'https://image.tmdb.org/t/p/w1280/sw7mordbZxgITU877yTpZCud90M.jpg', NOW()),
(60059, 'tv', 'Better Call Saul', 'https://image.tmdb.org/t/p/w500/tFCPd8nOqrxjKpTs0ZAdPRydQFR.jpg', 'https://image.tmdb.org/t/p/w1280/t15KHp3iNfHVQBNIaqUGW12xQA4.jpg', NOW()),
(810001, 'tv', 'The Mandalorian', 'https://image.tmdb.org/t/p/w500/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg', 'https://image.tmdb.org/t/p/w1280/o7qi2v4uWQ8bZ1tW3KI0Ztn2epk.jpg', NOW()),
(810002, 'tv', 'House of the Dragon', 'https://image.tmdb.org/t/p/w500/z2yahl2uefxDCl0nogcRBstwruJ.jpg', 'https://image.tmdb.org/t/p/w1280/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg', NOW()),
(810003, 'tv', 'Breaking Bad', 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', 'https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', NOW()),
(810004, 'tv', 'Peaky Blinders', 'https://image.tmdb.org/t/p/w500/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg', 'https://image.tmdb.org/t/p/w1280/bGksau9GGu0uJ8DJQ8DYc9JW5LM.jpg', NOW())
ON DUPLICATE KEY UPDATE
  media_title = VALUES(media_title),
  poster_path = VALUES(poster_path),
  backdrop_path = VALUES(backdrop_path),
  updated_at = NOW();

-- O id 810003 deixou de ser Better Call Saul e passou a Breaking Bad no catálogo local.
DELETE FROM media_assets
WHERE movie_id = 810003
  AND media_type = 'tv'
  AND LOWER(media_title) = 'better call saul';

-- Remove Better Call Saul adicionado manualmente ao catálogo extra, porque já existe no catálogo base.
DELETE FROM custom_catalog
WHERE media_type = 'tv'
  AND LOWER(COALESCE(title, name, '')) = 'better call saul';

-- Remove duplicados internos do catálogo extra.
DELETE c1 FROM custom_catalog c1
JOIN custom_catalog c2
  ON LOWER(COALESCE(c1.title, c1.name, '')) = LOWER(COALESCE(c2.title, c2.name, ''))
 AND c1.media_type = c2.media_type
 AND c1.id > c2.id;

-- Atualiza nomes visíveis nas tabelas antigas já existentes.
UPDATE quiz_results qr
LEFT JOIN users u ON u.id = qr.user_id
SET qr.username = COALESCE(u.username, qr.user_id)
WHERE qr.username IS NULL OR qr.username = '';

UPDATE favorites f
LEFT JOIN users u ON u.id = f.user_id
SET f.username = COALESCE(u.username, f.user_id)
WHERE f.username IS NULL OR f.username = '';

UPDATE comment_votes cv
LEFT JOIN users voter ON voter.id = cv.user_id
LEFT JOIN comments c ON c.id = cv.comment_id
LEFT JOIN users author ON author.id = c.user_id
SET
  cv.voter_username = COALESCE(voter.username, cv.user_id),
  cv.comment_author_id = c.user_id,
  cv.comment_author_username = COALESCE(author.username, c.username, c.user_id),
  cv.comment_movie_id = c.movie_id,
  cv.comment_media_type = c.media_type,
  cv.comment_media_title = c.media_title
WHERE cv.comment_id IS NOT NULL;

UPDATE movie_genres
SET
  genre_count = CASE WHEN JSON_VALID(genre_ids) THEN JSON_LENGTH(genre_ids) ELSE 0 END,
  main_genre_id = CASE WHEN JSON_VALID(genre_ids) AND JSON_LENGTH(genre_ids) > 0 THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(genre_ids, '$[0]')) AS UNSIGNED) ELSE NULL END,
  main_genre_name = CASE WHEN JSON_VALID(genre_names) AND JSON_LENGTH(genre_names) > 0 THEN JSON_UNQUOTE(JSON_EXTRACT(genre_names, '$[0]')) ELSE NULL END;

DELETE FROM movie_genre_links;

INSERT INTO movie_genre_links (movie_id, media_type, media_title, genre_id, genre_name, created_at, updated_at)
SELECT
  mg.movie_id,
  mg.media_type,
  mg.media_title,
  CAST(j.genre_id AS UNSIGNED) AS genre_id,
  CASE WHEN JSON_VALID(mg.genre_names) THEN JSON_UNQUOTE(JSON_EXTRACT(mg.genre_names, CONCAT('$[', j.ord - 1, ']'))) ELSE NULL END AS genre_name,
  COALESCE(mg.created_at, NOW()),
  NOW()
FROM movie_genres mg
JOIN JSON_TABLE(
  CASE WHEN JSON_VALID(mg.genre_ids) THEN mg.genre_ids ELSE JSON_ARRAY() END,
  '$[*]' COLUMNS (
    ord FOR ORDINALITY,
    genre_id VARCHAR(20) PATH '$'
  )
) AS j;

-- Badges finais.
INSERT INTO badges (id, badge_key, name, description, icon, type, category, rarity, level, xp_reward, points, color, criteria_json, sort_order, active, created_at, updated_at) VALUES
(1, 'first_rating', 'Primeira avaliação', 'Avaliaste o teu primeiro filme ou série.', '⭐', 'rating', 'participacao', 'common', 1, 10, 10, '#facc15', '{"min_ratings":1}', 10, 1, NOW(), NOW()),
(2, 'first_comment', 'Primeiro comentário', 'Tiveste um comentário aprovado pelo admin.', '💬', 'comment', 'comunidade', 'common', 1, 10, 10, '#38bdf8', '{"min_approved_comments":1}', 20, 1, NOW(), NOW()),
(3, 'five_ratings', 'Crítico em Aquecimento', 'Chegaste às 5 avaliações.', '🎬', 'rating', 'critica', 'uncommon', 2, 25, 25, '#a78bfa', '{"min_ratings":5}', 30, 1, NOW(), NOW()),
(4, 'ten_ratings', 'Crítico Movings', 'Chegaste às 10 avaliações.', '🍿', 'rating', 'critica', 'rare', 3, 50, 50, '#fb7185', '{"min_ratings":10}', 40, 1, NOW(), NOW()),
(5, 'five_favorites', 'Colecionador', 'Adicionaste 5 títulos aos favoritos.', '❤️', 'favorite', 'colecao', 'uncommon', 2, 25, 25, '#ef4444', '{"min_favorites":5}', 50, 1, NOW(), NOW()),
(6, 'quiz_done', 'Perfil Cinemático', 'Terminaste o quiz de personalidade.', '🧠', 'quiz', 'quiz', 'common', 1, 15, 15, '#22c55e', '{"quiz_completed":true}', 60, 1, NOW(), NOW()),
(7, 'approved_comments_5', 'Comentador Ativo', 'Tiveste 5 comentários aprovados.', '🗣️', 'comment', 'comunidade', 'rare', 3, 60, 60, '#06b6d4', '{"min_approved_comments":5}', 70, 1, NOW(), NOW()),
(8, 'balanced_user', 'Movinger Completo', 'Tens avaliações, comentários, favoritos e quiz registados.', '🏆', 'mixed', 'especial', 'epic', 4, 120, 120, '#f97316', '{"min_ratings":1,"min_approved_comments":1,"min_favorites":1,"quiz_completed":true}', 80, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  icon = VALUES(icon),
  type = VALUES(type),
  category = VALUES(category),
  rarity = VALUES(rarity),
  level = VALUES(level),
  xp_reward = VALUES(xp_reward),
  points = VALUES(points),
  color = VALUES(color),
  criteria_json = VALUES(criteria_json),
  sort_order = VALUES(sort_order),
  active = VALUES(active),
  updated_at = NOW();

DELIMITER $$

DROP TRIGGER IF EXISTS trg_quiz_results_bi $$
CREATE TRIGGER trg_quiz_results_bi
BEFORE INSERT ON quiz_results
FOR EACH ROW
BEGIN
  SET NEW.username = COALESCE(NEW.username, (SELECT username FROM users WHERE id = NEW.user_id LIMIT 1), NEW.user_id);
END $$

DROP TRIGGER IF EXISTS trg_quiz_results_bu $$
CREATE TRIGGER trg_quiz_results_bu
BEFORE UPDATE ON quiz_results
FOR EACH ROW
BEGIN
  SET NEW.username = COALESCE(NEW.username, (SELECT username FROM users WHERE id = NEW.user_id LIMIT 1), NEW.user_id);
END $$

DROP TRIGGER IF EXISTS trg_favorites_bi $$
CREATE TRIGGER trg_favorites_bi
BEFORE INSERT ON favorites
FOR EACH ROW
BEGIN
  SET NEW.username = COALESCE(NEW.username, (SELECT username FROM users WHERE id = NEW.user_id LIMIT 1), NEW.user_id);
END $$

DROP TRIGGER IF EXISTS trg_favorites_bu $$
CREATE TRIGGER trg_favorites_bu
BEFORE UPDATE ON favorites
FOR EACH ROW
BEGIN
  SET NEW.username = COALESCE(NEW.username, (SELECT username FROM users WHERE id = NEW.user_id LIMIT 1), NEW.user_id);
END $$

DROP TRIGGER IF EXISTS trg_comment_votes_bi $$
CREATE TRIGGER trg_comment_votes_bi
BEFORE INSERT ON comment_votes
FOR EACH ROW
BEGIN
  SET NEW.voter_username = COALESCE(NEW.voter_username, (SELECT username FROM users WHERE id = NEW.user_id LIMIT 1), NEW.user_id);
  SET NEW.comment_author_id = COALESCE(NEW.comment_author_id, (SELECT user_id FROM comments WHERE id = NEW.comment_id LIMIT 1));
  SET NEW.comment_author_username = COALESCE(NEW.comment_author_username, (SELECT COALESCE(u.username, c.username, c.user_id) FROM comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = NEW.comment_id LIMIT 1));
  SET NEW.comment_movie_id = COALESCE(NEW.comment_movie_id, (SELECT movie_id FROM comments WHERE id = NEW.comment_id LIMIT 1));
  SET NEW.comment_media_type = COALESCE(NEW.comment_media_type, (SELECT media_type FROM comments WHERE id = NEW.comment_id LIMIT 1));
  SET NEW.comment_media_title = COALESCE(NEW.comment_media_title, (SELECT media_title FROM comments WHERE id = NEW.comment_id LIMIT 1));
END $$

DROP TRIGGER IF EXISTS trg_comment_votes_bu $$
CREATE TRIGGER trg_comment_votes_bu
BEFORE UPDATE ON comment_votes
FOR EACH ROW
BEGIN
  SET NEW.voter_username = COALESCE(NEW.voter_username, (SELECT username FROM users WHERE id = NEW.user_id LIMIT 1), NEW.user_id);
  SET NEW.comment_author_id = COALESCE(NEW.comment_author_id, (SELECT user_id FROM comments WHERE id = NEW.comment_id LIMIT 1));
  SET NEW.comment_author_username = COALESCE(NEW.comment_author_username, (SELECT COALESCE(u.username, c.username, c.user_id) FROM comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = NEW.comment_id LIMIT 1));
  SET NEW.comment_movie_id = COALESCE(NEW.comment_movie_id, (SELECT movie_id FROM comments WHERE id = NEW.comment_id LIMIT 1));
  SET NEW.comment_media_type = COALESCE(NEW.comment_media_type, (SELECT media_type FROM comments WHERE id = NEW.comment_id LIMIT 1));
  SET NEW.comment_media_title = COALESCE(NEW.comment_media_title, (SELECT media_title FROM comments WHERE id = NEW.comment_id LIMIT 1));
END $$

DROP TRIGGER IF EXISTS trg_movie_genres_ai $$
CREATE TRIGGER trg_movie_genres_ai
AFTER INSERT ON movie_genres
FOR EACH ROW
BEGIN
  DELETE FROM movie_genre_links WHERE movie_id = NEW.movie_id AND media_type = NEW.media_type;
  INSERT INTO movie_genre_links (movie_id, media_type, media_title, genre_id, genre_name, created_at, updated_at)
  SELECT NEW.movie_id, NEW.media_type, NEW.media_title, CAST(j.genre_id AS UNSIGNED),
         CASE WHEN JSON_VALID(NEW.genre_names) THEN JSON_UNQUOTE(JSON_EXTRACT(NEW.genre_names, CONCAT('$[', j.ord - 1, ']'))) ELSE NULL END,
         COALESCE(NEW.created_at, NOW()), NOW()
  FROM JSON_TABLE(CASE WHEN JSON_VALID(NEW.genre_ids) THEN NEW.genre_ids ELSE JSON_ARRAY() END, '$[*]' COLUMNS (ord FOR ORDINALITY, genre_id VARCHAR(20) PATH '$')) AS j;
END $$

DROP TRIGGER IF EXISTS trg_movie_genres_au $$
CREATE TRIGGER trg_movie_genres_au
AFTER UPDATE ON movie_genres
FOR EACH ROW
BEGIN
  DELETE FROM movie_genre_links WHERE movie_id = NEW.movie_id AND media_type = NEW.media_type;
  INSERT INTO movie_genre_links (movie_id, media_type, media_title, genre_id, genre_name, created_at, updated_at)
  SELECT NEW.movie_id, NEW.media_type, NEW.media_title, CAST(j.genre_id AS UNSIGNED),
         CASE WHEN JSON_VALID(NEW.genre_names) THEN JSON_UNQUOTE(JSON_EXTRACT(NEW.genre_names, CONCAT('$[', j.ord - 1, ']'))) ELSE NULL END,
         COALESCE(NEW.created_at, NOW()), NOW()
  FROM JSON_TABLE(CASE WHEN JSON_VALID(NEW.genre_ids) THEN NEW.genre_ids ELSE JSON_ARRAY() END, '$[*]' COLUMNS (ord FOR ORDINALITY, genre_id VARCHAR(20) PATH '$')) AS j;
END $$

DELIMITER ;

CREATE OR REPLACE VIEW v_quiz_results AS
SELECT qr.user_id, COALESCE(qr.username, u.username, qr.user_id) AS username, qr.result_key, qr.result_label, qr.result_desc, qr.created_at
FROM quiz_results qr
LEFT JOIN users u ON u.id = qr.user_id;

CREATE OR REPLACE VIEW v_favorites AS
SELECT f.id, f.user_id, COALESCE(f.username, u.username, f.user_id) AS username, f.movie_id, f.media_type, f.media_title, f.created_at
FROM favorites f
LEFT JOIN users u ON u.id = f.user_id;

CREATE OR REPLACE VIEW v_watchlist AS
SELECT w.id, w.user_id, COALESCE(u.username, w.user_id) AS username, w.movie_id, w.media_type, w.media_title, w.created_at
FROM watchlist w
LEFT JOIN users u ON u.id = w.user_id;

CREATE OR REPLACE VIEW v_comment_votes AS
SELECT cv.id, cv.user_id AS voter_id, COALESCE(cv.voter_username, voter.username, cv.user_id) AS voter_username,
       cv.comment_id, cv.comment_author_id, COALESCE(cv.comment_author_username, author.username, c.username, c.user_id) AS comment_author_username,
       cv.comment_movie_id, cv.comment_media_type, cv.comment_media_title, cv.vote_type, cv.created_at
FROM comment_votes cv
LEFT JOIN users voter ON voter.id = cv.user_id
LEFT JOIN comments c ON c.id = cv.comment_id
LEFT JOIN users author ON author.id = c.user_id;

CREATE OR REPLACE VIEW v_movie_genres AS
SELECT movie_id, media_type, media_title, genre_count, main_genre_id, main_genre_name, genre_ids, genre_names, created_at, updated_at
FROM movie_genres;

CREATE OR REPLACE VIEW v_media_assets AS
SELECT movie_id, media_type, media_title, poster_path, backdrop_path, updated_at
FROM media_assets;

CREATE OR REPLACE VIEW v_badges AS
SELECT id, badge_key, name, description, icon, type, category, rarity, level, xp_reward, points, color, criteria_json, sort_order, active, created_at, updated_at
FROM badges;

CREATE TABLE IF NOT EXISTS password_resets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  request_ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_password_reset_token (token_hash),
  KEY idx_password_reset_user (user_id),
  KEY idx_password_reset_email (email),
  KEY idx_password_reset_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- MOVINGS V9 LOGO/BADGES UPGRADE
USE movings;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_col_if_missing $$
CREATE PROCEDURE add_col_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

CALL add_col_if_missing('badges', 'category', 'VARCHAR(60) NOT NULL DEFAULT ''general'' AFTER `type`');
CALL add_col_if_missing('badges', 'rarity', 'VARCHAR(30) NOT NULL DEFAULT ''common'' AFTER `category`');
CALL add_col_if_missing('badges', 'level', 'INT NOT NULL DEFAULT 1 AFTER `rarity`');
CALL add_col_if_missing('badges', 'xp_reward', 'INT NOT NULL DEFAULT 0 AFTER `level`');
CALL add_col_if_missing('badges', 'points', 'INT NOT NULL DEFAULT 0 AFTER `xp_reward`');
CALL add_col_if_missing('badges', 'color', 'VARCHAR(30) NULL AFTER `points`');
CALL add_col_if_missing('badges', 'icon_path', 'VARCHAR(255) NULL AFTER `color`');
CALL add_col_if_missing('badges', 'requirement_label', 'VARCHAR(220) NULL AFTER `icon_path`');
CALL add_col_if_missing('badges', 'unlock_hint', 'TEXT NULL AFTER `requirement_label`');
CALL add_col_if_missing('badges', 'criteria_json', 'JSON NULL AFTER `unlock_hint`');
CALL add_col_if_missing('badges', 'is_secret', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `criteria_json`');
CALL add_col_if_missing('badges', 'rarity_weight', 'INT NOT NULL DEFAULT 1 AFTER `is_secret`');
CALL add_col_if_missing('badges', 'sort_order', 'INT NOT NULL DEFAULT 0 AFTER `rarity_weight`');
CALL add_col_if_missing('badges', 'updated_at', 'DATETIME NULL AFTER `created_at`');

DROP PROCEDURE IF EXISTS add_col_if_missing;

CREATE TABLE IF NOT EXISTS badge_categories (
  category_key VARCHAR(80) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS badge_rarities (
  rarity_key VARCHAR(40) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  color VARCHAR(40) NULL,
  weight INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO badge_categories (category_key, name, description, sort_order, created_at, updated_at) VALUES
('participacao', 'Participação', 'Primeiras ações no Movings.', 10, NOW(), NOW()),
('critica', 'Crítica', 'Badges ligadas a avaliações.', 20, NOW(), NOW()),
('comunidade', 'Comunidade', 'Badges ligadas a comentários e votos.', 30, NOW(), NOW()),
('colecao', 'Coleção', 'Badges ligadas aos favoritos.', 40, NOW(), NOW()),
('quiz', 'Quiz', 'Badges ligadas ao quiz.', 50, NOW(), NOW()),
('exploracao', 'Exploração', 'Badges ligadas a géneros e descoberta.', 60, NOW(), NOW()),
('especial', 'Especial', 'Conquistas mais completas e raras.', 70, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  updated_at = NOW();

INSERT INTO badge_rarities (rarity_key, name, color, weight, sort_order) VALUES
('common', 'Comum', '#94a3b8', 1, 10),
('uncommon', 'Incomum', '#22c55e', 2, 20),
('rare', 'Rara', '#38bdf8', 3, 30),
('epic', 'Épica', '#a78bfa', 4, 40),
('legendary', 'Lendária', '#f5c518', 5, 50)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  color = VALUES(color),
  weight = VALUES(weight),
  sort_order = VALUES(sort_order);

CREATE TEMPORARY TABLE tmp_movings_badges (
  badge_key VARCHAR(80) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(40) NULL,
  type VARCHAR(40) NULL,
  category VARCHAR(60) NOT NULL,
  rarity VARCHAR(30) NOT NULL,
  level INT NOT NULL,
  xp_reward INT NOT NULL,
  points INT NOT NULL,
  color VARCHAR(30) NULL,
  icon_path VARCHAR(255) NULL,
  requirement_label VARCHAR(220) NULL,
  unlock_hint TEXT NULL,
  criteria_json JSON NULL,
  is_secret TINYINT(1) NOT NULL DEFAULT 0,
  rarity_weight INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_movings_badges
(badge_key,name,description,icon,type,category,rarity,level,xp_reward,points,color,icon_path,requirement_label,unlock_hint,criteria_json,is_secret,rarity_weight,sort_order,active)
VALUES
('first_rating', 'Primeira avaliação', 'Avaliaste o teu primeiro filme ou série.', '⭐', 'rating', 'participacao', 'common', 1, 10, 10, '#facc15', NULL, 'Avaliar 1 título', 'Entra num filme ou série e deixa uma avaliação.', '{"min_ratings":1}', 0, 1, 10, 1),
('first_comment', 'Primeiro comentário', 'Tiveste um comentário aprovado pelo admin.', '💬', 'comment', 'comunidade', 'common', 1, 10, 10, '#38bdf8', NULL, 'Ter 1 comentário aprovado', 'Comenta num título e aguarda aprovação.', '{"min_approved_comments":1}', 0, 1, 20, 1),
('five_ratings', 'Crítico em Aquecimento', 'Chegaste às 5 avaliações.', '🎬', 'rating', 'critica', 'uncommon', 2, 25, 25, '#a78bfa', NULL, 'Avaliar 5 títulos', 'Continua a avaliar filmes e séries.', '{"min_ratings":5}', 0, 2, 30, 1),
('ten_ratings', 'Crítico Movings', 'Chegaste às 10 avaliações.', '🍿', 'rating', 'critica', 'rare', 3, 50, 50, '#fb7185', NULL, 'Avaliar 10 títulos', 'Chega às 10 avaliações.', '{"min_ratings":10}', 0, 3, 40, 1),
('twenty_five_ratings', 'Crítico de Elite', 'Chegaste às 25 avaliações registadas.', '🎞️', 'rating', 'critica', 'epic', 4, 100, 100, '#f97316', NULL, 'Avaliar 25 títulos', 'Mantém o ritmo até às 25 avaliações.', '{"min_ratings":25}', 0, 4, 50, 1),
('fifty_ratings', 'Arquivo Vivo', 'Chegaste às 50 avaliações. Isto já é serviço público.', '🏛️', 'rating', 'critica', 'legendary', 5, 250, 250, '#f5c518', NULL, 'Avaliar 50 títulos', 'Só os teimosos chegam aqui.', '{"min_ratings":50}', 0, 5, 60, 1),
('five_favorites', 'Colecionador', 'Adicionaste 5 títulos aos favoritos.', '❤️', 'favorite', 'colecao', 'uncommon', 2, 25, 25, '#ef4444', NULL, 'Adicionar 5 favoritos', 'Marca os teus favoritos no catálogo.', '{"min_favorites":5}', 0, 2, 70, 1),
('ten_favorites', 'Prateleira Dourada', 'Adicionaste 10 títulos aos favoritos.', '💛', 'favorite', 'colecao', 'rare', 3, 60, 60, '#eab308', NULL, 'Adicionar 10 favoritos', 'Constrói a tua lista de favoritos.', '{"min_favorites":10}', 0, 3, 80, 1),
('quiz_done', 'Perfil Cinemático', 'Terminaste o quiz de personalidade.', '🧠', 'quiz', 'quiz', 'common', 1, 15, 15, '#22c55e', NULL, 'Completar o quiz', 'Vai ao quiz e descobre o teu perfil.', '{"quiz_completed":true}', 0, 1, 90, 1),
('approved_comments_5', 'Comentador Ativo', 'Tiveste 5 comentários aprovados.', '🗣️', 'comment', 'comunidade', 'rare', 3, 60, 60, '#06b6d4', NULL, 'Ter 5 comentários aprovados', 'Continua a comentar com qualidade.', '{"min_approved_comments":5}', 0, 3, 100, 1),
('approved_comments_10', 'Voz da Comunidade', 'Tiveste 10 comentários aprovados.', '📣', 'comment', 'comunidade', 'epic', 4, 120, 120, '#0ea5e9', NULL, 'Ter 10 comentários aprovados', 'A comunidade precisa das tuas opiniões questionáveis.', '{"min_approved_comments":10}', 0, 4, 110, 1),
('helpful_voter', 'Juiz dos Comentários', 'Deste like ou dislike num comentário.', '⚖️', 'vote', 'comunidade', 'common', 1, 10, 10, '#94a3b8', NULL, 'Votar em 1 comentário', 'Dá like ou dislike num comentário.', '{"min_comment_votes":1}', 0, 1, 120, 1),
('genre_explorer', 'Explorador de Géneros', 'Interagiste com vários géneros diferentes.', '🧭', 'genre', 'exploracao', 'rare', 3, 75, 75, '#14b8a6', NULL, 'Interagir com 5 géneros', 'Avalia e guarda títulos de géneros diferentes.', '{"min_unique_genres":5}', 0, 3, 130, 1),
('balanced_user', 'Movinger Completo', 'Tens avaliações, comentários, favoritos e quiz registados.', '🏆', 'mixed', 'especial', 'epic', 4, 120, 120, '#f97316', NULL, 'Avaliar, comentar, favoritar e completar quiz', 'Usa todas as áreas principais do Movings.', '{"min_ratings":1,"min_approved_comments":1,"min_favorites":1,"quiz_completed":true}', 0, 4, 140, 1),
('legend_movings', 'Lenda Movings', 'Um perfil completo com atividade forte em todas as áreas.', '👑', 'mixed', 'especial', 'legendary', 5, 300, 300, '#f5c518', NULL, '50 avaliações, 10 comentários, 10 favoritos e quiz', 'Badge lendária para quem praticamente mora no Movings.', '{"min_ratings":50,"min_approved_comments":10,"min_favorites":10,"quiz_completed":true}', 0, 5, 150, 1);

UPDATE badges b
JOIN tmp_movings_badges t ON t.badge_key = b.badge_key
SET
  b.name = t.name,
  b.description = t.description,
  b.icon = t.icon,
  b.type = t.type,
  b.category = t.category,
  b.rarity = t.rarity,
  b.level = t.level,
  b.xp_reward = t.xp_reward,
  b.points = t.points,
  b.color = t.color,
  b.icon_path = t.icon_path,
  b.requirement_label = t.requirement_label,
  b.unlock_hint = t.unlock_hint,
  b.criteria_json = t.criteria_json,
  b.is_secret = t.is_secret,
  b.rarity_weight = t.rarity_weight,
  b.sort_order = t.sort_order,
  b.active = t.active,
  b.updated_at = NOW();

SET @next_badge_id := (SELECT COALESCE(MAX(id), 0) FROM badges);

INSERT INTO badges
(id,badge_key,name,description,icon,type,category,rarity,level,xp_reward,points,color,icon_path,requirement_label,unlock_hint,criteria_json,is_secret,rarity_weight,sort_order,active,created_at,updated_at)
SELECT
  (@next_badge_id := @next_badge_id + 1) AS id,
  t.badge_key,t.name,t.description,t.icon,t.type,t.category,t.rarity,t.level,t.xp_reward,t.points,t.color,t.icon_path,t.requirement_label,t.unlock_hint,t.criteria_json,t.is_secret,t.rarity_weight,t.sort_order,t.active,NOW(),NOW()
FROM tmp_movings_badges t
LEFT JOIN badges b ON b.badge_key = t.badge_key
WHERE b.badge_key IS NULL
ORDER BY t.sort_order;

DROP TEMPORARY TABLE IF EXISTS tmp_movings_badges;

CREATE OR REPLACE VIEW v_badges AS
SELECT
  b.id,
  b.badge_key,
  b.name,
  b.description,
  b.icon,
  b.icon_path,
  b.type,
  b.category,
  COALESCE(c.name, b.category) AS category_name,
  b.rarity,
  COALESCE(r.name, b.rarity) AS rarity_name,
  COALESCE(r.color, b.color) AS rarity_color,
  b.level,
  b.xp_reward,
  b.points,
  b.color,
  b.requirement_label,
  b.unlock_hint,
  b.criteria_json,
  b.is_secret,
  b.rarity_weight,
  b.sort_order,
  b.active,
  b.created_at,
  b.updated_at
FROM badges b
LEFT JOIN badge_categories c ON c.category_key = b.category
LEFT JOIN badge_rarities r ON r.rarity_key = b.rarity
ORDER BY b.sort_order, b.id;

