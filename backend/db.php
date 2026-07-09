<?php
// Movings API + WAMP MySQL
// Camada central da API: configura CORS, headers de segurança, ligação MySQL,
// helpers de autenticação, normalização de dados e sincronização das tabelas.
// O objetivo é manter o projeto estável no WAMP da PAP e preparado para uma
// publicação controlada sem expor detalhes sensíveis no frontend.
// Esta versão usa MySQL real como fonte principal. O JSON antigo fica só para migração opcional.

if (!function_exists('movings_is_local_request')) {
    function movings_is_local_request() {
        $host = isset($_SERVER['HTTP_HOST']) ? strtolower((string)$_SERVER['HTTP_HOST']) : '';
        $remote = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
        return strpos($host, 'localhost') !== false
            || strpos($host, '127.0.0.1') !== false
            || strpos($host, '::1') !== false
            || $remote === '127.0.0.1'
            || $remote === '::1';
    }
}

if (!function_exists('movings_load_local_config')) {
    function movings_load_local_config() {
        $configPath = __DIR__ . DIRECTORY_SEPARATOR . 'db_config.php';
        if (file_exists($configPath)) {
            require_once $configPath;
        }
    }
}

if (!function_exists('movings_env_value')) {
    function movings_env_value($name, $default = '') {
        if (defined($name)) {
            return constant($name);
        }

        $value = getenv($name);
        return $value !== false ? $value : $default;
    }
}

if (!function_exists('movings_allowed_origins')) {
    function movings_allowed_origins() {
        $raw = trim((string)movings_env_value('MOVINGS_ALLOWED_ORIGINS', ''));
        if ($raw === '') return array();

        $parts = preg_split('/[;,\n]+/', $raw);
        $origins = array();
        foreach ($parts as $part) {
            $origin = rtrim(trim((string)$part), '/');
            if ($origin !== '') {
                $origins[] = $origin;
            }
        }

        return array_values(array_unique($origins));
    }
}

if (!function_exists('movings_resolve_cors_origin')) {
    function movings_resolve_cors_origin($origin) {
        $origin = rtrim(trim((string)$origin), '/');

        if ($origin === '') {
            return '';
        }

        $allowedOrigins = movings_allowed_origins();

        // Produção/Railway: quando MOVINGS_ALLOWED_ORIGINS está definido e o pedido
        // não é local, o backend aceita apenas o domínio público do frontend.
        // Isto evita CORS aberto em publicação real/controlada.
        if (!movings_is_local_request() && count($allowedOrigins) > 0) {
            foreach ($allowedOrigins as $allowedOrigin) {
                if (hash_equals($allowedOrigin, $origin)) {
                    return $origin;
                }
            }

            return '';
        }

        // PAP/WAMP: permite automaticamente origens locais mesmo quando o Vite muda de porta
        // (5173, 5174, 8080, etc.). Isto evita falsos erros de "backend offline".
        if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$/i', $origin)) {
            return $origin;
        }

        // Permite testes em rede local durante a apresentação sem abrir o CORS a qualquer domínio.
        if (preg_match('/^https?:\/\/(192\.168\.[0-9]{1,3}\.[0-9]{1,3}|10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]{1,3}\.[0-9]{1,3})(:[0-9]+)?$/i', $origin)) {
            return $origin;
        }

        foreach ($allowedOrigins as $allowedOrigin) {
            if (hash_equals($allowedOrigin, $origin)) {
                return $origin;
            }
        }

        return '';
    }
}

movings_load_local_config();

$movingsLocalRequest = movings_is_local_request();
ini_set('display_errors', $movingsLocalRequest ? '1' : '0');
ini_set('display_startup_errors', $movingsLocalRequest ? '1' : '0');
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowedCorsOrigin = movings_resolve_cors_origin($origin);

if ($allowedCorsOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $allowedCorsOrigin);
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

$requestMethod = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
if ($requestMethod === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function json_response($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function movings_config() {
    movings_load_local_config();

    // Produção/Railway:
    // 1) Usa primeiro variáveis MOVINGS_* definidas manualmente.
    // 2) Se estiveres no Railway com serviço MySQL, usa automaticamente MYSQLHOST,
    //    MYSQLPORT, MYSQLDATABASE, MYSQLUSER e MYSQLPASSWORD.
    // 3) Mantém fallback WAMP/local para a PAP.
    $railwayPass = getenv('MYSQLPASSWORD');

    return array(
        'host' => defined('MOVINGS_DB_HOST') ? MOVINGS_DB_HOST : (getenv('MOVINGS_DB_HOST') ?: (getenv('MYSQLHOST') ?: '127.0.0.1')),
        'port' => defined('MOVINGS_DB_PORT') ? MOVINGS_DB_PORT : (getenv('MOVINGS_DB_PORT') ?: (getenv('MYSQLPORT') ?: '3306')),
        'name' => defined('MOVINGS_DB_NAME') ? MOVINGS_DB_NAME : (getenv('MOVINGS_DB_NAME') ?: (getenv('MYSQLDATABASE') ?: 'movings')),
        'user' => defined('MOVINGS_DB_USER') ? MOVINGS_DB_USER : (getenv('MOVINGS_DB_USER') ?: (getenv('MYSQLUSER') ?: 'root')),
        'pass' => defined('MOVINGS_DB_PASS') ? MOVINGS_DB_PASS : (getenv('MOVINGS_DB_PASS') !== false ? getenv('MOVINGS_DB_PASS') : ($railwayPass !== false ? $railwayPass : '')),
        'charset' => 'utf8mb4'
    );
}

function pdo_server() {
    $cfg = movings_config();
    $dsn = 'mysql:host=' . $cfg['host'] . ';port=' . $cfg['port'] . ';charset=' . $cfg['charset'];
    return new PDO($dsn, $cfg['user'], $cfg['pass'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ));
}

function pdo_db() {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $cfg = movings_config();
    $dsn = 'mysql:host=' . $cfg['host'] . ';port=' . $cfg['port'] . ';dbname=' . $cfg['name'] . ';charset=' . $cfg['charset'];
    try {
        $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ));

        // Importante: a API já NÃO tenta criar BD/tabelas automaticamente.
        // As tabelas são criadas pelo ficheiro install_movings_mysql.sql no phpMyAdmin.
        // Isto evita erros de permissões/DDL no WAMP e bases meio-criadas.
        return $pdo;
    } catch (Throwable $e) {
        // Em ambiente local/WAMP, tenta auto-criar a BD e as tabelas quando ainda não existem.
        // Isto evita que o frontend marque a API como offline só porque o SQL ainda não foi importado.
        if (movings_is_local_request()) {
            try {
                $server = pdo_server();
                $dbName = str_replace('`', '``', $cfg['name']);
                $server->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

                $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], array(
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ));
                install_schema($pdo);
                return $pdo;
            } catch (Throwable $auto) {
                json_response(array(
                    'ok' => false,
                    'error' => 'db_connection_failed',
                    'message' => 'A API não conseguiu criar/abrir a base de dados MySQL. Confirma se o WAMP está verde, se MySQL está ligado e se db_config.php tem user/password certos.',
                    'details' => $auto->getMessage(),
                    'original_details' => $e->getMessage()
                ), 500);
            }
        }

        json_response(array(
            'ok' => false,
            'error' => 'db_connection_failed',
            'message' => 'A API não conseguiu abrir a base de dados MySQL. Confirma se a BD movings existe, se o WAMP está verde e se db_config.php tem user/password certos.',
            'details' => $e->getMessage()
        ), 500);
    }
}

function table_exists(PDO $pdo, $table) {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
    $stmt->execute(array($table));
    return intval($stmt->fetchColumn()) > 0;
}

function assert_schema_ready(PDO $pdo) {
    // Versão simplificada da BD: só exige as 14 tabelas principais.
    // Tabelas antigas como pending_comments, media_assets, movie_genres,
    // user_stats, user_favorite_genre, badge_categories e badge_rarities
    // são opcionais para manter compatibilidade com instalações antigas.
    $required = array(
        'app_next_ids','users','ratings','comments','favorites','watchlist','comment_votes',
        'movie_requests','custom_catalog','badges','user_badges','quiz_results','admin_logs','password_resets'
    );
    $missing = array();
    foreach ($required as $table) {
        if (!table_exists($pdo, $table)) $missing[] = $table;
    }
    if (!empty($missing)) {
        json_response(array(
            'ok' => false,
            'error' => 'schema_missing',
            'message' => 'A base de dados movings existe, mas ainda faltam tabelas. Vai ao phpMyAdmin > SQL e executa o ficheiro upgrade_wamp_final.sql. Se estiveres a instalar do zero, executa primeiro reset_movings_mysql.sql.',
            'missing_tables' => $missing
        ), 500);
    }
}

