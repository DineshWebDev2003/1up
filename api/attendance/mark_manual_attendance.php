<?php
header('Content-Type: application/json');
include_once '../config/database.php';
include_once '../auth/verify_session.php';

$database = new Database();
$db = $database->getConnection();

$user = verifySession($db);
if (!$user || !in_array($user['role'], ['Teacher', 'Admin'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

// Accept either numeric users.id or alphanumeric users.student_id (e.g., TNHK00030)
$input_student = $data['student_id'] ?? ($data['student_code'] ?? null);
$status = $data['status'] ?? 'present'; // Default to 'present'
$date = $data['date'] ?? date('Y-m-d');
$marked_by = $user['id']; // Always use the current authenticated user's ID
$guardian_type = $data['guardian_type'] ?? $data['marked_by'] ?? null; // Use guardian_type or marked_by as fallback

if (!$input_student) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Student ID is required.']);
    exit();
}

try {
    // Resolve student numeric id and branch_id
    if (is_numeric($input_student)) {
        $studentQuery = "SELECT id, branch_id FROM users WHERE id = :sid";
        $studentStmt = $db->prepare($studentQuery);
        $studentStmt->bindParam(':sid', $input_student);
    } else {
        $studentQuery = "SELECT id, branch_id FROM users WHERE student_id = :scode";
    $studentStmt = $db->prepare($studentQuery);
        $studentStmt->bindParam(':scode', $input_student);
    }
    $studentStmt->execute();
    $student_data = $studentStmt->fetch(PDO::FETCH_ASSOC);

    if (!$student_data) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Student not found.']);
        exit();
    }
    $resolved_student_id = $student_data['id'];
    $branch_id = $student_data['branch_id'];

    // Check if an attendance record for this student and date already exists
    $checkQuery = "SELECT id FROM attendance WHERE student_id = :student_id AND date = :date";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(':student_id', $resolved_student_id);
    $checkStmt->bindParam(':date', $date);
    $checkStmt->execute();
    $existingRecord = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if ($existingRecord) {
        // Update existing record
        if ($status === 'present') {
            $query = "UPDATE attendance SET status = :status, marked_by = :marked_by, guardian_type = :guardian_type, check_in_time = NOW(), updated_at = NOW() WHERE id = :id";
        } else {
            $query = "UPDATE attendance SET status = :status, marked_by = :marked_by, guardian_type = :guardian_type, check_out_time = NOW(), updated_at = NOW() WHERE id = :id";
        }
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $existingRecord['id']);
    } else {
        // Insert new record - always set both times
        $query = "INSERT INTO attendance (student_id, branch_id, date, status, marked_by, guardian_type, check_in_time, check_out_time) VALUES (:student_id, :branch_id, :date, :status, :marked_by, :guardian_type, NOW(), NOW())";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':student_id', $resolved_student_id);
        $stmt->bindParam(':branch_id', $branch_id); // Use student's actual branch_id
        $stmt->bindParam(':date', $date);
    }

    $stmt->bindParam(':status', $status);
    $stmt->bindParam(':marked_by', $marked_by);
    $stmt->bindParam(':guardian_type', $guardian_type);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Attendance marked successfully.']);
    } else {
        throw new Exception('Failed to save attendance data.');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
