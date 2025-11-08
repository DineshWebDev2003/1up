<?php
// Attendance Hub with real API integration
session_start();

// Check if user is logged in
if (!isset($_SESSION['sessionToken']) || !isset($_SESSION['userData'])) {
    header('Location: login.php');
    exit;
}

// Configuration
$API_BASE_URL = 'http://192.168.1.5/lastchapter';
$SESSION_TOKEN = $_SESSION['sessionToken'] ?? null;
$USER_DATA = $_SESSION['userData'] ?? null;

// Helper function to make API calls
function makeApiCall($endpoint, $method = 'GET', $data = null) {
    global $API_BASE_URL, $SESSION_TOKEN;
    
    $url = $API_BASE_URL . $endpoint;
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $SESSION_TOKEN
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For development
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    if ($data && in_array($method, ['POST', 'PUT', 'PATCH'])) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        error_log("CURL Error: " . $curlError);
        return ['success' => false, 'message' => 'Connection error: ' . $curlError];
    }
    
    if ($httpCode !== 200) {
        error_log("API Error - HTTP Code: " . $httpCode . ", Response: " . $response);
        return ['success' => false, 'message' => 'API call failed with code: ' . $httpCode];
    }
    
    $result = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON Decode Error: " . json_last_error_msg() . ", Response: " . $response);
        return ['success' => false, 'message' => 'Invalid JSON response'];
    }
    
    return $result;
}

// Fetch attendance stats
$stats = ['student_attendance' => ['present' => 0, 'total' => 0], 'staff_attendance' => ['present' => 0, 'total' => 0], 'user_role' => 'Guest', 'can_view_staff_attendance' => false];

if ($SESSION_TOKEN) {
    $statsResponse = makeApiCall('/api/dashboard/attendance_hub_stats.php');
    if ($statsResponse && $statsResponse['success']) {
        $stats = $statsResponse['data'];
    }
}

