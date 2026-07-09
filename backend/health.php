<?php
require_once __DIR__ . '/db.php';

try {
    $cfg = movings_config();
    $pdo = pdo_db();
    $pdo->query('SELECT 1');

    $requiredTables = array('users', 'ratings', 'comments', 'watchlist', 'password_resets');
    $existingTables = array();

    foreach ($requiredTables as $tableName) {
        $stmt = $pdo->prepare('SHOW TABLES LIKE ?');
        $stmt->execute(array($tableName));
        if ($stmt->fetchColumn()) {
            $existingTables[] = $tableName;
        }
    }

    $schemaReady = count($existingTables) === count($requiredTables);

    json_response(array(
        'ok' => true,
        'status' => 'ok',
        'service' => 'Movings PHP API',
        'backend' => 'connected',
        'database' => 'connected',
        'schema' => $schemaReady ? 'ready' : 'missing_or_partial',
        'tables_found' => $existingTables,
        'php_version' => PHP_VERSION,
        'message' => $schemaReady
            ? 'Backend Movings operacional.'
            : 'Backend online; confirma/importa os SQL da pasta database se algum endpoint falhar.'
    ));
} catch (Throwable $e) {
    json_response(array(
        'ok' => false,
        'status' => 'error',
        'service' => 'Movings PHP API',
        'backend' => 'online',
        'database' => 'offline',
        'message' => 'Backend PHP respondeu, mas falhou a ligação ao MySQL.',
        'details' => $e->getMessage()
    ), 500);
}
?>
