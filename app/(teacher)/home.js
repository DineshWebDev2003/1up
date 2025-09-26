import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Button } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as Animatable from 'react-native-animatable';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
const Profile = require('../components/Profile').default;
import { API_URL } from '../../config';

const TeacherHomeScreen = () => {
  const router = useRouter();
  const [teacherData, setTeacherData] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({ total_students: 0, present_students: 0 });
  const [clockInStatus, setClockInStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [dailyReport, setDailyReport] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [isScannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setTeacherData(user);

        // Fetch dashboard stats
        const statsResponse = await authFetch('/api/dashboard/teacher_dashboard_stats.php');
        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          setAttendanceStats(statsResult.data);
        }

        // Fetch clock-in status
        const clockStatusResponse = await authFetch('/api/attendance/staff_attendance.php');
        const clockResult = await clockStatusResponse.json();
        if (clockResult.success && clockResult.data) {
          setClockInStatus(clockResult.data);
        } else {
          setClockInStatus(null); // Not clocked in today
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

    useFocusEffect(fetchData);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleClockIn = async () => {
    try {
      const response = await authFetch('/api/attendance/staff_attendance.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'clock_in' }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'You have clocked in.');
        fetchData(); // Refresh data
      } else {
        Alert.alert('Error', result.message || 'Failed to clock in.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during clock-in.');
    }
  };

  const handleClockOut = () => {
    setReportModalVisible(true);
  };

    const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    try {
      const student = JSON.parse(data);
      if (student.student_id) {
        const response = await authFetch('/api/attendance/mark_manual_attendance.php', {
          method: 'POST',
          body: JSON.stringify({ student_id: student.student_id, status: 'present' }),
        });
        const result = await response.json();
        if (result.success) {
          Alert.alert('Success', `${student.name} marked as present.`);
          fetchData(); // Refresh stats
        } else {
          Alert.alert('Error', result.message || 'Failed to mark attendance.');
        }
      } else {
        Alert.alert('Invalid QR Code', 'This QR code does not contain valid student information.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while processing the QR code.');
    }
    setScannerVisible(false);
    setScanned(false);
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
        Alert.alert('Success', 'You have clocked out.');
        setReportModalVisible(false);
        setDailyReport('');
        fetchData(); // Refresh data
      } else {
        Alert.alert('Error', result.message || 'Failed to clock out.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during clock-out.');
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {teacherData && (
          <Profile 
            name={teacherData.name}
            role={teacherData.role}
            branch={teacherData.branch}
            profileImage={teacherData.avatar ? `${API_URL}${teacherData.avatar}` : null}
          />
        )}

        <View style={styles.statsContainer}>
          <Animatable.View animation="zoomIn" delay={100} style={styles.statCard}>
            <MaterialCommunityIcons name="account-group-outline" size={32} color={Colors.primary} />
            <Text style={styles.statValue}>{attendanceStats.total_students}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </Animatable.View>
          <Animatable.View animation="zoomIn" delay={200} style={styles.statCard}>
            <MaterialCommunityIcons name="account-check-outline" size={32} color={Colors.accent} />
            <Text style={styles.statValue}>{attendanceStats.present_students}</Text>
            <Text style={styles.statLabel}>Present Today</Text>
          </Animatable.View>
        </View>

        <View style={styles.attendanceActionContainer}>
          {clockInStatus && clockInStatus.status === 'clocked_in' ? (
            <TouchableOpacity style={[styles.actionButton, styles.clockOutButton]} onPress={handleClockOut}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Clock Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.clockInButton]} onPress={handleClockIn}>
              <Ionicons name="log-in-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Clock In</Text>
            </TouchableOpacity>
          )}
          {clockInStatus && (
            <Text style={styles.clockInTimeText}>
              {clockInStatus.status === 'clocked_in' 
                ? `Clocked in at ${new Date(clockInStatus.clock_in_time).toLocaleTimeString()}`
                : `Last clocked out at ${new Date(clockInStatus.clock_out_time).toLocaleTimeString()}`}
            </Text>
          )}
        </View>

                <Animatable.View animation="fadeInUp" delay={300} style={styles.actionsGrid}>
          <TouchableOpacity style={styles.gridButton} onPress={() => setScannerVisible(true)}>
            <MaterialCommunityIcons name="qrcode-scan" size={32} color={Colors.primary} />
            <Text style={styles.gridButtonText}>Scan Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridButton} onPress={() => router.push('/(teacher)/post-activity')}>
            <MaterialCommunityIcons name="pencil-plus-outline" size={32} color={Colors.accent} />
            <Text style={styles.gridButtonText}>Post Activity</Text>
          </TouchableOpacity>
                  </Animatable.View>

      </ScrollView>

            <Modal visible={isScannerVisible} onRequestClose={() => setScannerVisible(false)}>
        <Camera 
          style={StyleSheet.absoluteFillObject} 
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View style={styles.scannerOverlay}>
            <Text style={styles.scannerText}>Scan Student ID Card</Text>
            <Button title={'Cancel'} onPress={() => setScannerVisible(false)} />
        </View>
      </Modal>

      <Modal
        visible={isReportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Daily Report</Text>
            <Text style={styles.modalSubtitle}>Please provide a summary of today's activities before clocking out.</Text>
            <TextInput
              style={styles.reportInput}
              multiline
              placeholder="e.g., Completed Chapter 5, conducted a quiz..."
              value={dailyReport}
              onChangeText={setDailyReport}
            />
            <TouchableOpacity style={styles.submitButton} onPress={submitReportAndClockOut}>
              <Text style={styles.submitButtonText}>Submit & Clock Out</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBackground, // A lighter background for the main screen
  },
  scrollContainer: {
    padding: 15,
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
    marginTop: 15,
    fontSize: 14,
    color: Colors.textSecondary,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  reportInput: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.lightBackground,
    borderRadius: 10,
    padding: 15,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelText: {
      marginTop: 15,
      color: Colors.textSecondary,
      fontSize: 16
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
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerText: {
    fontSize: 24,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
});

export default TeacherHomeScreen;
