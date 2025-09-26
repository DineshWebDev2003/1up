import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
const LottieView = require('lottie-react-native').default;
console.log('LottieView component:', LottieView);
import Colors from '../constants/colors';
import authFetch, { API_URL } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MonthlyAttendance from './monthly-attendance';
import { Camera } from 'expo-camera';

export default function AttendanceScreen() {
  const { branch, branch_id } = useLocalSearchParams();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState(['All']);
  const [selectedBranchId, setSelectedBranchId] = useState(branch_id);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState('manual'); // 'manual' or 'qr'
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [cameraType, setCameraType] = useState('back');

  const fetchBranches = useCallback(async () => {
    if (branch_id) return; // Don't fetch all branches if a specific one is passed
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        setBranches(['All', ...result.data]);
      } else {
        console.error('Failed to fetch branches');
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, [branch_id]);

    const fetchAttendance = useCallback(async (currentDate, currentBranchId) => {
    setLoading(true);
    try {
      const formattedDate = currentDate.toISOString().split('T')[0];
      
      // 1. Fetch all students for the branch
      let studentsUrl = '/api/students/get_students.php';
      if (currentBranchId && currentBranchId !== 'All') {
        studentsUrl += `?branch_id=${currentBranchId}`;
      }
      const studentsResponse = await authFetch(studentsUrl);
      const studentsResult = await studentsResponse.json();

      if (!studentsResult.success) {
        throw new Error('Failed to fetch students');
      }
      const allStudents = studentsResult.data || [];

      // 2. Fetch attendance data for the specific date
      let attendanceUrl = `/api/attendance/get_attendance.php?date=${formattedDate}`;
      if (currentBranchId && currentBranchId !== 'All') {
        attendanceUrl += `&branch_id=${currentBranchId}`;
      }
      const attendanceResponse = await authFetch(attendanceUrl);
      const attendanceResult = await attendanceResponse.json();
      const attendanceData = attendanceResult.success ? attendanceResult.data : [];

      // 3. Merge the two lists
      const attendanceMap = new Map(attendanceData.map(att => [att.id, att]));
      
      const mergedStudents = allStudents.map(student => {
        const attendanceRecord = attendanceMap.get(student.id);
        return {
          ...student,
          status: attendanceRecord ? attendanceRecord.status : 'unmarked', // Default to 'unmarked'
          inTime: attendanceRecord ? attendanceRecord.inTime : null,
          outTime: attendanceRecord ? attendanceRecord.outTime : null,
          inBy: attendanceRecord ? attendanceRecord.inBy : null,
          outBy: attendanceRecord ? attendanceRecord.outBy : null,
          type: attendanceRecord ? attendanceRecord.type : 'Manual',
        };
      });

      setStudents(mergedStudents);

    } catch (error) {
      console.error('Error fetching attendance:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchAttendance(date, selectedBranchId);
  }, [date, selectedBranchId, fetchAttendance]);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleMarkAttendance = async (studentId, status) => {
    try {
      const response = await authFetch('/api/attendance/mark_manual_attendance.php', {
        method: 'POST',
        body: JSON.stringify({ 
          student_id: studentId, 
          status: status, 
          date: date.toISOString().split('T')[0]
        }),
      });
      const result = await response.json();

      if (result.success) {
        // Optimistically update the UI
        setStudents(students.map(student =>
          student.id === studentId ? { ...student, status: status } : student
        ));
        Alert.alert('Success', `Student marked as ${status}.`);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark attendance.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred.');
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const studentId = parseInt(data, 10); // Assuming QR code contains the user_id
      if (isNaN(studentId)) {
        Alert.alert('Invalid QR Code', 'This QR code does not contain a valid student ID.');
        return;
      }
      handleMarkAttendance(studentId, 'present');
      // Allow scanning another code after a short delay
      setTimeout(() => setScanned(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Could not process the QR code.');
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const renderStudentItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={600} delay={index * 100}>
      <LinearGradient
        colors={
          item.status === 'present' ? Colors.gradientSuccess :
          item.status === 'absent' ? Colors.gradientDanger :
          Colors.gradientNeutral
        }
        style={styles.studentCard}
      >
                <View style={{flexDirection: 'row', flex: 1}}>
          <View style={styles.studentInfo}>
            <Image source={item.avatar ? { uri: `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')} style={styles.avatar} />
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentId}>{item.studentId} - {item.branch}</Text>
              <View style={styles.tagContainer}>
                <MaterialCommunityIcons name={item.type === 'QR Code' ? 'qrcode-scan' : 'account-edit-outline'} size={14} color={Colors.lightText} />
                <Text style={styles.attendanceType}>{item.type || 'N/A'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.attendanceDetails}>
            <View style={styles.timeEntry}>
              <Text style={styles.timeLabel}>In: {item.inTime || '--:--'}</Text>
              <Text style={styles.byLabel}>(by {item.inBy || 'N/A'})</Text>
            </View>
            <View style={styles.timeEntry}>
              <Text style={styles.timeLabel}>Out: {item.outTime || '--:--'}</Text>
              <Text style={styles.byLabel}>(by {item.outBy || 'N/A'})</Text>
            </View>
          </View>
        </View>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.inButton, item.status === 'present' && styles.activeButton]}
            onPress={() => handleMarkAttendance(item.id, 'present')}
          >
            <Text style={styles.actionButtonText}>In</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.outButton, item.status === 'absent' && styles.activeButton]}
            onPress={() => handleMarkAttendance(item.id, 'absent')}
          >
            <Text style={styles.actionButtonText}>Out</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  const Header = () => (
    <Animatable.View animation="fadeInDown" duration={800}>
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <LottieView source={require('../../assets/lottie/attendance.json')} autoPlay loop style={styles.lottie} />
        <Text style={styles.title}>Student Attendance</Text>
        <Text style={styles.subtitle}>{branch ? `Branch: ${branch}` : 'All Branches'}</Text>
      </LinearGradient>
      <View style={styles.filtersContainer}>
        {!branch_id && (
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedBranchId} onValueChange={(itemValue) => setSelectedBranchId(itemValue)} style={styles.picker} itemStyle={styles.pickerItem}>
              {Array.isArray(branches) && branches.map(b => <Picker.Item key={b.id || 'All'} label={b.name || 'All'} value={b.id || 'All'} />)}
            </Picker>
          </View>
        )}
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
          <MaterialCommunityIcons name="calendar" size={22} color={Colors.primary} />
          <Text style={styles.datePickerText}>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
      </View>
      {showDatePicker && <DateTimePicker value={date} mode='date' display='default' onChange={onDateChange} />}
      <View style={styles.modeSelectorContainer}>
        <TouchableOpacity 
          style={[styles.modeButton, attendanceMode === 'manual' && styles.activeModeButton]}
          onPress={() => setAttendanceMode('manual')}
        >
          <MaterialCommunityIcons name="format-list-bulleted" size={20} color={attendanceMode === 'manual' ? Colors.white : Colors.primary} />
          <Text style={[styles.modeButtonText, attendanceMode === 'manual' && styles.activeModeButtonText]}>Manual Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, attendanceMode === 'qr' && styles.activeModeButton]}
          onPress={() => setAttendanceMode('qr')}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={20} color={attendanceMode === 'qr' ? Colors.white : Colors.primary} />
          <Text style={[styles.modeButtonText, attendanceMode === 'qr' && styles.activeModeButtonText]}>Scan QR</Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );

  if (attendanceMode === 'qr') {
    if (hasPermission === null) {
      return <View style={styles.centered}><Text>Requesting for camera permission...</Text></View>;
    }
    if (hasPermission === false) {
      return <View style={styles.centered}><Text>No access to camera. Please enable it in settings.</Text></View>;
    }
    return (
      <SafeAreaView style={styles.safeArea}>
                <Camera
          type={cameraType}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.qrHeader}>
          <Text style={styles.qrTitle}>Scan Student QR Code</Text>
        </View>
        {scanned && 
          <Animatable.View animation="bounceIn" style={styles.scannedOverlay}>
            <LottieView source={require('../../assets/lottie/success.json')} autoPlay loop={false} style={styles.lottieSuccess} />
            <Text style={styles.scannedText}>Attendance Marked!</Text>
          </Animatable.View>
        }
        <TouchableOpacity style={styles.switchModeFooter} onPress={() => setAttendanceMode('manual')}>
          <Text style={styles.switchModeFooterText}>Switch to Manual Entry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {viewMode === 'daily' ? (
        <FlatList
          data={students}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              {loading ? (
                <LottieView source={require('../../assets/lottie/loading.json')} autoPlay loop style={styles.lottieEmpty} />
              ) : (
                <LottieView source={require('../../assets/lottie/empty.json')} autoPlay loop style={styles.lottieEmpty} />
              )}
              <Text style={styles.emptyText}>{loading ? 'Fetching attendance...' : 'No attendance data found.'}</Text>
            </View>
          )}
          ListFooterComponent={() => students.length > 0 && (
            <Animatable.View animation="fadeInUp" duration={800} delay={200}>
              <TouchableOpacity onPress={() => setViewMode('monthly')}>
                <LinearGradient colors={Colors.gradient4} style={styles.viewToggleButton}>
                  <MaterialCommunityIcons name="chart-bar" size={22} color={Colors.lightText} />
                  <Text style={styles.viewToggleButtonText}>View Monthly Report</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>
          )}
        />
      ) : (
        <MonthlyAttendance 
          students={students}
          date={date}
          onBack={() => setViewMode('daily')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  header: { paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  lottie: { width: 300, height: 130, marginBottom: -15 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.lightText, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.lightText, opacity: 0.9, marginTop: 4 },
  filtersContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 5 },
  pickerContainer: { flex: 1, backgroundColor: Colors.card, borderRadius: 15, marginRight: 10, ...Platform.select({ ios: { padding: 10, shadowColor: Colors.shadow, shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }) },
  picker: { height: 50, width: '100%' },
  pickerItem: { fontSize: 16 },
  datePickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card, borderRadius: 15, paddingVertical: 15, ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }) },
  datePickerText: { marginLeft: 10, fontSize: 16, color: Colors.primary, fontWeight: '600' },
  studentCard: { borderRadius: 15, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
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
  statusToggle: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: 2 },
  actionButtonsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 5,
    right: 5,
  },
  actionButton: {
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
  },
  viewToggleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 15, marginTop: 10, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  viewToggleButtonText: { color: Colors.lightText, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  modeSelectorContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingBottom: 10, justifyContent: 'center', backgroundColor: Colors.background },
  modeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginHorizontal: 5, borderWidth: 1, borderColor: Colors.primary },
  activeModeButton: { backgroundColor: Colors.primary },
  modeButtonText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: Colors.primary },
  activeModeButtonText: { color: Colors.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  qrHeader: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15 },
  qrTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  scannedOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  lottieSuccess: { width: 150, height: 150 },
  scannedText: { fontSize: 22, color: 'white', fontWeight: 'bold', marginTop: 10 },
  switchModeFooter: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: Colors.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
  switchModeFooterText: { fontSize: 16, color: 'white', fontWeight: 'bold' },
});
