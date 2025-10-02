<?php
// Database configuration for TN Happy Kids Playschool
class Database {
    private $host = "localhost";
    private $port = "3306";
    private $database_name = "tnhappyki_happy";
    private $username = "tnhappyki_happy";
    private $password = "eRcI!2e5$0A9";
    public $conn;

    // Get database connection
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
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed. Please check server configuration.',
                'error_code' => 'DB_CONNECTION_ERROR'
            ]);
            exit;
        }
        
        return $this->conn;
    }
}

// CORS headers for React Native app
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Create database instance and get connection
$database = new Database();
$pdo = $database->getConnection();

// Helper function to get database connection (for backward compatibility)
function getDbConnection() {
    global $pdo;
    return $pdo;
}
?>
