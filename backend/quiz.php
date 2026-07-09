<?php
require_once __DIR__ . '/db.php';
try {
    $store = load_store();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $providedUserId = isset($_GET['user_id']) ? clean_text($_GET['user_id'], 80) : '';
        $userId = authenticated_user_id($store, $providedUserId);
        $result = isset($store['quiz_results'][$userId]) ? $store['quiz_results'][$userId] : null;
        json_response(array('ok' => true, 'result' => $result));
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(array('ok' => false, 'error' => 'method_not_allowed'), 405);
    $data = read_json_body();
    $providedUserId = isset($data['user_id']) ? clean_text($data['user_id'], 80) : '';
    $userId = authenticated_user_id($store, $providedUserId);
    if ($userId === '') json_response(array('ok' => false, 'error' => 'missing_user'), 400);
    $store['quiz_results'][$userId] = array(
        'user_id' => $userId,
        'result_key' => isset($data['result_key']) ? clean_text($data['result_key'], 80) : '',
        'result_label' => isset($data['result_label']) ? clean_text($data['result_label'], 200) : '',
        'result_desc' => isset($data['result_desc']) ? clean_text($data['result_desc'], 1000) : '',
        'created_at' => now_iso()
    );
    save_store($store);
    json_response(array('ok' => true));
} catch (Throwable $e) { json_response(array('ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()), 500); }
?>
