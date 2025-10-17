<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database connection
require_once '../config/database.php';
// Initialize PDO connection
$database = new Database();
$pdo = $database->getConnection();
if (!$pdo) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}


try {
    // Get query parameters
    $date = $_GET['date'] ?? date('Y-m-d');
    $branch_id = $_GET['branch_id'] ?? null;
    $student_id = $_GET['student_id'] ?? null; // students.id
    $user_id = $_GET['user_id'] ?? null; // users.id
    
    // Build the query
    $query = "
        SELECT 
            na.*,
            s.student_id AS student_code,
            u.name AS student_name,
            u.username,
            u.father_name AS father_name,
            u.mother_name AS mother_name,
            u.guardian_name AS guardian_name,
            b.name AS branch_name
        FROM new_attendance na
        LEFT JOIN students s ON na.student_id = s.id
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN branches b ON s.branch_id = b.id
        WHERE na.date = ?
    ";
    
    $params = [$date];
    
    // Add branch filter if specified
    if ($branch_id && $branch_id !== 'All') {
        $query .= " AND s.branch_id = ?";
        $params[] = $branch_id;
    }
    
    // Add student filter if specified
    if ($student_id) {
        $query .= " AND na.student_id = ?";
        $params[] = $student_id;
    }

    // Support filtering by user_id by mapping to students.user_id
    if ($user_id) {
        $query .= " AND s.user_id = ?";
        $params[] = $user_id;
    }
    
    $query .= " ORDER BY na.created_at DESC";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $attendanceData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the response
    $formattedData = array_map(function($record) {
        return [
            'id' => $record['id'],
            'student_id' => $record['student_id'],
            'student_code' => $record['student_code'],
            'student_name' => $record['student_name'] ?: 'Unknown Student',
            'username' => $record['username'],
            'branch_name' => $record['branch_name'],
            'status' => $record['status'],
            'date' => $record['date'],
            'in_time' => $record['in_time'],
            'out_time' => $record['out_time'],
            'in_by' => $record['in_by'],
            'out_by' => $record['out_by'],
            'in_guardian_type' => $record['in_guardian_type'],
            'in_guardian_name' => $record['in_guardian_name'],
            'out_guardian_type' => $record['out_guardian_type'],
            'out_guardian_name' => $record['out_guardian_name'],
            'father_name' => $record['father_name'] ?? null,
            'mother_name' => $record['mother_name'] ?? null,
            'guardian_name' => $record['guardian_name'] ?? null,
            'created_at' => $record['created_at'],
            'updated_at' => $record['updated_at']
        ];
    }, $attendanceData);
    
    echo json_encode([
        'success' => true,
        'data' => $formattedData,
        'count' => count($formattedData)
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
