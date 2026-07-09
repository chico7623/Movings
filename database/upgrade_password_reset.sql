USE movings;

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

-- Limpeza opcional de tokens velhos já expirados/usados.
DELETE FROM password_resets
WHERE used_at IS NOT NULL
   OR expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY);