function ensure_column(PDO $pdo, $table, $column, $definition) {
    if (!table_exists($pdo, $table)) return;

    // Compatibilidade WAMP/MySQL: algumas versões não aceitam placeholders em SHOW COLUMNS ... LIKE
    // com prepared statements nativos, causando erro "near '?'". Usamos INFORMATION_SCHEMA para
    // manter a query parametrizada e estável.
    $stmt = $pdo->prepare('
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
    ');
    $stmt->execute(array($table, $column));

    if (intval($stmt->fetchColumn()) === 0) {
        $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
}

function install_schema(PDO $pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS app_next_ids (
        name VARCHAR(64) NOT NULL PRIMARY KEY,
        next_value INT UNSIGNED NOT NULL DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ratings (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $commentSql = "(
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $pdo->exec("CREATE TABLE IF NOT EXISTS comments $commentSql");
    $pdo->exec("CREATE TABLE IF NOT EXISTS pending_comments $commentSql");

    $pdo->exec("CREATE TABLE IF NOT EXISTS favorites (
        id INT UNSIGNED NOT NULL PRIMARY KEY,
        user_id VARCHAR(80) NOT NULL,
        movie_id INT NOT NULL,
        media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
        media_title VARCHAR(200) NULL,
        created_at DATETIME NULL,
        UNIQUE KEY uniq_user_media_favorite (user_id, movie_id, media_type),
        KEY idx_user (user_id),
        KEY idx_media (movie_id, media_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS watchlist (
        id INT UNSIGNED NOT NULL PRIMARY KEY,
        user_id VARCHAR(80) NOT NULL,
        movie_id INT NOT NULL,
        media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
        media_title VARCHAR(200) NULL,
        created_at DATETIME NULL,
        UNIQUE KEY uniq_user_media_watchlist (user_id, movie_id, media_type),
        KEY idx_user (user_id),
        KEY idx_media (movie_id, media_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS comment_votes (
        id INT UNSIGNED NOT NULL PRIMARY KEY,
        user_id VARCHAR(80) NOT NULL,
        comment_id INT UNSIGNED NOT NULL,
        vote_type VARCHAR(20) NOT NULL DEFAULT 'like',
        created_at DATETIME NULL,
        UNIQUE KEY uniq_user_comment_vote (user_id, comment_id),
        KEY idx_comment (comment_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS movie_genres (
        movie_id INT NOT NULL,
        media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
        media_title VARCHAR(200) NULL,
        genre_ids LONGTEXT NULL,
        genre_names LONGTEXT NULL,
        created_at DATETIME NULL,
        updated_at DATETIME NULL,
        PRIMARY KEY (movie_id, media_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS user_favorite_genre (
        user_id VARCHAR(80) NOT NULL PRIMARY KEY,
        genre_id INT NULL,
        genre_name VARCHAR(120) NULL,
        score DECIMAL(10,2) NULL,
        source VARCHAR(30) NOT NULL DEFAULT 'auto',
        created_at DATETIME NULL,
        updated_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS user_stats (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS movie_requests (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS custom_catalog (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS media_assets (
        movie_id INT NOT NULL,
        media_type VARCHAR(20) NOT NULL DEFAULT 'movie',
        media_title VARCHAR(200) NOT NULL,
        poster_path VARCHAR(500) NULL,
        backdrop_path VARCHAR(500) NULL,
        updated_at DATETIME NULL,
        PRIMARY KEY (movie_id, media_type),
        KEY idx_media_title (media_title)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS movie_genre_links (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS badges (
        id INT UNSIGNED NOT NULL PRIMARY KEY,
        badge_key VARCHAR(80) NOT NULL,
        name VARCHAR(160) NOT NULL,
        description TEXT NULL,
        icon VARCHAR(20) NULL,
        type VARCHAR(40) NULL,
        category VARCHAR(60) NOT NULL DEFAULT 'general',
        rarity VARCHAR(30) NOT NULL DEFAULT 'common',
        level INT NOT NULL DEFAULT 1,
        xp_reward INT NOT NULL DEFAULT 0,
        points INT NOT NULL DEFAULT 0,
        color VARCHAR(30) NULL,
        icon_path VARCHAR(255) NULL,
        requirement_label VARCHAR(220) NULL,
        unlock_hint TEXT NULL,
        criteria_json JSON NULL,
        is_secret TINYINT(1) NOT NULL DEFAULT 0,
        rarity_weight INT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NULL,
        updated_at DATETIME NULL,
        UNIQUE KEY uniq_badge_key (badge_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS badge_categories (
        category_key VARCHAR(80) NOT NULL PRIMARY KEY,
        name VARCHAR(160) NOT NULL,
        description TEXT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NULL,
        updated_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS badge_rarities (
        rarity_key VARCHAR(40) NOT NULL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        color VARCHAR(40) NULL,
        weight INT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Lookup tables usadas para documentar/classificar o sistema de badges.
    // Ficam sem efeito destrutivo: se já existirem, apenas atualizam os nomes/cores.
    $pdo->exec("INSERT INTO badge_categories (category_key, name, description, sort_order, created_at, updated_at) VALUES
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
            updated_at = NOW()");

    $pdo->exec("INSERT INTO badge_rarities (rarity_key, name, color, weight, sort_order) VALUES
        ('common', 'Comum', '#94a3b8', 1, 10),
        ('uncommon', 'Incomum', '#22c55e', 2, 20),
        ('rare', 'Rara', '#38bdf8', 3, 30),
        ('epic', 'Épica', '#a78bfa', 4, 40),
        ('legendary', 'Lendária', '#f5c518', 5, 50)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            color = VALUES(color),
            weight = VALUES(weight),
            sort_order = VALUES(sort_order)");

    $pdo->exec("CREATE TABLE IF NOT EXISTS user_badges (
        id INT UNSIGNED NOT NULL PRIMARY KEY,
        user_id VARCHAR(80) NOT NULL,
        badge_key VARCHAR(80) NOT NULL,
        awarded_at DATETIME NULL,
        UNIQUE KEY uniq_user_badge (user_id, badge_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS quiz_results (
        user_id VARCHAR(80) NOT NULL PRIMARY KEY,
        result_key VARCHAR(80) NULL,
        result_label VARCHAR(200) NULL,
        result_desc TEXT NULL,
        created_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS password_resets (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(80) NULL,
        email VARCHAR(255) NULL,
        token_hash VARCHAR(255) NOT NULL,
        code_hash VARCHAR(255) NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME NULL,
        KEY idx_email (email),
        KEY idx_user (user_id),
        KEY idx_token_hash (token_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS admin_logs (
        id INT UNSIGNED NOT NULL PRIMARY KEY,
        admin_id VARCHAR(80) NULL,
        action VARCHAR(80) NOT NULL,
        target_type VARCHAR(80) NULL,
        target_id VARCHAR(120) NULL,
        details TEXT NULL,
        created_at DATETIME NULL,
        KEY idx_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Garante compatibilidade caso as tabelas já existissem na tua BD mas incompletas.
    foreach (array(
        'users' => array(
            'email' => 'VARCHAR(255) NULL',
            'username' => "VARCHAR(120) NOT NULL DEFAULT 'utilizador'",
            'username_norm' => "VARCHAR(120) NOT NULL DEFAULT 'utilizador'",
            'password_hash' => "VARCHAR(255) NOT NULL DEFAULT ''",
            'role' => "VARCHAR(30) NOT NULL DEFAULT 'user'",
            'blocked' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'created_at' => 'DATETIME NULL'
        ),
        'ratings' => array(
            'username' => 'VARCHAR(120) NULL',
            'movie_id' => 'INT NOT NULL DEFAULT 0',
            'media_type' => "VARCHAR(20) NOT NULL DEFAULT 'movie'",
            'media_title' => 'VARCHAR(200) NULL',
            'rating' => 'DECIMAL(3,1) NOT NULL DEFAULT 0',
            'created_at' => 'DATETIME NULL',
            'updated_at' => 'DATETIME NULL'
        ),
        'favorites' => array(
            'username' => 'VARCHAR(120) NULL',
            'movie_id' => 'INT NOT NULL DEFAULT 0',
            'media_type' => "VARCHAR(20) NOT NULL DEFAULT 'movie'",
            'media_title' => 'VARCHAR(200) NULL',
            'created_at' => 'DATETIME NULL'
        ),
        'watchlist' => array(
            'movie_id' => 'INT NOT NULL DEFAULT 0',
            'media_type' => "VARCHAR(20) NOT NULL DEFAULT 'movie'",
            'media_title' => 'VARCHAR(200) NULL',
            'created_at' => 'DATETIME NULL'
        ),
        'movie_genres' => array(
            'media_title' => 'VARCHAR(200) NULL',
            'genre_ids' => 'LONGTEXT NULL',
            'genre_names' => 'LONGTEXT NULL',
            'genre_count' => 'INT NOT NULL DEFAULT 0',
            'main_genre_id' => 'INT NULL',
            'main_genre_name' => 'VARCHAR(120) NULL',
            'created_at' => 'DATETIME NULL',
            'updated_at' => 'DATETIME NULL'
        ),
        'movie_requests' => array(
            'poster_url' => 'VARCHAR(500) NULL',
            'trailer_url' => 'VARCHAR(500) NULL',
            'synopsis' => 'TEXT NULL',
            'admin_note' => 'TEXT NULL',
            'updated_at' => 'DATETIME NULL',
            'completed_at' => 'DATETIME NULL'
        ),
        'custom_catalog' => array(
            'poster_path' => 'VARCHAR(500) NULL',
            'backdrop_path' => 'VARCHAR(500) NULL',
            'trailer_url' => 'VARCHAR(500) NULL',
            'overview' => 'TEXT NULL',
            'release_date' => 'VARCHAR(30) NULL',
            'first_air_date' => 'VARCHAR(30) NULL',
            'genre_ids' => 'LONGTEXT NULL'
        ),
        'password_resets' => array(
            'user_id' => 'VARCHAR(80) NULL',
            'email' => 'VARCHAR(255) NULL',
            'token_hash' => "VARCHAR(255) NOT NULL DEFAULT ''",
            'code_hash' => 'VARCHAR(255) NULL',
            'expires_at' => 'DATETIME NULL',
            'used_at' => 'DATETIME NULL',
            'created_at' => 'DATETIME NULL'
        ),
        'badges' => array(
            'category' => "VARCHAR(60) NOT NULL DEFAULT 'general'",
            'rarity' => "VARCHAR(30) NOT NULL DEFAULT 'common'",
            'level' => 'INT NOT NULL DEFAULT 1',
            'xp_reward' => 'INT NOT NULL DEFAULT 0',
            'points' => 'INT NOT NULL DEFAULT 0',
            'color' => 'VARCHAR(30) NULL',
            'icon_path' => 'VARCHAR(255) NULL',
            'requirement_label' => 'VARCHAR(220) NULL',
            'unlock_hint' => 'TEXT NULL',
            'criteria_json' => 'JSON NULL',
            'is_secret' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'rarity_weight' => 'INT NOT NULL DEFAULT 1',
            'sort_order' => 'INT NOT NULL DEFAULT 0',
            'updated_at' => 'DATETIME NULL'
        ),
        'quiz_results' => array(
            'username' => 'VARCHAR(120) NULL'
        ),
        'comment_votes' => array(
            'voter_username' => 'VARCHAR(120) NULL',
            'comment_author_id' => 'VARCHAR(80) NULL',
            'comment_author_username' => 'VARCHAR(120) NULL',
            'comment_movie_id' => 'INT NULL',
            'comment_media_type' => 'VARCHAR(20) NULL',
            'comment_media_title' => 'VARCHAR(200) NULL'
        ),
        'user_favorite_genre' => array(
            'genre_id' => 'INT NULL',
            'genre_name' => 'VARCHAR(120) NULL',
            'score' => 'DECIMAL(10,2) NULL',
            'source' => "VARCHAR(30) NOT NULL DEFAULT 'auto'",
            'created_at' => 'DATETIME NULL',
            'updated_at' => 'DATETIME NULL'
        ),
        'user_stats' => array(
            'ratings_total' => 'INT NOT NULL DEFAULT 0',
            'comments_total' => 'INT NOT NULL DEFAULT 0',
            'pending_comments_total' => 'INT NOT NULL DEFAULT 0',
            'favorites_total' => 'INT NOT NULL DEFAULT 0',
            'ratings_avg' => 'DECIMAL(4,2) NOT NULL DEFAULT 0',
            'movies_watched' => 'INT NOT NULL DEFAULT 0',
            'movies_rated' => 'INT NOT NULL DEFAULT 0',
            'comments_posted' => 'INT NOT NULL DEFAULT 0',
            'favorite_genre_id' => 'INT NULL',
            'favorite_genre_name' => 'VARCHAR(120) NULL',
            'top_genre_id' => 'INT NULL',
            'top_genre_name' => 'VARCHAR(120) NULL',
            'genre_distribution' => 'LONGTEXT NULL',
            'genre_distribution_labels' => 'LONGTEXT NULL',
            'genre_distribution_rows' => 'LONGTEXT NULL',
            'updated_at' => 'DATETIME NULL'
        )
    ) as $table => $columns) {
        foreach ($columns as $column => $definition) ensure_column($pdo, $table, $column, $definition);
    }
    foreach (array('ratings', 'comments', 'pending_comments', 'favorites', 'watchlist', 'movie_genres') as $table) {
        ensure_column($pdo, $table, 'media_title', 'VARCHAR(200) NULL');
    }
    foreach (array('comments', 'pending_comments') as $table) {
        ensure_column($pdo, $table, 'is_spoiler', 'TINYINT(1) NOT NULL DEFAULT 0');
        ensure_column($pdo, $table, 'parent_id', 'INT NULL');
        ensure_column($pdo, $table, 'likes', 'INT NOT NULL DEFAULT 0');
        ensure_column($pdo, $table, 'dislikes', 'INT NOT NULL DEFAULT 0');
        ensure_column($pdo, $table, 'approved_at', 'DATETIME NULL');
    }
    ensure_column($pdo, 'ratings', 'username', 'VARCHAR(120) NULL');
    ensure_column($pdo, 'user_favorite_genre', 'genre_name', 'VARCHAR(120) NULL');
    ensure_column($pdo, 'user_favorite_genre', 'score', 'DECIMAL(10,2) NULL');
    ensure_column($pdo, 'user_stats', 'favorite_genre_name', 'VARCHAR(120) NULL');
    ensure_column($pdo, 'user_stats', 'genre_distribution', 'LONGTEXT NULL');
    ensure_column($pdo, 'user_stats', 'genre_distribution_labels', 'LONGTEXT NULL');
    ensure_column($pdo, 'user_stats', 'genre_distribution_rows', 'LONGTEXT NULL');
}

function data_dir() {
    $dir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    return $dir;
}

function store_path() {
    return data_dir() . DIRECTORY_SEPARATOR . 'movings_store.json';
}

function default_store() {
    return array(
        'meta' => array('version' => 6, 'storage' => 'mysql', 'created_at' => date('c')),
        'next_ids' => array(
            'comment' => 1,
            'pending_comment' => 1,
            'rating' => 1,
            'favorite' => 1,
            'watchlist' => 1,
            'vote' => 1,
            'badge' => 1,
            'movie_request' => 1,
            'catalog_item' => 900000,
            'admin_log' => 1,
            'user_badge' => 1
        ),
        'users' => array(),
        'comments' => array(),
        'pending_comments' => array(),
        'ratings' => array(),
        'favorites' => array(),
        'watchlist' => array(),
        'movie_requests' => array(),
        'custom_catalog' => array(),
        'comment_votes' => array(),
        'movie_genres' => array(),
        'quiz_results' => array(),
        'badges' => array(),
        'user_badges' => array(),
        'user_favorite_genre' => array(),
        'user_stats' => array(),
        'admin_logs' => array()
    );
}

function mysql_json_decode($value, $fallback = array()) {
    if ($value === null || $value === '') return $fallback;
    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function mysql_json_encode($value) {
    return json_encode(is_array($value) ? $value : array(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function mysql_bool($value) {
    return !empty($value) ? 1 : 0;
}

function fetch_all_rows(PDO $pdo, $table) {
    if (!table_exists($pdo, $table)) return array();
    return $pdo->query("SELECT * FROM `$table`")->fetchAll();
}

function load_store_from_mysql(PDO $pdo) {
    install_schema($pdo);
    assert_schema_ready($pdo);
    ensure_column($pdo, 'custom_catalog', 'trailer_url', 'VARCHAR(500) NULL');

    // Compatibilidade incremental: estas colunas suportam o fluxo em que uma
    // edição de comentário aprovado volta para aprovação sem perder o comentário original.
    ensure_column($pdo, 'comments', 'original_comment_id', 'INT NULL');
    ensure_column($pdo, 'comments', 'edited_at', 'DATETIME NULL');
    ensure_column($pdo, 'pending_comments', 'original_comment_id', 'INT NULL');
    ensure_column($pdo, 'pending_comments', 'edited_at', 'DATETIME NULL');

    ensure_column($pdo, 'movie_requests', 'poster_url', 'VARCHAR(500) NULL');
    ensure_column($pdo, 'movie_requests', 'trailer_url', 'VARCHAR(500) NULL');
    ensure_column($pdo, 'movie_requests', 'synopsis', 'TEXT NULL');
    $store = default_store();

    foreach (fetch_all_rows($pdo, 'app_next_ids') as $row) {
        $store['next_ids'][$row['name']] = intval($row['next_value']);
    }

    foreach (fetch_all_rows($pdo, 'users') as $row) {
        $row['blocked'] = intval($row['blocked']) === 1;
        $store['users'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'ratings') as $row) {
        $row['id'] = intval($row['id']);
        $row['movie_id'] = intval($row['movie_id']);
        $row['rating'] = floatval($row['rating']);
        $store['ratings'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'comments') as $row) {
        $row['id'] = intval($row['id']);
        $row['movie_id'] = intval($row['movie_id']);
        $row['is_spoiler'] = intval($row['is_spoiler']) === 1;
        $row['parent_id'] = $row['parent_id'] === null ? null : intval($row['parent_id']);
        $row['likes'] = intval($row['likes']);
        $row['dislikes'] = intval($row['dislikes']);
        $row['original_comment_id'] = isset($row['original_comment_id']) && $row['original_comment_id'] !== null ? intval($row['original_comment_id']) : null;
        if (isset($row['status']) && $row['status'] === 'pending') {
            $store['pending_comments'][] = $row;
        } else {
            $store['comments'][] = $row;
        }
    }

    foreach (fetch_all_rows($pdo, 'pending_comments') as $row) {
        $row['id'] = intval($row['id']);
        $row['movie_id'] = intval($row['movie_id']);
        $row['is_spoiler'] = intval($row['is_spoiler']) === 1;
        $row['parent_id'] = $row['parent_id'] === null ? null : intval($row['parent_id']);
        $row['likes'] = intval($row['likes']);
        $row['dislikes'] = intval($row['dislikes']);
        $row['original_comment_id'] = isset($row['original_comment_id']) && $row['original_comment_id'] !== null ? intval($row['original_comment_id']) : null;
        $store['pending_comments'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'favorites') as $row) {
        $row['id'] = intval($row['id']);
        $row['movie_id'] = intval($row['movie_id']);
        $store['favorites'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'watchlist') as $row) {
        $row['id'] = intval($row['id']);
        $row['movie_id'] = intval($row['movie_id']);
        $store['watchlist'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'comment_votes') as $row) {
        $row['id'] = intval($row['id']);
        $row['comment_id'] = intval($row['comment_id']);
        $store['comment_votes'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'movie_genres') as $row) {
        $row['movie_id'] = intval($row['movie_id']);
        $row['genre_ids'] = mysql_json_decode($row['genre_ids']);
        $row['genre_names'] = mysql_json_decode($row['genre_names']);
        $store['movie_genres'][media_key($row['movie_id'], $row['media_type'])] = $row;
    }

    foreach (fetch_all_rows($pdo, 'user_favorite_genre') as $row) {
        $row['genre_id'] = $row['genre_id'] === null ? null : intval($row['genre_id']);
        $row['score'] = $row['score'] === null ? null : floatval($row['score']);
        $store['user_favorite_genre'][$row['user_id']] = $row;
    }

    foreach (fetch_all_rows($pdo, 'user_stats') as $row) {
        foreach (array('ratings_total','comments_total','pending_comments_total','favorites_total','movies_watched','movies_rated','comments_posted') as $k) {
            $row[$k] = intval($row[$k]);
        }
        $row['ratings_avg'] = floatval($row['ratings_avg']);
        $row['favorite_genre_id'] = $row['favorite_genre_id'] === null ? null : intval($row['favorite_genre_id']);
        $row['top_genre_id'] = $row['top_genre_id'] === null ? null : intval($row['top_genre_id']);
        $row['genre_distribution'] = mysql_json_decode($row['genre_distribution']);
        $row['genre_distribution_labels'] = mysql_json_decode($row['genre_distribution_labels']);
        $row['genre_distribution_rows'] = mysql_json_decode($row['genre_distribution_rows']);
        $store['user_stats'][$row['user_id']] = $row;
    }

    foreach (fetch_all_rows($pdo, 'movie_requests') as $row) {
        $row['id'] = intval($row['id']);
        $store['movie_requests'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'custom_catalog') as $row) {
        $row['id'] = intval($row['id']);
        $row['movie_id'] = intval($row['movie_id']);
        $row['vote_average'] = floatval($row['vote_average']);
        $row['vote_count'] = intval($row['vote_count']);
        $row['genre_ids'] = mysql_json_decode($row['genre_ids']);
        $row['popularity'] = floatval($row['popularity']);
        $store['custom_catalog'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'badges') as $row) {
        $row['id'] = intval($row['id']);
        $row['active'] = intval($row['active']) === 1;
        $store['badges'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'user_badges') as $row) {
        $row['id'] = intval($row['id']);
        $store['user_badges'][] = $row;
    }

    foreach (fetch_all_rows($pdo, 'quiz_results') as $row) {
        $store['quiz_results'][$row['user_id']] = $row;
    }

    foreach (fetch_all_rows($pdo, 'admin_logs') as $row) {
        $row['id'] = intval($row['id']);
        $store['admin_logs'][] = $row;
    }

    return $store;
}

function bump_next_ids_from_store(&$store) {
    $map = array(
        'comment' => array('comments', 1),
        'pending_comment' => array('pending_comments', 1),
        'rating' => array('ratings', 1),
        'favorite' => array('favorites', 1),
        'watchlist' => array('watchlist', 1),
        'vote' => array('comment_votes', 1),
        'badge' => array('badges', 1),
        'movie_request' => array('movie_requests', 1),
        'catalog_item' => array('custom_catalog', 900000),
        'admin_log' => array('admin_logs', 1),
        'user_badge' => array('user_badges', 1)
    );
    foreach ($map as $key => $info) {
        list($table, $min) = $info;
        $max = $min - 1;
        if (isset($store[$table]) && is_array($store[$table])) {
            foreach ($store[$table] as $row) {
                if (isset($row['id'])) $max = max($max, intval($row['id']));
            }
        }
        $current = isset($store['next_ids'][$key]) ? intval($store['next_ids'][$key]) : $min;
        $store['next_ids'][$key] = max($current, $max + 1, $min);
    }

    // Na BD simplificada os comentários pendentes ficam também na tabela comments.
    // Por isso o contador "comment" tem de considerar comments + pending_comments.
    $maxComment = 0;
    foreach (array('comments', 'pending_comments') as $commentList) {
        if (isset($store[$commentList]) && is_array($store[$commentList])) {
            foreach ($store[$commentList] as $row) {
                if (isset($row['id'])) $maxComment = max($maxComment, intval($row['id']));
            }
        }
    }
    $store['next_ids']['comment'] = max(isset($store['next_ids']['comment']) ? intval($store['next_ids']['comment']) : 1, $maxComment + 1, 1);
}

function ensure_store_shape($store) {
    $default = default_store();
    foreach ($default as $key => $value) {
        if (!array_key_exists($key, $store)) $store[$key] = $value;
    }
    foreach ($default['next_ids'] as $key => $value) {
        if (!isset($store['next_ids'][$key])) $store['next_ids'][$key] = $value;
    }

    if (isset($store['users_favorite_genre']) && is_array($store['users_favorite_genre'])) {
        $store['user_favorite_genre'] = array_replace($store['users_favorite_genre'], $store['user_favorite_genre']);
        unset($store['users_favorite_genre']);
    }
    if (isset($store['users_stats']) && is_array($store['users_stats'])) {
        $store['user_stats'] = array_replace($store['users_stats'], $store['user_stats']);
        unset($store['users_stats']);
    }
    if (isset($store['reviews'])) unset($store['reviews']);
    if (isset($store['next_ids']['review'])) unset($store['next_ids']['review']);

    if (!isset($store['meta']) || !is_array($store['meta'])) $store['meta'] = array();
    $store['meta']['version'] = 6;
    $store['meta']['storage'] = 'mysql';

    foreach ($store['users'] as &$user) {
        if (!isset($user['id']) || trim((string)$user['id']) === '') $user['id'] = 'user_' . bin2hex(random_bytes(8));
        if (!isset($user['username']) || trim((string)$user['username']) === '') {
            $user['username'] = isset($user['email']) && trim((string)$user['email']) !== '' ? explode('@', (string)$user['email'])[0] : 'utilizador';
        }
        $user['username_norm'] = norm_username($user['username']);
        if (!isset($user['password_hash']) || trim((string)$user['password_hash']) === '') {
            $user['password_hash'] = password_hash(isset($user['password']) ? (string)$user['password'] : '123456', PASSWORD_DEFAULT);
        }
        if (!isset($user['role']) || trim((string)$user['role']) === '') $user['role'] = 'user';
        if (!array_key_exists('blocked', $user)) $user['blocked'] = false;
        if (!isset($user['created_at'])) $user['created_at'] = now_iso();
    }
    unset($user);

    $store = ensure_admin($store);
    normalize_media_titles($store);

    foreach ($store['users'] as $user) {
        if (isset($user['id'])) update_user_stats($store, $user['id']);
    }

    bump_next_ids_from_store($store);
    return $store;
}

function mysql_insert(PDO $pdo, $sql, $params) {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
}

function save_store($store) {
    $pdo = pdo_db();
    install_schema($pdo);
    ensure_column($pdo, 'custom_catalog', 'trailer_url', 'VARCHAR(500) NULL');

    // Garante que instalações WAMP antigas recebem colunas novas sem resetar a BD.
    ensure_column($pdo, 'comments', 'original_comment_id', 'INT NULL');
    ensure_column($pdo, 'comments', 'edited_at', 'DATETIME NULL');
    ensure_column($pdo, 'pending_comments', 'original_comment_id', 'INT NULL');
    ensure_column($pdo, 'pending_comments', 'edited_at', 'DATETIME NULL');

    ensure_column($pdo, 'movie_requests', 'poster_url', 'VARCHAR(500) NULL');
    ensure_column($pdo, 'movie_requests', 'trailer_url', 'VARCHAR(500) NULL');
    ensure_column($pdo, 'movie_requests', 'synopsis', 'TEXT NULL');
    if (isset($store['users_favorite_genre'])) unset($store['users_favorite_genre']);
    if (isset($store['users_stats'])) unset($store['users_stats']);
    bump_next_ids_from_store($store);

    try {
        $pdo->beginTransaction();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        foreach (array(
            'app_next_ids','user_stats','user_favorite_genre','user_badges','badges','quiz_results','admin_logs',
            'movie_requests','custom_catalog','movie_genre_links','movie_genres','comment_votes','watchlist','favorites','ratings','pending_comments','comments','users'
        ) as $table) {
            if (table_exists($pdo, $table)) {
                $pdo->exec("DELETE FROM `$table`");
            }
        }

        $stmtNext = $pdo->prepare('INSERT INTO app_next_ids (name, next_value) VALUES (?, ?)');
        foreach ($store['next_ids'] as $name => $value) $stmtNext->execute(array($name, intval($value)));

        $stmtUser = $pdo->prepare('INSERT INTO users (id,email,username,username_norm,password_hash,role,blocked,created_at) VALUES (?,?,?,?,?,?,?,?)');
        foreach ($store['users'] as $u) {
            $stmtUser->execute(array(
                (string)$u['id'], isset($u['email']) ? $u['email'] : null, (string)$u['username'], isset($u['username_norm']) ? $u['username_norm'] : norm_username($u['username']),
                (string)$u['password_hash'], isset($u['role']) ? $u['role'] : 'user', mysql_bool(isset($u['blocked']) ? $u['blocked'] : false), isset($u['created_at']) ? $u['created_at'] : now_iso()
            ));
        }

        $stmtRating = $pdo->prepare('INSERT INTO ratings (id,user_id,username,movie_id,media_type,media_title,rating,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
        foreach ($store['ratings'] as $r) {
            $stmtRating->execute(array(intval($r['id']), (string)$r['user_id'], isset($r['username']) ? $r['username'] : null, intval($r['movie_id']), isset($r['media_type']) ? $r['media_type'] : 'movie', isset($r['media_title']) ? $r['media_title'] : null, floatval($r['rating']), isset($r['created_at']) ? $r['created_at'] : now_iso(), isset($r['updated_at']) ? $r['updated_at'] : now_iso()));
        }

        $stmtComment = $pdo->prepare('INSERT INTO comments (id,user_id,username,movie_id,media_type,media_title,content,is_spoiler,parent_id,status,likes,dislikes,created_at,approved_at,original_comment_id,edited_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $commentsToSave = $store['comments'];
        if (!table_exists($pdo, 'pending_comments')) {
            foreach ($store['pending_comments'] as $pendingComment) {
                $pendingComment['status'] = 'pending';
                $commentsToSave[] = $pendingComment;
            }
        }
        foreach ($commentsToSave as $c) {
            $stmtComment->execute(array(intval($c['id']), (string)$c['user_id'], isset($c['username']) ? $c['username'] : null, intval($c['movie_id']), isset($c['media_type']) ? $c['media_type'] : 'movie', isset($c['media_title']) ? $c['media_title'] : null, isset($c['content']) ? $c['content'] : '', mysql_bool(isset($c['is_spoiler']) ? $c['is_spoiler'] : false), isset($c['parent_id']) ? $c['parent_id'] : null, isset($c['status']) ? $c['status'] : 'approved', isset($c['likes']) ? intval($c['likes']) : 0, isset($c['dislikes']) ? intval($c['dislikes']) : 0, isset($c['created_at']) ? $c['created_at'] : now_iso(), isset($c['approved_at']) ? $c['approved_at'] : null, isset($c['original_comment_id']) && $c['original_comment_id'] !== null ? intval($c['original_comment_id']) : null, isset($c['edited_at']) ? $c['edited_at'] : null));
        }

        if (table_exists($pdo, 'pending_comments')) {
            $stmtPending = $pdo->prepare('INSERT INTO pending_comments (id,user_id,username,movie_id,media_type,media_title,content,is_spoiler,parent_id,status,likes,dislikes,created_at,approved_at,original_comment_id,edited_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            foreach ($store['pending_comments'] as $c) {
                $stmtPending->execute(array(intval($c['id']), (string)$c['user_id'], isset($c['username']) ? $c['username'] : null, intval($c['movie_id']), isset($c['media_type']) ? $c['media_type'] : 'movie', isset($c['media_title']) ? $c['media_title'] : null, isset($c['content']) ? $c['content'] : '', mysql_bool(isset($c['is_spoiler']) ? $c['is_spoiler'] : false), isset($c['parent_id']) ? $c['parent_id'] : null, isset($c['status']) ? $c['status'] : 'pending', isset($c['likes']) ? intval($c['likes']) : 0, isset($c['dislikes']) ? intval($c['dislikes']) : 0, isset($c['created_at']) ? $c['created_at'] : now_iso(), isset($c['approved_at']) ? $c['approved_at'] : null, isset($c['original_comment_id']) && $c['original_comment_id'] !== null ? intval($c['original_comment_id']) : null, isset($c['edited_at']) ? $c['edited_at'] : null));
            }
        }

        $stmtFav = $pdo->prepare('INSERT INTO favorites (id,user_id,movie_id,media_type,media_title,created_at) VALUES (?,?,?,?,?,?)');
        foreach ($store['favorites'] as $f) {
            $stmtFav->execute(array(intval($f['id']), (string)$f['user_id'], intval($f['movie_id']), isset($f['media_type']) ? $f['media_type'] : 'movie', isset($f['media_title']) ? $f['media_title'] : null, isset($f['created_at']) ? $f['created_at'] : now_iso()));
        }

        $stmtWish = $pdo->prepare('INSERT INTO watchlist (id,user_id,movie_id,media_type,media_title,created_at) VALUES (?,?,?,?,?,?)');
        foreach ($store['watchlist'] as $w) {
            $stmtWish->execute(array(intval($w['id']), (string)$w['user_id'], intval($w['movie_id']), isset($w['media_type']) ? $w['media_type'] : 'movie', isset($w['media_title']) ? $w['media_title'] : null, isset($w['created_at']) ? $w['created_at'] : now_iso()));
        }

        $stmtVote = $pdo->prepare('INSERT INTO comment_votes (id,user_id,comment_id,vote_type,created_at) VALUES (?,?,?,?,?)');
        foreach ($store['comment_votes'] as $v) {
            $stmtVote->execute(array(intval($v['id']), (string)$v['user_id'], intval($v['comment_id']), isset($v['vote_type']) ? $v['vote_type'] : 'like', isset($v['created_at']) ? $v['created_at'] : now_iso()));
        }

        if (table_exists($pdo, 'movie_genres')) {
            $stmtMG = $pdo->prepare('INSERT INTO movie_genres (movie_id,media_type,media_title,genre_ids,genre_names,created_at,updated_at) VALUES (?,?,?,?,?,?,?)');
            foreach ($store['movie_genres'] as $mg) {
                $stmtMG->execute(array(intval($mg['movie_id']), isset($mg['media_type']) ? $mg['media_type'] : 'movie', isset($mg['media_title']) ? $mg['media_title'] : null, mysql_json_encode(isset($mg['genre_ids']) ? $mg['genre_ids'] : array()), mysql_json_encode(isset($mg['genre_names']) ? $mg['genre_names'] : array()), isset($mg['created_at']) ? $mg['created_at'] : now_iso(), isset($mg['updated_at']) ? $mg['updated_at'] : now_iso()));
            }
        }

        if (table_exists($pdo, 'user_favorite_genre')) {
            $stmtUFG = $pdo->prepare('INSERT INTO user_favorite_genre (user_id,genre_id,genre_name,score,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?)');
            foreach ($store['user_favorite_genre'] as $ufg) {
                $stmtUFG->execute(array((string)$ufg['user_id'], isset($ufg['genre_id']) ? $ufg['genre_id'] : null, isset($ufg['genre_name']) ? $ufg['genre_name'] : null, isset($ufg['score']) ? $ufg['score'] : null, isset($ufg['source']) ? $ufg['source'] : 'auto', isset($ufg['created_at']) ? $ufg['created_at'] : null, isset($ufg['updated_at']) ? $ufg['updated_at'] : now_iso()));
            }
        }

        if (table_exists($pdo, 'user_stats')) {
            $stmtStats = $pdo->prepare('INSERT INTO user_stats (user_id,ratings_total,comments_total,pending_comments_total,favorites_total,ratings_avg,movies_watched,movies_rated,comments_posted,favorite_genre_id,favorite_genre_name,top_genre_id,top_genre_name,genre_distribution,genre_distribution_labels,genre_distribution_rows,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            foreach ($store['user_stats'] as $s) {
                $stmtStats->execute(array((string)$s['user_id'], intval($s['ratings_total']), intval($s['comments_total']), intval($s['pending_comments_total']), intval($s['favorites_total']), floatval($s['ratings_avg']), intval($s['movies_watched']), intval($s['movies_rated']), intval($s['comments_posted']), isset($s['favorite_genre_id']) ? $s['favorite_genre_id'] : null, isset($s['favorite_genre_name']) ? $s['favorite_genre_name'] : null, isset($s['top_genre_id']) ? $s['top_genre_id'] : null, isset($s['top_genre_name']) ? $s['top_genre_name'] : null, mysql_json_encode(isset($s['genre_distribution']) ? $s['genre_distribution'] : array()), mysql_json_encode(isset($s['genre_distribution_labels']) ? $s['genre_distribution_labels'] : array()), mysql_json_encode(isset($s['genre_distribution_rows']) ? $s['genre_distribution_rows'] : array()), isset($s['updated_at']) ? $s['updated_at'] : now_iso()));
            }
        }

        $stmtReq = $pdo->prepare('INSERT INTO movie_requests (id,user_id,username,title,media_type,note,poster_url,trailer_url,synopsis,admin_note,status,created_at,updated_at,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        foreach ($store['movie_requests'] as $r) {
            $stmtReq->execute(array(
                intval($r['id']),
                (string)$r['user_id'],
                isset($r['username']) ? $r['username'] : null,
                isset($r['title']) ? $r['title'] : '',
                isset($r['media_type']) ? $r['media_type'] : 'movie',
                isset($r['note']) ? $r['note'] : null,
                isset($r['poster_url']) ? $r['poster_url'] : null,
                isset($r['trailer_url']) ? $r['trailer_url'] : null,
                isset($r['synopsis']) ? $r['synopsis'] : null,
                isset($r['admin_note']) ? $r['admin_note'] : null,
                isset($r['status']) ? $r['status'] : 'pending',
                isset($r['created_at']) ? $r['created_at'] : now_iso(),
                isset($r['updated_at']) ? $r['updated_at'] : now_iso(),
                isset($r['completed_at']) ? $r['completed_at'] : null
            ));
        }

        $stmtCat = $pdo->prepare('INSERT INTO custom_catalog (id,movie_id,title,name,poster_path,backdrop_path,trailer_url,overview,vote_average,vote_count,release_date,first_air_date,media_type,genre_ids,popularity,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        foreach ($store['custom_catalog'] as $c) {
            $stmtCat->execute(array(intval($c['id']), intval(isset($c['movie_id']) ? $c['movie_id'] : $c['id']), isset($c['title']) ? $c['title'] : null, isset($c['name']) ? $c['name'] : null, isset($c['poster_path']) ? $c['poster_path'] : null, isset($c['backdrop_path']) ? $c['backdrop_path'] : null, isset($c['trailer_url']) ? $c['trailer_url'] : null, isset($c['overview']) ? $c['overview'] : null, isset($c['vote_average']) ? floatval($c['vote_average']) : 0, isset($c['vote_count']) ? intval($c['vote_count']) : 0, isset($c['release_date']) ? $c['release_date'] : null, isset($c['first_air_date']) ? $c['first_air_date'] : null, isset($c['media_type']) ? $c['media_type'] : 'movie', mysql_json_encode(isset($c['genre_ids']) ? $c['genre_ids'] : array()), isset($c['popularity']) ? floatval($c['popularity']) : 0, isset($c['created_at']) ? $c['created_at'] : now_iso()));
        }

        $stmtBadge = $pdo->prepare('INSERT INTO badges (id,badge_key,name,description,icon,type,category,rarity,level,xp_reward,points,color,icon_path,requirement_label,unlock_hint,criteria_json,is_secret,rarity_weight,sort_order,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        foreach ($store['badges'] as $b) {
            $criteria = isset($b['criteria_json'])
                ? (is_array($b['criteria_json']) ? json_encode($b['criteria_json'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : $b['criteria_json'])
                : null;
            $stmtBadge->execute(array(
                intval($b['id']),
                isset($b['badge_key']) ? $b['badge_key'] : ('badge_' . intval($b['id'])),
                isset($b['name']) ? $b['name'] : '',
                isset($b['description']) ? $b['description'] : null,
                isset($b['icon']) ? $b['icon'] : null,
                isset($b['type']) ? $b['type'] : null,
                isset($b['category']) ? $b['category'] : 'general',
                isset($b['rarity']) ? $b['rarity'] : 'common',
                isset($b['level']) ? intval($b['level']) : 1,
                isset($b['xp_reward']) ? intval($b['xp_reward']) : 0,
                isset($b['points']) ? intval($b['points']) : 0,
                isset($b['color']) ? $b['color'] : null,
                isset($b['icon_path']) ? $b['icon_path'] : null,
                isset($b['requirement_label']) ? $b['requirement_label'] : null,
                isset($b['unlock_hint']) ? $b['unlock_hint'] : null,
                $criteria,
                mysql_bool(isset($b['is_secret']) ? $b['is_secret'] : false),
                isset($b['rarity_weight']) ? intval($b['rarity_weight']) : 1,
                isset($b['sort_order']) ? intval($b['sort_order']) : 0,
                mysql_bool(isset($b['active']) ? $b['active'] : true),
                isset($b['created_at']) ? $b['created_at'] : now_iso(),
                isset($b['updated_at']) ? $b['updated_at'] : now_iso()
            ));
        }

        $stmtUB = $pdo->prepare('INSERT INTO user_badges (id,user_id,badge_key,awarded_at) VALUES (?,?,?,?)');
        foreach ($store['user_badges'] as $ub) {
            $stmtUB->execute(array(isset($ub['id']) ? intval($ub['id']) : next_id($store, 'user_badge'), isset($ub['user_id']) ? $ub['user_id'] : '', isset($ub['badge_key']) ? $ub['badge_key'] : '', isset($ub['awarded_at']) ? $ub['awarded_at'] : now_iso()));
        }

        $stmtQuiz = $pdo->prepare('INSERT INTO quiz_results (user_id,result_key,result_label,result_desc,created_at) VALUES (?,?,?,?,?)');
        foreach ($store['quiz_results'] as $q) {
            $stmtQuiz->execute(array((string)$q['user_id'], isset($q['result_key']) ? $q['result_key'] : null, isset($q['result_label']) ? $q['result_label'] : null, isset($q['result_desc']) ? $q['result_desc'] : null, isset($q['created_at']) ? $q['created_at'] : now_iso()));
        }

        $stmtLog = $pdo->prepare('INSERT INTO admin_logs (id,admin_id,action,target_type,target_id,details,created_at) VALUES (?,?,?,?,?,?,?)');
        foreach ($store['admin_logs'] as $l) {
            $stmtLog->execute(array(intval($l['id']), isset($l['admin_id']) ? $l['admin_id'] : null, isset($l['action']) ? $l['action'] : '', isset($l['target_type']) ? $l['target_type'] : null, isset($l['target_id']) ? $l['target_id'] : null, isset($l['details']) ? $l['details'] : null, isset($l['created_at']) ? $l['created_at'] : now_iso()));
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        $pdo->commit();
    } catch (Throwable $e) {
        try { $pdo->exec('SET FOREIGN_KEY_CHECKS=1'); } catch (Throwable $ignore) {}
        if ($pdo->inTransaction()) $pdo->rollBack();
        json_response(array('ok' => false, 'error' => 'db_write_failed', 'message' => 'Falha ao gravar na base de dados MySQL.', 'details' => $e->getMessage()), 500);
    }
}

function load_store() {
    $pdo = pdo_db();
    $store = load_store_from_mysql($pdo);
    $store = ensure_store_shape($store);
    save_store($store);
    return $store;
}

function reset_store() {
    $store = default_store();
    $store = ensure_store_shape($store);
    save_store($store);
    return $store;
}

function import_legacy_json_store($force = false) {
    $path = store_path();
    if (!file_exists($path)) {
        return array('ok' => false, 'message' => 'Não existe data/movings_store.json para importar.');
    }
    $raw = file_get_contents($path);
    $store = json_decode($raw, true);
    if (!is_array($store)) {
        return array('ok' => false, 'message' => 'O JSON antigo existe, mas está inválido.');
    }
    $pdo = pdo_db();
    $count = intval($pdo->query('SELECT COUNT(*) AS total FROM users')->fetch()['total']);
    if ($count > 0 && !$force) {
        return array('ok' => false, 'message' => 'A base de dados já tem utilizadores. Usa ?force=1 para substituir pelos dados do JSON.');
    }
    $store = ensure_store_shape($store);
    save_store($store);
    return array('ok' => true, 'message' => 'JSON antigo importado para MySQL.', 'counts' => array(
        'users' => count($store['users']),
        'ratings' => count($store['ratings']),
        'comments' => count($store['comments']),
        'favorites' => count($store['favorites']),
        'watchlist' => count($store['watchlist'])
    ));
}

function now_iso() {
    return date('Y-m-d H:i:s');
}

function text_lower($value) {
    $value = trim((string)$value);
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($value, 'UTF-8');
    }
    return strtolower($value);
}

function text_length($value) {
    $value = (string)$value;
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }
    return strlen($value);
}

function text_substr($value, $start, $length) {
    $value = (string)$value;
    if (function_exists('mb_substr')) {
        return mb_substr($value, $start, $length, 'UTF-8');
    }
    return substr($value, $start, $length);
}

function norm_username($username) {
    return text_lower($username);
}

function clean_text($value, $max = 2000) {
    $value = trim(strip_tags((string)$value));
    if (text_length($value) > $max) {
        $value = text_substr($value, 0, $max);
    }
    return $value;
}

function next_id(&$store, $key) {
    if (!isset($store['next_ids'][$key])) {
        $store['next_ids'][$key] = 1;
    }
    $id = intval($store['next_ids'][$key]);
    $store['next_ids'][$key] = $id + 1;
    return $id;
}

function ensure_admin($store) {
    $foundIndex = null;
    foreach ($store['users'] as $i => $user) {
        $usernameNorm = isset($user['username_norm']) ? $user['username_norm'] : norm_username(isset($user['username']) ? $user['username'] : '');
        if ($usernameNorm === 'admin') {
            $foundIndex = $i;
            break;
        }
    }

    $admin = array(
        'id' => 'admin_1',
        'email' => 'admin@movings.local',
        'username' => 'admin',
        'username_norm' => 'admin',
        'password_hash' => password_hash('admin123', PASSWORD_DEFAULT),
        'role' => 'admin',
        'blocked' => false,
        'created_at' => now_iso()
    );

    if ($foundIndex === null) {
        $store['users'][] = $admin;
    } else {
        $old = $store['users'][$foundIndex];
        $admin['created_at'] = isset($old['created_at']) ? $old['created_at'] : now_iso();
        // Mantém o id fixo para o admin, mas não toca nos restantes utilizadores.
        $store['users'][$foundIndex] = $admin;
    }

    return $store;
}

function read_json_body() {
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return array();
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_response(array('ok' => false, 'error' => 'invalid_json', 'message' => 'JSON inválido.'), 400);
    }
    return $data;
}

function find_user_by_username($store, $username) {
    $norm = norm_username($username);
    foreach ($store['users'] as $user) {
        $candidateNorm = isset($user['username_norm']) ? $user['username_norm'] : norm_username(isset($user['username']) ? $user['username'] : '');
        if ($candidateNorm === $norm) {
            return $user;
        }
    }
    return null;
}

function find_user_by_identifier($store, $identifier) {
    $identifier = trim((string)$identifier);
    if ($identifier === '') return null;

    $user = find_user_by_username($store, $identifier);
    if ($user) {
        return $user;
    }

    $needle = text_lower($identifier);
    foreach ($store['users'] as $candidate) {
        $email = isset($candidate['email']) ? text_lower($candidate['email']) : '';
        if ($email !== '' && $email === $needle) {
            return $candidate;
        }
    }
    return null;
}

function find_user_by_id($store, $id) {
    foreach ($store['users'] as $user) {
        if (isset($user['id']) && (string)$user['id'] === (string)$id) {
            return $user;
        }
    }
    return null;
}

function user_password_matches($user, $password) {
    if (!is_array($user)) return false;
    if (isset($user['password_hash']) && trim((string)$user['password_hash']) !== '') {
        $hash = (string)$user['password_hash'];
        if (password_verify($password, $hash)) return true;
        // Compatibilidade com stores antigos onde a password ficou gravada em texto nesta coluna.
        if (!preg_match('/^\$2y\$|^\$argon2/i', $hash) && hash_equals($hash, (string)$password)) return true;
    }
    foreach (array('password', 'password_plain', 'plain_password') as $legacyKey) {
        if (isset($user[$legacyKey]) && hash_equals((string)$user[$legacyKey], (string)$password)) return true;
    }
    return false;
}

function public_user($user) {
    return array(
        'id' => $user['id'],
        'email' => isset($user['email']) ? $user['email'] : null,
        'username' => $user['username'],
        'role' => isset($user['role']) ? $user['role'] : 'user',
        'blocked' => !empty($user['blocked'])
    );
}

function base64url_encode_movings($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode_movings($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $data .= str_repeat('=', 4 - $remainder);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_secret() {
    $configuredSecret = trim((string)movings_env_value('MOVINGS_JWT_SECRET', ''));
    if ($configuredSecret !== '') {
        return $configuredSecret;
    }

    // Fallback local preservado para não invalidar sessões/tokens existentes em WAMP/PAP.
    return 'movings-pap-local-json-secret';
}

function generate_token($user) {
    $header = array('alg' => 'HS256', 'typ' => 'JWT');
    $payload = array(
        'iat' => time(),
        'exp' => time() + 86400,
        'user_id' => $user['id'],
        'username' => $user['username'],
        'role' => isset($user['role']) ? $user['role'] : 'user'
    );
    $h = base64url_encode_movings(json_encode($header));
    $p = base64url_encode_movings(json_encode($payload));
    $s = base64url_encode_movings(hash_hmac('sha256', $h . '.' . $p, jwt_secret(), true));
    return $h . '.' . $p . '.' . $s;
}

function validate_token($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    list($h, $p, $s) = $parts;
    $expected = base64url_encode_movings(hash_hmac('sha256', $h . '.' . $p, jwt_secret(), true));
    if (!hash_equals($expected, $s)) {
        return null;
    }
    $payload = json_decode(base64url_decode_movings($p), true);
    if (!is_array($payload) || !isset($payload['exp']) || $payload['exp'] < time()) {
        return null;
    }
    return $payload;
}

function auth_header() {
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                return $value;
            }
        }
    }
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) return $_SERVER['HTTP_AUTHORIZATION'];
    if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    return '';
}

function current_user_from_store($store) {
    $auth = auth_header();
    if (!$auth || !preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
        return null;
    }
    $payload = validate_token($m[1]);
    if (!$payload || !isset($payload['user_id'])) {
        return null;
    }
    $user = find_user_by_id($store, $payload['user_id']);
    if (!$user || !empty($user['blocked'])) {
        return null;
    }
    return $user;
}

function require_admin_from_store($store) {
    $user = current_user_from_store($store);
    if (!$user || (isset($user['role']) ? $user['role'] : 'user') !== 'admin') {
        json_response(array('ok' => false, 'error' => 'forbidden', 'message' => 'Só admin pode aceder.'), 403);
    }
    return $user;
}

function require_user_from_store($store) {
    $user = current_user_from_store($store);
    if (!$user) {
        json_response(array('ok' => false, 'error' => 'unauthorized', 'message' => 'É preciso iniciar sessão.'), 401);
    }
    return $user;
}

function require_same_user_or_admin($store, $targetUserId) {
    $user = require_user_from_store($store);
    $role = isset($user['role']) ? $user['role'] : 'user';
    if ($role === 'admin' || (isset($user['id']) && (string)$user['id'] === (string)$targetUserId)) {
        return $user;
    }
    json_response(array('ok' => false, 'error' => 'forbidden', 'message' => 'Só podes aceder aos teus próprios dados.'), 403);
}

function authenticated_user_id($store, $providedUserId = '') {
    $user = require_user_from_store($store);
    $role = isset($user['role']) ? $user['role'] : 'user';
    if ($role === 'admin' && trim((string)$providedUserId) !== '') {
        return clean_text($providedUserId, 80);
    }
    return isset($user['id']) ? (string)$user['id'] : '';
}

function log_admin_action(&$store, $adminId, $action, $targetType, $targetId, $details = '') {
    $store['admin_logs'][] = array(
        'id' => next_id($store, 'admin_log'),
        'admin_id' => $adminId,
        'action' => $action,
        'target_type' => $targetType,
        'target_id' => (string)$targetId,
        'details' => $details,
        'created_at' => now_iso()
    );
}

function media_key($movieId, $mediaType) {
    return intval($movieId) . '|' . ($mediaType === 'tv' ? 'tv' : 'movie');
}

function genre_name_by_id($genreId) {
    $genres = array(
        12 => 'Aventura', 14 => 'Fantasia', 16 => 'Animação', 18 => 'Drama', 27 => 'Terror', 28 => 'Ação',
        35 => 'Comédia', 36 => 'História', 37 => 'Western', 53 => 'Thriller', 80 => 'Crime', 99 => 'Documentário',
        878 => 'Ficção científica', 9648 => 'Mistério', 10402 => 'Música', 10749 => 'Romance', 10751 => 'Família',
        10752 => 'Guerra', 10759 => 'Ação e aventura', 10762 => 'Infantil', 10763 => 'Notícias', 10764 => 'Reality',
        10765 => 'Sci-Fi & Fantasia', 10766 => 'Novela', 10767 => 'Talk show', 10768 => 'Guerra e política',
        10770 => 'Telefilme'
    );
    $id = intval($genreId);
    return isset($genres[$id]) ? $genres[$id] : ('Género #' . $id);
}

function title_from_row($row) {
    if (!is_array($row)) return '';
    foreach (array('media_title', 'title', 'name', 'movie_title', 'series_title') as $key) {
        if (isset($row[$key]) && trim((string)$row[$key]) !== '') return trim((string)$row[$key]);
    }
    return '';
}

function resolve_media_title($store, $movieId, $mediaType, $fallback = '') {
    $movieId = intval($movieId);
    $mediaType = $mediaType === 'tv' ? 'tv' : 'movie';
    if (trim((string)$fallback) !== '') return clean_text($fallback, 200);

    foreach (array('custom_catalog', 'ratings', 'comments', 'pending_comments', 'favorites', 'watchlist', 'movie_genres', 'movie_requests') as $table) {
        if (!isset($store[$table]) || !is_array($store[$table])) continue;
        foreach ($store[$table] as $row) {
            if (!is_array($row)) continue;
            $rowId = isset($row['movie_id']) ? intval($row['movie_id']) : (isset($row['id']) ? intval($row['id']) : 0);
            $rowType = isset($row['media_type']) && $row['media_type'] === 'tv' ? 'tv' : 'movie';
            if ($rowId === $movieId && $rowType === $mediaType) {
                $title = title_from_row($row);
                if ($title !== '') return clean_text($title, 200);
            }
        }
    }

    return '';
}

function ensure_row_media_title(&$store, &$row) {
    if (!is_array($row) || !isset($row['movie_id'])) return;
    $mediaType = isset($row['media_type']) && $row['media_type'] === 'tv' ? 'tv' : 'movie';
    $currentTitle = title_from_row($row);
    $resolved = resolve_media_title($store, intval($row['movie_id']), $mediaType, $currentTitle);
    if ($resolved !== '') $row['media_title'] = $resolved;
}

function normalize_media_titles(&$store) {
    foreach (array('ratings', 'comments', 'pending_comments', 'favorites', 'watchlist', 'movie_genres') as $table) {
        if (!isset($store[$table]) || !is_array($store[$table])) $store[$table] = array();
        foreach ($store[$table] as &$row) {
            ensure_row_media_title($store, $row);
        }
        unset($row);
    }
}

function decorated_media_rows($store, $rows) {
    $out = array();
    foreach ($rows as $row) {
        ensure_row_media_title($store, $row);
        $out[] = $row;
    }
    return $out;
}

function interaction_matches_media($row, $movieId, $mediaType) {
    if (!is_array($row) || !isset($row['movie_id'])) return false;
    $rowType = isset($row['media_type']) && $row['media_type'] === 'tv' ? 'tv' : 'movie';
    return intval($row['movie_id']) === intval($movieId) && $rowType === ($mediaType === 'tv' ? 'tv' : 'movie');
}

function update_users_for_media(&$store, $movieId, $mediaType) {
    $users = array();
    foreach (array('ratings', 'comments', 'favorites', 'watchlist') as $table) {
        if (!isset($store[$table]) || !is_array($store[$table])) continue;
        foreach ($store[$table] as $row) {
            if (interaction_matches_media($row, $movieId, $mediaType) && isset($row['user_id'])) $users[$row['user_id']] = true;
        }
    }
    foreach (array_keys($users) as $userId) update_user_stats($store, $userId);
}

function update_user_stats(&$store, $userId) {
    $userId = (string)$userId;
    if ($userId === '') return;

    if (!isset($store['user_stats']) || !is_array($store['user_stats'])) $store['user_stats'] = array();
    if (!isset($store['user_favorite_genre']) || !is_array($store['user_favorite_genre'])) $store['user_favorite_genre'] = array();

    $ratings = array();
    $comments = array();
    $pendingComments = array();
    $favorites = array();

    foreach ($store['ratings'] as $r) if (isset($r['user_id']) && $r['user_id'] === $userId) $ratings[] = $r;
    foreach ($store['comments'] as $c) if (isset($c['user_id']) && $c['user_id'] === $userId) $comments[] = $c;
    foreach ($store['pending_comments'] as $c) if (isset($c['user_id']) && $c['user_id'] === $userId) $pendingComments[] = $c;
    foreach ($store['favorites'] as $f) if (isset($f['user_id']) && $f['user_id'] === $userId) $favorites[] = $f;

    $ratingsTotal = count($ratings);
    $commentsTotal = count($comments);
    $pendingCommentsTotal = count($pendingComments);
    $favoritesTotal = count($favorites);

    $ratingsAvg = 0;
    if ($ratingsTotal > 0) {
        $sum = 0;
        foreach ($ratings as $r) $sum += floatval(isset($r['rating']) ? $r['rating'] : 0);
        $ratingsAvg = round($sum / $ratingsTotal, 1);
    }

    $genreDistribution = array();
    $genreLabels = array();
    $accumulateGenres = function($movieId, $mediaType, $weight) use ($store, &$genreDistribution, &$genreLabels) {
        $key = media_key($movieId, $mediaType);
        if (!isset($store['movie_genres'][$key]['genre_ids']) || !is_array($store['movie_genres'][$key]['genre_ids'])) return;
        foreach ($store['movie_genres'][$key]['genre_ids'] as $genreId) {
            $gid = (string)intval($genreId);
            if (intval($gid) <= 0) continue;
            if (!isset($genreDistribution[$gid])) $genreDistribution[$gid] = 0;
            $genreDistribution[$gid] += $weight;
            $genreLabels[$gid] = genre_name_by_id($gid);
        }
    };

    foreach ($ratings as $r) $accumulateGenres(intval($r['movie_id']), isset($r['media_type']) ? $r['media_type'] : 'movie', 2);
    foreach ($favorites as $f) $accumulateGenres(intval($f['movie_id']), isset($f['media_type']) ? $f['media_type'] : 'movie', 3);
    foreach ($comments as $c) $accumulateGenres(intval($c['movie_id']), isset($c['media_type']) ? $c['media_type'] : 'movie', 1);

    $topGenreId = null;
    $topScore = -1;
    foreach ($genreDistribution as $gid => $score) {
        if ($score > $topScore) {
            $topScore = $score;
            $topGenreId = intval($gid);
        }
    }
    $topGenreName = $topGenreId ? genre_name_by_id($topGenreId) : null;

    $genreRows = array();
    foreach ($genreDistribution as $gid => $score) {
        $genreRows[] = array('genre_id' => intval($gid), 'genre_name' => genre_name_by_id($gid), 'count' => $score);
    }
    usort($genreRows, function($a, $b) {
        if ($a['count'] === $b['count']) return strcmp($a['genre_name'], $b['genre_name']);
        return $b['count'] <=> $a['count'];
    });

    $stats = array(
        'user_id' => $userId,
        'ratings_total' => $ratingsTotal,
        'comments_total' => $commentsTotal,
        'pending_comments_total' => $pendingCommentsTotal,
        'favorites_total' => $favoritesTotal,
        'ratings_avg' => $ratingsAvg,
        'movies_watched' => $ratingsTotal,
        'movies_rated' => $ratingsTotal,
        'comments_posted' => $commentsTotal,
        'favorite_genre_id' => $topGenreId,
        'favorite_genre_name' => $topGenreName,
        'top_genre_id' => $topGenreId,
        'top_genre_name' => $topGenreName,
        'genre_distribution' => $genreDistribution,
        'genre_distribution_labels' => $genreLabels,
        'genre_distribution_rows' => $genreRows,
        'updated_at' => now_iso()
    );

    $store['user_stats'][$userId] = $stats;
    $store['user_favorite_genre'][$userId] = array(
        'user_id' => $userId,
        'genre_id' => $topGenreId,
        'genre_name' => $topGenreName,
        'score' => $topScore > 0 ? $topScore : 0,
        'source' => 'auto',
        'updated_at' => now_iso()
    );
}
?>
