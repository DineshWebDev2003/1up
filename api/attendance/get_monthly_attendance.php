<?php
header('Content-Type: application/json');
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
    $year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
    $month = isset($_GET['month']) ? intval($_GET['month']) : date('m');
    
    // Validate year and month
    if ($year < 2020 || $year > 2100 || $month < 1 || $month > 12) {
        http_response_code(400);
        echo json_encode(array("success" => false, "message" => "Invalid year or month"));
        exit();
    }
    
    // Build date range for the month
    $startDate = sprintf('%04d-%02d-01', $year, $month);
    $endDate = sprintf('%04d-%02d-%d', $year, $month, date('t', mktime(0, 0, 0, $month, 1, $year)));
    
    // Build query based on user role
    if ($user['role'] === 'Student') {
        // Students can only view their own attendance
        $query = "SELECT a.*, u.name as marked_by_name
                  FROM attendance a
                  LEFT JOIN users u ON a.marked_by = u.id
                  WHERE a.student_id = :user_id
                  AND a.date >= :start_date
                  AND a.date <= :end_date
                  ORDER BY a.date DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $user['id']);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        
    } elseif ($user['role'] === 'Admin') {
        // Admin can view all attendance
        $query = "SELECT a.*, u.name as marked_by_name, s.name as student_name, s.student_id
                  FROM attendance a
                  LEFT JOIN users u ON a.marked_by = u.id
                  LEFT JOIN users s ON a.student_id = s.id
                  WHERE a.date >= :start_date
                  AND a.date <= :end_date
                  ORDER BY a.date DESC, s.name ASC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        
    } elseif (in_array($user['role'], ['Teacher', 'Franchisee'])) {
        // Teachers and Franchisees can view attendance for their branch
        $query = "SELECT a.*, u.name as marked_by_name, s.name as student_name, s.student_id
                  FROM attendance a
                  LEFT JOIN users u ON a.marked_by = u.id
                  LEFT JOIN users s ON a.student_id = s.id
                  WHERE a.branch_id = :branch_id
                  AND a.date >= :start_date
                  AND a.date <= :end_date
                  ORDER BY a.date DESC, s.name ASC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':branch_id', $user['branch_id']);
        $stmt->bindParam(':start_date', $startDate);
        $stmt->bindParam(':end_date', $endDate);
        
    } else {
        http_response_code(403);
        echo json_encode(array("success" => false, "message" => "Access denied for this role"));
        exit();
    }
    
    $stmt->execute();
    $attendance_records = array();
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $attendance_records[] = array(
            'id' => $row['id'],
            'student_id' => $row['student_id'],
            'student_name' => $row['student_name'] ?? '',
            'date' => $row['date'],
            'status' => $row['status'],
            'check_in_time' => $row['check_in_time'],
            'check_out_time' => $row['check_out_time'],
            'remarks' => $row['remarks'],
            'marked_by_name' => $row['marked_by_name'],
            'guardian_type' => $row['guardian_type'] ?? null
        );
    }
    
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "data" => $attendance_records,
        "meta" => array(
            "year" => $year,
            "month" => $month,
            "start_date" => $startDate,
            "end_date" => $endDate,
            "total_records" => count($attendance_records)
        )
    ));
    
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Error fetching monthly attendance: " . $e->getMessage()
    ));
}
?>

