<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';
require_once '../../config/auth.php';

// Verify authentication
$auth = new Auth();
$user = $auth->validateToken();

if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Get parameters
    $month = $_GET['month'] ?? date('Y-m');
    $type = $_GET['type'] ?? 'all';
    $branch_id = $_GET['branch_id'] ?? null;
    
    // Validate month format
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        throw new Exception('Invalid month format. Use YYYY-MM');
    }
    
    // Build query based on user role and parameters
    $userRole = $user['role'] ?? '';
    $userBranchId = $user['branch_id'] ?? null;
    
    // Base query for monthly attendance
    $query = "
        SELECT DISTINCT
            DATE(a.date) as attendance_date,
            s.id as student_id,
            s.name as student_name,
            s.code as student_code,
            s.class,
            b.name as branch_name,
            a.status,
            a.in_time,
            a.out_time,
            a.in_guardian_name,
            a.in_guardian_type,
            a.out_guardian_name,
            a.out_guardian_type,
            'student' as type
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id 
            AND DATE_FORMAT(a.date, '%Y-%m') = :month
        LEFT JOIN branches b ON s.branch_id = b.id
        WHERE 1=1
    ";
    
    $params = [':month' => $month];
    
    // Apply branch filtering based on user role
    if ($userRole !== 'Admin' && $userBranchId != 1) {
        // Non-admin users can only see their branch
        $query .= " AND s.branch_id = :user_branch_id";
        $params[':user_branch_id'] = $userBranchId;
    } elseif ($branch_id && $branch_id !== 'All') {
        // Admin users can filter by specific branch
        $query .= " AND s.branch_id = :branch_id";
        $params[':branch_id'] = $branch_id;
    }
    
    // Add staff attendance if type is 'all' or 'staff'
    if ($type === 'all' || $type === 'staff') {
        $staffQuery = "
            UNION ALL
            SELECT DISTINCT
                DATE(sa.date) as attendance_date,
                st.id as student_id,
                st.name as student_name,
                st.employee_id as student_code,
                st.position as class,
                b.name as branch_name,
                sa.status,
                sa.in_time,
                sa.out_time,
                NULL as in_guardian_name,
                NULL as in_guardian_type,
                NULL as out_guardian_name,
                NULL as out_guardian_type,
                'staff' as type
            FROM staff st
            LEFT JOIN staff_attendance sa ON st.id = sa.staff_id 
                AND DATE_FORMAT(sa.date, '%Y-%m') = :month
            LEFT JOIN branches b ON st.branch_id = b.id
            WHERE 1=1
        ";
        
        // Apply same branch filtering for staff
        if ($userRole !== 'Admin' && $userBranchId != 1) {
            $staffQuery .= " AND st.branch_id = :user_branch_id";
        } elseif ($branch_id && $branch_id !== 'All') {
            $staffQuery .= " AND st.branch_id = :branch_id";
        }
        
        $query .= $staffQuery;
    }
    
    // Filter by type if not 'all'
    if ($type === 'student') {
        // Already filtered to students only
    } elseif ($type === 'staff') {
        // Remove student part, keep only staff
        $query = str_replace("SELECT DISTINCT", "SELECT DISTINCT", $staffQuery);
        $query = substr($staffQuery, 10); // Remove "UNION ALL"
    }
    
    $query .= " ORDER BY attendance_date DESC, branch_name, student_name";
    
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Generate PDF using TCPDF or similar library
    require_once '../../vendor/tcpdf/tcpdf.php';
    
    // Create new PDF document
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
    
    // Set document information
    $pdf->SetCreator('School Management System');
    $pdf->SetAuthor('School Admin');
    $pdf->SetTitle('Monthly Attendance Report - ' . $month);
    $pdf->SetSubject('Attendance Report');
    
    // Set margins
    $pdf->SetMargins(15, 20, 15);
    $pdf->SetHeaderMargin(10);
    $pdf->SetFooterMargin(10);
    
    // Set auto page breaks
    $pdf->SetAutoPageBreak(TRUE, 20);
    
    // Add a page
    $pdf->AddPage();
    
    // Set font
    $pdf->SetFont('helvetica', 'B', 16);
    
    // Title
    $branchName = $branch_id && $branch_id !== 'All' ? 
        " - Branch: " . ($records[0]['branch_name'] ?? 'Unknown') : 
        ($userRole !== 'Admin' ? " - " . ($records[0]['branch_name'] ?? 'Your Branch') : ' - All Branches');
    
    $pdf->Cell(0, 10, 'Monthly Attendance Report' . $branchName, 0, 1, 'C');
    $pdf->SetFont('helvetica', '', 12);
    $pdf->Cell(0, 8, 'Month: ' . date('F Y', strtotime($month . '-01')), 0, 1, 'C');
    $pdf->Cell(0, 8, 'Generated on: ' . date('Y-m-d H:i:s'), 0, 1, 'C');
    $pdf->Ln(5);
    
    // Group records by date
    $groupedRecords = [];
    foreach ($records as $record) {
        $date = $record['attendance_date'] ?: 'No Date';
        if (!isset($groupedRecords[$date])) {
            $groupedRecords[$date] = [];
        }
        $groupedRecords[$date][] = $record;
    }
    
    // Create table for each date
    foreach ($groupedRecords as $date => $dateRecords) {
        // Date header
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 8, 'Date: ' . ($date !== 'No Date' ? date('d M Y', strtotime($date)) : 'No Attendance'), 0, 1, 'L');
        $pdf->Ln(2);
        
        // Table header
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell(40, 8, 'Name', 1, 0, 'C');
        $pdf->Cell(25, 8, 'ID/Code', 1, 0, 'C');
        $pdf->Cell(20, 8, 'Type', 1, 0, 'C');
        $pdf->Cell(20, 8, 'Status', 1, 0, 'C');
        $pdf->Cell(20, 8, 'In Time', 1, 0, 'C');
        $pdf->Cell(20, 8, 'Out Time', 1, 0, 'C');
        $pdf->Cell(45, 8, 'Guardian Info', 1, 1, 'C');
        
        // Table data
        $pdf->SetFont('helvetica', '', 8);
        foreach ($dateRecords as $record) {
            $guardianInfo = '';
            if ($record['type'] === 'student') {
                $guardianParts = [];
                if ($record['in_guardian_name']) {
                    $guardianParts[] = 'Drop: ' . $record['in_guardian_name'];
                }
                if ($record['out_guardian_name']) {
                    $guardianParts[] = 'Pick: ' . $record['out_guardian_name'];
                }
                $guardianInfo = implode(', ', $guardianParts);
            }
            
            $pdf->Cell(40, 6, substr($record['student_name'] ?: 'Unknown', 0, 20), 1, 0, 'L');
            $pdf->Cell(25, 6, $record['student_code'] ?: 'N/A', 1, 0, 'C');
            $pdf->Cell(20, 6, ucfirst($record['type']), 1, 0, 'C');
            $pdf->Cell(20, 6, ucfirst($record['status'] ?: 'Absent'), 1, 0, 'C');
            $pdf->Cell(20, 6, $record['in_time'] ? substr($record['in_time'], 0, 5) : '-', 1, 0, 'C');
            $pdf->Cell(20, 6, $record['out_time'] ? substr($record['out_time'], 0, 5) : '-', 1, 0, 'C');
            $pdf->Cell(45, 6, substr($guardianInfo, 0, 30), 1, 1, 'L');
        }
        
        $pdf->Ln(5);
    }
    
    // Summary statistics
    $totalRecords = count($records);
    $presentCount = count(array_filter($records, function($r) { return $r['status'] === 'present'; }));
    $absentCount = count(array_filter($records, function($r) { return $r['status'] === 'absent'; }));
    $unmarkedCount = $totalRecords - $presentCount - $absentCount;
    
    $pdf->SetFont('helvetica', 'B', 12);
    $pdf->Cell(0, 8, 'Summary Statistics', 0, 1, 'L');
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(50, 6, 'Total Records: ' . $totalRecords, 0, 1, 'L');
    $pdf->Cell(50, 6, 'Present: ' . $presentCount, 0, 1, 'L');
    $pdf->Cell(50, 6, 'Absent: ' . $absentCount, 0, 1, 'L');
    $pdf->Cell(50, 6, 'Unmarked: ' . $unmarkedCount, 0, 1, 'L');
    
    // Create uploads directory if it doesn't exist
    $uploadsDir = '../../uploads/reports';
    if (!file_exists($uploadsDir)) {
        mkdir($uploadsDir, 0777, true);
    }
    
    // Generate filename
    $filename = 'monthly_attendance_' . $month . '_' . date('YmdHis') . '.pdf';
    $filepath = $uploadsDir . '/' . $filename;
    
    // Output PDF to file
    $pdf->Output($filepath, 'F');
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'PDF generated successfully',
        'pdf_url' => '/uploads/reports/' . $filename,
        'filename' => $filename,
        'records_count' => $totalRecords,
        'month' => $month
    ]);
    
} catch (Exception $e) {
    error_log('PDF Generation Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to generate PDF: ' . $e->getMessage()
    ]);
}
?>
