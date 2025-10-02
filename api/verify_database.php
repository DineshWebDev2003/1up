<?php
// Database Structure Verification Script
// This script checks if all required tables and columns exist

// Include database connection (includes CORS headers)
require_once __DIR__ . '/config/database.php';

try {
    $results = [];
    
    // Check if invoices table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'invoices'");
    $invoicesTableExists = $stmt->rowCount() > 0;
    $results['invoices_table_exists'] = $invoicesTableExists;
    
    if ($invoicesTableExists) {
        // Check invoices table structure
        $stmt = $pdo->query("DESCRIBE invoices");
        $invoicesColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $results['invoices_columns'] = array_column($invoicesColumns, 'Field');
        
        // Count existing invoices
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM invoices");
        $results['invoices_count'] = $stmt->fetch()['count'];
    }
    
    // Check if students table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'students'");
    $studentsTableExists = $stmt->rowCount() > 0;
    $results['students_table_exists'] = $studentsTableExists;
    
    if ($studentsTableExists) {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM students");
        $results['students_count'] = $stmt->fetch()['count'];
    }
    
    // Check if branches table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'branches'");
    $branchesTableExists = $stmt->rowCount() > 0;
    $results['branches_table_exists'] = $branchesTableExists;
    
    if ($branchesTableExists) {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM branches");
        $results['branches_count'] = $stmt->fetch()['count'];
    }
    
    // List all tables in the database
    $stmt = $pdo->query("SHOW TABLES");
    $allTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $results['all_tables'] = $allTables;
    
    // Database info
    $stmt = $pdo->query("SELECT DATABASE() as db_name");
    $results['database_name'] = $stmt->fetch()['db_name'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Database verification completed',
        'data' => $results,
        'recommendations' => [
            'invoices_table' => $invoicesTableExists ? 'OK' : 'MISSING - Please create the invoices table',
            'students_table' => $studentsTableExists ? 'OK' : 'MISSING - May need to create students table',
            'branches_table' => $branchesTableExists ? 'OK' : 'MISSING - May need to create branches table'
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database verification failed: ' . $e->getMessage()
    ]);
}
?>
