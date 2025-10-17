<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include_once '../config/database.php';
include_once '../auth/verify_session.php';

$database = new Database();
$db = $database->getConnection();

$user = verifySession($db);
if (!$user) {
    http_response_code(401);
    echo json_encode(array("success" => false, "message" => "Unauthorized"));
    exit();
}

try {
    $student_id = $_GET['student_id'] ?? null;
    
    if (!$student_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Student ID is required']);
        exit();
    }

    // Get student fees data from student_fees table
    $query = "SELECT 
                sf.id,
                sf.student_id,
                sf.total_fees,
                sf.amount_paid,
                sf.pending_amount,
                sf.academic_year,
                sf.fee_type,
                sf.due_date,
                sf.status,
                sf.created_at,
                sf.updated_at,
                u.name as student_name,
                u.email,
                u.phone,
                u.student_id as user_student_id,
                b.name as branch_name,
                s.student_id as admitted_student_id
              FROM student_fees sf
              JOIN users u ON sf.student_id = u.id
              LEFT JOIN students s ON u.id = s.user_id
              LEFT JOIN branches b ON sf.branch_id = b.id
              WHERE sf.student_id = :student_id";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':student_id', $student_id);
    $stmt->execute();
    
    $fee_data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$fee_data) {
        // If no fee record exists, create a default one
        $default_query = "SELECT 
                            u.id as student_id,
                            u.name as student_name,
                            u.email,
                            u.phone,
                            u.student_id as user_student_id,
                            s.student_id as admitted_student_id,
                            b.name as branch_name,
                            u.branch_id
                          FROM users u
                          LEFT JOIN students s ON u.id = s.user_id
                          LEFT JOIN branches b ON u.branch_id = b.id
                          WHERE u.id = :student_id AND u.role IN ('Student', 'Tuition Student')";
        
        $default_stmt = $db->prepare($default_query);
        $default_stmt->bindParam(':student_id', $student_id);
        $default_stmt->execute();
        
        $student_data = $default_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$student_data) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Student not found']);
            exit();
        }
        
        // Create default fee record
        $insert_query = "INSERT INTO student_fees (student_id, total_fees, amount_paid, pending_amount, branch_id, academic_year, fee_type, status, created_at, updated_at)
                        VALUES (:student_id, 0.00, 0.00, 0.00, :branch_id, '2024-25', 'monthly', 'pending', NOW(), NOW())
                        ON DUPLICATE KEY UPDATE updated_at = NOW()";
        
        $insert_stmt = $db->prepare($insert_query);
        $insert_stmt->bindParam(':student_id', $student_id);
        $insert_stmt->bindParam(':branch_id', $student_data['branch_id']);
        
        if (!$insert_stmt->execute()) {
            $errorInfo = $insert_stmt->errorInfo();
            throw new Exception("Failed to create default fee record: " . implode(", ", $errorInfo));
        }
        
        // Fetch the newly created record
        $stmt->execute();
        $fee_data = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    // Get recent payment transactions
    $trans_query = "SELECT * FROM payment_transactions 
                    WHERE student_id = :student_id 
                    ORDER BY created_at DESC LIMIT 10";
    $trans_stmt = $db->prepare($trans_query);
    $trans_stmt->bindParam(':student_id', $student_id);
    $trans_stmt->execute();
    $transactions = $trans_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format response
    $response_data = [
        'student_info' => [
            'user_id' => $fee_data['student_id'],
            'name' => $fee_data['student_name'],
            'email' => $fee_data['email'],
            'phone' => $fee_data['phone'],
            'student_id' => $fee_data['admitted_student_id'] ?: $fee_data['user_student_id'],
            'branch_name' => $fee_data['branch_name']
        ],
        'fee_summary' => [
            'total_fees' => (float)$fee_data['total_fees'],
            'amount_paid' => (float)$fee_data['amount_paid'],
            'pending_amount' => (float)$fee_data['pending_amount'],
            'payment_status' => $fee_data['status'],
            'academic_year' => $fee_data['academic_year'],
            'fee_type' => $fee_data['fee_type'],
            'due_date' => $fee_data['due_date'],
            'last_payment_date' => $transactions[0]['created_at'] ?? null
        ],
        'recent_transactions' => array_map(function($transaction) {
            return [
                'id' => $transaction['id'],
                'amount' => (float)$transaction['amount'],
                'payment_date' => $transaction['created_at'],
                'status' => $transaction['status'] ?? 'completed',
                'payment_method' => $transaction['payment_method'] ?? 'unknown',
                'reference_number' => $transaction['reference_number'] ?? ''
            ];
        }, $transactions)
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $response_data
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching student fees: ' . $e->getMessage()
    ]);
}
?>