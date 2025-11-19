import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert, Image, ActivityIndicator, Modal, TextInput, Keyboard, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraView, Camera } from 'expo-camera';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
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
import { formatPhotoSource } from '../utils/imageUtils';

export default function NewAttendanceScreen() {
  const { branch, branch_id } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
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
  const [detailedStudentInfo, setDetailedStudentInfo] = useState(null);
  const [loadingStudentInfo, setLoadingStudentInfo] = useState(false);
  const [showMonthlyView, setShowMonthlyView] = useState(false);
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [selectedMonthYear, setSelectedMonthYear] = useState(new Date());

  const fetchBranches = useCallback(safeAsync(async () => {
    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    
    const response = await authFetch('/api/branches/get_branches.php');
    const result = await response.json();
    if (result.success) {
      let availableBranches = result.data;
      
      if (user?.role === 'Admin') {
        // Admin can see all branches + "All Branches" option
        availableBranches = [{ id: 'All', name: 'All Branches' }, ...result.data];
        console.log('👑 Admin user - showing all branches');
      } else {
        // Non-admin users see only their assigned branches
        if (user?.branch_id) {
          // Filter to show only user's assigned branch
          availableBranches = result.data.filter(branch => 
            branch.id === user.branch_id || branch.id === user.branch
          );
          console.log('👤 Non-admin user - filtered to assigned branch:', availableBranches);
          
          // Set their branch as default
          if (availableBranches.length > 0 && !selectedBranchId) {
            setSelectedBranchId(availableBranches[0].id);
          }
        }
      }
      
      safeSetState(setBranches, availableBranches);
    } else {
      console.error('Failed to fetch branches');
    }
  }), [selectedBranchId]);

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
              parent_name: user.parent_name,
              parent_phone: user.parent_phone || user.mobile,
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
      console.log('Sample student data with guardian info:', uniqueStudents.slice(0, 2)); // Log first 2 students for debugging
      
      // Additional debug for guardian fields
      if (uniqueStudents.length > 0) {
        const firstStudent = uniqueStudents[0];
        console.log('🔍 First student guardian fields check:', {
          name: firstStudent.name,
          father_name: firstStudent.father_name,
          father_photo: firstStudent.father_photo,
          mother_name: firstStudent.mother_name,
          mother_photo: firstStudent.mother_photo,
          guardian_name: firstStudent.guardian_name,
          guardian_photo: firstStudent.guardian_photo,
          parent_name: firstStudent.parent_name,
          parent_photo: firstStudent.parent_photo
        });
      }

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
        
        console.log('🔍 RETRIEVING ATTENDANCE DATA FROM DATABASE:');
        console.log('📅 Date:', formattedDate);
        console.log('🏢 Branch ID:', currentBranchId);
        console.log('🌐 API URL:', `/api/attendance/get_new_attendance.php?date=${formattedDate}${branchQuery}`);
        
        const newAttRes = await authFetch(`/api/attendance/get_new_attendance.php?date=${formattedDate}${branchQuery}`);
        const newAttJson = await newAttRes.json();
        
        console.log('📥 DATABASE RETRIEVAL RESPONSE:', newAttJson);
        console.log('✅ Retrieval Success Status:', newAttJson.success);
        console.log('📊 Retrieved Records Count:', newAttJson.data?.length || 0);
        console.log('💾 Raw Attendance Records:', newAttJson.data);
        
        if (newAttJson.success && Array.isArray(newAttJson.data)) {
          const attMap = new Map();
          console.log('🗺️ MAPPING ATTENDANCE RECORDS TO STUDENTS:');
          newAttJson.data.forEach(r => {
            if (r && r.student_id != null) {
              console.log(`📝 Mapping record for student ${r.student_id}:`, r);
              attMap.set(r.student_id, r);
            }
          });
          
          console.log('👥 PROCESSING STUDENT ATTENDANCE STATUS:');
          studentsWithAttendance = studentsWithAttendance.map(s => {
            const rec = attMap.get(s.id) || attMap.get(s.student_id);
            if (!rec) {
              console.log(`❌ No attendance record found for student ${s.id} (${s.name})`);
              return s;
            }
            
            console.log(`✅ Found attendance record for student ${s.id} (${s.name}):`, rec);
            // Determine status based on in/out times
            let studentStatus = s.status;
            if (rec.in_time && rec.out_time) {
              studentStatus = 'present'; // Has both in and out time
            } else if (rec.in_time && !rec.out_time) {
              studentStatus = 'present'; // Has in time, still in school
            } else if (rec.status) {
              studentStatus = rec.status; // Use API status
            }

            const updatedStudent = {
              ...s,
              status: studentStatus,
              inTime: rec.in_time || s.inTime,
              outTime: rec.out_time || s.outTime,
              inBy: rec.in_guardian_name ? `${rec.in_guardian_name} (${rec.in_guardian_type || 'Guardian'})` : (rec.in_by || s.inBy),
              outBy: rec.out_guardian_name ? `${rec.out_guardian_name} (${rec.out_guardian_type || 'Guardian'})` : (rec.out_by || s.outBy),
              guardianType: rec.in_guardian_type || rec.out_guardian_type || s.guardianType,
              guardianName: rec.in_guardian_name || rec.out_guardian_name || s.guardianName,
            };
            
            console.log(`🎯 Final status for ${s.name}:`, {
              status: updatedStudent.status,
              inTime: updatedStudent.inTime,
              outTime: updatedStudent.outTime,
              inBy: updatedStudent.inBy,
              outBy: updatedStudent.outBy,
              guardianType: updatedStudent.guardianType,
              guardianName: updatedStudent.guardianName
            });
            
            return updatedStudent;
          });
        }
      } catch (mergeErr) {
        // Non-fatal; proceed with baseline list
      }

      console.log('📊 FINAL DATABASE STORAGE & RETRIEVAL SUMMARY:');
      console.log('👥 Total Students:', studentsWithAttendance.length);
      console.log('✅ Present Students:', studentsWithAttendance.filter(s => s.status === 'present').length);
      console.log('❌ Unmarked Students:', studentsWithAttendance.filter(s => s.status === 'unmarked').length);
      console.log('📋 Students with attendance data:', studentsWithAttendance.filter(s => s.inTime || s.outTime).length);
      
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
    loadCurrentUser();
    fetchBranches();
    fetchStudents(selectedBranchId);
    requestCameraPermission();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        console.log('Current user loaded for attendance:', user.role);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Camera permission error:', error);
    }
  };


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

  // Add focus listener to refresh data when screen comes back into focus
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('📱 Screen focused - refreshing attendance data...');
      fetchStudents(selectedBranchId);
    });

    return unsubscribe;
  }, [navigation, fetchStudents, selectedBranchId]);

  // Fetch detailed student information including guardian details
  const fetchDetailedStudentInfo = async (studentId) => {
    try {
      setLoadingStudentInfo(true);
      console.log('📚 Fetching detailed student info for ID:', studentId);
      const response = await authFetch(`/api/students/get_student_info.php?student_id=${studentId}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Detailed student info loaded:', result.data);
        setDetailedStudentInfo(result.data);
        return result.data;
      } else {
        console.error('❌ Failed to load detailed student info:', result.message);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching detailed student info:', error);
      return null;
    } finally {
      setLoadingStudentInfo(false);
    }
  };

  const handleGuardianSelection = (guardianType, guardianName) => {
    if (selectedStudent && selectedAction) {
      // For avatar tap (IN/OUT), student is considered present on that day.
      // OUT means leaving, not absent. Only the long-press flow explicitly marks 'absent'.
      const status = 'present';
      const methodInfo = `${selectedMethod} - ${selectedAction}`;
      
      // FIXED: Always use student_id to avoid duplicate ID issues
      const studentId = selectedStudent.student_id;
      
      console.log('🎯 GUARDIAN SELECTION - Selected Student:', {
        name: selectedStudent.name,
        id: selectedStudent.id,
        student_id: selectedStudent.student_id,
        finalId: studentId
      });
      
      if (!studentId) {
        Alert.alert('Error', 'Invalid student ID. Please try again.');
        return;
      }
      
      markAttendanceDirectly(
        studentId, 
        status, 
        guardianName, 
        guardianType
      );
      setShowGuardianModal(false);
      setDetailedStudentInfo(null); // Clear detailed info
    }
  };

  const handleMarkAttendance = (studentId, status) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setShowGuardianModal(false);
      setDetailedStudentInfo(null); // Clear detailed info
    }
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
    safeNavigate(router, '/(common)/enhanced-monthly-attendance', { 
      branch_id: selectedBranchId,
      branch_name: branch,
      date: date.toISOString(),
      students: JSON.stringify(students.slice(0, 10)) // Pass first 10 students as sample
    });
  };

  const fetchMonthlyAttendance = useCallback(safeAsync(async () => {
    if (!showMonthlyView) return;
    
    setLoadingMonthly(true);
    try {
      const year = selectedMonthYear.getFullYear();
      const month = selectedMonthYear.getMonth() + 1;
      
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString()
      });

      if (selectedBranchId && selectedBranchId !== 'All') {
        params.append('branch_id', selectedBranchId);
      }

      const response = await authFetch(`/api/attendance/get_monthly_attendance.php?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setMonthlyAttendance(result.data || []);
      } else {
        console.error('Failed to fetch monthly attendance:', result.message);
        setMonthlyAttendance([]);
      }
    } catch (error) {
      console.error('Error fetching monthly attendance:', error);
      setMonthlyAttendance([]);
    } finally {
      setLoadingMonthly(false);
    }
  }), [showMonthlyView, selectedMonthYear, selectedBranchId]);

  useEffect(() => {
    if (showMonthlyView) {
      fetchMonthlyAttendance();
    }
  }, [fetchMonthlyAttendance]);

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
      console.log('📧 Report notification endpoint not available:', e.message);
      // Silently fail for 404 errors - endpoint doesn't exist on server
      if (e.message && e.message.includes('404')) {
        console.log('⚠️ Report notification feature not implemented on server');
        return;
      }
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
      // Fetch detailed student info for guardian selection
      fetchDetailedStudentInfo(student.student_id || student.id);
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
      
      // Determine attendance data based on status and selectedAction
      let attendanceData;
      
      if (status === 'absent') {
        // Marking as ABSENT
        attendanceData = {
          student_id: actualStudentId, 
          status: 'absent',
          action: 'absent',
          date: date.toISOString().split('T')[0],
          marked_by_name: currentUser?.name || currentUser?.username || 'Staff',
          marked_by_role: currentUser?.role || 'Staff',
          guardian_type: guardianType,
          guardian_name: guardianName
        };
      } else if (selectedAction === 'IN') {
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
      
      console.log('🚀 SENDING ATTENDANCE DATA TO DATABASE:', attendanceData);
      console.log('📊 Database Storage Details:', {
        student_id: attendanceData.student_id,
        action: attendanceData.action,
        date: attendanceData.date,
        guardian_name: attendanceData.in_guardian_name || attendanceData.out_guardian_name,
        guardian_type: attendanceData.in_guardian_type || attendanceData.out_guardian_type,
        time: attendanceData.in_time || attendanceData.out_time,
        marked_by: attendanceData.marked_by_name
      });
      
      const response = await authFetch('/api/attendance/mark_new_attendance.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });
      
      const result = await response.json();
      console.log('📋 DATABASE STORAGE RESPONSE:', result);
      console.log('✅ Storage Success Status:', result.success);
      console.log('💾 Stored Data Confirmation:', result.data);

      if (result.success) {
        const student = students.find(s => s.student_id === studentId);
        
        // Debug logging to identify the issue
        console.log('🔍 DEBUGGING ATTENDANCE UPDATE:');
        console.log('Target Student ID:', studentId, 'Type:', typeof studentId);
        console.log('Target Student Found:', student?.name);
        console.log('All Student IDs:', students.map(s => ({ id: s.id, name: s.name, type: typeof s.id })));
        
        const updatedStudents = students.map(s => {
          // FIXED: Use student_id for matching since id field has duplicates
          // Only match by student_id to avoid duplicate ID issues
          const isTargetStudent = s.student_id && String(s.student_id) === String(studentId);
          
          if (isTargetStudent) {
            console.log('✅ MATCH FOUND - Updating student:', s.name, 'Student_ID:', s.student_id);
          } else {
            console.log('❌ NO MATCH - Student:', s.name, 'Student_ID:', s.student_id, 'Target:', studentId);
          }
          
          return isTargetStudent ? { 
            ...s, 
            status: status === 'absent' ? 'absent' : 'present',
            inTime: selectedAction === 'IN' ? currentTime : s.inTime,
            outTime: selectedAction === 'OUT' ? currentTime : s.outTime,
            inBy: selectedAction === 'IN' ? `${guardianName} (${guardianType})` : s.inBy,
            outBy: selectedAction === 'OUT' ? `${guardianName} (${guardianType})` : s.outBy,
            guardianType: guardianType,
            guardianName: guardianName,
          } : s;
        });
      
      setStudents(updatedStudents);
      
      // Update filtered students based on current search query
      if (searchQuery.trim() === '') {
        setFilteredStudents(updatedStudents);
      } else {
        const filtered = updatedStudents.filter(student => 
          student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.student_id?.toString().includes(searchQuery) ||
          student.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredStudents(filtered);
      }
      
      Alert.alert('✅ Success!', `${student?.name} marked ${selectedAction} by ${guardianName}`);
      
      // TEMPORARILY DISABLED: Refresh attendance data after marking
      // This might be causing all students to be marked due to server-side issues
      // setTimeout(() => {
      //   console.log('🔄 Refreshing attendance data after marking...');
      //   fetchStudents(selectedBranchId);
      // }, 1000);
      
      // Note: Removed automatic report sending to prevent 404 errors
      // const stillUnmarked = updatedStudents.some(s => s.status === 'unmarked');
      // if (!stillUnmarked) {
      //   sendTodayReportNotification();
      // }
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
    <Animatable.View animation="fadeInUp" duration={600} delay={index * 100} style={styles.modernStudentCard}>
      <LinearGradient 
        colors={['#F8FAFC', '#FFFFFF']} 
        style={styles.modernCardGradient}
      >
        <TouchableOpacity activeOpacity={0.9} onPress={() => openDetail(item)}>
          <View style={styles.modernStudentContainer}>
            {/* Header Section */}
            <View style={styles.modernStudentHeader}>
              {/* Avatar Section */}
              <TouchableOpacity
                style={styles.modernAvatarContainer}
                onPress={() => {
                  if (activeTab === 'manual') {
                    let actionType = '';
                    if (item.status === 'unmarked') {
                      actionType = 'IN';
                    } else if (item.status === 'present' && !item.outTime) {
                      actionType = 'OUT';
                    } else {
                      actionType = 'IN';
                    }
                    
                    setSelectedStudent(item);
                    setSelectedAction(actionType);
                    setSelectedMethod('Manual');
                    // Fetch detailed student info for guardian selection
                    fetchDetailedStudentInfo(item.student_id || item.id);
                    setShowGuardianModal(true);
                  }
                }}
                onLongPress={() => {
                  if (activeTab === 'manual' && item.status !== 'absent') {
                    Alert.alert(
                      'Mark as Absent',
                      `Mark ${item.name || item.username || 'this student'} as absent for today?`,
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel'
                        },
                        {
                          text: 'Mark Absent',
                          style: 'destructive',
                          onPress: () => {
                            markAttendanceDirectly(
                              item.student_id || item.id, 
                              'absent', 
                              currentUser?.name || 'Staff', 
                              'Staff'
                            );
                          }
                        }
                      ]
                    );
                  }
                }}
              >
                <Image
                  source={formatPhotoSource(item.avatar) || require('../../assets/Avartar.png')}
                  style={styles.modernAvatar}
                  defaultSource={require('../../assets/Avartar.png')}
                />
                <View style={[styles.modernStatusBadge, styles[`modernBadge_${item.status || 'unmarked'}`]]}>
                  <MaterialCommunityIcons
                    name={ 
                      item.status === 'present' ? 'check-circle' : 
                      (item.status === 'absent' ? 'close-circle' : 'clock-outline') 
                    }
                    size={16}
                    color={Colors.white}
                  />
                </View>
              </TouchableOpacity>

              {/* Student Info */}
              <View style={styles.modernStudentInfo}>
                <Text style={styles.modernStudentName}>{item.name || item.username || item.student_id || 'Unknown Student'}</Text>
                <View style={styles.modernStudentMeta}>
                  <MaterialCommunityIcons name="card-account-details" size={14} color={Colors.textSecondary} />
                  <Text style={styles.modernStudentId}>ID: {item.student_id || item.id || 'N/A'}</Text>
                </View>
                {(item.branch_name || item.branch) && (
                  <View style={styles.modernBranchContainer}>
                    <MaterialCommunityIcons name="map-marker" size={12} color={Colors.textSecondary} />
                    <Text style={styles.modernBranchText}>{item.branch_name || item.branch}</Text>
                  </View>
                )}
                <View style={styles.modernMethodContainer}>
                  <MaterialCommunityIcons 
                    name={activeTab === 'manual' ? "account-edit-outline" : "qrcode-scan"} 
                    size={12} 
                    color={Colors.primary} 
                  />
                  <Text style={styles.modernMethodText}>{activeTab === 'manual' ? 'Manual Entry' : 'QR Scanner'}</Text>
                </View>
              </View>

              {/* Status Indicator */}
              <View style={styles.modernStatusContainer}>
                <View style={[styles.modernStatusPill, styles[`modernStatusPill_${item.status || 'unmarked'}`]]}>
                  <Text style={styles.modernStatusText}>{item.status || 'unmarked'}</Text>
                </View>
              </View>
            </View>

            {/* Time Details */}
            <View style={styles.modernTimeSection}>
              <View style={styles.modernTimeRow}>
                <View style={styles.modernTimeItem}>
                  <MaterialCommunityIcons name="login" size={16} color={Colors.success} />
                  <View style={styles.modernTimeInfo}>
                    <Text style={styles.modernTimeLabel}>Check In</Text>
                    <Text style={styles.modernTimeValue}>{item.inTime || '--:--'}</Text>
                    <Text style={styles.modernByLabel}>By: {item.inBy || '--'}</Text>
                  </View>
                </View>
                
                <View style={styles.modernTimeItem}>
                  <MaterialCommunityIcons name="logout" size={16} color={Colors.danger} />
                  <View style={styles.modernTimeInfo}>
                    <Text style={styles.modernTimeLabel}>Check Out</Text>
                    <Text style={styles.modernTimeValue}>{item.outTime || '--:--'}</Text>
                    <Text style={styles.modernByLabel}>By: {item.outBy || '--'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </Animatable.View>
  );

  const Header = () => (
    <Animatable.View animation="fadeInDown" duration={800}>
      {/* Full Width Modern Header */}
      <LinearGradient colors={Colors.gradientMain} style={styles.fullWidthHeader}>
        <View style={styles.fullWidthHeaderContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.modernBackButton} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.modernHeaderTitle}>Student Attendance</Text>
              <Text style={styles.modernHeaderSubtitle}>
                {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <View style={styles.headerActionsRow}>
              <TouchableOpacity style={styles.modernHeaderActionButton} onPress={downloadAttendance}>
                <MaterialCommunityIcons name="download" size={20} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modernHeaderActionButton} onPress={navigateToMonthlyReport}>
                <MaterialCommunityIcons name="calendar-month" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
      
      <View style={styles.modernFiltersContainer}>
        {/* Show branch selector based on user role and available branches */}
        {branches && branches.length > 0 && (
          <View style={styles.modernPickerContainer}>
            <MaterialCommunityIcons name="domain" size={20} color={Colors.primary} style={styles.pickerIcon} />
            <Text style={styles.pickerLabel}>
              {currentUser?.role === 'Admin' ? 'Select Branch:' : 'Your Branch:'}
            </Text>
            <View style={styles.pickerWrapper}>
              <Picker 
                selectedValue={selectedBranchId} 
                onValueChange={(itemValue) => {
                  console.log('Branch changed to:', itemValue);
                  setSelectedBranchId(itemValue);
                  fetchStudents(itemValue);
                }} 
                style={styles.modernPicker} 
                itemStyle={styles.pickerItem}
                enabled={currentUser?.role === 'Admin' || branches.length > 1}
              >
                {Array.isArray(branches) && branches.map(b => (
                  <Picker.Item 
                    key={b.id || 'All'} 
                    label={b.name || 'All Branches'} 
                    value={b.id || 'All'} 
                  />
                ))}
              </Picker>
            </View>
            {currentUser?.role === 'Admin' && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>✓ Admin</Text>
              </View>
            )}
            {currentUser?.role !== 'Admin' && branches.length === 1 && (
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedBadgeText}>Assigned Branch</Text>
              </View>
            )}
          </View>
        )}
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)} 
          onLongPress={openDateDetails}
          style={styles.modernDateButton}
        >
          <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
          <Text style={styles.modernDateText}>{date.toLocaleDateString()}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Attendance Method Tabs - Only show in daily view */}
      {!showMonthlyView && (
        <View style={styles.newTabContainer}>
          <TouchableOpacity 
            style={[styles.newTab, activeTab === 'manual' && styles.newActiveTab]}
            onPress={() => setActiveTab('manual')}
          >
            <MaterialCommunityIcons name="account-edit-outline" size={16} color={activeTab === 'manual' ? Colors.white : Colors.primary} />
            <Text style={[styles.newTabText, activeTab === 'manual' && styles.newActiveTabText]}>Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.newTab, activeTab === 'qr' && styles.newActiveTab]}
            onPress={() => {
              setActiveTab('qr');
              if (hasPermission) {
                setShowQRScanner(true);
              } else {
                Alert.alert('Camera Permission', 'Camera permission is required for QR scanning');
              }
            }}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={16} color={activeTab === 'qr' ? Colors.white : Colors.primary} />
            <Text style={[styles.newTabText, activeTab === 'qr' && styles.newActiveTabText]}>QR Scan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modern Search - Only show in daily view */}
      {!showMonthlyView && (
        <View style={styles.modernSearchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search students by name or ID..."
            style={styles.modernSearchInput}
            placeholderTextColor={Colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <MaterialCommunityIcons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Monthly View Controls */}
      {showMonthlyView && (
        <View style={styles.monthlyControlsContainer}>
          <TouchableOpacity 
            style={styles.monthNavButton}
            onPress={() => {
              const newDate = new Date(selectedMonthYear);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedMonthYear(newDate);
            }}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.primary} />
          </TouchableOpacity>
          
          <View style={styles.monthDisplayContainer}>
            <Text style={styles.monthDisplayText}>
              {selectedMonthYear.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.monthNavButton}
            onPress={() => {
              const newDate = new Date(selectedMonthYear);
              newDate.setMonth(newDate.getMonth() + 1);
              setSelectedMonthYear(newDate);
            }}
          >
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Redesigned Compact Stats */}
      <View style={styles.newStatsContainer}>
        {!showMonthlyView ? (
          // Daily Stats
          <>
            <View style={styles.newStatItem}>
              <View style={[styles.newStatIcon, { backgroundColor: '#10b981' }]}>
                <MaterialCommunityIcons name="check-circle" size={16} color={Colors.white} />
              </View>
              <Text style={styles.newStatNumber}>{filteredStudents.filter(s => s.status === 'present').length}</Text>
              <Text style={styles.newStatLabel}>Present</Text>
            </View>
            
            <View style={styles.newStatItem}>
              <View style={[styles.newStatIcon, { backgroundColor: '#ef4444' }]}>
                <MaterialCommunityIcons name="close-circle" size={16} color={Colors.white} />
              </View>
              <Text style={styles.newStatNumber}>{filteredStudents.filter(s => s.status === 'absent').length}</Text>
              <Text style={styles.newStatLabel}>Absent</Text>
            </View>
            
            <View style={styles.newStatItem}>
              <View style={[styles.newStatIcon, { backgroundColor: '#f59e0b' }]}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.white} />
              </View>
              <Text style={styles.newStatNumber}>{filteredStudents.filter(s => !s.status || s.status === 'unmarked').length}</Text>
              <Text style={styles.newStatLabel}>Unmarked</Text>
            </View>
            
            <View style={styles.newStatItem}>
              <View style={[styles.newStatIcon, { backgroundColor: '#8b5cf6' }]}>
                <MaterialCommunityIcons name="account-group" size={16} color={Colors.white} />
              </View>
              <Text style={styles.newStatNumber}>{filteredStudents.length}</Text>
              <Text style={styles.newStatLabel}>Total</Text>
            </View>
          </>
        ) : (
          // Monthly Stats
          <>
            <View style={styles.newStatItem}>
              <View style={[styles.newStatIcon, { backgroundColor: '#10b981' }]}>
                <MaterialCommunityIcons name="check-circle" size={16} color={Colors.white} />
              </View>
              <Text style={styles.newStatNumber}>{monthlyAttendance.filter(s => s.status === 'present').length}</Text>
              <Text style={styles.newStatLabel}>Present</Text>
            </View>
            
            <View style={styles.newStatItem}>
              <View style={[styles.newStatIcon, { backgroundColor: '#ef4444' }]}>
                <MaterialCommunityIcons name="close-circle" size={16} color={Colors.white} />
              </View>
              <Text style={styles.newStatNumber}>{monthlyAttendance.filter(s => s.status === 'absent').length}</Text>
              <Text style={styles.newStatLabel}>Absent</Text>
            </View>
            
            <View style={styles.newStatItem}>
              <View style={[styles.newStatIcon, { backgroundColor: '#3b82f6' }]}>
                <MaterialCommunityIcons name="calendar-check" size={16} color={Colors.white} />
              </View>
              <Text style={styles.newStatNumber}>{monthlyAttendance.length}</Text>
              <Text style={styles.newStatLabel}>Records</Text>
            </View>
            
            <View style={styles.newStatItem}>
              <View style={[styles.newStatIcon, { backgroundColor: '#8b5cf6' }]}>
                <MaterialCommunityIcons name="percent" size={16} color={Colors.white} />
              </View>
              <Text style={styles.newStatNumber}>
                {monthlyAttendance.length > 0 ? 
                  Math.round((monthlyAttendance.filter(s => s.status === 'present').length / monthlyAttendance.length) * 100) : 0}%
              </Text>
              <Text style={styles.newStatLabel}>Attendance</Text>
            </View>
          </>
        )}
      </View>
    </Animatable.View>
  );

  // Monthly attendance item renderer
  const renderMonthlyItem = ({ item }) => (
    <Animatable.View animation="fadeInUp" duration={600} style={styles.monthlyItemContainer}>
      <View style={styles.monthlyItemContent}>
        <View style={styles.monthlyItemHeader}>
          <Text style={styles.monthlyStudentName}>{item.student_name || 'Unknown Student'}</Text>
          <View style={[styles.monthlyStatusBadge, 
            item.status === 'present' ? styles.monthlyPresentBadge : styles.monthlyAbsentBadge]}>
            <MaterialCommunityIcons 
              name={item.status === 'present' ? 'check-circle' : 'close-circle'} 
              size={14} 
              color={Colors.white} 
            />
            <Text style={styles.monthlyStatusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.monthlyItemDetails}>
          <View style={styles.monthlyDetailItem}>
            <MaterialCommunityIcons name="calendar" size={16} color={Colors.textSecondary} />
            <Text style={styles.monthlyDetailText}>{item.date}</Text>
          </View>
          
          {item.check_in_time && (
            <View style={styles.monthlyDetailItem}>
              <MaterialCommunityIcons name="login" size={16} color={Colors.success} />
              <Text style={styles.monthlyDetailText}>In: {item.check_in_time}</Text>
            </View>
          )}
          
          {item.check_out_time && (
            <View style={styles.monthlyDetailItem}>
              <MaterialCommunityIcons name="logout" size={16} color={Colors.error} />
              <Text style={styles.monthlyDetailText}>Out: {item.check_out_time}</Text>
            </View>
          )}
          
          {item.marked_by_name && (
            <View style={styles.monthlyDetailItem}>
              <MaterialCommunityIcons name="account-check" size={16} color={Colors.primary} />
              <Text style={styles.monthlyDetailText}>By: {item.marked_by_name}</Text>
            </View>
          )}
        </View>
      </View>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={showMonthlyView ? monthlyAttendance : filteredStudents}
        renderItem={showMonthlyView ? renderMonthlyItem : renderStudentItem}
        keyExtractor={(item, index) => 
          showMonthlyView 
            ? `monthly_${item.id || index}_${item.date || index}`
            : `daily_${item.id || item.student_id || index}_${item.email || item.username || index}`
        }
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={null}
        {...getOptimizedFlatListProps(showMonthlyView ? monthlyAttendance.length : filteredStudents.length)}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {(loading || loadingMonthly) ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <MaterialCommunityIcons 
                name={showMonthlyView ? "calendar-month-outline" : "account-group-outline"} 
                size={60} 
                color={Colors.textSecondary} 
              />
            )}
            <Text style={styles.emptyText}>
              {(loading || loadingMonthly) ? 
                (showMonthlyView ? 'Loading monthly attendance...' : 'Fetching students...') :
                (showMonthlyView ? 
                  'No monthly attendance records found.' : 
                  (searchQuery ? 'No students found matching your search.' : 'No students found.')
                )
              }
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

      {/* NEW Guardian Selection Modal - Completely Redesigned */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showGuardianModal}
        onRequestClose={() => setShowGuardianModal(false)}
      >
        <View style={styles.newModalOverlay}>
          <View style={styles.newModalContainer}>
            
            {/* Header */}
            <View style={styles.newModalHeader}>
              <Text style={styles.newModalTitle}>Select Guardian</Text>
              <Text style={styles.newModalSubtitle}>
                {selectedAction === 'IN' ? 'Drop-off' : 'Pick-up'} for {selectedStudent?.name}
              </Text>
            </View>

            {/* Guardian Options with Real Data */}
            <View style={styles.newGuardianList}>
              {(() => {
                // Get student data (detailed info or basic info)
                const studentData = detailedStudentInfo || selectedStudent || {};
                const studentName = studentData.name || 'Student';
                
                // Debug logging
                console.log('🔍 Guardian popup - Student data:', {
                  name: studentData.name,
                  father_name: studentData.father_name,
                  father_photo: studentData.father_photo,
                  mother_name: studentData.mother_name,
                  mother_photo: studentData.mother_photo,
                  guardian_name: studentData.guardian_name,
                  guardian_photo: studentData.guardian_photo,
                  parent_name: studentData.parent_name,
                  parent_photo: studentData.parent_photo,
                  avatar: studentData.avatar
                });
                
                // Create guardian options with real data
                const guardianOptions = [
                  {
                    type: 'Father',
                    name: studentData.father_name || studentData.parent_name || `${studentName}'s Father`,
                    photo: studentData.father_photo || studentData.parent_photo || studentData.avatar,
                    phone: studentData.father_phone || studentData.father_number || studentData.parent_phone,
                    icon: 'account-tie',
                    color: '#3B82F6'
                  },
                  {
                    type: 'Mother', 
                    name: studentData.mother_name || studentData.parent_name || `${studentName}'s Mother`,
                    photo: studentData.mother_photo || studentData.parent_photo || studentData.avatar,
                    phone: studentData.mother_phone || studentData.mother_number || studentData.parent_phone,
                    icon: 'account-heart',
                    color: '#EC4899'
                  },
                  {
                    type: 'Guardian',
                    name: studentData.guardian_name || studentData.emergency_contact_name || studentData.parent_name || `${studentName}'s Guardian`,
                    photo: studentData.guardian_photo || studentData.parent_photo || studentData.avatar,
                    phone: studentData.guardian_phone || studentData.guardian_number || studentData.emergency_contact_number || studentData.parent_phone,
                    icon: 'account-supervisor',
                    color: '#10B981'
                  },
                  {
                    type: 'Captain',
                    name: 'School Captain',
                    photo: studentData.avatar,
                    phone: null,
                    icon: 'account-star',
                    color: '#F59E0B'
                  }
                ];

                return guardianOptions.map((guardian) => (
                  <TouchableOpacity 
                    key={guardian.type}
                    style={[styles.newGuardianOption, { borderLeftColor: guardian.color }]}
                    onPress={() => handleGuardianSelection(guardian.type, guardian.name)}
                  >
                    {/* Guardian Photo */}
                    <View style={styles.newGuardianPhotoContainer}>
                      <Image 
                        source={formatPhotoSource(guardian.photo) || require('../../assets/Avartar.png')} 
                        style={styles.newGuardianPhoto}
                        defaultSource={require('../../assets/Avartar.png')}
                      />
                      <View style={[styles.newGuardianIconBadge, { backgroundColor: guardian.color }]}>
                        <MaterialCommunityIcons name={guardian.icon} size={14} color="white" />
                      </View>
                    </View>

                    {/* Guardian Info */}
                    <View style={styles.newGuardianInfo}>
                      <Text style={styles.newGuardianName} numberOfLines={1}>{guardian.name}</Text>
                      <View style={styles.newGuardianTypeRow}>
                        <Text style={[styles.newGuardianType, { color: guardian.color }]}>{guardian.type}</Text>
                        {guardian.phone && (
                          <Text style={styles.newGuardianPhone} numberOfLines={1}>{guardian.phone}</Text>
                        )}
                      </View>
                    </View>

                    {/* Arrow */}
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#666" />
                  </TouchableOpacity>
                ));
              })()}
            </View>

            {/* Footer */}
            <View style={styles.newModalFooter}>
              <TouchableOpacity 
                style={styles.newCancelButton}
                onPress={() => setShowGuardianModal(false)}
              >
                <Text style={styles.newCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

          </View>
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
  listContainer: { paddingHorizontal: 16, paddingBottom: 120 },
  
  // Original Header Styles (No Margins)
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
  // Modern Filters
  modernFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  modernPickerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  pickerIcon: {
    marginRight: 8,
  },
  modernPicker: {
    flex: 1,
    height: 50,
  },
  pickerItem: { fontSize: 16 },
  modernDateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 8,
  },
  modernDateText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
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
  // Modern Stats
  modernStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  modernStatCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  presentCard: {
    borderTopWidth: 3,
    borderTopColor: '#10b981',
  },
  absentCard: {
    borderTopWidth: 3,
    borderTopColor: '#ef4444',
  },
  unmarkedCard: {
    borderTopWidth: 3,
    borderTopColor: '#f59e0b',
  },
  totalCard: {
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
  },
  modernStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Original Student Card Styles
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
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: Colors.primary },
  studentDetails: { marginLeft: 12, flex: 1 },
  studentName: { fontSize: 17, fontWeight: 'bold', color: Colors.text },
  studentId: { fontSize: 14, color: Colors.textSecondary, opacity: 0.9 },
  tagContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginTop: 5, alignSelf: 'flex-start' },
  attendanceType: { fontSize: 12, color: Colors.white, marginLeft: 5 },
  attendanceDetails: { alignItems: 'flex-end', marginLeft: 10 },
  timeEntry: { alignItems: 'flex-end', marginBottom: 5 },
  timeLabel: { fontSize: 13, color: Colors.text, fontWeight: '600' },
  byLabel: { fontSize: 11, color: Colors.textSecondary, opacity: 0.8 },
  // Legacy styles (keeping for compatibility)
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 25,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'center',
  },
  modalQuestion: {
    fontSize: 17,
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  guardianButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  guardianModalAvatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 18,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  guardianInfo: {
    flex: 1,
  },
  guardianButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  guardianTagText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
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
  // Modern Tabs
  modernTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: Colors.white,
    borderRadius: 25,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  modernTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 8,
  },
  modernActiveTab: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  activeTabIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modernTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modernActiveTabText: {
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

  // Modern Search Styles
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  modernSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  clearSearchButton: {
    padding: 4,
  },

  // Modern Student Card Styles
  modernStudentCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modernCardGradient: {
    borderRadius: 16,
    padding: 16,
  },
  modernStudentContainer: {
    flex: 1,
  },
  modernStudentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modernAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  modernAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.containerDark,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  modernStatusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  modernBadge_present: {
    backgroundColor: Colors.success,
  },
  modernBadge_absent: {
    backgroundColor: Colors.danger,
  },
  modernBadge_unmarked: {
    backgroundColor: Colors.textSecondary,
  },
  modernStudentInfo: {
    flex: 1,
  },
  modernStudentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  modernStudentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernStudentId: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  modernBranchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernBranchText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  modernMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernMethodText: {
    fontSize: 11,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  modernStatusContainer: {
    alignItems: 'flex-end',
  },
  modernStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  modernStatusPill_present: {
    backgroundColor: Colors.success,
  },
  modernStatusPill_absent: {
    backgroundColor: Colors.danger,
  },
  modernStatusPill_unmarked: {
    backgroundColor: Colors.textSecondary,
  },
  modernStatusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modernTimeSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modernTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modernTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  modernTimeInfo: {
    marginLeft: 8,
    flex: 1,
  },
  modernTimeLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modernTimeValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  modernByLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // Modern Stats Container Styles
  modernStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  modernStatCard: {
    flex: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  modernStatGradient: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  modernStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Modern Guardian Modal Styles
  modernModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modernGuardianModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modernModalHeader: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  modernModalHeaderContent: {
    alignItems: 'center',
  },
  modernModalTitleContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  modernModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  modernModalStudentName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  modernModalMethod: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  modernModalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flex: 1,
  },
  modernModalQuestionContainer: {
    marginBottom: 24,
  },
  modernModalQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modernModalSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  guardianScrollView: {
    flex: 1,
  },
  guardianList: {
    gap: 12,
    paddingBottom: 20, // Add bottom padding for better scrolling
  },
  guardianListItem: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guardianItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guardianLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  guardianIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guardianAvatarSection: {
    marginRight: 16,
  },
  guardianAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  guardianInfoSection: {
    flex: 1,
    paddingRight: 12,
  },
  guardianNameContainer: {
    marginBottom: 6,
  },
  guardianNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  guardianRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  guardianRoleText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  guardianPhoneText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  guardianArrowSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    padding: 20,
    alignItems: 'center',
  },
  fallbackText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  fallbackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  testGuardianContainer: {
    padding: 20,
  },
  testGuardianTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  testGuardianItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  testGuardianText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 12,
  },
  simpleGuardianContainer: {
    paddingVertical: 10,
  },
  simpleGuardianTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  simpleGuardianButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  simpleGuardianText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginLeft: 12,
  },
  
  // NEW Modal Styles - Completely Redesigned
  newModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  newModalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  newModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  newModalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  newGuardianList: {
    padding: 20,
  },
  newGuardianOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  newGuardianPhotoContainer: {
    position: 'relative',
    marginRight: 16,
  },
  newGuardianPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
  newGuardianIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  newGuardianInfo: {
    flex: 1,
    paddingRight: 12,
  },
  newGuardianName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  newGuardianTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newGuardianType: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newGuardianPhone: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  newGuardianText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  newModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  newCancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  
  // New Header Styles
  newHeader: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  newHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  newHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  newHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  newHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newHeaderAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // New Stats Styles
  newStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  newStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  newStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  newStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  newStatLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // New Tab Styles
  newTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 4,
    marginTop: 12,
  },
  newTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  newActiveTab: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  newTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  newActiveTabText: {
    color: Colors.white,
  },
  modernModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modernCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.containerLight,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  modernCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Full Width Header Styles
  fullWidthHeader: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 0, // No horizontal padding for full width
  },
  fullWidthHeaderContent: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  modernHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
  },
  modernHeaderSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modernHeaderActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Admin Badge Styles
  adminBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  
  // Modern Filters Container
  modernFiltersContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Branch Picker Styles
  modernPickerContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerIcon: {
    position: 'absolute',
    left: 12,
    top: 38,
    zIndex: 1,
  },
  pickerWrapper: {
    backgroundColor: Colors.containerLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: 40,
    minHeight: 48,
    justifyContent: 'center',
  },
  modernPicker: {
    height: 48,
    width: '100%',
  },
  pickerItem: {
    fontSize: 16,
    color: Colors.text,
  },
  
  // Date Button Styles
  modernDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.containerLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  modernDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  
  // Search Container Styles
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
  },
  clearSearchButton: {
    marginLeft: 8,
  },
  
  // Assigned Branch Badge
  assignedBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
});
