<?php

// Admin User Creation Script for TN Happy Kids Playschool
// This script creates an admin user with the specified credentials

// Database configuration - adjust according to your setup
$host = 'localhost';
$username = 'root';
$password = '';
$database = 'happy1'; // Adjust to your database name

try {
    // Create database connection
    $conn = new PDO("mysql:host=$host;dbname=$database", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // User details
    $admin_username = '9514900070';
    $admin_password = 'Founder@95149';
    $admin_email = 'admin@tnhappykids.in';
    $admin_role = 'admin';
    $admin_name = 'System Administrator';
    
    // First, check if users table exists and get its structure
    $table_check_sql = "SHOW TABLES LIKE 'users'";
    $table_stmt = $conn->query($table_check_sql);
    
    if ($table_stmt->rowCount() == 0) {
        echo "📋 Users table doesn't exist. Creating it...\n";
        createUsersTable($conn);
        // After creating table, run the script again
        echo "🔄 Please refresh this page to create the admin user.\n";
        exit;
    }
    
    // Check table structure to understand existing columns
    $structure_sql = "DESCRIBE users";
    $structure_stmt = $conn->query($structure_sql);
    $columns = [];
    while ($row = $structure_stmt->fetch(PDO::FETCH_ASSOC)) {
        $columns[$row['Field']] = $row;
    }
    
    echo "📋 Existing table columns: " . implode(', ', array_keys($columns)) . "\n";
    
    // Hash the password (using password_hash for security)
    $hashed_password = password_hash($admin_password, PASSWORD_DEFAULT);
    
    // Check if user already exists
    $check_sql = "SELECT id FROM users WHERE username = :username";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->execute([':username' => $admin_username]);
    
    if ($check_stmt->rowCount() > 0) {
        echo "❌ Admin user already exists! Updating...\n";
        
        // Build update query based on available columns
        $update_fields = [];
        $update_params = [':username' => $admin_username];
        
        if (isset($columns['password_hash'])) {
            $update_fields[] = 'password_hash = :password_hash';
            $update_params[':password_hash'] = $hashed_password;
        } elseif (isset($columns['password'])) {
            $update_fields[] = 'password = :password';
            $update_params[':password'] = $hashed_password;
        }
        
        if (isset($columns['role'])) {
            $update_fields[] = 'role = :role';
            $update_params[':role'] = $admin_role;
        }
        
        if (isset($columns['email'])) {
            $update_fields[] = 'email = :email';
            $update_params[':email'] = $admin_email;
        }
        
        if (isset($columns['name'])) {
            $update_fields[] = 'name = :name';
            $update_params[':name'] = $admin_name;
        }
        
        if (isset($columns['status'])) {
            $update_fields[] = "status = 'active'";
        }
        
        if (!empty($update_fields)) {
            $update_sql = "UPDATE users SET " . implode(', ', $update_fields) . " WHERE username = :username";
            $update_stmt = $conn->prepare($update_sql);
            $update_stmt->execute($update_params);
            echo "✅ Existing user updated to admin role!\n";
        } else {
            echo "❌ No updatable fields found in table structure.\n";
        }
        exit;
    }
    
    // Insert admin user - build query based on available columns
    $insert_fields = ['username'];
    $insert_placeholders = [':username'];
    $insert_params = [':username' => $admin_username];
    
    // Add password field (check for password_hash first, then password)
    if (isset($columns['password_hash'])) {
        $insert_fields[] = 'password_hash';
        $insert_placeholders[] = ':password_hash';
        $insert_params[':password_hash'] = $hashed_password;
    } elseif (isset($columns['password'])) {
        $insert_fields[] = 'password';
        $insert_placeholders[] = ':password';
        $insert_params[':password'] = $hashed_password;
    }
    
    // Add other fields if they exist
    if (isset($columns['email'])) {
        $insert_fields[] = 'email';
        $insert_placeholders[] = ':email';
        $insert_params[':email'] = $admin_email;
    }
    
    if (isset($columns['role'])) {
        $insert_fields[] = 'role';
        $insert_placeholders[] = ':role';
        $insert_params[':role'] = $admin_role;
    }
    
    if (isset($columns['name'])) {
        $insert_fields[] = 'name';
        $insert_placeholders[] = ':name';
        $insert_params[':name'] = $admin_name;
    }
    
    if (isset($columns['status'])) {
        $insert_fields[] = 'status';
        $insert_placeholders[] = "'active'";
    }
    
    if (isset($columns['created_at'])) {
        $insert_fields[] = 'created_at';
        $insert_placeholders[] = 'NOW()';
    }
    
    // Insert admin user
    $sql = "INSERT INTO users (" . implode(', ', $insert_fields) . ") 
            VALUES (" . implode(', ', $insert_placeholders) . ")";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($insert_params);
    
    $user_id = $conn->lastInsertId();
    
    echo "✅ Admin user created successfully!\n";
    echo "📋 User Details:\n";
    echo "   - User ID: $user_id\n";
    echo "   - Username: $admin_username\n";
    echo "   - Password: $admin_password\n";
    echo "   - Email: $admin_email\n";
    echo "   - Role: $admin_role\n";
    echo "   - Name: $admin_name\n";
    echo "\n⚠️  Important: Keep these credentials secure!\n";
    
} catch(PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    
    // Show more detailed error information
    echo "📋 Debug Info:\n";
    echo "   - Error Code: " . $e->getCode() . "\n";
    echo "   - File: " . $e->getFile() . "\n";
    echo "   - Line: " . $e->getLine() . "\n";
}

function createUsersTable($conn) {
    $create_table_sql = "
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role ENUM('admin', 'teacher', 'parent', 'student') DEFAULT 'student',
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";
    
    try {
        $conn->exec($create_table_sql);
        echo "✅ Users table created successfully!\n";
    } catch(PDOException $e) {
        echo "❌ Error creating table: " . $e->getMessage() . "\n";
    }
}
?>