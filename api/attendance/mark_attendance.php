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

// Only teachers, franchisees, and admins can mark attendance
if (!in_array($user['role'], ['Admin', 'Franchisee', 'Teacher', 'Tuition Teacher'])) {
    http_response_code(403);
    echo json_encode(array("success" => false, "message" => "Insufficient permissions"));
    exit();
}

// Get posted data
$data = json_decode(file_get_contents("php://input"));

if (!empty($data->student_id) && !empty($data->date) && !empty($data->status)) {
    
    try {
        // Verify student belongs to user's branch (if not admin)
        if ($user['role'] !== 'Admin') {
            $student_check = "SELECT s.id FROM students s WHERE s.id = :student_id AND s.branch_id = :branch_id";
            $check_stmt = $db->prepare($student_check);
            $check_stmt->bindParam(":student_id", $data->student_id);
            $check_stmt->bindParam(":branch_id", $user['branch_id']);
            $check_stmt->execute();
            
            if ($check_stmt->rowCount() === 0) {
                http_response_code(403);
                echo json_encode(array("success" => false, "message" => "Student not found in your branch"));
                exit();
            }
        }
        
        // Get student's branch_id
        $branch_query = "SELECT branch_id FROM students WHERE id = :student_id";
        $branch_stmt = $db->prepare($branch_query);
        $branch_stmt->bindParam(":student_id", $data->student_id);
        $branch_stmt->execute();
        $student_branch = $branch_stmt->fetch(PDO::FETCH_ASSOC);
        
        // Check if attendance already exists for this date
        $check_query = "SELECT id FROM attendance WHERE student_id = :student_id AND date = :date";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":student_id", $data->student_id);
        $check_stmt->bindParam(":date", $data->date);
        $check_stmt->execute();
        
        if ($check_stmt->rowCount() > 0) {
            // Update existing attendance
            $update_query = "UPDATE attendance SET status = :status, marked_by = :marked_by, remarks = :remarks, updated_at = NOW() 
                           WHERE student_id = :student_id AND date = :date";
            $stmt = $db->prepare($update_query);
        } else {
            // Insert new attendance
            $insert_query = "INSERT INTO attendance (student_id, branch_id, date, status, marked_by, remarks) 
                           VALUES (:student_id, :branch_id, :date, :status, :marked_by, :remarks)";
            $stmt = $db->prepare($insert_query);
            $stmt->bindParam(":branch_id", $student_branch['branch_id']);
        }
        
        $stmt->bindParam(":student_id", $data->student_id);
        $stmt->bindParam(":date", $data->date);
        $stmt->bindParam(":status", $data->status);
        $stmt->bindParam(":marked_by", $user['id']);
        $remarks = isset($data->remarks) ? $data->remarks : null;
        $stmt->bindParam(":remarks", $remarks);
        
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array(
                "success" => true,
                "message" => "Attendance marked successfully"
            ));
        } else {
            http_response_code(500);
            echo json_encode(array(
                "success" => false,
                "message" => "Failed to mark attendance"
            ));
        }
        
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(array(
            "success" => false,
            "message" => "Error marking attendance: " . $e->getMessage()
        ));
    }
    
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Student ID, date, and status are required"
    ));
}
?>
