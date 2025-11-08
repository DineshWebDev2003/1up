import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert, Image, ActivityIndicator, Modal, TextInput, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const fetchStudents = useCallback(async (currentBranchId) => {
    setLoading(true);
    try {
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

      let studentsWithAttendance = allStudents.map(student => ({
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
            return {
              ...s,
              status: rec.status || s.status,
              inTime: rec.in_time || s.inTime,
              outTime: rec.out_time || s.outTime,
              inBy: rec.in_by || s.inBy,
              outBy: rec.out_by || s.outBy,
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
  }, [date]);

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

  const handleMarkAttendance = (studentId, status) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      setAttendanceStatus(status);
      setShowGuardianModal(true);
    }
  };

  const handleGuardianSelection = async (guardianType, guardianName) => {
    try {
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const response = await authFetch('/api/attendance/mark_new_attendance.php', {
        method: 'POST',
        body: JSON.stringify({ 
          student_id: selectedStudent.id, 
          status: attendanceStatus, 
          date: date.toISOString().split('T')[0],
          guardian_type: guardianType,
          guardian_name: guardianName,
          marked_by_name: currentUser?.name || currentUser?.username || 'Staff',
          marked_by_role: currentUser?.role || 'Staff',
          marked_time: currentTime
        }),
      });
      const result = await response.json();

      if (result.success) {
        const updatedStudents = students.map(student =>
          student.id === selectedStudent.id ? { 
            ...student, 
            status: attendanceStatus,
            inTime: attendanceStatus === 'present' ? currentTime : student.inTime,
            outTime: attendanceStatus === 'absent' ? currentTime : student.outTime,
            inBy: attendanceStatus === 'present' ? `${guardianName} (${guardianType})` : student.inBy,
            outBy: attendanceStatus === 'absent' ? `${guardianName} (${guardianType})` : student.outBy,
            guardianType: guardianType,
            guardianName: guardianName,
          } : student
        );
        
        setStudents(updatedStudents);
        setFilteredStudents(updatedStudents);
        
        Alert.alert('Success', `${selectedStudent.name} marked as ${attendanceStatus} by ${guardianName}.`);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark attendance.');
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      Alert.alert('Error', 'An error occurred while marking attendance.');
    } finally {
      setShowGuardianModal(false);
      setSelectedStudent(null);
    }
  };

  const openDetail = (student) => {
    setDetailRecord(student);
    setShowDetailModal(true);
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
                  if (item.status === 'unmarked') {
                    handleMarkAttendance(item.id, 'present');
                  } else if (item.status === 'present' && !item.outTime) {
                    handleMarkAttendance(item.id, 'absent');
                  }
                }}
              >
                <View>
                  <Image
                    source={ item.avatar_url ? {uri:item.avatar_url} : (item.avatar ? {uri:`${API_URL}${item.avatar}`} : (item.profile_image ? {uri:`${API_URL}${item.profile_image}`} : require('../../assets/Avartar.png')) ) }
                    style={styles.avatar}
                  />
                  <View style={[styles.statusBadge,
                    item.status === 'present' ? styles.badgePresent :
                    item.status === 'absent' ? styles.badgeAbsent : styles.badgeUnmarked]}
                  >
                    <MaterialCommunityIcons
                      name={ item.status === 'present' ? 'check' : (item.status === 'absent' ? 'logout' : 'clock') }
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
                  <MaterialCommunityIcons name="account-edit-outline" size={14} color={Colors.lightText} />
                  <Text style={styles.attendanceType}>Manual</Text>
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
        <Text style={styles.title}>New Attendance</Text>
        <View style={styles.placeholder} />
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

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor={Colors.textSecondary}
          onSubmitEditing={() => Keyboard.dismiss()}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
            <MaterialCommunityIcons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

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
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContainer}
        ListFooterComponent={null}
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
                <Text style={styles.modalSubtitle}>{detailRecord.student_id || detailRecord.id}</Text>
                <View style={{marginTop:12}}>
                  <Text style={styles.byLabel}>In: {detailRecord.inTime || '--:--'} by {detailRecord.inBy || '--'}</Text>
                  <Text style={styles.byLabel}>Out: {detailRecord.outTime || '--:--'} by {detailRecord.outBy || '--'}</Text>
                  {detailRecord.father_name && <Text style={styles.byLabel}>Father: {detailRecord.father_name}</Text>}
                  {detailRecord.mother_name && <Text style={styles.byLabel}>Mother: {detailRecord.mother_name}</Text>}
                  {detailRecord.guardian_name && <Text style={styles.byLabel}>Guardian: {detailRecord.guardian_name}</Text>}
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
  placeholder: { width: 40 },
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
    color: Colors.darkText,
    textAlign: 'center',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
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
});
