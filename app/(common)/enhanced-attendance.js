import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert, Image, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MonthlyAttendance from './monthly-attendance';

export default function EnhancedAttendanceScreen() {
  const { branch, branch_id } = useLocalSearchParams();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState(['All']);
  const [selectedBranchId, setSelectedBranchId] = useState(branch_id);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  const fetchBranches = useCallback(async () => {
    if (branch_id) return;
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
      const attendanceMap = new Map();
      attendanceData.forEach(att => {
        if (!att) return;
        if (att.id != null) attendanceMap.set(att.id, att);
        if (att.student_id != null) attendanceMap.set(att.student_id, att);
      });
      
      const mergedStudents = allStudents.map(student => {
        const key = student.student_id || student.id;
        const attendanceRecord = attendanceMap.get(key);
        return {
          ...student,
          status: attendanceRecord ? attendanceRecord.status : 'unmarked',
          inTime: attendanceRecord ? (attendanceRecord.check_in_time ? attendanceRecord.check_in_time.slice(0, 5) : null) : null,
          outTime: attendanceRecord ? (attendanceRecord.check_out_time ? attendanceRecord.check_out_time.slice(0, 5) : null) : null,
          inBy: attendanceRecord ? `${attendanceRecord.marked_by_name} (${attendanceRecord.marked_by_role})` : null,
          outBy: attendanceRecord ? `${attendanceRecord.marked_by_name} (${attendanceRecord.marked_by_role})` : null,
          type: attendanceRecord ? (attendanceRecord.guardian_type || 'Manual') : 'Manual',
        };
      });

      setStudents(mergedStudents);
      setFilteredStudents(mergedStudents);

    } catch (error) {
      console.error('Error fetching attendance:', error);
      setStudents([]);
      setFilteredStudents([]);
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

  // Load current user for marked_by metadata
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

  // Filter students based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student => 
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_id?.toString().includes(searchQuery) ||
        student.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleMarkAttendanceDirect = async (studentId, status) => {
    try {
      const response = await authFetch('/api/attendance/mark_manual_attendance.php', {
        method: 'POST',
        body: JSON.stringify({ 
          student_id: studentId, 
          status: status, 
          date: date.toISOString().split('T')[0],
          marked_by_name: currentUser?.name || currentUser?.username || 'Staff',
          marked_by_role: currentUser?.role || 'Staff'
        }),
      });
      const result = await response.json();

      if (result.success) {
        const currentTime = new Date().toLocaleTimeString().slice(0, 5);
        setStudents(students.map(student =>
          student.id === studentId ? { 
            ...student, 
            status: status,
            inTime: status === 'present' ? currentTime : student.inTime,
            outTime: status === 'absent' ? currentTime : student.outTime,
            type: 'Manual'
          } : student
        ));
        
        // Update filtered students too
        setFilteredStudents(prev => prev.map(student =>
          student.id === studentId ? { 
            ...student, 
            status: status,
            inTime: status === 'present' ? currentTime : student.inTime,
            outTime: status === 'absent' ? currentTime : student.outTime,
            type: 'Manual'
          } : student
        ));
        
        Alert.alert('Success', `Student marked as ${status}.`);
        fetchAttendance(date, selectedBranchId);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark attendance.');
        fetchAttendance(date, selectedBranchId);
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      Alert.alert('Error', 'An error occurred while marking attendance.');
      fetchAttendance(date, selectedBranchId);
    }
  };

  const handleMarkAttendanceWithGuardian = (studentId, status) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      setAttendanceStatus(status);
      setShowGuardianModal(true);
    }
  };

  const handleGuardianSelection = async (guardianType, guardianName) => {
    try {
      const response = await authFetch('/api/attendance/mark_manual_attendance.php', {
        method: 'POST',
        body: JSON.stringify({ 
          student_id: selectedStudent.id, 
          status: attendanceStatus, 
          date: date.toISOString().split('T')[0],
          marked_by: guardianName,
          guardian_type: guardianType,
          marked_by_name: currentUser?.name || currentUser?.username || 'Staff',
          marked_by_role: currentUser?.role || 'Staff'
        }),
      });
      const result = await response.json();

      if (result.success) {
        setStudents(students.map(student =>
          student.id === selectedStudent.id ? { ...student, status: attendanceStatus } : student
        ));
        setFilteredStudents(prev => prev.map(student =>
          student.id === selectedStudent.id ? { ...student, status: attendanceStatus } : student
        ));
        Alert.alert('Success', `${selectedStudent.name} marked as ${attendanceStatus} by ${guardianName}.`);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark attendance.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred.');
    } finally {
      setShowGuardianModal(false);
      setSelectedStudent(null);
    }
  };

  const renderStudentItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={600} delay={index * 100}>
      <LinearGradient
        colors={
          item.status === 'present' ? Colors.gradientSuccess :
          item.status === 'absent' ? Colors.gradientDanger :
          Colors.gradientOrange
        }
        style={styles.studentCard}
      >
        <View style={{flexDirection: 'row', flex: 1}}>
          <View style={styles.studentInfo}>
            <Image source={
              item.avatar_url ? { uri: item.avatar_url } :
              (item.avatar ? { uri: `${API_URL}${item.avatar}` } :
              (item.profile_image ? { uri: `${API_URL}${item.profile_image}` } : require('../../assets/Avartar.png')))
            } style={styles.avatar} />
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{item.name || item.username || item.student_id}</Text>
              <Text style={styles.studentId}>{(item.student_id || item.id)} - {(item.branch_name || item.branch || '')}</Text>
              <View style={styles.tagContainer}>
                <MaterialCommunityIcons name="account-edit-outline" size={14} color={Colors.lightText} />
                <Text style={styles.attendanceType}>{item.type || 'Manual'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.attendanceDetails}>
            <View style={styles.timeEntry}>
              <Text style={styles.timeLabel}>In: {item.inTime || '--:--'}</Text>
            </View>
            <View style={styles.timeEntry}>
              <Text style={styles.timeLabel}>Out: {item.outTime || '--:--'}</Text>
            </View>
            <Text style={styles.summaryText}>
              {(() => {
                const rel = item.type || 'Manual';
                const by = item.inBy || item.outBy || 'N/A';
                const parts = [];
                if (item.inTime) parts.push(`In ${item.inTime}`);
                if (item.outTime) parts.push(`Out ${item.outTime}`);
                parts.push(`by ${rel}${by && by !== 'N/A' ? ` (${by})` : ''}`);
                return parts.join(' • ');
              })()}
            </Text>
          </View>
        </View>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.inButton, item.status === 'present' && styles.activeButton]}
            onPress={() => handleMarkAttendanceWithGuardian(item.id, 'present')}
          >
            <Text style={styles.actionButtonText}>In</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.outButton, item.status === 'absent' && styles.activeButton]}
            onPress={() => handleMarkAttendanceWithGuardian(item.id, 'absent')}
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
        <Text style={styles.title}>Enhanced Attendance</Text>
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
            <MaterialCommunityIcons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Stats */}
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
      {viewMode === 'daily' ? (
        <FlatList
          data={filteredStudents}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} />
              ) : (
                <MaterialCommunityIcons name="account-group-outline" size={60} color={Colors.textSecondary} />
              )}
              <Text style={styles.emptyText}>
                {loading ? 'Fetching attendance...' : 
                 searchQuery ? 'No students found matching your search.' : 
                 'No attendance data found.'}
              </Text>
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

      {/* Guardian Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showGuardianModal}
        onRequestClose={() => setShowGuardianModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={500} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Who is with {selectedStudent?.name}?</Text>
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
                <View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  header: { paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.lightText, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.lightText, opacity: 0.9, marginTop: 4 },
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
  summaryText: { fontSize: 11, color: Colors.lightText, opacity: 0.8, textAlign: 'right' },
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
    color: Colors.darkText,
    textAlign: 'center',
    marginBottom: 20,
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
  guardianButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    flex: 1,
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
});
