<?php
// Student Attendance with real API integration
session_start();

// Check if user is logged in
if (!isset($_SESSION['sessionToken']) || !isset($_SESSION['userData'])) {
    header('Location: login.php');
    exit;
}

// Configuration
$API_BASE_URL = 'http://10.216.219.139/lastchapter';
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

// Get parameters
$branch_id = $_GET['branch_id'] ?? null;
$date = $_GET['date'] ?? date('Y-m-d');

// Fetch branches
$branches = [['id' => 'All', 'name' => 'All']];
if ($SESSION_TOKEN) {
    $branchesResponse = makeApiCall('/api/branches/get_branches.php');
    if ($branchesResponse && $branchesResponse['success']) {
        $branches = array_merge($branches, $branchesResponse['data']);
    }
}

// Fetch students
$students = [];
if ($SESSION_TOKEN) {
    $studentsUrl = '/api/students/get_students.php';
    if ($branch_id && $branch_id !== 'All') {
        $studentsUrl .= '?branch_id=' . $branch_id;
    }
    $studentsResponse = makeApiCall($studentsUrl);
    if ($studentsResponse && $studentsResponse['success']) {
        $allStudents = $studentsResponse['data'] ?? [];
        
        // Fetch attendance data for the specific date
        $attendanceUrl = '/api/attendance/get_attendance.php?date=' . $date;
        if ($branch_id && $branch_id !== 'All') {
            $attendanceUrl .= '&branch_id=' . $branch_id;
        }
        $attendanceResponse = makeApiCall($attendanceUrl);
        $attendanceData = [];
        if ($attendanceResponse && $attendanceResponse['success']) {
            $attendanceData = $attendanceResponse['data'] ?? [];
        }
        
        // Merge students with attendance data
        $attendanceMap = [];
        foreach ($attendanceData as $att) {
            if ($att) {
                if (isset($att['id'])) $attendanceMap[$att['id']] = $att;
                if (isset($att['student_id'])) $attendanceMap[$att['student_id']] = $att;
            }
        }
        
        foreach ($allStudents as $student) {
            $key = $student['student_id'] ?? $student['id'];
            $attendanceRecord = $attendanceMap[$key] ?? null;
            
            $students[] = [
                'id' => $student['id'],
                'name' => $student['name'],
                'student_id' => $student['student_id'],
                'branch_name' => $student['branch_name'],
                'status' => $attendanceRecord ? $attendanceRecord['status'] : 'unmarked',
                'inTime' => $attendanceRecord && $attendanceRecord['check_in_time'] ? substr($attendanceRecord['check_in_time'], 0, 5) : null,
                'outTime' => $attendanceRecord && $attendanceRecord['check_out_time'] ? substr($attendanceRecord['check_out_time'], 0, 5) : null,
                'inBy' => $attendanceRecord ? $attendanceRecord['marked_by_name'] . ' (' . $attendanceRecord['marked_by_role'] . ')' : null,
                'outBy' => $attendanceRecord ? $attendanceRecord['marked_by_name'] . ' (' . $attendanceRecord['marked_by_role'] . ')' : null,
                'type' => $attendanceRecord ? ($attendanceRecord['guardian_type'] ?? 'Manual') : 'Manual',
                'father_name' => $student['parent_name'] ?? null,
                'mother_name' => $student['mother_name'] ?? null,
                'guardian_name' => $student['guardian_name'] ?? null,
                'father_photo' => $student['father_photo'] ?? null,
                'mother_photo' => $student['mother_photo'] ?? null,
                'guardian_photo' => $student['guardian_photo'] ?? null,
            ];
        }
    }
}

