<?php
header('Content-Type: application/json');
include_once '../config/database.php';
include_once '../auth/verify_session.php';

$database = new Database();
$db = $database->getConnection();

$user = verifySession($db);
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

$date = $_GET['date'] ?? date('Y-m-d');
$branch_id = $_GET['branch_id'] ?? null;
$roles = $_GET['roles'] ?? 'Teacher,Captain,Admin,Franchisee';

try {
    // Build the query to get staff attendance with enhanced details
    $query = "SELECT 
                u.id,
                u.name,
                u.email,
                u.phone,
                u.role,
                u.employee_id,
                u.avatar,
                b.name as branch_name,
                sa.status,
                TIME_FORMAT(sa.clock_in_time, '%H:%i') as clock_in_time,
                TIME_FORMAT(sa.clock_out_time, '%H:%i') as clock_out_time,
                sa.notes,
                sa.marked_by,
                sa.created_at,
                sa.updated_at,
                CASE 
                    WHEN sa.clock_in_time IS NOT NULL AND sa.clock_out_time IS NOT NULL 
                    THEN TIMESTAMPDIFF(MINUTE, sa.clock_in_time, sa.clock_out_time) / 60.0
                    ELSE NULL
                END as total_hours,
                CASE 
                    WHEN sa.clock_in_time > '09:30:00' THEN 1
                    ELSE 0
                END as is_late,
                CASE 
                    WHEN sa.status IS NULL THEN 'not_marked'
                    ELSE sa.status
                END as attendance_status
              FROM users u
              LEFT JOIN branches b ON u.branch_id = b.id
              LEFT JOIN staff_attendance sa ON u.id = sa.user_id AND sa.date = :date
              WHERE u.role IN (" . implode(',', array_map(function($role) { return "'$role'"; }, explode(',', $roles))) . ")
              AND u.status = 'active'";

    $params = [':date' => $date];

    // Add branch filter if specified
    if ($branch_id && $branch_id !== 'All') {
        $query .= " AND u.branch_id = :branch_id";
        $params[':branch_id'] = $branch_id;
    }

    // Add role-based access control
    if ($user['role'] === 'Franchisee') {
        $query .= " AND u.branch_id = :user_branch_id";
        $params[':user_branch_id'] = $user['branch_id'];
    }

    $query .= " ORDER BY u.name ASC";

    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();

    $staff_attendance = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Format the data
        $staff_member = [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'role' => $row['role'],
            'employee_id' => $row['employee_id'],
            'avatar' => $row['avatar'],
            'branch_name' => $row['branch_name'],
            'status' => $row['attendance_status'] === 'not_marked' ? 'absent' : $row['status'],
            'clock_in_time' => $row['clock_in_time'],
            'clock_out_time' => $row['clock_out_time'],
            'total_hours' => $row['total_hours'] ? number_format($row['total_hours'], 1) : null,
            'is_late' => (bool)$row['is_late'],
            'notes' => $row['notes'],
            'marked_by' => $row['marked_by'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at']
        ];

        $staff_attendance[] = $staff_member;
    }

    // Calculate summary statistics
    $total_staff = count($staff_attendance);
    $present_count = count(array_filter($staff_attendance, function($s) { return $s['status'] === 'present'; }));
    $absent_count = count(array_filter($staff_attendance, function($s) { return $s['status'] === 'absent'; }));
    $late_count = count(array_filter($staff_attendance, function($s) { return $s['is_late']; }));

    echo json_encode([
        'success' => true,
        'data' => $staff_attendance,
        'summary' => [
            'total' => $total_staff,
            'present' => $present_count,
            'absent' => $absent_count,
            'late' => $late_count,
            'on_time' => $present_count - $late_count,
            'attendance_rate' => $total_staff > 0 ? round(($present_count / $total_staff) * 100, 1) : 0
        ],
        'date' => $date
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching staff attendance: ' . $e->getMessage()
    ]);
}
?>
