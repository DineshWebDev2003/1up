<?php
// Get Invoices API for TN Happy Kids Playschool
// Retrieves specific invoices by ID or invoice number

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
    $invoice_id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $invoice_number = isset($_GET['invoice_number']) ? $_GET['invoice_number'] : null;
    $student_id = isset($_GET['student_id']) ? (int)$_GET['student_id'] : null;
    $branch_id = isset($_GET['branch_id']) ? (int)$_GET['branch_id'] : null;
    
    if ($invoice_id) {
        // Get specific invoice by ID
        $stmt = $pdo->prepare("
            SELECT i.*,
                   s.name as student_name,
                   s.parent_name,
                   s.guardian_name,
                   s.class_name,
                   s.phone as student_phone,
                   b.name as branch_name,
                   b.address as branch_address,
                   b.contact as branch_contact,
                   b.phone as branch_phone
            FROM invoices i
            LEFT JOIN students s ON i.student_id = s.id
            LEFT JOIN branches b ON i.branch_id = b.id
            WHERE i.id = ?
        ");
        $stmt->execute([$invoice_id]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            throw new Exception('Invoice not found');
        }
        
        echo json_encode([
            'success' => true,
            'data' => $invoice
        ]);
        
    } elseif ($invoice_number) {
        // Get specific invoice by invoice number
        $stmt = $pdo->prepare("
            SELECT i.*,
                   s.name as student_name,
                   s.parent_name,
                   s.guardian_name,
                   s.class_name,
                   s.phone as student_phone,
                   b.name as branch_name,
                   b.address as branch_address,
                   b.contact as branch_contact,
                   b.phone as branch_phone
            FROM invoices i
            LEFT JOIN students s ON i.student_id = s.id
            LEFT JOIN branches b ON i.branch_id = b.id
            WHERE i.invoice_number = ?
        ");
        $stmt->execute([$invoice_number]);
        $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$invoice) {
            throw new Exception('Invoice not found');
        }
        
        echo json_encode([
            'success' => true,
            'data' => $invoice
        ]);
        
    } else {
        // Get all invoices with optional filters
        $where_conditions = [];
        $params = [];
        
        if ($student_id) {
            $where_conditions[] = "i.student_id = ?";
            $params[] = $student_id;
        }
        
        if ($branch_id) {
            $where_conditions[] = "i.branch_id = ?";
            $params[] = $branch_id;
        }
        
        $where_clause = '';
        if (!empty($where_conditions)) {
            $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
        }
        
        $stmt = $pdo->prepare("
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
        ");
        $stmt->execute($params);
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $invoices
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
