<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../config/database.php';
include_once '../auth/verify_session.php';

$database = new Database();
$db = $database->getConnection();

$user = verifySession($db);
if (!$user) {
    // TEMPORARY: Use hardcoded user for testing
    $user = array('id' => 30, 'username' => 'test_user', 'role' => 'Student');
}

try {
    $data = json_decode(file_get_contents("php://input"), true);
    $student_id = $data['student_id'] ?? null;
    $amount = $data['amount'] ?? null;

    if (!$student_id || !$amount) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Student ID and amount are required']);
        exit();
    }

    // Read UPI ID from settings table, fallback to default
    try {
        $db->exec("CREATE TABLE IF NOT EXISTS settings (\n            id INT AUTO_INCREMENT PRIMARY KEY,\n            `key` VARCHAR(100) UNIQUE NOT NULL,\n            `value` TEXT NULL,\n            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    } catch (Exception $e) {
        // ignore create error
    }
    $defaultUpi = "tnhappykids@oksbi";
    $upi_id = $defaultUpi;
    try {
        $getUpi = $db->prepare("SELECT `value` FROM settings WHERE `key` = 'upi_id' LIMIT 1");
        $getUpi->execute();
        $row = $getUpi->fetch(PDO::FETCH_ASSOC);
        if ($row && !empty($row['value'])) {
            $upi_id = $row['value'];
        }
    } catch (Exception $e) {
        // fallback to default
    }
    $merchant_name = "TN Happy Kids Playschool";
    
    // Generate UPI payment URL
    $upi_url = "upi://pay?pa={$upi_id}&pn=" . urlencode($merchant_name) . "&am={$amount}&cu=INR&tn=" . urlencode("Fees Payment - {$student_id}");
    
    // Save QR payment record
    $query = "INSERT INTO qr_payments (student_id, qr_code_data, upi_id, merchant_name, amount, expires_at) 
              VALUES (:student_id, :qr_data, :upi_id, :merchant_name, :amount, DATE_ADD(NOW(), INTERVAL 1 HOUR))
              ON DUPLICATE KEY UPDATE 
              qr_code_data = :qr_data, amount = :amount, expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':student_id', $student_id);
    $stmt->bindParam(':qr_data', $upi_url);
    $stmt->bindParam(':upi_id', $upi_id);
    $stmt->bindParam(':merchant_name', $merchant_name);
    $stmt->bindParam(':amount', $amount);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'data' => [
            'qr_code_data' => $upi_url,
            'upi_id' => $upi_id,
            'merchant_name' => $merchant_name,
            'amount' => $amount,
            'student_id' => $student_id,
            'expires_in' => '1 hour',
            'instructions' => [
                'Open any UPI app (Google Pay, PhonePe, Paytm, etc.)',
                'Scan this QR code',
                'Verify the amount: ₹' . number_format($amount, 2),
                'Complete the payment',
                'Take a screenshot of the success message',
                'Upload the screenshot using the upload button'
            ]
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
