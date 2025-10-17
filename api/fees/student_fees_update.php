<?php
header('Content-Type: application/json');
include_once '../config/database.php';
include_once '../auth/verify_session.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Verify user session
$user = verifySession($db);
if (!$user) {
    http_response_code(401);
    echo json_encode(array("success" => false, "message" => "Unauthorized"));
    exit();
}

// Handle PUT request for updating fees
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    try {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data || empty($data['student_id']) || !isset($data['total_fees'])) {
            http_response_code(400);
            echo json_encode(array("success" => false, "message" => "Student ID and total_fees are required"));
            exit();
        }
        
        $student_id = $data['student_id'];
        $total_fees = (float)$data['total_fees'];
        $amount_paid = isset($data['amount_paid']) ? (float)$data['amount_paid'] : 0;
        $fee_type = isset($data['fee_type']) ? $data['fee_type'] : 'monthly';
        $due_date = isset($data['due_date']) ? $data['due_date'] : null;
        
        // Map student_fees fee_type to fees fee_type
        $fees_fee_type = 'tuition'; // Default mapping
        switch ($fee_type) {
            case 'monthly':
                $fees_fee_type = 'tuition';
                break;
            case 'quarterly':
                $fees_fee_type = 'tuition';
                break;
            case 'annual':
                $fees_fee_type = 'tuition';
                break;
            case 'admission':
                $fees_fee_type = 'other';
                break;
            default:
                $fees_fee_type = 'tuition';
        }
        
        // Get student information and check permissions
        $check_query = "SELECT branch_id FROM users WHERE id = :student_id AND role = 'Student'";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(':student_id', $student_id);
        $check_stmt->execute();
        
        if ($check_stmt->rowCount() == 0) {
            http_response_code(404);
            echo json_encode(array("success" => false, "message" => "Student not found"));
            exit();
        }
        
        $student = $check_stmt->fetch(PDO::FETCH_ASSOC);
        
        // Debug: Log student data
        error_log("Student query result: " . json_encode($student));
        error_log("Student branch_id: " . ($student['branch_id'] ?? 'NULL'));
        
        // Check permissions
        if ($user['role'] !== 'Admin' && $user['role'] !== 'admin') {
            if ($user['branch_id'] != $student['branch_id']) {
                http_response_code(403);
                echo json_encode(array("success" => false, "message" => "You can only update fees for students in your branch"));
                exit();
            }
        }
        
        // Update fees table
        $update_fees_query = "INSERT INTO fees (student_id, branch_id, fee_amount, amount, fee_type, due_date, updated_at) 
                             VALUES (:student_id, :branch_id, :fee_amount, :amount, :fee_type, :due_date, NOW()) 
                             ON DUPLICATE KEY UPDATE 
                             branch_id = :branch_id,
                             fee_amount = :fee_amount, 
                             amount = :amount, 
                             fee_type = :fee_type, 
                             due_date = :due_date, 
                             updated_at = NOW()";
        
        error_log("About to update fees table");
        
        $fees_stmt = $db->prepare($update_fees_query);
        $fees_stmt->bindParam(':student_id', $student_id);
        $fees_stmt->bindParam(':branch_id', $student['branch_id']);
        $fees_stmt->bindParam(':fee_amount', $total_fees);
        $fees_stmt->bindParam(':amount', $total_fees);
        $fees_stmt->bindParam(':fee_type', $fees_fee_type); // Use the mapped fee_type
        $fees_stmt->bindParam(':due_date', $due_date);
        
        if (!$fees_stmt->execute()) {
            throw new Exception("Failed to update fees table");
        }
        
        // Update student_fees table
        $pending_amount = $total_fees - $amount_paid;
        $status = 'pending';
        if ($amount_paid >= $total_fees) {
            $status = 'paid';
        } elseif ($amount_paid > 0) {
            $status = 'partial';
        }
        
        // First delete existing records to avoid duplicate key issues
        $delete_query = "DELETE FROM student_fees WHERE student_id = :student_id";
        $delete_stmt = $db->prepare($delete_query);
        $delete_stmt->bindParam(':student_id', $student_id);
        
        error_log("About to execute delete query for student_id: $student_id");
        $delete_result = $delete_stmt->execute();
        error_log("Delete result: " . ($delete_result ? 'SUCCESS' : 'FAILED'));
        
        if (!$delete_result) {
            throw new Exception("Failed to delete existing records");
        }
        
        // Insert new record
        $insert_query = "INSERT INTO student_fees (student_id, branch_id, total_fees, amount_paid, pending_amount, status, created_at, updated_at) 
                         VALUES (:student_id, :branch_id, :total_fees, :amount_paid, :pending_amount, :status, NOW(), NOW())";
        
        // Debug: Check if branch_id is valid
        if (empty($student['branch_id'])) {
            throw new Exception("Student branch_id is empty or null");
        }
        
        // Debug: Log insert parameters
        error_log("Insert params - student_id: $student_id, branch_id: {$student['branch_id']}, total_fees: $total_fees, amount_paid: $amount_paid, pending_amount: $pending_amount, status: $status");
        
        $insert_stmt = $db->prepare($insert_query);
        $insert_stmt->bindParam(':student_id', $student_id);
        $insert_stmt->bindParam(':branch_id', $student['branch_id']);
        $insert_stmt->bindParam(':total_fees', $total_fees);
        $insert_stmt->bindParam(':amount_paid', $amount_paid);
        $insert_stmt->bindParam(':pending_amount', $pending_amount);
        $insert_stmt->bindParam(':status', $status);
        
        if (!$insert_stmt->execute()) {
            throw new Exception("Failed to update student_fees table");
        }
        
        // Return success response
        http_response_code(200);
        echo json_encode(array(
            "success" => true, 
            "message" => "Fee updated successfully",
            "data" => array(
                "student_id" => $student_id,
                "total_fees" => $total_fees,
                "amount_paid" => $amount_paid,
                "pending_amount" => $pending_amount,
                "status" => $status
            )
        ));
        exit();
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(array("success" => false, "message" => "Update failed: " . $e->getMessage()));
        exit();
    }
}

