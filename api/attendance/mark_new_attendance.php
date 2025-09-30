<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Include database connection
require_once '../../config/database.php';

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate required fields
    $required_fields = ['student_id', 'status', 'date', 'guardian_type', 'guardian_name', 'marked_by_name', 'marked_by_role', 'marked_time'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    $student_id = $input['student_id'];
    $status = $input['status'];
    $date = $input['date'];
    $guardian_type = $input['guardian_type'];
    $guardian_name = $input['guardian_name'];
    $marked_by_name = $input['marked_by_name'];
    $marked_by_role = $input['marked_by_role'];
    $marked_time = $input['marked_time'];
    
    // Validate status
    if (!in_array($status, ['present', 'absent'])) {
        throw new Exception('Invalid status. Must be present or absent');
    }
    
    // Check if student exists
    $stmt = $pdo->prepare("SELECT id, name FROM students WHERE id = ?");
    $stmt->execute([$student_id]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$student) {
        throw new Exception('Student not found');
    }
    
    // Check if attendance already exists for this student on this date
    $stmt = $pdo->prepare("SELECT id FROM new_attendance WHERE student_id = ? AND date = ?");
    $stmt->execute([$student_id, $date]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existing) {
        // Update existing record
        if ($status === 'present') {
            $stmt = $pdo->prepare("
                UPDATE new_attendance 
                SET status = ?, 
                    in_time = ?, 
                    in_by = ?, 
                    in_guardian_type = ?, 
                    in_guardian_name = ?,
                    updated_at = NOW()
                WHERE student_id = ? AND date = ?
            ");
            $stmt->execute([$status, $marked_time, $marked_by_name, $guardian_type, $guardian_name, $student_id, $date]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE new_attendance 
                SET status = ?, 
                    out_time = ?, 
                    out_by = ?, 
                    out_guardian_type = ?, 
                    out_guardian_name = ?,
                    updated_at = NOW()
                WHERE student_id = ? AND date = ?
            ");
            $stmt->execute([$status, $marked_time, $marked_by_name, $guardian_type, $guardian_name, $student_id, $date]);
        }
    } else {
        // Insert new record
        if ($status === 'present') {
            $stmt = $pdo->prepare("
                INSERT INTO new_attendance 
                (student_id, status, date, in_time, in_by, in_guardian_type, in_guardian_name, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->execute([$student_id, $status, $date, $marked_time, $marked_by_name, $guardian_type, $guardian_name]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO new_attendance 
                (student_id, status, date, out_time, out_by, out_guardian_type, out_guardian_name, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->execute([$student_id, $status, $date, $marked_time, $marked_by_name, $guardian_type, $guardian_name]);
        }
    }
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Attendance marked successfully',
        'data' => [
            'student_id' => $student_id,
            'student_name' => $student['name'],
            'status' => $status,
            'date' => $date,
            'time' => $marked_time,
            'guardian_type' => $guardian_type,
            'guardian_name' => $guardian_name,
            'marked_by' => $marked_by_name
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
