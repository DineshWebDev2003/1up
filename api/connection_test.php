<?php
// Simple connection test - just tests database connectivity
// This is a minimal test without any dependencies

// Database configuration (same as your existing setup)
class Database {
    private $host = "localhost";
    private $port = "3306";
    private $database_name = "tnhappyki_happy";
    private $username = "tnhappyki_happy";
    private $password = "eRcI!2e5$0A9";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->database_name,
                $this->username,
                $this->password
            );
            $this->conn->exec("set names utf8");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            return "Connection error: " . $exception->getMessage();
        }
        
        return $this->conn;
    }
}

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Test the connection
$database = new Database();
$connection = $database->getConnection();

if (is_string($connection)) {
    // Connection failed
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
        'error' => $connection,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
} else {
    // Connection successful
    try {
        // Test a simple query
        $stmt = $connection->query("SELECT 1 as test");
        $result = $stmt->fetch();
        
        echo json_encode([
            'success' => true,
            'message' => 'Database connection successful!',
            'database' => 'tnhappyki_happy',
            'test_query' => $result,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Connection OK but query failed',
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}
?>