// Handle GET request for retrieving student data
try {
    
    $params = array();
    
    // Base query for getting student fee data
    $query = "SELECT u.id, u.name as student_name, u.username as student_id, u.email, u.phone, 
              b.name as branch_name, u.branch_id, f.fee_amount, f.fee_type, f.due_date, 
              sf.total_fees, sf.amount_paid, sf.pending_amount, sf.status as fee_status
              FROM users u
              LEFT JOIN branches b ON u.branch_id = b.id
              LEFT JOIN fees f ON u.id = f.student_id
              LEFT JOIN student_fees sf ON u.id = sf.student_id
              WHERE u.role = 'Student' AND u.status = 'active'";
    
    // Apply role-based filtering
    if ($user['role'] !== 'Admin' && $user['role'] !== 'admin') {
        if ($user['branch_id']) {
            $query .= " AND u.branch_id = :branch_id";
            $params[':branch_id'] = $user['branch_id'];
        } else {
            // If user has no branch, they can't see any students
            http_response_code(403);
            echo json_encode(array("success" => false, "message" => "Access denied"));
            exit();
        }
    }
    
    // Filter by specific branch if requested
    if (isset($_GET['branch_id']) && !empty($_GET['branch_id'])) {
        if ($user['role'] === 'Admin' || $user['role'] === 'admin' || $user['branch_id'] == $_GET['branch_id']) {
            $query .= " AND u.branch_id = :filter_branch_id";
            $params[':filter_branch_id'] = $_GET['branch_id'];
        }
    }
    
    // Search functionality
    if (isset($_GET['search']) && !empty($_GET['search'])) {
        $query .= " AND (u.name LIKE :search OR u.username LIKE :search OR u.email LIKE :search)";
        $params[':search'] = '%' . $_GET['search'] . '%';
    }
    
    $query .= " ORDER BY u.name ASC";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $students = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $students[] = array(
            'id' => $row['id'],
            'student_id' => $row['student_id'],
            'name' => $row['student_name'],
            'branch' => $row['branch_name'],
            'branch_id' => $row['branch_id'],
            'fee' => (float)($row['fee_amount'] ?? 0),
            'fee_type' => $row['fee_type'],
            'due_date' => $row['due_date'],
            'total_fees' => (float)($row['total_fees'] ?? 0),
            'amount_paid' => (float)($row['amount_paid'] ?? 0),
            'pending_amount' => (float)($row['pending_amount'] ?? 0),
            'fee_status' => $row['fee_status'],
            'email' => $row['email'],
            'phone' => $row['phone']
        );
    }
    
    // Return success response with student data
    http_response_code(200);
    echo json_encode(array(
        "success" => true, 
        "data" => $students,
        "message" => "Students retrieved successfully"
    ));
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false, 
        "message" => "Server error: " . $e->getMessage()
    ));
}
?>