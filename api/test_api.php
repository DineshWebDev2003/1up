<?php
// Simple API Test Endpoint for TN Happy Kids Playschool
// Tests basic API functionality and server configuration

// Include database connection (includes CORS headers)
require_once __DIR__ . '/config/database.php';

echo json_encode([
    'success' => true,
    'message' => 'API is working!',
    'timestamp' => date('Y-m-d H:i:s'),
    'method' => $_SERVER['REQUEST_METHOD'],
    'data' => [
        'server_info' => 'PHP ' . phpversion(),
        'request_uri' => $_SERVER['REQUEST_URI']
    ]
]);
?>
