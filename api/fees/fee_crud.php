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

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            handleGetFees($db, $user);
            break;
        case 'PUT':
            handleUpdateFee($db, $user);
            break;
        default:
            http_response_code(405);
            echo json_encode(array("success" => false, "message" => "Method not allowed"));
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("success" => false, "message" => "Server error: " . $e->getMessage()));
}

function handleGetFees($db, $user) {
    // Build query based on user role and permissions - using users table for students
    $query = "SELECT u.id, u.username as student_id, u.name, u.branch_id, 
                     COALESCE(f.fee_amount, 0) as fee_amount, u.status,
                     u.username, u.email, u.phone,
                     b.name as branch_name
              FROM users u
              LEFT JOIN fees f ON u.id = f.student_id
              JOIN branches b ON u.branch_id = b.id
              WHERE u.role = 'Student' AND u.status = 'active'";
    
    $params = array();
    
    // Apply role-based filtering
    if ($user['role'] !== 'Admin' && $user['role'] !== 'admin') {
        if ($user['branch_id']) {
            $query .= " AND u.branch_id = :branch_id";
            $params[':branch_id'] = $user['branch_id'];
        } else {
            // If user has no branch, they can't see any students
            http_response_code(403);
            echo json_encode(array("success" => false, "message" => "Access denied"));
            return;
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
            'name' => $row['name'],
            'branch' => $row['branch_name'],
            'branch_id' => $row['branch_id'],
            'fee' => (float)$row['fee_amount'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'status' => $row['status']
        );
    }
    
    // If no students found, return empty array instead of error
    http_response_code(200);
    echo json_encode(array("success" => true, "data" => $students));
}

function handleUpdateFee($db, $user) {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!$data || empty($data->student_id) || !isset($data->fee_amount)) {
        http_response_code(400);
        echo json_encode(array("success" => false, "message" => "Student ID and fee amount are required"));
        return;
    }
    
    if ($data->fee_amount < 0) {
        http_response_code(400);
        echo json_encode(array("success" => false, "message" => "Fee amount cannot be negative"));
        return;
    }
    
    // Check if student exists and user has permission to update
    $check_query = "SELECT u.id, u.branch_id, u.name FROM users u 
                    WHERE u.id = :student_id AND u.role = 'Student' AND u.status = 'active'";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':student_id', $data->student_id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() == 0) {
        http_response_code(404);
        echo json_encode(array("success" => false, "message" => "Student not found"));
        return;
    }
    
    $student = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    // Check permissions
    if ($user['role'] !== 'Admin' && $user['role'] !== 'admin' && $user['branch_id'] != $student['branch_id']) {
        http_response_code(403);
        echo json_encode(array("success" => false, "message" => "You can only update fees for students in your branch"));
        return;
    }
    
    // Update or insert fee amount in fees table
    // Include all required fields for the fees table
    $update_query = "INSERT INTO fees (student_id, branch_id, fee_amount, amount, fee_type, due_date, created_at, updated_at) 
                     VALUES (:student_id, :branch_id, :fee_amount, :fee_amount, 'tuition', CURDATE(), NOW(), NOW())
                     ON DUPLICATE KEY UPDATE 
                     fee_amount = :fee_amount_update, amount = :amount_update, updated_at = NOW()";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(':student_id', $data->student_id);
    $update_stmt->bindParam(':branch_id', $student['branch_id']);
    $update_stmt->bindParam(':fee_amount', $data->fee_amount);
    $update_stmt->bindParam(':fee_amount_update', $data->fee_amount);
    $update_stmt->bindParam(':amount_update', $data->fee_amount);
    
    if ($update_stmt->execute()) {
        // Also update student_fees table to keep both tables in sync
        try {
            // First, delete existing records for this student to avoid duplicates
            $delete_query = "DELETE FROM student_fees WHERE student_id = :student_id";
            $delete_stmt = $db->prepare($delete_query);
            $delete_stmt->bindParam(':student_id', $data->student_id);
            $delete_stmt->execute();
            
            // Then insert a new record
            $insert_query = "INSERT INTO student_fees (student_id, total_fees, amount_paid, pending_amount, branch_id, academic_year, fee_type, status, created_at, updated_at)
                             VALUES (:student_id, :total_fees, 0.00, :total_fees, :branch_id, '2024-25', 'monthly', 'pending', NOW(), NOW())";
            
            $insert_stmt = $db->prepare($insert_query);
            $insert_stmt->bindParam(':student_id', $data->student_id);
            $insert_stmt->bindParam(':total_fees', $data->fee_amount);
            $insert_stmt->bindParam(':branch_id', $student['branch_id']);
            
            $insert_stmt->execute();
        } catch (Exception $e) {
            // Log error but don't fail the main operation
            error_log("Failed to update student_fees table: " . $e->getMessage());
        }
        
        // Log fee update for audit trail
        error_log("Fee update: Student " . $data->student_id . " fee changed to " . $data->fee_amount . " by user " . $user['id']);
        
        http_response_code(200);
        echo json_encode(array(
            "success" => true, 
            "message" => "Fee updated successfully for " . $student['name'],
            "data" => array(
                "student_id" => $data->student_id,
                "new_fee" => (float)$data->fee_amount
            )
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("success" => false, "message" => "Failed to update fee"));
    }
}
?>
