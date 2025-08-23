import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, Image, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import MonthlyAttendance from './monthly-attendance';

// Mock Data
const studentsData = [
  { id: '1', studentId: 'S001', name: 'John Doe', branch: 'Main Campus', status: 'present', inTime: '09:00 AM', outTime: '04:00 PM', inBy: 'Father', outBy: 'Mother', type: 'Manual' },
  { id: '2', studentId: 'S002', name: 'Mary Williams', branch: 'North Campus', status: 'absent', inTime: null, outTime: null, inBy: null, outBy: null, type: null },
  { id: '3', studentId: 'S003', name: 'Alex Johnson', branch: 'Main Campus', status: 'present', inTime: '09:05 AM', outTime: '04:00 PM', inBy: 'Guardian', outBy: 'Guardian', type: 'QR Code' },
  { id: '4', studentId: 'S004', name: 'Patricia Brown', branch: 'East Campus', status: 'present', inTime: '08:55 AM', outTime: '03:50 PM', inBy: 'Father', outBy: 'Father', type: 'Manual' },
];

const branches = ['All', 'Main Campus', 'North Campus', 'East Campus'];

export default function AttendanceScreen() {
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [students, setStudents] = useState(studentsData);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('daily');

    const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(false);
    setDate(currentDate);
  };

  const toggleAttendance = (id) => {
    setStudents(students.map(student =>
      student.id === id ? { ...student, status: student.status === 'present' ? 'absent' : 'present' } : student
    ));
  };

  const renderStudentItem = ({ item }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <View style={styles.avatarContainer}>
          <Image source={require('../../assets/Avartar.png')} style={styles.avatar} />
          <TouchableOpacity onPress={() => toggleAttendance(item.id)} style={[styles.statusIconOverlay, item.status === 'present' ? styles.presentOverlay : styles.absentOverlay]}>
            <Ionicons name={item.status === 'present' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <View>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentId}>{item.studentId} - {item.branch}</Text>
          <Text style={styles.attendanceType}>Type: {item.type || 'N/A'}</Text>
        </View>
      </View>
      <View style={styles.attendanceControls}>
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
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Daily Attendance</Text>
        <View style={styles.filtersContainer}>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedBranch} onValueChange={(itemValue) => setSelectedBranch(itemValue)} style={styles.picker}>
              {branches.map(b => <Picker.Item key={b} label={b} value={b} />)}
            </Picker>
          </View>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
            <Ionicons name="calendar" size={20} color="#333" />
            <Text style={styles.datePickerText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={date}
              mode={'date'}
              display="default"
              onChange={onDateChange}
            />
          )}
        </View>
        {viewMode === 'daily' ? (
          <>
            <FlatList
              data={students.filter(s => selectedBranch === 'All' || s.branch === selectedBranch)}
              renderItem={renderStudentItem}
              keyExtractor={(item) => item.id}
            />
            <TouchableOpacity style={styles.viewToggleButton} onPress={() => setViewMode('monthly')}>
              <Text style={styles.viewToggleButtonText}>View Monthly Report</Text>
            </TouchableOpacity>
          </>
        ) : (
          <MonthlyAttendance 
            students={students.filter(s => selectedBranch === 'All' || s.branch === selectedBranch)}
            date={date}
            onBack={() => setViewMode('daily')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f7fc' },
  container: { flex: 1, padding: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  filtersContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  pickerContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 10, marginHorizontal: 5 },
  picker: { height: 50 },
  datePickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 10, marginHorizontal: 5, paddingVertical: 10 },
  datePickerText: { marginLeft: 10, fontSize: 16, color: '#333' },
  studentCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 10, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#000' },
  studentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarContainer: { marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  studentName: { fontSize: 16, fontWeight: 'bold' },
  studentId: { fontSize: 14, color: '#666' },
  attendanceType: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  attendanceControls: { alignItems: 'flex-end' },
  timeEntry: { alignItems: 'flex-end', marginBottom: 5 },
  timeLabel: { fontSize: 13, color: '#555' },
  byLabel: { fontSize: 11, color: '#777' },
  statusIconOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presentOverlay: { backgroundColor: 'rgba(40, 167, 69, 0.6)' },
  absentOverlay: { backgroundColor: 'rgba(220, 53, 69, 0.6)' },
    viewToggleButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  viewToggleButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

