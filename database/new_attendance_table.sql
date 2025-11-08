-- Create new_attendance table
CREATE TABLE IF NOT EXISTS `new_attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `status` enum('present','absent') NOT NULL,
  `date` date NOT NULL,
  `in_time` time DEFAULT NULL,
  `out_time` time DEFAULT NULL,
  `in_by` varchar(255) DEFAULT NULL,
  `out_by` varchar(255) DEFAULT NULL,
  `in_guardian_type` varchar(50) DEFAULT NULL,
  `in_guardian_name` varchar(255) DEFAULT NULL,
  `out_guardian_type` varchar(50) DEFAULT NULL,
  `out_guardian_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_date` (`student_id`, `date`),
  KEY `idx_student_id` (`student_id`),
  KEY `idx_date` (`date`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_new_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for better performance
CREATE INDEX `idx_student_date_status` ON `new_attendance` (`student_id`, `date`, `status`);
CREATE INDEX `idx_created_at` ON `new_attendance` (`created_at`);
