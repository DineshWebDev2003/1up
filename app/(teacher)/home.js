import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Button } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log('Teacher data loaded:', user);
        setTeacherData(user);

        // Fetch dashboard stats
        console.log('Fetching teacher dashboard stats...');
        const statsResponse = await authFetch('/api/dashboard/teacher_dashboard_stats.php');
        const statsResult = await statsResponse.json();
        console.log('Stats response:', statsResult);
        if (statsResult.success) {
          setAttendanceStats(statsResult.data);
          console.log('Attendance stats updated:', statsResult.data);
        } else {
          console.error('Failed to fetch stats:', statsResult.message);
          // Set default values if API fails
          setAttendanceStats({ total_students: 0, present_students: 0 });
        }

        // Fetch clock-in status
        console.log('Fetching clock-in status...');
        const clockStatusResponse = await authFetch('/api/attendance/staff_attendance.php');
        const clockResult = await clockStatusResponse.json();
        console.log('Clock status response:', clockResult);
        if (clockResult.success && clockResult.data) {
          // Check if user is currently clocked in (has clock_in_time but no clock_out_time)
          if (clockResult.data.clock_in_time && !clockResult.data.clock_out_time) {
            setClockInStatus({ ...clockResult.data, status: 'clocked_in' });
          } else {
            setClockInStatus({ ...clockResult.data, status: 'clocked_out' });
          }
        } else {
          setClockInStatus(null); // Not clocked in today
        }
      } else {
        console.error('No user data found in AsyncStorage');
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Set default values on error
      setAttendanceStats({ total_students: 0, present_students: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );


  const handleClockIn = async () => {
    try {
      const response = await authFetch('/api/attendance/staff_attendance.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'clock_in' }),
      });
      const result = await response.json();
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

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Section - Always show with fallback data */}
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

        {/* Stats Section with Refresh Button */}
        <View style={styles.statsHeader}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
            <MaterialCommunityIcons name="refresh" size={20} color={Colors.primary} />
          </TouchableOpacity>
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
                : clockInStatus.clock_out_time 
                  ? `Last clocked out at ${new Date(clockInStatus.clock_out_time).toLocaleTimeString()}`
                  : 'Not clocked in today'}
            </Text>
          )}
        </View>

                <Animatable.View animation="fadeInUp" delay={300} style={styles.actionsGrid}>
          <TouchableOpacity style={styles.gridButton} onPress={() => router.push('/(common)/student-qr-scanner')}>
            <MaterialCommunityIcons name="qrcode-scan" size={32} color={Colors.primary} />
            <Text style={styles.gridButtonText}>Scan Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridButton} onPress={() => router.push('/(common)/post-activity')}>
            <MaterialCommunityIcons name="pencil-plus-outline" size={32} color={Colors.accent} />
            <Text style={styles.gridButtonText}>Post Activity</Text>
          </TouchableOpacity>
                  </Animatable.View>

      </ScrollView>


      <Modal
        visible={isReportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>📝 Daily Report</Text>
          <Text style={styles.modalSubtitle}>Please provide a summary of today's activities before clocking out.</Text>
          <TextInput
            style={styles.reportInput}
            multiline
            numberOfLines={4}
            placeholder="e.g., Completed Chapter 5, conducted a quiz, helped students with homework..."
            value={dailyReport}
            onChangeText={setDailyReport}
            textAlignVertical="top"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.submitButton} onPress={submitReportAndClockOut}>
              <Text style={styles.submitButtonText}>Submit & Clock Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setReportModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
});

export default TeacherHomeScreen;
