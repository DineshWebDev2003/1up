-- My Invoice 2.0 Database Table Structure
-- This table stores all invoice data for admin and franchisee invoice generation

CREATE TABLE `my_invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` varchar(50) NOT NULL UNIQUE,
  `fee_category` enum('monthly', 'admission') NOT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `student_name` varchar(255) NOT NULL,
  `student_email` varchar(255) DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payer_name` varchar(255) NOT NULL,
  `payer_email` varchar(255) NOT NULL,
  `month_year` varchar(20) DEFAULT NULL, -- For monthly fees (e.g., "November 2024")
  `description` text DEFAULT NULL,
  `status` enum('pending', 'paid', 'cancelled') DEFAULT 'pending',
  `created_by` int(11) NOT NULL, -- Admin/Franchisee user ID
  `created_by_role` enum('admin', 'franchisee') NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `paid_at` timestamp NULL DEFAULT NULL,
  `pdf_path` varchar(500) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_id` (`invoice_id`),
  KEY `student_id` (`student_id`),
  KEY `created_by` (`created_by`),
  KEY `fee_category` (`fee_category`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice Payments Table (for tracking payment history)
CREATE TABLE `invoice_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` varchar(50) NOT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `payment_amount` decimal(10,2) NOT NULL,
  `payment_date` timestamp DEFAULT CURRENT_TIMESTAMP,
  `payment_status` enum('success', 'failed', 'pending') DEFAULT 'pending',
  `payment_notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  FOREIGN KEY (`invoice_id`) REFERENCES `my_invoices`(`invoice_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data for testing
INSERT INTO `my_invoices` (`invoice_id`, `fee_category`, `student_id`, `student_name`, `student_email`, `branch`, `amount`, `payer_name`, `payer_email`, `month_year`, `description`, `status`, `created_by`, `created_by_role`) VALUES
('INV-2024-001', 'monthly', 'STU001', 'Rahul Sharma', 'rahul@example.com', 'Main Branch', 5000.00, 'Mr. Rajesh Sharma', 'rajesh@example.com', 'November 2024', 'Monthly fee for November 2024', 'pending', 1, 'admin'),
('INV-2024-002', 'admission', NULL, 'Priya Patel', 'priya@example.com', 'South Branch', 15000.00, 'Mrs. Meera Patel', 'meera@example.com', NULL, 'Admission fee for new student', 'paid', 1, 'admin'),
('INV-2024-003', 'monthly', 'STU002', 'Arjun Kumar', 'arjun@example.com', 'North Branch', 4500.00, 'Mr. Suresh Kumar', 'suresh@example.com', 'November 2024', 'Monthly fee for November 2024', 'pending', 2, 'franchisee');
