import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';
import { useCaptain } from '../(common)/CaptainProvider';

const AttendanceScreen = () => {
  const { captain, loading } = useCaptain();
  const [onDuty, setOnDuty] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchAttendanceData();
    fetchStudentsForCaptain();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      const response = await authFetch('/api/get_captain_attendance.php');
      const data = await response.json();
      if (data.success) {
        setAttendanceData(data.data || []);
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = data.data?.find(record => record.date === today);
        setTodayAttendance(todayRecord);
        setOnDuty(todayRecord?.status === 'on_duty');
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  const handleDutyToggle = async () => {
    try {
      const action = onDuty ? 'off_duty' : 'on_duty';
      await authFetch('/api/captain_attendance.php', { 
        body: JSON.stringify({ action }) 
      });
      setOnDuty(!onDuty);
      Alert.alert('Success', `You are now ${action.replace('_', ' ')}.`);
      fetchAttendanceData();
    } catch (error) {
      Alert.alert('Error', `Failed to ${onDuty ? 'go off' : 'go on'} duty.`);
    }
  };

  const fetchStudentsForCaptain = async () => {
    try {
      const response = await authFetch('/api/get_students_for_captain.php');
      const data = await response.json();
      if (data.success) {
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return '--';
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60 * 60);
    return diff.toFixed(1) + 'h';
  };

  if (loading) {
    return (
      <LinearGradient colors={Colors.gradientMain} style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.white} />
          <Text style={{ color: Colors.white, marginTop: 10, fontSize: 16 }}>Loading Attendance...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.gradientMain} style={styles.container}>
      <Animatable.View animation="fadeIn" duration={800} style={styles.animatedContainer}>
        
        {/* Header */}
        <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
          <Text style={styles.headerTitle}>My Attendance</Text>
          <Text style={styles.headerSubtitle}>Daily attendance entry and tracking</Text>
        </Animatable.View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* Duty Status Card */}
          <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.dutyCard}>
            <LinearGradient
              colors={onDuty ? ['#4CAF50', '#45a049'] : ['#FF6B6B', '#FF5252']}
              style={styles.dutyGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.dutyContent}>
                <View style={styles.dutyInfo}>
                  <MaterialIcons 
                    name={onDuty ? "work" : "work-off"} 
                    size={32} 
                    color={Colors.white} 
                  />
                  <View style={styles.dutyTextContainer}>
                    <Text style={styles.dutyStatus}>
                      {onDuty ? 'ON DUTY' : 'OFF DUTY'}
                    </Text>
                    <Text style={styles.dutySubtext}>
                      {onDuty ? 'Currently working' : 'Not on duty'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.dutyButton} 
                  onPress={handleDutyToggle}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dutyButtonText}>
                    {onDuty ? 'GO OFF DUTY' : 'GO ON DUTY'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animatable.View>

          {/* Today's Summary */}
          {todayAttendance && (
            <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Today's Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <FontAwesome5 name="clock" size={20} color={Colors.primary} />
                  <Text style={styles.summaryLabel}>Start Time</Text>
                  <Text style={styles.summaryValue}>
                    {formatTime(todayAttendance.start_time)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <FontAwesome5 name="clock" size={20} color={Colors.danger} />
                  <Text style={styles.summaryLabel}>End Time</Text>
                  <Text style={styles.summaryValue}>
                    {formatTime(todayAttendance.end_time)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <FontAwesome5 name="hourglass-half" size={20} color={Colors.success} />
                  <Text style={styles.summaryLabel}>Total Hours</Text>
                  <Text style={styles.summaryValue}>
                    {calculateHours(todayAttendance.start_time, todayAttendance.end_time)}
                  </Text>
                </View>
              </View>
            </Animatable.View>
          )}

          {/* Attendance History */}
          <Animatable.View animation="fadeInUp" duration={600} delay={600} style={styles.historySection}>
            <Text style={styles.historyTitle}>Attendance History</Text>
            {attendanceData.length > 0 ? (
              attendanceData.slice(0, 10).map((record, index) => (
                <Animatable.View 
                  key={record.id || index}
                  animation="fadeInUp" 
                  duration={400} 
                  delay={700 + (index * 50)}
                  style={styles.historyItem}
                >
                  <View style={styles.historyDate}>
                    <Text style={styles.historyDateText}>
                      {formatDate(record.date)}
                    </Text>
                  </View>
                  <View style={styles.historyDetails}>
                    <View style={styles.historyTimeRow}>
                      <Text style={styles.historyTime}>
                        {formatTime(record.start_time)} - {formatTime(record.end_time)}
                      </Text>
                      <Text style={styles.historyHours}>
                        {calculateHours(record.start_time, record.end_time)}
                      </Text>
                    </View>
                    <View style={[
                      styles.historyStatus,
                      { backgroundColor: record.status === 'on_duty' ? Colors.success : Colors.danger }
                    ]}>
                      <Text style={styles.historyStatusText}>
                        {record.status?.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </Animatable.View>
              ))
            ) : (
              <View style={styles.noDataContainer}>
                <FontAwesome5 name="calendar-times" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.noDataText}>No attendance records found</Text>
              </View>
            )}
          </Animatable.View>

          {/* Student List */}
          <Animatable.View animation="fadeInUp" duration={600} delay={800} style={styles.historySection}>
            <Text style={styles.historyTitle}>My Students</Text>
            {students.length > 0 ? (
              students.map((student, index) => (
                <Animatable.View 
                  key={student.user_id || index}
                  animation="fadeInUp" 
                  duration={400} 
                  delay={900 + (index * 50)}
                  style={styles.studentItem}
                >
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentStatus}>Attendance: Pending</Text>
                </Animatable.View>
              ))
            ) : (
              <View style={styles.noDataContainer}>
                <FontAwesome5 name="user-graduate" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.noDataText}>No students assigned to your branch.</Text>
              </View>
            )}
          </Animatable.View>

        </ScrollView>
      </Animatable.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  animatedContainer: { flex: 1 },
  header: { 
    padding: 20, 
    paddingTop: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Duty Status Card
  dutyCard: {
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dutyGradient: {
    borderRadius: 20,
    padding: 20,
  },
  dutyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dutyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dutyTextContainer: {
    marginLeft: 15,
  },
  dutyStatus: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  dutySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  dutyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dutyButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },

  // History Section
  historySection: {
    marginBottom: 100,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 15,
  },
  historyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  historyDate: {
    marginBottom: 8,
  },
  historyDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTimeRow: {
    flex: 1,
  },
  historyTime: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  historyHours: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.white,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    marginTop: 15,
  },
  studentItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  studentStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
});

export default AttendanceScreen;