$currentUser = $USER_DATA ? json_decode($USER_DATA, true) : null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Attendance</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/@mdi/font@7.4.47/css/materialdesignicons.min.css" rel="stylesheet">
    <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
    <style>
        :root {
            --primary: #6C63FF;
            --accent: #FF6B6B;
            --bg: #0b0f1a;
            --card: #121826;
            --text: #cbd5e1;
            --lightText: #ffffff;
            --shadow: rgba(0,0,0,0.25);
            --grad-1a: #6C63FF;
            --grad-1b: #00C49A;
            --grad-orange-a: #FFB36B;
            --grad-orange-b: #FF8A4C;
            --grad-success-a: #00D8B5;
            --grad-success-b: #5BE7C4;
            --grad-danger-a: #FF7A7A;
            --grad-danger-b: #FF6B6B;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial; background: var(--bg); color: var(--lightText); }
        .safe-area { min-height: 100vh; }
        .list-container { padding-left: 15px; padding-right: 15px; padding-bottom: 20px; max-width: 1100px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, var(--grad-1a), var(--grad-1b)); padding-top: 40px; padding-bottom: 20px; border-bottom-left-radius: 30px; border-bottom-right-radius: 30px; text-align: center; position: sticky; top: 0; z-index: 2; }
        .title { font-size: 32px; font-weight: 800; margin: 0; }
        .subtitle { font-size: 16px; opacity: 0.9; margin-top: 4px; }
        .qr-btn { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 25px; margin-top: 15px; border: 1px solid rgba(255,255,255,0.3); color: #fff; text-decoration: none; font-weight: 600; }

        .filters { display: flex; gap: 10px; align-items: center; justify-content: space-between; padding: 15px 5px; }
        .picker { flex: 1; background: var(--card); border-radius: 15px; padding: 10px; color: var(--lightText); border: 0; outline: none; }
        .date-btn { flex: 1; display: flex; justify-content: center; align-items: center; gap: 10px; background: var(--card); border-radius: 15px; padding: 15px; border: 0; color: var(--primary); font-weight: 700; }

        .mode-selector { display: flex; justify-content: center; gap: 10px; background: var(--bg); padding: 0 15px 10px; }
        .mode-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--card); padding: 10px 20px; border-radius: 20px; border: 1px solid var(--primary); color: var(--primary); font-weight: 700; cursor: pointer; }
        .mode-btn.active { background: var(--primary); color: #fff; }

        .student-card { border-radius: 15px; padding: 15px; margin-bottom: 15px; display: flex; align-items: center; position: relative; box-shadow: 0 5px 14px rgba(0,0,0,0.18); }
        .grad-orange { background: linear-gradient(135deg, var(--grad-orange-a), var(--grad-orange-b)); }
        .grad-success { background: linear-gradient(135deg, var(--grad-success-a), var(--grad-success-b)); }
        .grad-danger { background: linear-gradient(135deg, var(--grad-danger-a), var(--grad-danger-b)); }
        .student-info { display: flex; align-items: center; flex: 1; }
        .avatar { width: 50px; height: 50px; border-radius: 25px; border: 2px solid #fff; object-fit: cover; }
        .student-details { margin-left: 12px; flex: 1; }
        .student-name { font-size: 17px; font-weight: 800; }
        .student-id { font-size: 14px; opacity: 0.9; }
        .tag { display: inline-flex; align-items: center; background: rgba(255,255,255,0.2); border-radius: 10px; padding: 4px 8px; margin-top: 5px; gap: 6px; }
        .tag i { font-size: 14px; }
        .attn-details { text-align: right; margin-left: 10px; }
        .time { font-size: 13px; font-weight: 700; }
        .summary { font-size: 12px; opacity: 0.9; margin-top: 4px; }
        .actions { position: absolute; top: 5px; right: 5px; display: flex; gap: 6px; }
        .btn { padding: 6px 12px; border-radius: 15px; font-weight: 800; border: 0; cursor: pointer; }
        .btn-in { background: rgba(255,255,255,0.2); color: #fff; }
        .btn-out { background: rgba(0,0,0,0.25); color: #fff; }
        .btn-guardian { background: rgba(255,165,0,0.3); color: #fff; font-size: 11px; padding: 4px 8px; }
        .btn.active { outline: 2px solid #fff; }

        .footer-btn { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 18px; border-radius: 15px; margin-top: 10px; background: linear-gradient(135deg, #4e67eb, #8e54e9); color: #fff; font-weight: 800; text-decoration: none; }

        .empty { text-align: center; padding: 50px 20px; }
        .empty-text { font-size: 16px; color: #a3b1c6; margin-top: 20px; }

        /* Modal */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #fff; color: #0f172a; border-radius: 20px; padding: 20px; width: 100%; max-width: 400px; }
        .modal-title { font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 20px; }
        .guardian { display: flex; align-items: center; gap: 15px; background: #121826; color: #fff; padding: 15px; border-radius: 15px; margin-bottom: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); cursor: pointer; }
        .guardian img { width: 50px; height: 50px; border-radius: 25px; }
        .guardian .type { font-size: 12px; color: var(--primary); font-weight: 600; margin-top: 2px; }
        .cancel { background: #ef4444; color: #fff; padding: 15px; border-radius: 15px; text-align: center; font-weight: 800; cursor: pointer; }
    </style>
    <script>
        const state = {
            branch: null,
            branches: <?php echo json_encode($branches); ?>,
            selectedBranchId: '<?php echo $branch_id ?? 'All'; ?>',
            date: new Date('<?php echo $date; ?>'),
            students: <?php echo json_encode($students); ?>,
            selectedStudent: null,
            attendanceStatus: 'present',
            showGuardianModal: false,
            currentUser: <?php echo json_encode($currentUser); ?>,
            apiBaseUrl: '<?php echo $API_BASE_URL; ?>',
            sessionToken: '<?php echo $SESSION_TOKEN; ?>'
        };
        function fmtDate(d){ return d.toLocaleDateString(); }
        function renderBranches(){
            const sel = document.getElementById('branch');
            sel.innerHTML = '';
            state.branches.forEach(b => {
                const o = document.createElement('option');
                o.value = b.id; o.textContent = b.name; if (b.id === state.selectedBranchId) o.selected = true; sel.appendChild(o);
            });
        }
        function renderList(){
            const list = document.getElementById('list');
            list.innerHTML = '';
            state.students.forEach((s,i) => {
                const card = document.createElement('div');
                card.className = 'student-card ' + (s.status==='present'?'grad-success':(s.status==='absent'?'grad-danger':'grad-orange'));
                card.innerHTML = `
                    <div class="student-info">
                        <img class="avatar" src="https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(s.name||'S')}&backgroundType=gradientLinear" alt="avatar" />
                        <div class="student-details">
                            <div class="student-name">${s.name||s.username||s.student_id}</div>
                            <div class="student-id">${s.student_id||s.id} - ${s.branch_name||''}</div>
                            <div class="tag"><i class="mdi ${s.type==='QR Code'?'mdi-qrcode-scan':'mdi-account-edit-outline'}"></i><span>${s.type||'N/A'}</span></div>
                        </div>
                    </div>
                    <div class="attn-details">
                        <div class="time">In: ${s.inTime||'--:--'}</div>
                        <div class="time">Out: ${s.outTime||'--:--'}</div>
                        <div class="summary">${summaryText(s)}</div>
                    </div>
                    <div class="actions">
                        <button class="btn btn-in ${s.status==='present'?'active':''}" data-id="${s.id}" data-status="present" onclick="markAttendanceDirect(${s.id}, 'present')">In</button>
                        <button class="btn btn-out ${s.status==='absent'?'active':''}" data-id="${s.id}" data-status="absent" onclick="markAttendanceDirect(${s.id}, 'absent')">Out</button>
                        <button class="btn btn-guardian" data-id="${s.id}" data-status="present" onclick="onMarkClick(event)">Guardian</button>
                    </div>
                `;
                list.appendChild(card);
            });
            // Remove old event listeners and add new ones
            list.querySelectorAll('.btn').forEach(btn => {
                btn.removeEventListener('click', onMarkClick);
                if (btn.classList.contains('btn-guardian')) {
                    btn.addEventListener('click', onMarkClick);
                }
            });
        }
        function summaryText(item){
            const rel = item.type || 'Manual';
            const by = item.inBy || item.outBy || 'N/A';
            const parts = [];
            if (item.inTime) parts.push(`In ${item.inTime}`);
            if (item.outTime) parts.push(`Out ${item.outTime}`);
            parts.push(`by ${rel}${by && by !== 'N/A' ? ` (${by})` : ''}`);
            return parts.join(' • ');
        }
        function onMarkClick(e){
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            const status = e.currentTarget.getAttribute('data-status');
            const stu = state.students.find(s => s.id===id);
            if (!stu) return;
            state.selectedStudent = stu;
            state.attendanceStatus = status;
            openModal();
        }
        
        // Direct manual attendance marking (without guardian selection)
        async function markAttendanceDirect(studentId, status) {
            const success = await markAttendance(studentId, status);
            if (success) {
                // Update UI optimistically
                const student = state.students.find(s => s.id === studentId);
                if (student) {
                    const now = new Date();
                    if (status === 'present') {
                        student.status = 'present';
                        student.inTime = now.toTimeString().slice(0,5);
                        student.type = 'Manual';
                    } else if (status === 'absent') {
                        student.status = 'absent';
                        student.outTime = now.toTimeString().slice(0,5);
                        student.type = 'Manual';
                    }
                    renderList();
                }
            }
        }
        function openModal(){ document.getElementById('backdrop').style.display = 'flex'; renderModal(); }
        function closeModal(){ document.getElementById('backdrop').style.display = 'none'; }
        function renderModal(){
            const s = state.selectedStudent; if (!s) return;
            const list = document.getElementById('guardians');
            list.innerHTML = '';
            const candidates = [
                { name: s.father_name || s.parent_name || 'Father', type: 'Father', photo: s.father_photo || s.parent_photo },
                { name: s.mother_name || 'Mother', type: 'Mother', photo: s.mother_photo },
                { name: s.guardian_name || 'Guardian', type: 'Guardian', photo: s.guardian_photo },
                { name: 'Captain', type: 'Captain', photo: null },
            ].filter(x => x.name);
            candidates.forEach(c => {
                const row = document.createElement('div');
                row.className = 'guardian';
                row.innerHTML = `
                    <img src="${c.photo?`https://via.placeholder.com/50?text=${encodeURIComponent(c.type[0])}`:'https://via.placeholder.com/50?text=G'}" alt="${c.name}" />
                    <div style="flex:1">
                        <div style="font-weight:800">${c.name}</div>
                        <div class="type">${c.type}</div>
                    </div>
                    <i class="mdi mdi-chevron-right" style="font-size:22px;color:var(--primary)"></i>
                `;
                row.addEventListener('click', () => confirmGuardian(c.type, c.name));
                list.appendChild(row);
            });
        }
        async function markAttendance(studentId, status, guardianType = null, guardianName = null) {
            try {
                const response = await fetch(state.apiBaseUrl + '/api/attendance/mark_manual_attendance.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + state.sessionToken
                    },
                    body: JSON.stringify({
                        student_id: studentId,
                        status: status,
                        date: state.date.toISOString().split('T')[0],
                        marked_by_name: state.currentUser?.name || state.currentUser?.username || 'Staff',
                        marked_by_role: state.currentUser?.role || 'Staff',
                        ...(guardianType && { guardian_type: guardianType }),
                        ...(guardianName && { marked_by: guardianName })
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                if (result.success) {
                    return true;
                } else {
                    alert('Error: ' + (result.message || 'Failed to mark attendance'));
                    return false;
                }
            } catch (error) {
                console.error('Attendance marking error:', error);
                alert('Error: Could not mark attendance - ' + error.message);
                return false;
            }
        }
        
        async function confirmGuardian(type, name){
            const s = state.selectedStudent; if (!s) return;
            
            // Mark attendance via API
            const success = await markAttendance(s.id, state.attendanceStatus, type, name);
            
            if (success) {
                // Optimistic UI update
                const now = new Date();
                if (state.attendanceStatus==='present') {
                    s.status = 'present'; s.inTime = now.toTimeString().slice(0,5); s.type = type;
                } else {
                    s.status = 'absent'; s.outTime = now.toTimeString().slice(0,5); s.type = type;
                }
                closeModal();
                renderList();
            }
        }
        // Mode switching
        function setMode(mode) {
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            event.target.closest('.mode-btn').classList.add('active');
            
            if (mode === 'qr') {
                openQRScannerWithPermissionCheck();
            }
        }
        
        // Open QR scanner with permission check
        async function openQRScannerWithPermissionCheck() {
            const hasPermission = await checkCameraPermissions();
            if (hasPermission) {
                openQRScanner();
            } else {
                alert("Camera permission is required for QR scanning. Please allow camera access and try again.");
                showManualInput();
            }
        }
        
        // QR Scanner functions
        let qrScanner = null;
        
        function openQRScanner() {
            document.getElementById('qr-scanner-modal').style.display = 'flex';
            
            // Small delay to ensure modal is visible
            setTimeout(() => {
                // Initialize QR scanner
                if (typeof Html5Qrcode !== 'undefined') {
                    qrScanner = new Html5Qrcode("qr-reader");
                    const config = { 
                        fps: 10, 
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    };
                    
                    qrScanner.start({ facingMode: "environment" }, config, onQRSuccess, onQRError)
                        .then(() => {
                            console.log("QR Scanner started successfully");
                        })
                        .catch(err => {
                            console.error("QR Scanner start error:", err);
                            // Try with user camera as fallback
                            qrScanner.start({ facingMode: "user" }, config, onQRSuccess, onQRError)
                                .catch(fallbackErr => {
                                    console.error("Fallback camera also failed:", fallbackErr);
                                    alert("Could not start camera. Please check permissions or try manual input.");
                                    showManualInput();
                                });
                        });
                } else {
                    console.error("Html5Qrcode library not loaded");
                    showManualInput();
                }
            }, 100);
        }
        
        function showManualInput() {
            const qrInput = prompt("Enter QR code data manually:");
            if (qrInput) {
                processQRCode(qrInput);
                closeQRScanner();
            }
        }
        
        function closeQRScanner() {
            if (qrScanner) {
                qrScanner.stop().then(() => {
                    qrScanner.clear();
                    qrScanner = null;
                }).catch(err => console.error("QR Scanner stop error:", err));
            }
            document.getElementById('qr-scanner-modal').style.display = 'none';
        }
        
        // Check camera permissions before opening scanner
        async function checkCameraPermissions() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop());
                return true;
            } catch (error) {
                console.error("Camera permission denied:", error);
                return false;
            }
        }
        
        function onQRSuccess(decodedText, decodedResult) {
            console.log("QR Code detected:", decodedText);
            processQRCode(decodedText);
            closeQRScanner();
        }
        
        function onQRError(error) {
            // Don't show error for every failed scan attempt
            console.log("QR Scan error:", error);
        }
        
        async function processQRCode(qrData) {
            try {
                let studentId;
                let studentCode = null;
                let studentName = 'Student';
                
                // Try to parse as JSON first (new format)
                try {
                    const qrDataObj = JSON.parse(qrData);
                    if (qrDataObj.student_id) {
                        studentId = qrDataObj.student_id;
                        if (typeof studentId === 'string' && isNaN(parseInt(studentId, 10))) {
                            studentCode = studentId;
                        }
                        studentName = qrDataObj.name || 'Student';
                    } else if (qrDataObj.id) {
                        studentId = qrDataObj.id;
                        studentName = qrDataObj.name || 'Student';
                    } else {
                        throw new Error('Invalid QR data structure');
                    }
                } catch (jsonError) {
                    // Fallback to integer parsing (old format)
                    studentId = parseInt(qrData, 10);
                    if (isNaN(studentId)) {
                        alert('Invalid QR Code: This QR code does not contain a valid student ID.');
                        return;
                    }
                }
                
                // Find the student in the current list
                const student = state.students.find(s => (s.id === studentId) || (s.student_id === studentId));
                if (!student) {
                    alert(`Student not found in current list. ID: ${studentId}`);
                    return;
                }
                
                // Mark attendance via API
                const success = await markAttendance(studentId, 'present', 'QR Code', 'QR Scanner');
                
                if (success) {
                    // Update UI optimistically
                    const now = new Date();
                    student.status = 'present';
                    student.inTime = now.toTimeString().slice(0, 5);
                    student.type = 'QR Code';
                    renderList();
                    alert(`${studentName} marked as present via QR Code!`);
                }
                
            } catch (error) {
                console.error('QR Code processing error:', error);
                alert('Error processing QR code: ' + error.message);
            }
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('subtitle').textContent = state.branch?`Branch: ${state.branch}`:'All Branches';
            renderBranches();
            renderList();
            document.getElementById('branch').addEventListener('change', (e)=>{ state.selectedBranchId = e.target.value; /* fetch */ });
            document.getElementById('date').textContent = fmtDate(state.date);
            document.getElementById('close').addEventListener('click', closeModal);
        });
    </script>
</head>
<body>
    <div class="safe-area">
        <div class="list-container">
            <header class="header">
                <h1 class="title">Student Attendance</h1>
                <p id="subtitle" class="subtitle">All Branches</p>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <a class="qr-btn" href="#" onclick="openQRScannerWithPermissionCheck()"><i class="mdi mdi-qrcode-scan"></i><span>QR Scanner</span></a>
                    <a href="attendance-hub.php" style="color: rgba(255,255,255,0.8); text-decoration: none; font-size: 14px; padding: 10px 20px; background: rgba(255,255,255,0.1); border-radius: 25px;">
                        <i class="mdi mdi-arrow-left" style="margin-right: 5px;"></i>Back to Hub
                    </a>
                </div>
            </header>

            <div class="filters">
                <select id="branch" class="picker"></select>
                <button class="date-btn" type="button"><i class="mdi mdi-calendar" style="font-size:22px;color:var(--primary)"></i><span id="date"></span></button>
            </div>

            <div class="mode-selector">
                <button class="mode-btn active" type="button" onclick="setMode('manual')"><i class="mdi mdi-format-list-bulleted"></i><span>Manual Entry</span></button>
                <button class="mode-btn" type="button" onclick="setMode('qr')"><i class="mdi mdi-qrcode-scan"></i><span>Scan QR</span></button>
            </div>
            
            <!-- QR Scanner Modal -->
            <div id="qr-scanner-modal" class="modal-backdrop" style="display: none;">
                <div class="modal" style="max-width: 500px;">
                    <div class="modal-title">QR Code Scanner</div>
                    <div id="qr-reader" style="width: 100%; height: 300px; background: #000; border-radius: 10px; margin: 20px 0; position: relative; overflow: hidden;"></div>
                    <div id="qr-reader-results" style="display: none;"></div>
                    <div style="text-align: center; margin: 20px 0;">
                        <button class="cancel" onclick="closeQRScanner()">Close Scanner</button>
                    </div>
                </div>
            </div>

            <div id="list"></div>

            <a class="footer-btn" href="#"><i class="mdi mdi-chart-bar" style="font-size:22px"></i><span>View Monthly Report</span></a>

            <div id="empty" class="empty" style="display:none">
                <div>No Data</div>
                <div class="empty-text">No attendance data found.</div>
            </div>
        </div>
    </div>

    <!-- Guardian Modal -->
    <div id="backdrop" class="modal-backdrop">
        <div class="modal">
            <div class="modal-title">Who is with <span id="studentName"></span>?</div>
            <div id="guardians"></div>
            <div id="close" class="cancel">Cancel</div>
        </div>
    </div>
</body>
</html>


