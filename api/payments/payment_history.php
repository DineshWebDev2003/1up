<?php
// Payment History API for TN Happy Kids Playschool
// Retrieves invoice/payment history with filtering options

// Include database connection (includes CORS headers)
require_once __DIR__ . '/../config/database.php';

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get query parameters
    $branch_id = isset($_GET['branch_id']) ? (int)$_GET['branch_id'] : null;
    $student_id = isset($_GET['student_id']) ? (int)$_GET['student_id'] : null;
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $type = isset($_GET['type']) ? $_GET['type'] : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    // Build the query
    $where_conditions = [];
    $params = [];
    
    if ($branch_id) {
        $where_conditions[] = "i.branch_id = ?";
        $params[] = $branch_id;
    }
    
    if ($student_id) {
        $where_conditions[] = "i.student_id = ?";
        $params[] = $student_id;
    }
    
    if ($status) {
        $where_conditions[] = "i.status = ?";
        $params[] = $status;
    }
    
    if ($type) {
        $where_conditions[] = "i.type = ?";
        $params[] = $type;
    }
    
    $where_clause = '';
    if (!empty($where_conditions)) {
        $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
    }
    
    // Get invoices with student and branch details
    $query = "
        SELECT i.*,
               s.name as student_name,
               s.parent_name,
               s.guardian_name,
               s.class_name,
               b.name as branch_name,
               b.address as branch_address,
               b.contact as branch_contact,
               b.phone as branch_phone
        FROM invoices i
        LEFT JOIN students s ON i.student_id = s.id
        LEFT JOIN branches b ON i.branch_id = b.id
        $where_clause
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $params[] = $limit;
    $params[] = $offset;
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get total count for pagination
    $count_query = "
        SELECT COUNT(*) as total
        FROM invoices i
        LEFT JOIN students s ON i.student_id = s.id
        LEFT JOIN branches b ON i.branch_id = b.id
        $where_clause
    ";
    
    $count_params = array_slice($params, 0, -2); // Remove limit and offset
    $count_stmt = $pdo->prepare($count_query);
    $count_stmt->execute($count_params);
    $total_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Format the data for the app
    $formatted_invoices = [];
    foreach ($invoices as $invoice) {
        $formatted_invoice = [
            'id' => $invoice['id'],
            'invoice_number' => $invoice['invoice_number'],
            'student_id' => $invoice['student_id'],
            'student_name' => $invoice['student_name'],
            'parent_name' => $invoice['parent_name'],
            'guardian_name' => $invoice['guardian_name'],
            'class_name' => $invoice['class_name'],
            'amount' => (float)$invoice['amount'],
            'description' => $invoice['description'],
            'fee_type' => $invoice['description'], // For backward compatibility
            'type' => $invoice['type'],
            'due_date' => $invoice['due_date'],
            'status' => $invoice['status'],
            'payment_date' => $invoice['paid_date'],
            'paid_date' => $invoice['paid_date'],
            'date' => $invoice['paid_date'] ? date('d/m/Y', strtotime($invoice['paid_date'])) : date('d/m/Y', strtotime($invoice['created_at'])),
            'branch_id' => $invoice['branch_id'],
            'branch_name' => $invoice['branch_name'],
            'branch_address' => $invoice['branch_address'],
            'branch_contact' => $invoice['branch_contact'],
            'branch_phone' => $invoice['branch_phone'],
            'created_by' => $invoice['created_by'],
            'created_at' => $invoice['created_at'],
            'updated_at' => $invoice['updated_at'],
            // For invoice display compatibility
            'payment_method' => 'Cash', // Default, can be enhanced later
            'transaction_id' => $invoice['invoice_number'] // Use invoice number as transaction ID
        ];
        
        $formatted_invoices[] = $formatted_invoice;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $formatted_invoices,
        'pagination' => [
            'total' => (int)$total_count,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total_count
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
