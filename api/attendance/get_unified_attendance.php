<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../config.php'; // adjust path if necessary

$pdo = getDbConnection();

$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
$type = isset($_GET['type']) ? strtolower($_GET['type']) : 'all'; // student|staff|all
$branchId = isset($_GET['branch_id']) ? $_GET['branch_id'] : null;

$response = [
    'success' => false,
    'data' => null,
    'error' => null,
];

try {
    $records = [];
    $summary = [
        'total' => 0,
        'present' => 0,
        'absent' => 0,
        'unmarked' => 0
    ];

    // Helper function to process result rows
    $processRows = function($rows, $category) use (&$records, &$summary) {
        foreach ($rows as $row) {
            $records[] = [
                'id' => $row['id'],
                'name' => $row['name'],
                'status' => $row['status'] ?? 'unmarked',
                'in_time' => $row['in_time'] ?? null,
                'out_time' => $row['out_time'] ?? null,
                'type' => $category,
            ];
            // Update summary counts
            $summary['total']++;
            $statusKey = strtolower($row['status'] ?? 'unmarked');
            if (isset($summary[$statusKey])) {
                $summary[$statusKey]++;
            }
        }
    };

    /* -------------------------------- Students ------------------------------- */
    if ($type === 'student' || $type === 'all') {
        $studentSql = "SELECT s.student_id AS code, s.id AS id, CONCAT(u.name) AS name,
                            na.status, na.in_time, na.out_time
                          FROM new_attendance na
                          JOIN students s ON s.id = na.student_id
                          JOIN users u ON u.id = s.user_id
                         WHERE na.date = :date";
        if ($branchId) {
            $studentSql .= " AND s.branch_id = :branchId";
        }
        $stmt = $pdo->prepare($studentSql);
        $stmt->bindParam(':date', $date);
        if ($branchId) {
            $stmt->bindParam(':branchId', $branchId);
        }
        $stmt->execute();
        $processRows($stmt->fetchAll(PDO::FETCH_ASSOC), 'student');
    }

    /* --------------------------------- Staff --------------------------------- */
    if ($type === 'staff' || $type === 'all') {
        $staffSql = "SELECT sa.user_id AS id, u.name,
                            sa.status, sa.check_in_time AS in_time, sa.check_out_time AS out_time
                         FROM staff_attendance sa
                         JOIN users u ON u.id = sa.user_id
                         WHERE sa.date = :date";
        if ($branchId) {
            $staffSql .= " AND sa.branch_id = :branchId";
        }
        $stmt2 = $pdo->prepare($staffSql);
        $stmt2->bindParam(':date', $date);
        if ($branchId) {
            $stmt2->bindParam(':branchId', $branchId);
        }
        $stmt2->execute();
        $processRows($stmt2->fetchAll(PDO::FETCH_ASSOC), 'staff');
    }

    $response['success'] = true;
    $response['data'] = [
        'records' => $records,
        'summary' => $summary,
    ];
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
}

echo json_encode($response);