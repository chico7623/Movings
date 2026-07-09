CREATE DATABASE IF NOT EXISTS movings CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE movings;

CREATE TABLE IF NOT EXISTS app_next_ids (
  name VARCHAR(64) NOT NULL PRIMARY KEY,
  next_value INT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  email_sent TINYINT(1) NOT NULL DEFAULT 0,
  email_error TEXT NULL,
  UNIQUE KEY uniq_password_reset_token (token_hash),
  KEY idx_password_reset_user (user_id),
  KEY idx_password_reset_email (email),
  KEY idx_password_reset_expires (expires_at),
  KEY idx_password_reset_used (used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

DROP PROCEDURE IF EXISTS movings_add_col_if_missing $$
CREATE PROCEDURE movings_add_col_if_missing(
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

CALL movings_add_col_if_missing('password_resets', 'email_sent', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER created_at');
CALL movings_add_col_if_missing('password_resets', 'email_error', 'TEXT NULL AFTER email_sent');
CALL movings_add_col_if_missing('password_resets', 'request_ip', 'VARCHAR(45) NULL AFTER used_at');
CALL movings_add_col_if_missing('password_resets', 'user_agent', 'VARCHAR(255) NULL AFTER request_ip');
CALL movings_add_col_if_missing('custom_catalog', 'trailer_url', 'VARCHAR(500) NULL AFTER backdrop_path');

DROP PROCEDURE IF EXISTS movings_add_col_if_missing;

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

INSERT INTO app_next_ids (name, next_value)
VALUES ('watchlist', 1)
ON DUPLICATE KEY UPDATE next_value = GREATEST(next_value, 1);

DROP PROCEDURE IF EXISTS migrate_wishlist_to_watchlist;
DELIMITER //
CREATE PROCEDURE migrate_wishlist_to_watchlist()
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'wishlist'
  ) THEN
    SET @sql = 'INSERT IGNORE INTO watchlist (id, user_id, movie_id, media_type, media_title, created_at)
                SELECT id, user_id, movie_id, media_type, media_title, created_at
                FROM wishlist';
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;
CALL migrate_wishlist_to_watchlist();
DROP PROCEDURE IF EXISTS migrate_wishlist_to_watchlist;

UPDATE app_next_ids
SET next_value = GREATEST(
  next_value,
  COALESCE((SELECT MAX(id) + 1 FROM watchlist), 1)
)
WHERE name = 'watchlist';

CREATE OR REPLACE VIEW v_watchlist AS
SELECT w.id, w.user_id, COALESCE(u.username, w.user_id) AS username, w.movie_id, w.media_type, w.media_title, w.created_at
FROM watchlist w
LEFT JOIN users u ON u.id = w.user_id;

UPDATE users
SET email = NULL
WHERE email = '';

DELETE FROM password_resets
WHERE used_at IS NOT NULL
   OR expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY);


-- Suporte a revisões de comentários aprovados que voltam para moderação.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS original_comment_id INT NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at DATETIME NULL;
ALTER TABLE pending_comments ADD COLUMN IF NOT EXISTS original_comment_id INT NULL;
ALTER TABLE pending_comments ADD COLUMN IF NOT EXISTS edited_at DATETIME NULL;