$userRole = $stats['user_role'];
$canViewStaffAttendance = $stats['can_view_staff_attendance'];
$studentAttendance = $stats['student_attendance'];
$staffAttendance = $stats['staff_attendance'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Hub</title>
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
            --grad-primary-1: #7C6CFF;
            --grad-primary-2: #5AB0FF;
            --grad-accent-1: #FF7A7A;
            --grad-accent-2: #FFB36B;
            --grad-secondary-1: #00D8B5;
            --grad-secondary-2: #5BE7C4;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial; background: var(--bg); color: var(--text); }
        .safe-area { min-height: 100vh; background: var(--bg); }
        .container { padding-bottom: 40px; }
        .header {
            background: linear-gradient(135deg, var(--grad-main-1), var(--grad-main-2));
            padding-top: 50px;
            padding-bottom: 30px;
            padding-left: 20px;
            padding-right: 20px;
            border-bottom-left-radius: 40px;
            border-bottom-right-radius: 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .title { font-size: 34px; font-weight: 800; color: var(--lightText); margin: 0; }
        .subtitle { font-size: 16px; color: rgba(255,255,255,0.9); margin-top: 6px; }
        .lottie-placeholder { width: 150px; height: 150px; margin: 0 auto -10px; opacity: 0.9; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.15)); }
        .lottie-circle { width: 150px; height: 150px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 2px dashed rgba(255,255,255,0.35); }

        .stats { display: flex; justify-content: space-around; gap: 16px; padding-left: 15px; padding-right: 15px; margin-top: -20px; }
        .stat-box {
            background: var(--lightText);
            color: var(--darkText);
            border-radius: 20px;
            padding: 15px;
            width: 48%;
            display: flex; flex-direction: column; align-items: center;
            box-shadow: 0 5px 20px var(--shadow);
        }
        .stat-label { font-size: 14px; font-weight: 600; margin-top: 8px; }
        .stat-value { font-size: 22px; font-weight: 800; margin-top: 4px; }

        .menu { padding-left: 20px; padding-right: 20px; margin-top: 30px; max-width: 980px; margin-left: auto; margin-right: auto; }
        .menu-item { display: block; text-decoration: none; margin-bottom: 20px; }
        .button {
            display: flex; align-items: center;
            padding: 25px 20px; border-radius: 20px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .button:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,0,0,0.25); }
        .icon { font-size: 40px; color: var(--lightText); }
        .button-text { color: var(--lightText); font-size: 18px; font-weight: 700; margin-left: 15px; }

        .grad-primary { background: linear-gradient(135deg, var(--grad-primary-1), var(--grad-primary-2)); }
        .grad-accent { background: linear-gradient(135deg, var(--grad-accent-1), var(--grad-accent-2)); }
        .grad-secondary { background: linear-gradient(135deg, var(--grad-secondary-1), var(--grad-secondary-2)); }

        .no-access { text-align: center; padding: 40px 20px; }
        .no-access-title { font-size: 20px; font-weight: 800; color: var(--primary); margin-top: 15px; margin-bottom: 8px; }
        .no-access-sub { font-size: 16px; color: #334155; opacity: 0.7; }

        @media (max-width: 720px) {
            .stats { flex-direction: column; align-items: center; }
            .stat-box { width: 100%; }
        }
    </style>
    <script>
        // Real data from PHP backend
        const state = {
            branch: null,
            userRole: '<?php echo $userRole; ?>',
            canViewStaffAttendance: <?php echo $canViewStaffAttendance ? 'true' : 'false'; ?>,
            studentAttendance: { present: <?php echo $studentAttendance['present']; ?>, total: <?php echo $studentAttendance['total']; ?> },
            staffAttendance: { present: <?php echo $staffAttendance['present']; ?>, total: <?php echo $staffAttendance['total']; ?> }
        };
        document.addEventListener('DOMContentLoaded', () => {
            const branchEl = document.getElementById('branch');
            branchEl.textContent = state.branch ? `Branch: ${state.branch}` : 'All Branches';
            document.getElementById('stud-val').textContent = `${state.studentAttendance.present} / ${state.studentAttendance.total}`;
            const staffBox = document.getElementById('staff-box');
            if (state.canViewStaffAttendance) {
                document.getElementById('staff-val').textContent = `${state.staffAttendance.present} / ${state.staffAttendance.total}`;
                staffBox.style.display = 'flex';
            } else {
                staffBox.style.display = 'none';
            }
            // Role-based menu filtering
            const role = state.userRole;
            document.querySelectorAll('[data-roles]').forEach(el => {
                const allowed = (el.getAttribute('data-roles') || '').split(',').map(s => s.trim());
                if (!allowed.includes(role)) { el.remove(); }
            });
            // If nothing left, show no-access
            if (!document.querySelector('.menu').children.length) {
                document.getElementById('no-access').style.display = 'block';
            }
        });
    </script>
</head>
<body>
    <div class="safe-area">
        <div class="container">
            <header class="header">
                <div class="lottie-placeholder"><div class="lottie-circle"></div></div>
                <h1 class="title">Attendance Hub</h1>
                <p id="branch" class="subtitle">All Branches</p>
                <div style="margin-top: 15px;">
                    <a href="logout.php" style="color: rgba(255,255,255,0.8); text-decoration: none; font-size: 14px;">
                        <i class="mdi mdi-logout" style="margin-right: 5px;"></i>Logout
                    </a>
                </div>
            </header>

            <section class="stats">
                <div class="stat-box">
                    <span class="mdi mdi-school-outline" style="font-size:30px;color:var(--primary)"></span>
                    <div class="stat-label">Student Attendance</div>
                    <div id="stud-val" class="stat-value">0 / 0</div>
                </div>
                <div id="staff-box" class="stat-box" style="display:none">
                    <span class="mdi mdi-account-tie-outline" style="font-size:30px;color:var(--accent)"></span>
                    <div class="stat-label">Staff Attendance</div>
                    <div id="staff-val" class="stat-value">0 / 0</div>
                </div>
            </section>

            <nav class="menu">
                <a class="menu-item" href="./attendance.php" data-roles="Admin,Franchisee,Teacher,Tuition Teacher">
                    <div class="button grad-primary">
                        <span class="mdi mdi-account-group-outline icon"></span>
                        <span class="button-text">Student Attendance</span>
                    </div>
                </a>
                <a class="menu-item" href="#" data-roles="Admin,Franchisee,Teacher">
                    <div class="button grad-accent">
                        <span class="mdi mdi-video-wireless-outline icon"></span>
                        <span class="button-text">Live Monitoring</span>
                    </div>
                </a>
                <a class="menu-item" href="#" data-roles="Admin,Franchisee,Teacher,Tuition Teacher">
                    <div class="button grad-secondary">
                        <span class="mdi mdi-qrcode-scan icon"></span>
                        <span class="button-text">QR Scanner</span>
                    </div>
                </a>
                <a class="menu-item" href="#" data-roles="Admin,Franchisee">
                    <div class="button grad-secondary">
                        <span class="mdi mdi-account-tie-outline icon"></span>
                        <span class="button-text">Staff Attendance</span>
                    </div>
                </a>
            </nav>

            <div id="no-access" class="no-access" style="display:none">
                <span class="mdi mdi-lock-outline" style="font-size:60px;color:var(--primary)"></span>
                <div class="no-access-title">No Attendance Access</div>
                <div class="no-access-sub">Your role doesn't have access to attendance features.</div>
            </div>
        </div>
    </div>
</body>
</html>


