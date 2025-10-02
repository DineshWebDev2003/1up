<?php
// Invoice Creation API for TN Happy Kids Playschool
// Creates new invoices in the invoices table

// Include database connection (includes CORS headers)
require_once __DIR__ . '/../config/database.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Log the request for debugging
    error_log("Invoice creation request received: " . $_SERVER['REQUEST_METHOD']);
    
    // Get JSON input
    $raw_input = file_get_contents('php://input');
    error_log("Raw input: " . $raw_input);
    
    $input = json_decode($raw_input, true);
    
    if (!$input) {
        $json_error = json_last_error_msg();
        error_log("JSON decode error: " . $json_error);
        throw new Exception('Invalid JSON input: ' . $json_error);
    }
    
    error_log("Parsed input: " . print_r($input, true));
    
    // Validate required fields
    $required_fields = ['student_id', 'amount'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Extract data
    $student_id = (int)$input['student_id'];
    $amount = (float)$input['amount'];
    $description = $input['description'] ?? $input['fee_type'] ?? 'Fee Payment';
    $type = $input['type'] ?? 'fee';
    $due_date = $input['due_date'] ?? null;
    $status = $input['status'] ?? 'paid';
    $branch_id = isset($input['branch_id']) ? (int)$input['branch_id'] : null;
    $created_by = isset($input['created_by']) ? (int)$input['created_by'] : null;
    
    // Generate invoice number
    $invoice_prefix = 'TNHK';
    $invoice_number = $invoice_prefix . date('Ymd') . sprintf('%04d', rand(1, 9999));
    
    // Check if invoice number already exists, regenerate if needed
    $check_stmt = $pdo->prepare("SELECT COUNT(*) FROM invoices WHERE invoice_number = ?");
    $check_stmt->execute([$invoice_number]);
    while ($check_stmt->fetchColumn() > 0) {
        $invoice_number = $invoice_prefix . date('Ymd') . sprintf('%04d', rand(1, 9999));
        $check_stmt->execute([$invoice_number]);
    }
    
    // Set paid_date if status is paid
    $paid_date = ($status === 'paid') ? date('Y-m-d H:i:s') : null;
    
    // Insert into invoices table
    $stmt = $pdo->prepare("
        INSERT INTO invoices (
            invoice_number, student_id, amount, description, type, 
            due_date, status, paid_date, branch_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $result = $stmt->execute([
        $invoice_number,
        $student_id,
        $amount,
        $description,
        $type,
        $due_date,
        $status,
        $paid_date,
        $branch_id,
        $created_by
    ]);
    
    if ($result) {
        $invoice_id = $pdo->lastInsertId();
        
        // Get the created invoice with additional details
        $invoice_stmt = $pdo->prepare("
            SELECT i.*, 
                   s.name as student_name,
                   s.parent_name,
                   s.guardian_name,
                   b.name as branch_name,
                   b.address as branch_address,
                   b.contact as branch_contact
            FROM invoices i
            LEFT JOIN students s ON i.student_id = s.id
            LEFT JOIN branches b ON i.branch_id = b.id
            WHERE i.id = ?
        ");
        $invoice_stmt->execute([$invoice_id]);
        $invoice_data = $invoice_stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Invoice created successfully',
            'data' => [
                'invoice_id' => $invoice_id,
                'invoice_number' => $invoice_number,
                'invoice' => $invoice_data
            ]
        ]);
    } else {
        throw new Exception('Failed to create invoice');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
