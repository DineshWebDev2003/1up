# TN Happy Kids Playschool - Invoice API Setup Instructions

## 📋 Overview
This guide will help you set up the invoice API system to work with your existing server at `https://appv5.tnhappykids.in/lastchapter/`.

## 🚀 Quick Setup Steps

### 1. Upload API Files to Your Server
Upload these files to your server in the following structure:

```
https://appv5.tnhappykids.in/lastchapter/
├── api/
│   ├── config/
│   │   └── database.php
│   ├── payments/
│   │   ├── create_payment.php
│   │   ├── payment_history.php
│   │   └── get_invoices.php
│   ├── test_api.php
│   └── env_example.txt
```

### 2. Database Configuration ✅ **READY!**

**Good news!** The database configuration is already set up with your actual credentials:

- **Host:** localhost
- **Database:** tnhappyki_happy  
- **Username:** tnhappyki_happy
- **Password:** ✅ Configured

No additional configuration needed! The API files are ready to connect to your database.

### 3. Test the Setup

#### Test 1: Database Connection Test
Visit: `https://appv5.tnhappykids.in/lastchapter/api/connection_test.php`

Expected response:
```json
{
  "success": true,
  "message": "Database connection successful!",
  "database": "tnhappyki_happy",
  "timestamp": "2025-10-02 12:30:00"
}
```

#### Test 2: Basic API Test
Visit: `https://appv5.tnhappykids.in/lastchapter/api/test_api.php`

#### Test 3: Database Structure Check
Visit: `https://appv5.tnhappykids.in/lastchapter/api/verify_database.php`

#### Test 4: Payment History API
Visit: `https://appv5.tnhappykids.in/lastchapter/api/payments/payment_history.php`

### 4. Verify Invoice Creation
Test creating an invoice using a tool like Postman or curl:

```bash
curl -X POST https://appv5.tnhappykids.in/lastchapter/api/payments/create_payment.php \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "amount": 1000,
    "description": "Test Invoice",
    "type": "fee",
    "status": "paid",
    "branch_id": 1
  }'
```

## 🔧 Troubleshooting

### Common Issues

#### 1. 500 Internal Server Error
- Check PHP error logs on your server
- Verify database credentials are correct
- Ensure the `invoices` table exists
- Check file permissions (should be 644 for PHP files)

#### 2. Database Connection Failed
- Verify database credentials in `.env` or `database.php`
- Check if the database `tnhappyki_happy` exists
- Ensure the database user has proper permissions

#### 3. CORS Issues
- The API includes CORS headers, but if you still have issues, check your server configuration
- Ensure your server allows the required HTTP methods (GET, POST, OPTIONS)

#### 4. Missing Tables
If you get "table doesn't exist" errors, you may need to create additional tables:

```sql
-- Students table (if it doesn't exist)
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    parent_name VARCHAR(255),
    guardian_name VARCHAR(255),
    class_name VARCHAR(100),
    phone VARCHAR(20),
    branch_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branches table (if it doesn't exist)
CREATE TABLE branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact VARCHAR(20),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📱 App Integration

Once the API is working, your app should automatically:
1. ✅ Create invoices when payments are made
2. ✅ Display real invoice data instead of mock data
3. ✅ Generate proper invoice numbers (TNHK format)
4. ✅ Show correct student and branch information

## 🆘 Need Help?

If you encounter issues:
1. Check the PHP error logs on your server
2. Test each endpoint individually
3. Verify your database structure matches the expected schema
4. Ensure all files are uploaded to the correct directories

## 📞 Support

The API endpoints are now ready to handle:
- ✅ Invoice creation with auto-generated invoice numbers
- ✅ Payment history retrieval with filtering
- ✅ Individual invoice lookup
- ✅ Integration with existing student and branch data
