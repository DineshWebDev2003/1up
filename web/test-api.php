<?php
// Simple API connectivity test
echo "<h1>API Connectivity Test</h1>";

$apiUrl = 'http://10.216.219.139/lastchapter/api/auth/login.php';
echo "<h2>Testing API URL: " . $apiUrl . "</h2>";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

// Test with invalid credentials to see if API responds
$testData = json_encode([
    'email' => 'test@test.com',
    'password' => 'wrongpassword'
]);

curl_setopt($ch, CURLOPT_POSTFIELDS, $testData);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "<h3>Results:</h3>";
echo "<pre>";
echo "HTTP Code: " . $httpCode . "\n";
echo "CURL Error: " . ($curlError ?: 'None') . "\n";
echo "Response: " . $response . "\n";
echo "</pre>";

if ($httpCode === 200) {
    echo "<p style='color: green;'>✅ API is accessible!</p>";
    $result = json_decode($response, true);
    if ($result) {
        echo "<p>API Response: " . ($result['message'] ?? 'No message') . "</p>";
    }
} elseif ($httpCode === 401) {
    echo "<p style='color: orange;'>⚠️ API is accessible but credentials are invalid (expected)</p>";
} else {
    echo "<p style='color: red;'>❌ API is not accessible. Check server configuration.</p>";
}

echo "<h3>Alternative URLs to test:</h3>";
echo "<ul>";
echo "<li><a href='http://10.216.219.139/lastchapter/api/auth/login.php' target='_blank'>Direct API Link</a></li>";
echo "<li><a href='http://10.216.219.139/lastchapter/' target='_blank'>Base URL</a></li>";
echo "</ul>";

echo "<h3>Server Info:</h3>";
echo "<pre>";
echo "PHP Version: " . phpversion() . "\n";
echo "CURL Available: " . (function_exists('curl_init') ? 'Yes' : 'No') . "\n";
echo "Server: " . $_SERVER['SERVER_NAME'] . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "</pre>";
?>
