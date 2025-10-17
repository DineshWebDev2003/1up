import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Button, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, Camera } from 'expo-camera';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
const Profile = require('../components/Profile').default;
import { API_URL } from '../../config';
import { safeApiCall, safeSetState, safeNavigate } from '../utils/crashPrevention';

const TeacherHomeScreen = () => {
  const router = useRouter();
  const [teacherData, setTeacherData] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({ total_students: 0, present_students: 0 });
  const [clockInStatus, setClockInStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [dailyReport, setDailyReport] = useState('');
  
  // QR Scanner states
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [students, setStudents] = useState([]);
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  const fetchData = useCallback(async () => {
    safeSetState(setLoading, true);
    
    const apiCall = async () => {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log('Teacher data loaded:', user);
        safeSetState(setTeacherData, user);

        // Fetch dashboard stats
        console.log('Fetching teacher dashboard stats...');
        const statsResponse = await authFetch('/api/dashboard/teacher_dashboard_stats.php');
        const statsResult = await statsResponse.json();
        console.log('Stats response:', statsResult);
        if (statsResult.success) {
          safeSetState(setAttendanceStats, statsResult.data);
          console.log('Attendance stats updated:', statsResult.data);
        } else {
          console.error('Failed to fetch stats:', statsResult.message);
          safeSetState(setAttendanceStats, { total_students: 0, present_students: 0 });
        }

        // Fetch clock-in status
        console.log('Fetching clock-in status...');
        const clockStatusResponse = await authFetch('/api/attendance/staff_attendance.php');
        const clockResult = await clockStatusResponse.json();
        console.log('Clock status response:', clockResult);
        if (clockResult.success && clockResult.data) {
          // Check if user is currently clocked in (has clock_in_time but no clock_out_time)
          if (clockResult.data.clock_in_time && !clockResult.data.clock_out_time) {
            safeSetState(setClockInStatus, { ...clockResult.data, status: 'clocked_in' });
          } else {
            safeSetState(setClockInStatus, { ...clockResult.data, status: 'clocked_out' });
          }
        } else {
          safeSetState(setClockInStatus, null); // Not clocked in today
        }
      } else {
        console.error('No user data found in AsyncStorage');
      }
    };

    try {
      await safeApiCall(apiCall);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      safeSetState(setAttendanceStats, { total_students: 0, present_students: 0 });
    } finally {
      safeSetState(setLoading, false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      fetchStudents();
      getCameraPermissions();
    }, [fetchData])
  );

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const fetchStudents = useCallback(async () => {
    try {
      const studentsResponse = await authFetch('/api/students/get_students.php');
      const studentsResult = await studentsResponse.json();

      if (studentsResult.success) {
        const allStudents = studentsResult.data || [];
        const studentsWithAttendance = allStudents.map(student => ({
          ...student,
          name: student.name || student.username || student.student_id || 'Unknown Student',
          status: 'unmarked',
          inTime: null,
          outTime: null,
        }));
        setStudents(studentsWithAttendance);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }, []);


  const handleClockIn = async () => {
    // Prevent multiple simultaneous calls
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      console.log('🕐 Clock-in attempt started');
      const response = await authFetch('/api/attendance/staff_attendance.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'clock_in' }),
      });
      const result = await response.json();
      console.log('🕐 Clock-in response:', result);
      
      if (result.success) {
        Alert.alert('Success', result.message || 'You have clocked in successfully!');
        // Immediately update the UI state
        setClockInStatus(prev => ({
          ...prev,
          status: 'clocked_in',
          clock_in_time: new Date().toISOString(),
          clock_out_time: null
        }));
        // Also refresh data to get latest info
        fetchData();
      } else {
        Alert.alert('Clock-in Failed', result.message || 'You are already clocked in for today.');
      }
    } catch (error) {
      console.error('Clock-in error:', error);
      Alert.alert('Error', 'An error occurred during clock-in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = () => {
    setReportModalVisible(true);
  };


  const submitReportAndClockOut = async () => {
    if (!dailyReport.trim()) {
      Alert.alert('Required', 'Please enter a brief report before clocking out.');
      return;
    }
    try {
      const response = await authFetch('/api/attendance/staff_attendance.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'clock_out', report: dailyReport }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'You have clocked out successfully!');
        setReportModalVisible(false);
        setDailyReport('');
        // Immediately update the UI state
        setClockInStatus(prev => ({
          ...prev,
          status: 'clocked_out',
          clock_out_time: new Date().toISOString(),
          daily_report: dailyReport
        }));
        // Also refresh data to get latest info
        fetchData();
      } else {
        Alert.alert('Clock-out Failed', result.message || 'Failed to clock out.');
      }
    } catch (error) {
      console.error('Clock-out error:', error);
      Alert.alert('Error', 'An error occurred during clock-out.');
    }
  };

  // QR Scanner Functions
  const handleQRScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    
    console.log('🔍 QR Scanned Data:', data);
    
    // Parse QR data - handle JSON or plain text
    let qrStudentId = data;
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.student_id) {
        qrStudentId = parsedData.student_id;
      } else if (parsedData.id) {
        qrStudentId = parsedData.id;
      }
    } catch (e) {
      // Not JSON, use as plain text
    }
    
    // Find student by ID from QR code
    let student = null;
    const searchId = qrStudentId.toString().trim();
    
    student = students.find(s => 
      s.student_id?.toString().trim() === searchId ||
      s.id?.toString().trim() === searchId ||
      s.username?.toString().trim() === searchId
    );
    
    if (!student && !isNaN(searchId)) {
      const numericId = parseInt(searchId);
      student = students.find(s => 
        parseInt(s.student_id) === numericId ||
        parseInt(s.id) === numericId
      );
    }
    
    if (student) {
      console.log('✅ Student Found:', student);
      
      // Determine the action needed
      let actionType = '';
      if (student.status === 'unmarked') {
        actionType = 'IN';
      } else if (student.status === 'present' && student.inTime && !student.outTime) {
        actionType = 'OUT';
      } else {
        actionType = 'IN';
      }
      
      // Show guardian selection
      setSelectedStudent(student);
      setSelectedAction(actionType);
      setSelectedMethod('QR Scanner');
      setShowGuardianModal(true);
      
    } else {
      Alert.alert(
        'Student Not Found', 
        `Scanned ID: ${searchId}\nNo matching student found.`,
        [
          { text: 'Retry', onPress: () => setScanned(false) },
          { text: 'Close', onPress: () => setShowQRScanner(false) }
        ]
      );
      return;
    }
    
    setShowQRScanner(false);
    setTimeout(() => setScanned(false), 2000);
  };

  const handleGuardianSelection = (guardianType, guardianName) => {
    if (selectedStudent && selectedAction) {
      markAttendanceDirectly(
        selectedStudent.id, 
        selectedAction === 'IN' ? 'present' : 'absent', 
        guardianName, 
        guardianType
      );
    }
    setShowGuardianModal(false);
  };

  const markAttendanceDirectly = async (studentId, status, guardianName, guardianType) => {
    try {
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const attendanceData = {
        student_id: studentId, 
        status: status,
        action: selectedAction?.toLowerCase(),
        date: new Date().toISOString().split('T')[0],
        guardian_type: guardianType,
        guardian_name: guardianName,
        marked_by_name: teacherData?.name || 'Teacher',
        marked_by_role: teacherData?.role || 'Teacher'
      };
      
      const response = await authFetch('/api/attendance/mark_new_attendance.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('✅ Success!', `${selectedStudent?.name} marked ${selectedAction} by ${guardianName}`);
        fetchData(); // Refresh stats
      } else {
        Alert.alert('❌ Error', result.message || 'Failed to mark attendance.');
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      Alert.alert('❌ Network Error', 'Failed to connect to server.');
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Section - Always show with fallback data */}
        <View style={styles.profileContainer}>
          <Profile 
            name={teacherData?.name || 'Teacher'}
            role={teacherData?.role || 'Teacher'}
            branch={teacherData?.branch || 'Loading...'}
            profileImage={teacherData?.avatar ? (
              teacherData.avatar.startsWith('http') 
                ? teacherData.avatar 
                : `${API_URL}${teacherData.avatar}`
            ) : null}
          />
        </View>

        <View style={styles.statsContainer}>
          <Animatable.View animation="zoomIn" delay={100} style={styles.statCard}>
            <MaterialCommunityIcons name="account-group-outline" size={32} color={Colors.primary} />
            <Text style={styles.statValue}>{attendanceStats.total_students || 0}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </Animatable.View>
          <Animatable.View animation="zoomIn" delay={200} style={styles.statCard}>
            <MaterialCommunityIcons name="account-check-outline" size={32} color={Colors.accent} />
            <Text style={styles.statValue}>{attendanceStats.present_students || 0}</Text>
            <Text style={styles.statLabel}>Present Today</Text>
          </Animatable.View>
        </View>

        <View style={styles.attendanceActionContainer}>
          <View style={styles.clockStatusHeader}>
            <MaterialCommunityIcons 
              name={clockInStatus?.status === 'clocked_in' ? 'clock-check-outline' : 'clock-outline'} 
              size={28} 
              color={clockInStatus?.status === 'clocked_in' ? Colors.accent : Colors.textSecondary} 
            />
            <Text style={styles.clockStatusTitle}>
              {clockInStatus?.status === 'clocked_in' ? 'Currently Working' : 'Ready to Start'}
            </Text>
          </View>

          {clockInStatus && (
            <View style={styles.timeInfoContainer}>
              <MaterialCommunityIcons name="information-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.clockInTimeText}>
                {clockInStatus.status === 'clocked_in' 
                  ? `Started at ${new Date(clockInStatus.clock_in_time).toLocaleTimeString()}`
                  : clockInStatus.clock_out_time 
                    ? `Last session ended at ${new Date(clockInStatus.clock_out_time).toLocaleTimeString()}`
                    : 'No session today'}
              </Text>
            </View>
          )}

          {clockInStatus && clockInStatus.status === 'clocked_in' ? (
            <TouchableOpacity style={[styles.actionButton, styles.clockOutButton]} onPress={handleClockOut}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>End Session</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.clockInButton]} onPress={handleClockIn}>
              <Ionicons name="log-in-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Start Session</Text>
            </TouchableOpacity>
          )}
        </View>

                <Animatable.View animation="fadeInUp" delay={300} style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.gridButton} 
            onPress={() => {
              if (hasPermission) {
                setShowQRScanner(true);
              } else {
                Alert.alert('Camera Permission', 'Camera permission is required for QR scanning');
              }
            }}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={32} color={Colors.primary} />
            <Text style={styles.gridButtonText}>QR Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridButton} onPress={() => safeNavigate(router, '/(common)/post-activity')}>
            <MaterialCommunityIcons name="pencil-plus-outline" size={32} color={Colors.accent} />
            <Text style={styles.gridButtonText}>Post Activity</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.gridButton} onPress={() => safeNavigate(router, '/(teacher)/attendance-report')}>
            <MaterialCommunityIcons name="chart-line" size={32} color={Colors.success} />
            <Text style={styles.gridButtonText}>My Attendance</Text>
          </TouchableOpacity> */}
          {/* <TouchableOpacity style={styles.gridButton} onPress={() => safeNavigate(router, '/(common)/enhanced-staff-attendance')}>
            <MaterialCommunityIcons name="account-clock" size={32} color={Colors.warning} />
            <Text style={styles.gridButtonText}>Staff Attendance</Text>
          </TouchableOpacity> */}
                  </Animatable.View>

      </ScrollView>

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
                  name: selectedStudent.mother_name || selectedStudent.parent_name || 'Mother', 
                  profilePic: selectedStudent.mother_photo || selectedStudent.parent_photo 
                }, 
                type: 'Mother' 
              },
              { 
                person: { 
                  name: selectedStudent.guardian_name || selectedStudent.parent_name || 'Guardian', 
                  profilePic: selectedStudent.guardian_photo || selectedStudent.parent_photo 
                }, 
                type: 'Guardian' 
              },
            ].filter(g => g.person.name).map(({ person, type }) => (
              <TouchableOpacity 
                key={type} 
                style={styles.guardianButton} 
                onPress={() => handleGuardianSelection(type, person.name)}
              >
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

      <Modal
        visible={isReportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.reportModalContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity 
              style={styles.reportCloseButton}
              onPress={() => setReportModalVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>📝 Daily Report</Text>
            <View style={{width: 40}} />
          </View>
          
          <ScrollView 
            style={styles.reportScrollView}
            contentContainerStyle={styles.reportScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.reportContent}>
              <View style={styles.reportIconContainer}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={Colors.primary} />
              </View>
              
              <Text style={styles.reportTitle}>End of Day Summary</Text>
              <Text style={styles.reportDescription}>
                Please provide a brief summary of today's activities, achievements, and any important notes before ending your session.
              </Text>
              
              <View style={styles.reportInputContainer}>
                <Text style={styles.reportInputLabel}>Today's Activities</Text>
                <TextInput
                  style={styles.reportInput}
                  multiline
                  numberOfLines={8}
                  placeholder="• Completed lessons and topics covered&#10;• Student progress and achievements&#10;• Any challenges or issues faced&#10;• Notes for tomorrow's preparation&#10;• Other important observations..."
                  value={dailyReport}
                  onChangeText={setDailyReport}
                  textAlignVertical="top"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              
              <View style={styles.reportButtons}>
                <TouchableOpacity 
                  style={[styles.reportSubmitButton, !dailyReport.trim() && styles.disabledButton]} 
                  onPress={submitReportAndClockOut}
                  disabled={!dailyReport.trim()}
                >
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color={Colors.white} />
                  <Text style={styles.reportSubmitButtonText}>Submit & End Session</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.reportCancelButton} 
                  onPress={() => setReportModalVisible(false)}
                >
                  <Text style={styles.reportCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 15,
    paddingBottom: 100, // Extra space for tab bar
  },
  profileContainer: {
    marginTop: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  attendanceActionContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  clockStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  clockStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginLeft: 10,
  },
  timeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.lightBackground,
    borderRadius: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  clockInButton: {
    backgroundColor: Colors.primary,
  },
  clockOutButton: {
    backgroundColor: Colors.danger,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  clockInTimeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.primary,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  reportInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    padding: 15,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: Colors.lightGray,
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  postActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent, // Or another distinct color
    padding: 18,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  postActivityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  gridButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  gridButtonText: {
    marginTop: 10,
    color: Colors.darkText,
    fontWeight: '600',
    fontSize: 14,
  },
  // QR Scanner Styles
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
  // Report Modal Styles
  reportModalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.primary,
  },
  reportCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  reportHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  reportScrollView: {
    flex: 1,
  },
  reportScrollContent: {
    flexGrow: 1,
  },
  reportContent: {
    padding: 20,
    flex: 1,
    backgroundColor: Colors.white,
  },
  reportIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
    textAlign: 'center',
    marginBottom: 10,
  },
  reportDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  reportInputContainer: {
    marginBottom: 30,
  },
  reportInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 10,
  },
  reportInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    padding: 20,
    fontSize: 16,
    minHeight: 200,
    textAlignVertical: 'top',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportButtons: {
    gap: 15,
  },
  reportSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  reportSubmitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  reportCancelButton: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  reportCancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default TeacherHomeScreen;
