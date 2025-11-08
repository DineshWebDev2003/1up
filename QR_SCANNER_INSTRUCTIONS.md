# QR Code Scanner for Student Attendance

## 📱 Mobile App QR Scanner

### How to Use:
1. Open the app and go to Teacher Home
2. Tap on "Scan Attendance" button
3. Allow camera permission when prompted
4. Point camera at student's QR code
5. Keep QR code within the green frame
6. Wait for automatic detection
7. Student will be marked as present automatically

### Features:
- ✅ Real-time QR code detection
- ✅ Automatic attendance marking
- ✅ Visual feedback with scanning animation
- ✅ Error handling for invalid QR codes
- ✅ Works with both JSON and integer QR formats

---

## 🌐 Web-Based QR Scanner (Backup)

### How to Use:
1. Open `qr-scanner-web.html` in any web browser
2. Click "Start Camera" button
3. Allow camera permission when prompted
4. Point camera at student's QR code
5. Keep QR code within the green frame
6. Wait for automatic detection and processing
7. Student will be marked as present

### Features:
- ✅ Works in any modern web browser
- ✅ No app installation required
- ✅ Real-time QR code detection
- ✅ Automatic attendance marking
- ✅ Visual scanning animation
- ✅ Student information display
- ✅ Error handling and status messages

### Requirements:
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Camera access permission
- Internet connection
- Valid session token

### Setup:
1. Open `qr-scanner-web.html` in browser
2. Enter your session token when prompted
3. Token will be saved for future use
4. Start scanning!

---

## 🔧 Technical Details

### QR Code Formats Supported:
1. **JSON Format** (Recommended):
   ```json
   {
     "student_id": 123,
     "name": "John Doe"
   }
   ```

2. **Integer Format** (Legacy):
   ```
   123
   ```

### API Endpoint:
- **URL**: `/api/attendance/mark_manual_attendance.php`
- **Method**: POST
- **Data**: `{ student_id, status: 'present', date }`

### Error Handling:
- Invalid QR code format
- Camera permission denied
- Network connection issues
- API errors
- Student not found

---

## 🚀 Quick Start

### For Teachers:
1. Use the mobile app QR scanner for daily use
2. Use the web scanner as backup if app has issues
3. Both methods mark attendance automatically
4. Check attendance status in the app

### For Students:
1. Generate QR code with student ID
2. Show QR code to teacher for scanning
3. QR code can be printed or displayed on phone
4. QR code should contain student ID in supported format

---

## 📞 Support

If you encounter any issues:
1. Check camera permissions
2. Ensure stable internet connection
3. Verify QR code format
4. Check session token validity
5. Try the web-based scanner as alternative

Both scanners are designed to work reliably and provide immediate feedback for successful attendance marking.
