<?php
// Debug page to check authentication and API connectivity
session_start();

echo "<h1>Debug Information</h1>";

echo "<h2>Session Data:</h2>";
echo "<pre>";
print_r($_SESSION);
echo "</pre>";

echo "<h2>Server Environment:</h2>";
echo "<pre>";
echo "PHP Version: " . phpversion() . "\n";
echo "CURL Available: " . (function_exists('curl_init') ? 'Yes' : 'No') . "\n";
echo "JSON Available: " . (function_exists('json_encode') ? 'Yes' : 'No') . "\n";
echo "</pre>";

if (isset($_SESSION['sessionToken'])) {
    echo "<h2>API Test:</h2>";
    
    $API_BASE_URL = 'http://10.216.219.139/lastchapter/tn-happykids-playschool/server';
    $SESSION_TOKEN = $_SESSION['sessionToken'];
    
    // Test API call
    $url = $API_BASE_URL . '/api/dashboard/attendance_hub_stats.php';
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $SESSION_TOKEN
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    echo "<h3>API Call Details:</h3>";
    echo "<pre>";
    echo "URL: " . $url . "\n";
    echo "Headers: " . print_r($headers, true) . "\n";
    echo "HTTP Code: " . $httpCode . "\n";
    echo "CURL Error: " . ($curlError ?: 'None') . "\n";
    echo "Response: " . $response . "\n";
    echo "</pre>";
    
    if ($httpCode === 200) {
        $result = json_decode($response, true);
        echo "<h3>Parsed Response:</h3>";
        echo "<pre>";
        print_r($result);
        echo "</pre>";
    }
} else {
    echo "<h2>No Session Token Found</h2>";
    echo "<p><a href='login.php'>Go to Login</a></p>";
}
?>
