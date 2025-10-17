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
    // Get query parameters
    $start_date = $_GET['start_date'] ?? date('Y-m-01'); // Default to first day of current month
    $end_date = $_GET['end_date'] ?? date('Y-m-t'); // Default to last day of current month
    $user_id = $_GET['user_id'] ?? $user['id']; // Default to current user
    
    // Validate that user can access this data
    if ($user['role'] !== 'Admin' && $user_id != $user['id']) {
        http_response_code(403);
        echo json_encode(array("success" => false, "message" => "Access denied"));
        exit();
    }
    
    // Get teacher attendance records
    $query = "SELECT 
                sa.id,
                sa.date,
                sa.clock_in_time,
                sa.clock_out_time,
                sa.daily_report,
                sa.status,
                sa.check_in_time,
                sa.check_out_time,
                sa.remarks,
                TIME_FORMAT(sa.clock_in_time, '%H:%i') as clock_in_formatted,
                TIME_FORMAT(sa.clock_out_time, '%H:%i') as clock_out_formatted,
                CASE 
                    WHEN sa.clock_in_time IS NOT NULL AND sa.clock_out_time IS NOT NULL 
                    THEN TIMESTAMPDIFF(MINUTE, sa.clock_in_time, sa.clock_out_time) / 60.0
                    ELSE NULL 
                END as total_hours,
                CASE 
                    WHEN sa.clock_in_time > CONCAT(sa.date, ' 09:30:00') THEN 1
                    ELSE 0 
                END as is_late,
                u.name as teacher_name,
                u.role,
                b.name as branch_name
              FROM staff_attendance sa
              JOIN users u ON sa.user_id = u.id
              LEFT JOIN branches b ON sa.branch_id = b.id
              WHERE sa.user_id = :user_id 
              AND sa.date BETWEEN :start_date AND :end_date
              ORDER BY sa.date DESC";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $user_id);
    $stmt->bindParam(':start_date', $start_date);
    $stmt->bindParam(':end_date', $end_date);
    $stmt->execute();
    
    $attendance_records = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $attendance_records[] = $row;
    }
    
    // Calculate summary statistics
    $total_days = count($attendance_records);
    $present_days = count(array_filter($attendance_records, function($record) {
        return !empty($record['clock_in_time']);
    }));
    $late_days = count(array_filter($attendance_records, function($record) {
        return $record['is_late'] == 1;
    }));
    $total_hours = array_sum(array_column($attendance_records, 'total_hours'));
    $average_hours = $present_days > 0 ? $total_hours / $present_days : 0;
    
    // Get current month stats
    $current_month_start = date('Y-m-01');
    $current_month_end = date('Y-m-t');
    
    $currentMonthQuery = "SELECT 
                            COUNT(*) as total_days,
                            COUNT(CASE WHEN clock_in_time IS NOT NULL THEN 1 END) as present_days,
                            COUNT(CASE WHEN clock_in_time > CONCAT(date, ' 09:30:00') THEN 1 END) as late_days,
                            AVG(CASE 
                                WHEN clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL 
                                THEN TIMESTAMPDIFF(MINUTE, clock_in_time, clock_out_time) / 60.0
                                ELSE NULL 
                            END) as avg_hours
                          FROM staff_attendance 
                          WHERE user_id = :user_id 
                          AND date BETWEEN :start_date AND :end_date";
    
    $currentMonthStmt = $db->prepare($currentMonthQuery);
    $currentMonthStmt->bindParam(':user_id', $user_id);
    $currentMonthStmt->bindParam(':start_date', $current_month_start);
    $currentMonthStmt->bindParam(':end_date', $current_month_end);
    $currentMonthStmt->execute();
    $current_month_stats = $currentMonthStmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode(array(
        "success" => true,
        "data" => array(
            "attendance_records" => $attendance_records,
            "summary" => array(
                "total_days" => $total_days,
                "present_days" => $present_days,
                "late_days" => $late_days,
                "total_hours" => round($total_hours, 2),
                "average_hours" => round($average_hours, 2),
                "attendance_rate" => $total_days > 0 ? round(($present_days / $total_days) * 100, 1) : 0
            ),
            "current_month_stats" => array(
                "total_days" => (int)$current_month_stats['total_days'],
                "present_days" => (int)$current_month_stats['present_days'],
                "late_days" => (int)$current_month_stats['late_days'],
                "average_hours" => round($current_month_stats['avg_hours'] ?? 0, 2),
                "attendance_rate" => $current_month_stats['total_days'] > 0 ? 
                    round(($current_month_stats['present_days'] / $current_month_stats['total_days']) * 100, 1) : 0
            ),
            "date_range" => array(
                "start_date" => $start_date,
                "end_date" => $end_date
            )
        )
    ));
    
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Error fetching teacher attendance: " . $e->getMessage()
    ));
}
?>
