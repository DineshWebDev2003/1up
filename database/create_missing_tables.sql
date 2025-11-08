-- Create missing tables for Google Sign-In functionality
-- Run this SQL script in your MySQL database (happy1)

USE happy1;

-- Create user_invites table for managing Google Sign-In registrations
CREATE TABLE IF NOT EXISTS user_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Franchisee', 'Teacher', 'Student', 'Captain', 'Tuition Teacher', 'Tuition Student') NOT NULL,
    branch_id INT NOT NULL,
    invited_by INT NOT NULL,
    status ENUM('pending', 'used', 'expired') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    expires_at TIMESTAMP DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pending_invite (email, status)
);

-- Create user_sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_session_user (user_id)
);

-- Create FCM tokens table for better token management
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token TEXT NOT NULL,
    platform ENUM('android', 'ios', 'web') NOT NULL,
    device_info JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_fcm_user_id (user_id),
    INDEX idx_fcm_active (is_active)
);

-- Create notification topics table
CREATE TABLE IF NOT EXISTS notification_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user topic subscriptions table
CREATE TABLE IF NOT EXISTS user_topic_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    topic_name VARCHAR(255) NOT NULL,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_topic (user_id, topic_name),
    INDEX idx_user_topics (user_id)
);

-- Insert default notification topics
INSERT IGNORE INTO notification_topics (topic_name, description) VALUES
('general_announcements', 'General announcements for all users'),
('system_updates', 'System maintenance and update notifications'),
('app_updates', 'Mobile app update notifications'),
('all_users', 'Notifications for all registered users');

-- Fix password_hash field to allow NULL for Google Sign-In users
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- Insert sample user invites for testing Google Sign-In
-- Note: Replace branch_id and invited_by with actual values from your database
-- You can check existing branch IDs with: SELECT id, name FROM branches;
-- You can check admin user IDs with: SELECT id, name, role FROM users WHERE role = 'Admin';

-- Example invites (update the IDs as needed):
INSERT IGNORE INTO user_invites (email, role, branch_id, invited_by, status) VALUES
('demo@gmail.com', 'Student', 1, 1, 'pending'),
('test.student@gmail.com', 'Student', 1, 1, 'pending'),
('test.teacher@gmail.com', 'Teacher', 1, 1, 'pending');

-- Show the created tables
SHOW TABLES LIKE '%invite%';
SHOW TABLES LIKE '%session%';
SHOW TABLES LIKE '%fcm%';
SHOW TABLES LIKE '%notification%';

-- Show sample data
SELECT 'Tables created successfully!' as Status;
SELECT COUNT(*) as 'User Invites Count' FROM user_invites;
SELECT COUNT(*) as 'Notification Topics Count' FROM notification_topics;

-- Show existing branches and admin users for reference
SELECT 'Existing Branches:' as Info;
SELECT id, name, status FROM branches WHERE status = 'active';

SELECT 'Admin Users (for invited_by reference):' as Info;
SELECT id, name, email, role FROM users WHERE role IN ('Admin', 'Franchisee') LIMIT 5;
