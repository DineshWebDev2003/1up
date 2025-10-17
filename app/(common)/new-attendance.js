import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert, Image, ActivityIndicator, Modal, TextInput, Keyboard } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraView, Camera } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeAsync, safeSetState, safeNavigate, safeApiCall } from '../utils/crashPrevention';
import { optimizeImageUri, getOptimizedFlatListProps, debounce, measurePerformance } from '../utils/performanceOptimizer';

export default function NewAttendanceScreen() {
  const { branch, branch_id } = useLocalSearchParams();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState(['All']);
  const [selectedBranchId, setSelectedBranchId] = useState(branch_id);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [detailRecord, setDetailRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDateRecord, setSelectedDateRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'qr'
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successStudent, setSuccessStudent] = useState(null);
  const [selectedAction, setSelectedAction] = useState(''); // 'IN' or 'OUT'
  const [selectedMethod, setSelectedMethod] = useState(''); // 'Manual' or 'QR Scanner'

  const fetchBranches = useCallback(safeAsync(async () => {
    if (branch_id) return;
    const response = await authFetch('/api/branches/get_branches.php');
    const result = await response.json();
    if (result.success) {
      safeSetState(setBranches, ['All', ...result.data]);
    } else {
      console.error('Failed to fetch branches');
    }
  }), [branch_id]);

  const fetchStudents = useCallback(measurePerformance('fetchStudents', async (currentBranchId) => {
    setLoading(true);
    try {
      let allStudents = [];
      
      // Fetch from students table (existing students)
      try {
        let studentsUrl = '/api/students/get_students.php';
        if (currentBranchId && currentBranchId !== 'All') {
          studentsUrl += `?branch_id=${currentBranchId}`;
        }
        const studentsResponse = await authFetch(studentsUrl);
        const studentsResult = await studentsResponse.json();
        if (studentsResult.success && studentsResult.data) {
          allStudents = [...allStudents, ...studentsResult.data];
        }
      } catch (error) {
        console.log('Students table fetch failed, trying users table');
      }
      
      // Also fetch from users table (new students)
      try {
        let usersUrl = '/api/users/user_crud.php?role=Student';
        if (currentBranchId && currentBranchId !== 'All') {
          usersUrl += `&branch_id=${currentBranchId}`;
        }
        const usersResponse = await authFetch(usersUrl);
        const usersResult = await usersResponse.json();
        if (usersResult.success && usersResult.data) {
          const studentUsers = usersResult.data
            .filter(user => user.role === 'Student' && (user.status === 'active' || user.user_status === 'active' || user.approval_status === 'active'))
            .map(user => ({
              id: user.id,
              name: user.name || user.username,
              student_id: user.student_id, // Use actual student_id from database (TNHK25001, etc.)
              branch_name: user.branch_name,
              branch_id: user.branch_id,
              class: user.class_name, // Use class_name from classes table join
              section: user.section,
              email: user.email,
              parent_name: user.parent_name || user.father_name || user.mother_name,
              parent_phone: user.mobile || user.father_number || user.mother_number,
              profile_photo: user.avatar || user.profile_photo,
              source: 'users_table'
            }));
          allStudents = [...allStudents, ...studentUsers];
        }
      } catch (error) {
        console.log('Users table fetch failed');
      }
      
      // Remove duplicates based on email, student_id, or id with priority handling
      const uniqueStudents = allStudents.filter((student, index, self) => {
        // Find first occurrence of this student based on multiple criteria
        // Check each criteria separately to avoid false matches
        const firstIndex = self.findIndex(s => {
          // Priority 1: Match by student_id (most reliable)
          if (s.student_id && student.student_id && s.student_id === student.student_id) {
            return true;
          }
          // Priority 2: Match by email (if student_id not available)
          if (!s.student_id && !student.student_id && s.email && student.email && s.email === student.email) {
            return true;
          }
          // Priority 3: Match by id (fallback)
          if (!s.student_id && !student.student_id && !s.email && !student.email && s.id && student.id && s.id === student.id) {
            return true;
          }
          return false;
        });
        return index === firstIndex;
      });
      
      console.log('Total students loaded for attendance:', uniqueStudents.length);
      console.log('Sample student data:', uniqueStudents.slice(0, 2)); // Log first 2 students for debugging

      let studentsWithAttendance = uniqueStudents.map(student => ({
        ...student,
        name: student.name || student.username || student.student_id || 'Unknown Student',
        status: 'unmarked',
        inTime: null,
        outTime: null,
        inBy: null,
        outBy: null,
        guardianType: null,
        guardianName: null,
      }));

      try {
        const formattedDate = date.toISOString().split('T')[0];
        const branchQuery = currentBranchId && currentBranchId !== 'All' ? `&branch_id=${currentBranchId}` : '';
        const newAttRes = await authFetch(`/api/attendance/get_new_attendance.php?date=${formattedDate}${branchQuery}`);
        const newAttJson = await newAttRes.json();
        if (newAttJson.success && Array.isArray(newAttJson.data)) {
          const attMap = new Map();
          newAttJson.data.forEach(r => {
            if (r && r.student_id != null) attMap.set(r.student_id, r);
          });
          studentsWithAttendance = studentsWithAttendance.map(s => {
            const rec = attMap.get(s.id) || attMap.get(s.student_id);
            if (!rec) return s;
            // Determine status based on in/out times
            let studentStatus = s.status;
            if (rec.in_time && rec.out_time) {
              studentStatus = 'present'; // Has both in and out time
            } else if (rec.in_time && !rec.out_time) {
              studentStatus = 'present'; // Has in time, still in school
            } else if (rec.status) {
              studentStatus = rec.status; // Use API status
            }

            return {
              ...s,
              status: studentStatus,
              inTime: rec.in_time || s.inTime,
              outTime: rec.out_time || s.outTime,
              inBy: rec.in_guardian_name ? `${rec.in_guardian_name} (${rec.in_guardian_type || 'Guardian'})` : (rec.in_by || s.inBy),
              outBy: rec.out_guardian_name ? `${rec.out_guardian_name} (${rec.out_guardian_type || 'Guardian'})` : (rec.out_by || s.outBy),
              guardianType: rec.in_guardian_type || rec.out_guardian_type || s.guardianType,
              guardianName: rec.in_guardian_name || rec.out_guardian_name || s.guardianName,
            };
          });
        }
      } catch (mergeErr) {
        // Non-fatal; proceed with baseline list
      }

      setStudents(studentsWithAttendance);
      setFilteredStudents(studentsWithAttendance);

    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
      setFilteredStudents([]);
    } finally {
      setLoading(false);
    }
  }), [date]);

  useEffect(() => {
    const loadBranches = async () => {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (sessionToken) {
        fetchBranches();
      }
    };
    loadBranches();
  }, [fetchBranches]);

  useEffect(() => {
    fetchStudents(selectedBranchId);
  }, [selectedBranchId, fetchStudents]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setCurrentUser(JSON.parse(userData));
        }
      } catch (e) {}
    };
    loadUser();
  }, []);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  // Debounced search to prevent excessive filtering
  const debouncedSearch = useMemo(() => debounce((query) => {
    if (query.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student => 
        student.name?.toLowerCase().includes(query.toLowerCase()) ||
        student.student_id?.toString().includes(query) ||
        student.username?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, 300), [students]);

  const filteredStudentsData = useMemo(() => {
    if (searchQuery.trim() === '') {
      return students;
    }
    return students.filter(student => 
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_id?.toString().includes(searchQuery) ||
      student.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, students]);

  useEffect(() => {
    setFilteredStudents(filteredStudentsData);
  }, [filteredStudentsData]);

  const handleMarkAttendance = (studentId, status) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setAttendanceStatus(status);
      setShowGuardianModal(true);
    }
  };

  const handleGuardianSelection = (guardianType, guardianName) => {
    if (selectedStudent && selectedAction) {
      const status = selectedAction === 'IN' ? 'present' : 'absent';
      const methodInfo = `${selectedMethod} - ${selectedAction}`;
      
      markAttendanceDirectly(
        selectedStudent.id, 
        status, 
        guardianName, 
        guardianType
      );
    }
    setShowGuardianModal(false);
  };

  const openDetail = (student) => {
    setDetailRecord(student);
    setShowDetailModal(true);
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const openDateDetails = () => {
    const dateStats = {
      date: date.toLocaleDateString(),
      total: filteredStudents.length,
      present: filteredStudents.filter(s => s.status === 'present').length,
      absent: filteredStudents.filter(s => s.status === 'absent').length,
      unmarked: filteredStudents.filter(s => s.status === 'unmarked').length,
    };
    setSelectedDateRecord(dateStats);
    setShowDateModal(true);
  };

  const downloadAttendance = async () => {
    try {
      Alert.alert(
        'Download Attendance',
        'Choose download format:',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'PDF', onPress: () => downloadPDF() },
          { text: 'Excel', onPress: () => downloadExcel() },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to download attendance report');
    }
  };

  const downloadPDF = () => {
    Alert.alert('PDF Download', 'PDF download feature will be implemented');
  };

  const downloadExcel = () => {
    Alert.alert('Excel Download', 'Excel download feature will be implemented');
  };

  const navigateToMonthlyReport = () => {
    safeNavigate(router, '/(common)/monthly-attendance-screen', { 
      branch_id: selectedBranchId,
      branch_name: branch,
      date: date.toISOString(),
      students: JSON.stringify(students.slice(0, 10)) // Pass first 10 students as sample
    });
  };

  const navigateToTodayReport = () => {
    const today = date.toISOString().split('T')[0];
    safeNavigate(router, '/(common)/attendance-hub', { date: today, branch_id: selectedBranchId || '' });
  };

  const sendTodayReportNotification = async () => {
    try {
      const today = date.toISOString().split('T')[0];
      const resp = await authFetch('/api/attendance/push_today_report.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, branch_id: selectedBranchId || null })
      });
      const resJson = await resp.json();
      if (resJson.success) {
        Alert.alert('Sent', 'Today\'s attendance report notifications sent.');
        navigateToTodayReport();
      } else {
        Alert.alert('Info', resJson.message || 'Unable to send notifications.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to send notifications.');
    }
  };

  const handleQRScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    
    console.log('🔍 QR Scanned Data:', data);
    console.log('📋 Available Students:', students.map(s => ({ 
      id: s.id, 
      student_id: s.student_id, 
      name: s.name,
      username: s.username 
    })));
    
    // Parse QR data - handle JSON or plain text
    let qrStudentId = data;
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.student_id) {
        qrStudentId = parsedData.student_id;
        console.log('📄 Parsed JSON student_id:', qrStudentId);
      } else if (parsedData.id) {
        qrStudentId = parsedData.id;
        console.log('📄 Parsed JSON id:', qrStudentId);
      }
    } catch (e) {
      // Not JSON, use as plain text
      console.log('📝 Using plain text data:', qrStudentId);
    }
    
    // Find student by ID from QR code - comprehensive matching
    let student = null;
    const searchId = qrStudentId.toString().trim();
    
    // Try exact matches first
    student = students.find(s => 
      s.student_id?.toString().trim() === searchId ||
      s.id?.toString().trim() === searchId ||
      s.username?.toString().trim() === searchId
    );
    
    // If not found, try case-insensitive and partial matches
    if (!student) {
      student = students.find(s => 
        s.student_id?.toString().toLowerCase().trim() === searchId.toLowerCase() ||
        s.id?.toString().toLowerCase().trim() === searchId.toLowerCase() ||
        s.username?.toString().toLowerCase().trim() === searchId.toLowerCase() ||
        s.name?.toLowerCase().trim().includes(searchId.toLowerCase())
      );
    }
    
    // If still not found, try numeric comparison
    if (!student && !isNaN(searchId)) {
      const numericId = parseInt(searchId);
      student = students.find(s => 
        parseInt(s.student_id) === numericId ||
        parseInt(s.id) === numericId
      );
    }
    
    if (student) {
      console.log('✅ Student Found:', student);
      console.log('📊 Student Status:', student.status);
      console.log('⏰ Student Times:', { inTime: student.inTime, outTime: student.outTime });
      
      // Determine the action needed based on current status
      let actionType = '';
      let actionMessage = '';
      
      if (student.status === 'unmarked') {
        actionType = 'IN';
        actionMessage = 'Mark student IN (arrival)';
      } else if (student.status === 'present' && student.inTime && !student.outTime) {
        actionType = 'OUT';
        actionMessage = 'Mark student OUT (departure)';
      } else if (student.status === 'present' && student.inTime && student.outTime) {
        actionType = 'IN';
        actionMessage = 'Mark student IN again (re-entry)';
      } else {
        actionType = 'IN';
        actionMessage = 'Mark student IN (arrival)';
      }
      
      console.log('🎯 Action determined:', actionType, '-', actionMessage);
      
      // Show guardian selection for QR scanner
      setSelectedStudent(student);
      setSelectedAction(actionType);
      setSelectedMethod('QR Scanner');
      setShowGuardianModal(true);
      
    } else {
      console.log('❌ Student NOT Found for data:', data);
      console.log('🔍 Searched for ID:', searchId);
      console.log('📊 Total students available:', students.length);
      
      Alert.alert(
        'Student Not Found', 
        `Scanned ID: ${searchId}\nNo matching student found.\n\nAvailable students: ${students.length}\nSelected branch: ${branch || 'All'}`,
        [
          { text: 'Retry', onPress: () => {
            setScanned(false);
            return;
          }},
          { text: 'Close', onPress: () => setShowQRScanner(false) }
        ]
      );
      return; // Don't close scanner, allow retry
    }
    
    setShowQRScanner(false);
    setTimeout(() => setScanned(false), 2000);
  };

  const markAttendanceDirectly = async (studentId, status, guardianName = 'Direct', guardianType = 'System') => {
    try {
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const currentStudent = students.find(s => s.id === studentId);
      console.log('🎯 Marking attendance for:', currentStudent?.name);
      console.log('📊 Current student status:', currentStudent?.status);
      console.log('⏰ Current times:', { inTime: currentStudent?.inTime, outTime: currentStudent?.outTime });
      console.log('🆔 Student ID being sent:', studentId, 'Student data:', currentStudent);
      
      // Use student_id if database id is 0 or invalid
      let actualStudentId = studentId;
      if (!studentId || studentId === 0) {
        if (currentStudent?.student_id) {
          actualStudentId = currentStudent.student_id;
          console.log('🔄 Using student_id instead:', actualStudentId);
        } else {
          throw new Error('No valid student identifier found');
        }
      }
      
      // Determine if this is IN or OUT based on selectedAction
      let attendanceData;
      
      if (selectedAction === 'IN') {
        // Marking IN (arrival)
        attendanceData = {
          student_id: actualStudentId, 
          status: 'present',
          action: 'in',
          date: date.toISOString().split('T')[0],
          in_time: currentTime,
          in_guardian_type: guardianType,
          in_guardian_name: guardianName,
          marked_by_name: currentUser?.name || currentUser?.username || 'Staff',
          marked_by_role: currentUser?.role || 'Staff'
        };
      } else {
        // Marking OUT (departure)
        attendanceData = {
          student_id: actualStudentId, 
          status: 'present', // Keep as present when marking OUT (they were present)
          action: 'out',
          date: date.toISOString().split('T')[0],
          out_time: currentTime,
          out_guardian_type: guardianType,
          out_guardian_name: guardianName,
          marked_by_name: currentUser?.name || currentUser?.username || 'Staff',
          marked_by_role: currentUser?.role || 'Staff'
        };
      }
      
      console.log('Sending attendance data:', attendanceData);
      
      const response = await authFetch('/api/attendance/mark_new_attendance.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });
      
      const result = await response.json();
      console.log('📋 Attendance API response:', result);

      if (result.success) {
        const student = students.find(s => s.id === studentId);
        const updatedStudents = students.map(s =>
          s.id === studentId ? { 
            ...s, 
            status: 'present', // Always present when marked
            inTime: selectedAction === 'IN' ? currentTime : s.inTime,
            outTime: selectedAction === 'OUT' ? currentTime : s.outTime,
            inBy: selectedAction === 'IN' ? `${guardianName} (${guardianType})` : s.inBy,
            outBy: selectedAction === 'OUT' ? `${guardianName} (${guardianType})` : s.outBy,
            guardianType: guardianType,
            guardianName: guardianName,
          } : s
        );
        
        setStudents(updatedStudents);
        setFilteredStudents(updatedStudents);
        
        Alert.alert('✅ Success!', `${student?.name} marked ${selectedAction} by ${guardianName}`);
        // If all students are marked (no unmarked), auto-send today's report
        const stillUnmarked = updatedStudents.some(s => s.status === 'unmarked');
        if (!stillUnmarked) {
          sendTodayReportNotification();
        }
      } else {
        console.error('API Error:', result);
        Alert.alert('❌ Error', result.message || 'Failed to mark attendance. Please try again.');
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      Alert.alert('❌ Network Error', 'Failed to connect to server. Please check your internet connection.');
    }
  };

  const renderStudentItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={600} delay={index * 100}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => openDetail(item)}>
        <LinearGradient
          colors={
            item.status === 'present' ? Colors.gradientSuccess :
            item.status === 'absent' ? Colors.gradientDanger :
            Colors.gradientOrange
          }
          style={styles.studentCard}
        >
          <View style={{flexDirection:'row',flex:1}}>
            <View style={styles.studentInfo}>
              <TouchableOpacity
                onPress={() => {
                  if (activeTab === 'manual') {
                    // Determine action type
                    let actionType = '';
                    if (item.status === 'unmarked') {
                      actionType = 'IN';
                    } else if (item.status === 'present' && !item.outTime) {
                      actionType = 'OUT';
                    } else {
                      actionType = 'IN'; // Reset to IN if already marked out
                    }
                    
                    // Show guardian selection for manual
                    setSelectedStudent(item);
                    setSelectedAction(actionType);
                    setSelectedMethod('Manual');
                    setShowGuardianModal(true);
                  }
                }}
                onLongPress={() => {
                  if (activeTab === 'manual' && item.status !== 'absent') {
                    // Quick mark as absent with long press
                    setSelectedStudent(item);
                    setSelectedAction('OUT');
                    setSelectedMethod('Manual (Long Press)');
                    setShowGuardianModal(true);
                  }
                }}
              >
                <View>
                  <Image
                    source={ 
                      item.avatar_url ? {uri: optimizeImageUri(item.avatar_url, 80, 80)} : 
                      (item.avatar ? {uri: optimizeImageUri(`${API_URL}${item.avatar}`, 80, 80)} : 
                      (item.profile_image ? {uri: optimizeImageUri(`${API_URL}${item.profile_image}`, 80, 80)} : 
                      require('../../assets/Avartar.png'))) 
                    }
                    style={styles.avatar}
                    defaultSource={require('../../assets/Avartar.png')}
                  />
                  <View style={[styles.statusBadge,
                    item.status === 'present' ? styles.badgePresent :
                    item.status === 'absent' ? styles.badgeAbsent : styles.badgeUnmarked]}
                  >
                    <MaterialCommunityIcons
                      name={ item.status === 'present' ? 'check' : (item.status === 'absent' ? 'close' : 'clock-outline') }
                      size={12}
                      color={Colors.white}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.studentDetails}>
                <Text style={styles.studentName}>{item.name || item.username || item.student_id}</Text>
                <Text style={styles.studentId}>{(item.student_id || item.id)} - {(item.branch_name || item.branch || '')}</Text>
                <View style={styles.tagContainer}>
                  <MaterialCommunityIcons 
                    name={activeTab === 'manual' ? "account-edit-outline" : "qrcode-scan"} 
                    size={14} 
                    color={Colors.lightText} 
                  />
                  <Text style={styles.attendanceType}>{activeTab === 'manual' ? 'Manual' : 'QR'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.attendanceDetails}>
              <View style={styles.timeEntry}>
                <Text style={styles.timeLabel}>In: {item.inTime || '--:--'}</Text>
                <Text style={styles.byLabel}>By: {item.inBy || '--'}</Text>
              </View>
              <View style={styles.timeEntry}>
                <Text style={styles.timeLabel}>Out: {item.outTime || '--:--'}</Text>
                <Text style={styles.byLabel}>By: {item.outBy || '--'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const Header = () => (
    <Animatable.View animation="fadeInDown" duration={800}>
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Kids Attendance</Text>
        <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerActionButton} onPress={downloadAttendance}>
            <MaterialCommunityIcons name="download" size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={navigateToMonthlyReport}>
            <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.white} />
          </TouchableOpacity>
              <TouchableOpacity style={styles.headerActionButton} onPress={sendTodayReportNotification}>
                <MaterialCommunityIcons name="bell-ring" size={20} color={Colors.white} />
              </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <View style={styles.filtersContainer}>
        {!branch_id && (
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedBranchId} onValueChange={(itemValue) => setSelectedBranchId(itemValue)} style={styles.picker} itemStyle={styles.pickerItem}>
              {Array.isArray(branches) && branches.map(b => <Picker.Item key={b.id || 'All'} label={b.name || 'All'} value={b.id || 'All'} />)}
            </Picker>
          </View>
        )}
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)} 
          onLongPress={openDateDetails}
          style={styles.datePickerButton}
        >
          <MaterialCommunityIcons name="calendar" size={22} color={Colors.primary} />
          <Text style={styles.datePickerText}>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
      </View>

      {/* Manual/QR Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
          onPress={() => setActiveTab('manual')}
        >
          <MaterialCommunityIcons name="account-edit-outline" size={20} color={activeTab === 'manual' ? Colors.white : Colors.primary} />
          <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>Manual</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'qr' && styles.activeTab]}
          onPress={() => {
            setActiveTab('qr');
            if (hasPermission) {
              setShowQRScanner(true);
            } else {
              Alert.alert('Camera Permission', 'Camera permission is required for QR scanning');
            }
          }}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={20} color={activeTab === 'qr' ? Colors.white : Colors.primary} />
          <Text style={[styles.tabText, activeTab === 'qr' && styles.activeTabText]}>QR Scanner</Text>
        </TouchableOpacity>
      </View>

      {/* Search removed as requested */}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredStudents.filter(s => s.status === 'present').length}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredStudents.filter(s => s.status === 'absent').length}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredStudents.filter(s => s.status === 'unmarked').length}</Text>
          <Text style={styles.statLabel}>Unmarked</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{filteredStudents.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filteredStudents}
        renderItem={renderStudentItem}
        keyExtractor={(item, index) => `${item.id || item.student_id || index}_${item.email || item.username || index}`}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={null}
        {...getOptimizedFlatListProps(filteredStudents.length)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <MaterialCommunityIcons name="account-group-outline" size={60} color={Colors.textSecondary} />
            )}
            <Text style={styles.emptyText}>
              {loading ? 'Fetching students...' :
               (searchQuery ? 'No students found matching your search.' : 'No students found.')}
            </Text>
          </View>
        )}
      />

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* Date Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDateModal}
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={400} style={styles.modalContent}>
            {selectedDateRecord && (
              <>
                <MaterialCommunityIcons name="calendar-check" size={50} color={Colors.primary} style={{alignSelf: 'center', marginBottom: 10}} />
                <Text style={styles.modalTitle}>Attendance Summary</Text>
                <Text style={styles.modalSubtitle}>{selectedDateRecord.date}</Text>
                
                <View style={styles.dateStatsContainer}>
                  <View style={styles.dateStatItem}>
                    <Text style={styles.dateStatNumber}>{selectedDateRecord.total}</Text>
                    <Text style={styles.dateStatLabel}>Total Students</Text>
                  </View>
                  <View style={styles.dateStatItem}>
                    <Text style={[styles.dateStatNumber, {color: '#16a34a'}]}>{selectedDateRecord.present}</Text>
                    <Text style={styles.dateStatLabel}>Present</Text>
                  </View>
                  <View style={styles.dateStatItem}>
                    <Text style={[styles.dateStatNumber, {color: '#dc2626'}]}>{selectedDateRecord.absent}</Text>
                    <Text style={styles.dateStatLabel}>Absent</Text>
                  </View>
                  <View style={styles.dateStatItem}>
                    <Text style={[styles.dateStatNumber, {color: '#f59e0b'}]}>{selectedDateRecord.unmarked}</Text>
                    <Text style={styles.dateStatLabel}>Unmarked</Text>
                  </View>
                </View>

                <View style={styles.dateModalActions}>
                  <TouchableOpacity style={styles.dateActionButton} onPress={downloadAttendance}>
                    <MaterialCommunityIcons name="download" size={20} color={Colors.primary} />
                    <Text style={styles.dateActionText}>Download</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dateActionButton} onPress={navigateToMonthlyReport}>
                    <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.primary} />
                    <Text style={styles.dateActionText}>Monthly Report</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity style={[styles.cancelButton, {marginTop: 15}]} onPress={() => setShowDateModal(false)}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showQRScanner}
        onRequestClose={() => setShowQRScanner(false)}
      >
        <View style={styles.qrContainer}>
          <View style={styles.qrHeader}>
            <TouchableOpacity 
              style={styles.qrCloseButton} 
              onPress={() => setShowQRScanner(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.qrTitle}>Scan Student QR Code</Text>
            <View style={{width: 40}} />
          </View>
          
          {hasPermission === null ? (
            <View style={styles.qrPermissionContainer}>
              <Text style={styles.qrPermissionText}>Requesting camera permission...</Text>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.qrPermissionContainer}>
              <MaterialCommunityIcons name="camera-off" size={60} color={Colors.textSecondary} />
              <Text style={styles.qrPermissionText}>No access to camera</Text>
              <TouchableOpacity 
                style={styles.qrPermissionButton}
                onPress={async () => {
                  const { status } = await Camera.requestCameraPermissionsAsync();
                  setHasPermission(status === 'granted');
                }}
              >
                <Text style={styles.qrPermissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.qrCameraContainer}>
              <CameraView
                style={styles.qrCamera}
                facing="back"
                onBarcodeScanned={handleQRScan}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "pdf417"],
                }}
              />
              <View style={styles.qrOverlay}>
                <View style={styles.qrFrame} />
                <Text style={styles.qrInstructions}>
                  Position the QR code within the frame
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Guardian Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showGuardianModal}
        onRequestClose={() => setShowGuardianModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={500} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Marking {selectedStudent?.name} {selectedAction}</Text>
            <Text style={styles.modalSubtitle}>Method: {selectedMethod}</Text>
            <Text style={styles.modalQuestion}>Who is with {selectedStudent?.name}?</Text>
            <Text style={styles.modalSubtitle}>Select the person accompanying the student</Text>
            
            {selectedStudent && [
              { 
                person: { 
                  name: selectedStudent.father_name || selectedStudent.parent_name || 'Father', 
                  profilePic: selectedStudent.father_photo || selectedStudent.parent_photo 
                }, 
                type: 'Father' 
              },
              { 
                person: { 
                  name: selectedStudent.mother_name || 'Mother', 
                  profilePic: selectedStudent.mother_photo 
                }, 
                type: 'Mother' 
              },
              { 
                person: { 
                  name: selectedStudent.guardian_name || 'Guardian', 
                  profilePic: selectedStudent.guardian_photo 
                }, 
                type: 'Guardian' 
              },
              {
                person: {
                  name: 'Captain',
                  profilePic: null
                },
                type: 'Captain'
              },
            ].filter(g => g.person.name).map(({ person, type }) => (
              <TouchableOpacity 
                key={type} 
                style={styles.guardianButton} 
                onPress={() => handleGuardianSelection(type, person.name)}
              >
                <Image 
                  source={person.profilePic ? { uri: `${API_URL}${person.profilePic}` } : require('../../assets/Avartar.png')} 
                  style={styles.guardianModalAvatar} 
                />
                <View style={styles.guardianInfo}>
                  <Text style={styles.guardianButtonText}>{person.name}</Text>
                  <Text style={styles.guardianTagText}>{type}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.primary} />
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowGuardianModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDetailModal}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={400} style={[styles.modalContent, {backgroundColor: Colors.card}]}> 
            {detailRecord && (
              <>
                <Text style={styles.modalTitle}>{detailRecord.name}</Text>
                <Text style={styles.modalSubtitle}>ID: {detailRecord.student_id || detailRecord.id}</Text>
                
                <View style={styles.detailInfoContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.detailValue, {
                      color: detailRecord.status === 'present' ? '#16a34a' : 
                             detailRecord.status === 'absent' ? '#dc2626' : '#f59e0b',
                      fontWeight: 'bold'
                    }]}>
                      {detailRecord.status?.toUpperCase() || 'UNMARKED'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>In Time:</Text>
                    <Text style={styles.detailValue}>{detailRecord.inTime || '--:--'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Brought In By:</Text>
                    <Text style={styles.detailValue}>{detailRecord.inBy || 'Not recorded'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Out Time:</Text>
                    <Text style={styles.detailValue}>{detailRecord.outTime || 'Still in school'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Picked Up By:</Text>
                    <Text style={styles.detailValue}>{detailRecord.outBy || 'Not picked up yet'}</Text>
                  </View>

                  {(detailRecord.father_name || detailRecord.mother_name || detailRecord.guardian_name) && (
                    <View style={styles.familyInfoContainer}>
                      <Text style={styles.familyTitle}>Family Information:</Text>
                      {detailRecord.father_name && (
                        <Text style={styles.familyInfo}>Father: {detailRecord.father_name}</Text>
                      )}
                      {detailRecord.mother_name && (
                        <Text style={styles.familyInfo}>Mother: {detailRecord.mother_name}</Text>
                      )}
                      {detailRecord.guardian_name && (
                        <Text style={styles.familyInfo}>Guardian: {detailRecord.guardian_name}</Text>
                      )}
                    </View>
                  )}
                </View>
              </>
            )}
            <TouchableOpacity style={[styles.cancelButton,{marginTop:20}]} onPress={()=>setShowDetailModal(false)}>
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  header: { 
    paddingTop: Platform.OS === 'android' ? 40 : 20, 
    paddingBottom: 20, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 10,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.lightText, textAlign: 'center' },
  headerActions: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  headerActionButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 10,
    marginLeft: 8,
  },
  filtersContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 5 },
  pickerContainer: { flex: 1, backgroundColor: Colors.card, borderRadius: 15, marginRight: 10, ...Platform.select({ ios: { padding: 10, shadowColor: Colors.shadow, shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }) },
  picker: { height: 50, width: '100%' },
  pickerItem: { fontSize: 16 },
  datePickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card, borderRadius: 15, paddingVertical: 15, ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }) },
  datePickerText: { marginLeft: 10, fontSize: 16, color: Colors.primary, fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } })
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.darkText,
  },
  clearSearchButton: { marginLeft: 10 },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    minWidth: 70,
    ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowRadius: 3, shadowOpacity: 0.1 }, android: { elevation: 2 } })
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  studentCard: { 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowColor: Colors.shadow, 
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 10, 
    elevation: 5 
  },
  studentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: Colors.lightText },
  studentDetails: { marginLeft: 12, flex: 1 },
  studentName: { fontSize: 17, fontWeight: 'bold', color: Colors.lightText },
  studentId: { fontSize: 14, color: Colors.lightText, opacity: 0.9 },
  tagContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginTop: 5, alignSelf: 'flex-start' },
  attendanceType: { fontSize: 12, color: Colors.lightText, marginLeft: 5 },
  attendanceDetails: { alignItems: 'flex-end', marginLeft: 10 },
  timeEntry: { alignItems: 'flex-end', marginBottom: 5 },
  timeLabel: { fontSize: 13, color: Colors.lightText, fontWeight: '600' },
  byLabel: { fontSize: 11, color: Colors.lightText, opacity: 0.8 },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginHorizontal: 3,
  },
  inButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  outButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  activeButton: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePresent: { backgroundColor: '#34d399' },
  badgeAbsent: { backgroundColor: '#f87171' },
  badgeUnmarked: { backgroundColor: '#fbbf24' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 20 },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.lightText,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalQuestion: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  guardianButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: Colors.card,
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guardianModalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  guardianInfo: {
    flex: 1,
  },
  guardianButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  guardianTagText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  cancelButton: {
    backgroundColor: Colors.danger,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: Colors.lightText,
    fontSize: 16,
    fontWeight: '600',
  },
  detailInfoContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.textSecondary + '30',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textSecondary + '20',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.darkText,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  familyInfoContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.textSecondary + '30',
  },
  familyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 8,
  },
  familyInfo: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  dateStatItem: {
    alignItems: 'center',
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  dateStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  dateStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  dateModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  dateActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    justifyContent: 'center',
  },
  dateActionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginBottom: 15,
    backgroundColor: Colors.card,
    borderRadius: 25,
    padding: 4,
    ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } })
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  activeTabText: {
    color: Colors.white,
  },
  qrContainer: {
    flex: 1,
    backgroundColor: Colors.darkText,
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
  },
  qrCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  qrPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  qrPermissionText: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginTop: 20,
  },
  qrPermissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 30,
  },
  qrPermissionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  qrCameraContainer: {
    flex: 1,
    position: 'relative',
  },
  qrCamera: {
    flex: 1,
  },
  qrOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  qrInstructions: {
    color: Colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 40,
  },
});
