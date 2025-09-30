<?php
// Simple login page for web access
session_start();

$error = '';
$success = '';

if ($_POST) {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if ($email && $password) {
        // Make API call to login
        $apiUrl = 'http://10.216.219.139/lastchapter/api/auth/login.php';
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json'
        ]);
        
        $loginData = json_encode([
            'email' => $email,
            'password' => $password
        ]);
        
        curl_setopt($ch, CURLOPT_POSTFIELDS, $loginData);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        // Debug information
        error_log("Login attempt - URL: " . $apiUrl);
        error_log("Login attempt - HTTP Code: " . $httpCode);
        error_log("Login attempt - CURL Error: " . ($curlError ?: 'None'));
        error_log("Login attempt - Response: " . $response);
        
        if ($curlError) {
            $error = 'Connection error: ' . $curlError;
        } elseif ($httpCode === 200) {
            $result = json_decode($response, true);
            if ($result && $result['success']) {
                // Store session data - using correct field names from your API
                $_SESSION['sessionToken'] = $result['data']['session_token'];
                $_SESSION['userData'] = json_encode($result['data']);
                $_SESSION['userRole'] = $result['data']['role'];
                $_SESSION['userId'] = $result['data']['id'];
                $_SESSION['branchId'] = $result['data']['branch_id'];
                
                // Redirect to attendance hub
                header('Location: attendance-hub.php');
                exit;
            } else {
                $error = $result['message'] ?? 'Login failed';
            }
        } else {
            $error = 'Server error (HTTP ' . $httpCode . '). Please try again.';
            if ($response) {
                $error .= ' Response: ' . substr($response, 0, 200);
            }
        }
    } else {
        $error = 'Please enter both email and password';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Happy Kids Play School</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css" rel="stylesheet">
    <style>
        :root {
            --primary: #6C63FF;
            --accent: #FF6B6B;
            --secondary: #00C49A;
            --bg: #0b0f1a;
            --card: #121826;
            --text: #cbd5e1;
            --lightText: #ffffff;
            --darkText: #0f172a;
            --shadow: rgba(0,0,0,0.25);
            --grad-main-1: #6C63FF;
            --grad-main-2: #00C49A;
        }
        * { box-sizing: border-box; }
        body { 
            margin: 0; 
            font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial; 
            background: var(--bg); 
            color: var(--text); 
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-container {
            background: var(--card);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--grad-main-1), var(--grad-main-2));
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: white;
        }
        .title {
            font-size: 28px;
            font-weight: 800;
            color: var(--lightText);
            margin: 0 0 8px 0;
        }
        .subtitle {
            font-size: 16px;
            color: var(--text);
            opacity: 0.7;
            margin: 0;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: var(--text);
            margin-bottom: 8px;
        }
        .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #374151;
            border-radius: 10px;
            background: var(--bg);
            color: var(--lightText);
            font-size: 16px;
            transition: border-color 0.2s;
        }
        .form-input:focus {
            outline: none;
            border-color: var(--primary);
        }
        .form-input::placeholder {
            color: #6b7280;
        }
        .login-btn {
            width: 100%;
            background: linear-gradient(135deg, var(--grad-main-1), var(--grad-main-2));
            color: var(--lightText);
            border: none;
            padding: 14px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(108, 99, 255, 0.3);
        }
        .error {
            background: #fee2e2;
            color: #dc2626;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .success {
            background: #d1fae5;
            color: #059669;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: var(--text);
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="header">
            <div class="logo">
                <i class="mdi mdi-school"></i>
            </div>
            <h1 class="title">Happy Kids</h1>
            <p class="subtitle">Play School Management</p>
        </div>
        
        <?php if ($error): ?>
            <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
        <?php if ($success): ?>
            <div class="success"><?php echo htmlspecialchars($success); ?></div>
        <?php endif; ?>
        
        <form method="POST">
            <div class="form-group">
                <label class="form-label" for="email">Email or Phone</label>
                <input 
                    type="text" 
                    id="email" 
                    name="email" 
                    class="form-input" 
                    placeholder="Enter your email or phone"
                    value="<?php echo htmlspecialchars($_POST['email'] ?? ''); ?>"
                    required
                >
            </div>
            
            <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    class="form-input" 
                    placeholder="Enter your password"
                    required
                >
            </div>
            
            <button type="submit" class="login-btn">
                <i class="mdi mdi-login" style="margin-right: 8px;"></i>
                Sign In
            </button>
        </form>
        
        <div class="footer">
            <p>Web Access Portal</p>
        </div>
    </div>
</body>
</html>
