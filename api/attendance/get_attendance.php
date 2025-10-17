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

try {
    // Optional filters that may be provided
    $dateParam = isset($_GET['date']) ? $_GET['date'] : null;
    $queryStudentId = isset($_GET['student_id']) ? $_GET['student_id'] : null; // could be students.id OR users.id (legacy)
    $queryUserId = isset($_GET['user_id']) ? $_GET['user_id'] : null; // users.id

    // Resolve requested student filter into students.id if possible
    $resolvedStudentId = null;
    if ($queryUserId) {
        // Map users.id -> students.id
        $mapStmt = $db->prepare("SELECT s.id FROM students s WHERE s.user_id = :uid LIMIT 1");
        $mapStmt->bindValue(':uid', $queryUserId);
        $mapStmt->execute();
        $mapRow = $mapStmt->fetch(PDO::FETCH_ASSOC);
        if ($mapRow && isset($mapRow['id'])) {
            $resolvedStudentId = $mapRow['id'];
        }
    }
    if (!$resolvedStudentId && $queryStudentId) {
        // If a students.id exists with this id, use it; otherwise try treating as users.id
        $checkStudent = $db->prepare("SELECT id FROM students WHERE id = :sid LIMIT 1");
        $checkStudent->bindValue(':sid', $queryStudentId);
        $checkStudent->execute();
        $existsAsStudent = $checkStudent->fetch(PDO::FETCH_ASSOC);
        if ($existsAsStudent) {
            $resolvedStudentId = $queryStudentId;
        } else {
            $mapStmt = $db->prepare("SELECT s.id FROM students s WHERE s.user_id = :uid LIMIT 1");
            $mapStmt->bindValue(':uid', $queryStudentId);
            $mapStmt->execute();
            $mapRow = $mapStmt->fetch(PDO::FETCH_ASSOC);
            if ($mapRow && isset($mapRow['id'])) {
                $resolvedStudentId = $mapRow['id'];
            }
        }
    }

    // Build query based on user role. Join students first, then users
    $query = "SELECT a.id, a.date, a.status, a.remarks, a.check_in_time, a.check_out_time, a.guardian_type,
                     u.student_id AS user_student_code, u.name AS student_name, u.class, u.section,
                     b.name AS branch_name,
                     mu.name AS marked_by_name, mu.role AS marked_by_role
              FROM attendance a 
              JOIN students s ON a.student_id = s.id
              JOIN users u ON s.user_id = u.id
              JOIN branches b ON a.branch_id = b.id
              JOIN users mu ON a.marked_by = mu.id
              WHERE 1=1";
    
    $params = array();
    
    if ($user['role'] === 'Admin') {
        // Admin can see all attendance
        if (isset($_GET['branch_id'])) {
            $query .= " AND a.branch_id = :branch_id";
            $params[':branch_id'] = $_GET['branch_id'];
        }
    } elseif (in_array($user['role'], ['Franchisee', 'Teacher', 'Tuition Teacher'])) {
        // Branch-specific roles can see attendance in their branch
        $query .= " AND a.branch_id = :branch_id";
        $params[':branch_id'] = $user['branch_id'];
    } elseif (in_array($user['role'], ['Student', 'Tuition Student'])) {
        // Students can only see their own attendance
        $query .= " AND a.student_id = :user_id";
        $params[':user_id'] = $user['id'];
    }
    
    // Filter by date if specified
    if ($dateParam) {
        $query .= " AND a.date = :date";
        $params[':date'] = $dateParam;
    } else {
        // Default to current month
        $query .= " AND MONTH(a.date) = MONTH(CURRENT_DATE()) AND YEAR(a.date) = YEAR(CURRENT_DATE())";
    }
    
    // Filter by resolved student id (students.id)
    if ($resolvedStudentId) {
        $query .= " AND a.student_id = :student_id";
        $params[':student_id'] = $resolvedStudentId;
    }
    
    $query .= " ORDER BY a.date DESC, u.name ASC";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $attendance = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $attendance[] = $row;
    }
    
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "data" => $attendance
    ));
    
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Error fetching attendance: " . $e->getMessage()
    ));
}
?>
