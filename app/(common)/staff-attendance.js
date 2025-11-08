import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert, Image, Modal, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MonthlyStaffAttendance from './monthly-staff-attendance';
import { API_URL } from '../../config';

export default function StaffAttendanceScreen() {
  const { branch, branch_id } = useLocalSearchParams();
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState(['All']);
  const [selectedBranchId, setSelectedBranchId] = useState(branch_id);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showTeacherDetail, setShowTeacherDetail] = useState(false);
  const [teacherAttendanceHistory, setTeacherAttendanceHistory] = useState([]);

  const fetchBranches = useCallback(async () => {
    if (branch_id) return;
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        setBranches(['All', ...result.data]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, [branch_id]);

  const fetchStaffAttendance = useCallback(async (currentDate, currentBranchId) => {
    setLoading(true);
    try {
      const formattedDate = currentDate.toISOString().split('T')[0];
      let url = `/api/attendance/get_staff_attendance.php?date=${formattedDate}`;
      if (currentBranchId && currentBranchId !== 'All') {
        url += `&branch_id=${currentBranchId}`;
      }
      // Filter to show only Teacher roles
      url += `&roles=Teacher`;
      
      console.log('🔍 Fetching teacher attendance from:', url);
      const response = await authFetch(url);
      const result = await response.json();
      console.log('📊 Teacher attendance response:', result);
      
      if (result.success) {
        const teacherData = result.data || [];
        console.log('✅ Teacher data received:', teacherData.length, 'teachers');
        setStaff(teacherData);
      } else {
        console.warn('⚠️ API returned error:', result.message);
        setStaff([]);
      }
    } catch (error) {
      console.error('❌ Error fetching teacher attendance:', error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeacherAttendanceHistory = useCallback(async (teacherId, startDate, endDate) => {
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const url = `/api/attendance/get_teacher_attendance.php?user_id=${teacherId}&start_date=${startDateStr}&end_date=${endDateStr}`;
      console.log('🔍 Fetching teacher attendance history from:', url);
      
      const response = await authFetch(url);
      const result = await response.json();
      console.log('📊 Teacher attendance history response:', result);
      
      if (result.success) {
        setTeacherAttendanceHistory(result.data.attendance_records || []);
      } else {
        console.warn('⚠️ Failed to fetch teacher attendance history:', result.message);
        setTeacherAttendanceHistory([]);
      }
    } catch (error) {
      console.error('❌ Error fetching teacher attendance history:', error);
      setTeacherAttendanceHistory([]);
    }
  }, []);

  const handleTeacherClick = (teacher) => {
    setSelectedTeacher(teacher);
    setShowTeacherDetail(true);
    
    // Fetch last 30 days of attendance history
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    fetchTeacherAttendanceHistory(teacher.id, startDate, endDate);
  };

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
    fetchStaffAttendance(date, selectedBranchId);
  }, [date, selectedBranchId, fetchStaffAttendance]);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const toggleAttendance = async (id, currentStatus) => {
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    try {
      const response = await authFetch('/api/attendance/mark_staff_attendance.php', {
        method: 'POST',
        body: JSON.stringify({
          staff_id: id,
          status: newStatus,
          date: date.toISOString().split('T')[0]
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchStaffAttendance(date, selectedBranchId); // Refresh the list
        Alert.alert('Success', `Attendance for staff member updated to ${newStatus}.`);
      } else {
        Alert.alert('Error', result.message || 'Failed to update attendance.');
      }
    } catch (error) {
      console.error('Update staff attendance error:', error);
      Alert.alert('Error', 'An error occurred while updating attendance.');
    }
  };

  const renderStaffItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={600} delay={index * 100}>
      <TouchableOpacity onPress={() => handleTeacherClick(item)} activeOpacity={0.8}>
        <LinearGradient
          colors={item.status === 'present' ? Colors.gradient3 : Colors.gradientDanger}
          style={styles.staffCard}
        >
          <View style={styles.staffInfo}>
            <Image source={item.avatar ? { uri: `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')} style={styles.avatar} />
            <View style={styles.staffDetails}>
              <Text style={styles.staffName}>{item.name}</Text>
              <Text style={styles.staffId}>{item.staffId || item.id} - {item.branch_name || 'N/A'}</Text>
              <View style={styles.roleContainer}>
                <MaterialCommunityIcons 
                  name="account-tie" 
                  size={16} 
                  color="#4CAF50" 
                />
                <Text style={[styles.roleText, { color: '#4CAF50' }]}>
                  {item.role || 'Teacher'}
                </Text>
              </View>
              <View style={styles.tagContainer}>
                <MaterialCommunityIcons name="eye" size={14} color={Colors.lightText} />
                <Text style={styles.attendanceType}>Tap to view details</Text>
              </View>
            </View>
          </View>
          <View style={styles.attendanceDetails}>
            <View style={styles.timeEntry}>
              <Text style={styles.timeLabel}>In: {item.check_in_time || item.clock_in_time || '--:--'}</Text>
            </View>
            <View style={styles.timeEntry}>
              <Text style={styles.timeLabel}>Out: {item.check_out_time || item.clock_out_time || '--:--'}</Text>
            </View>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons 
                name={item.status === 'present' ? 'check-circle' : 'close-circle'} 
                size={16} 
                color={Colors.lightText} 
              />
              <Text style={styles.statusText}>{item.status || 'Absent'}</Text>
            </View>
          </View>
          <View style={styles.clickIndicator}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.lightText} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const Header = () => (
    <Animatable.View animation="fadeInDown" duration={800}>
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <LottieView source={require('../../assets/lottie/staff.json')} autoPlay loop style={styles.lottie} />
        <Text style={styles.title}>Teacher Attendance</Text>
        <Text style={styles.subtitle}>{branch ? `Branch: ${branch}` : 'All Branches'}</Text>
        <Text style={styles.roleFilter}>Showing: Teacher Roles Only</Text>
      </LinearGradient>
      <View style={styles.filtersContainer}>
        {!branch_id && (
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedBranchId} onValueChange={(itemValue) => setSelectedBranchId(itemValue)} style={styles.picker} itemStyle={styles.pickerItem}>
              {branches.map(b => <Picker.Item key={b.id || 'All'} label={b.name || 'All'} value={b.id || 'All'} />)}
            </Picker>
          </View>
        )}
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
          <MaterialCommunityIcons name="calendar" size={22} color={Colors.primary} />
          <Text style={styles.datePickerText}>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
      </View>
      {showDatePicker && <DateTimePicker value={date} mode='date' display='default' onChange={onDateChange} />}
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {viewMode === 'daily' ? (
        <FlatList
          data={staff}
          renderItem={renderStaffItem}
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
          ListFooterComponent={() => staff.length > 0 && (
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
        <MonthlyStaffAttendance 
          staff={staff}
          date={date}
          onBack={() => setViewMode('daily')}
        />
      )}

      {/* Teacher Detail Modal */}
      <Modal
        visible={showTeacherDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTeacherDetail(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowTeacherDetail(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedTeacher?.name} - Attendance History
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Teacher Info */}
            <View style={styles.teacherInfoCard}>
              <Image 
                source={selectedTeacher?.avatar ? { uri: `${API_URL}${selectedTeacher.avatar}` } : require('../../assets/Avartar.png')} 
                style={styles.teacherAvatar} 
              />
              <View style={styles.teacherInfo}>
                <Text style={styles.teacherName}>{selectedTeacher?.name}</Text>
                <Text style={styles.teacherRole}>Teacher</Text>
                <Text style={styles.teacherBranch}>{selectedTeacher?.branch_name || 'N/A'}</Text>
              </View>
            </View>

            {/* Attendance Table */}
            <View style={styles.attendanceTable}>
              <Text style={styles.tableTitle}>Last 30 Days Attendance</Text>
              
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Date</Text>
                <Text style={styles.headerCell}>Status</Text>
                <Text style={styles.headerCell}>Clock In</Text>
                <Text style={styles.headerCell}>Clock Out</Text>
                <Text style={styles.headerCell}>Hours</Text>
              </View>

              {teacherAttendanceHistory.length > 0 ? (
                teacherAttendanceHistory.map((record, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{new Date(record.date).toLocaleDateString()}</Text>
                    <View style={styles.statusCell}>
                      <MaterialCommunityIcons 
                        name={record.clock_in_time ? 'check-circle' : 'close-circle'} 
                        size={16} 
                        color={record.clock_in_time ? '#4CAF50' : '#F44336'} 
                      />
                      <Text style={[styles.tableCell, { color: record.clock_in_time ? '#4CAF50' : '#F44336' }]}>
                        {record.clock_in_time ? 'Present' : 'Absent'}
                      </Text>
                    </View>
                    <Text style={styles.tableCell}>{record.clock_in_formatted || '--:--'}</Text>
                    <Text style={styles.tableCell}>{record.clock_out_formatted || '--:--'}</Text>
                    <Text style={styles.tableCell}>{record.total_hours ? `${record.total_hours}h` : '--'}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyTable}>
                  <MaterialCommunityIcons name="calendar-blank" size={48} color={Colors.gray} />
                  <Text style={styles.emptyTableText}>No attendance records found</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  header: { paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  lottie: { width: 130, height: 130, marginBottom: -15 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.lightText, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.lightText, opacity: 0.9, marginTop: 4 },
  roleFilter: { fontSize: 14, color: Colors.lightText, opacity: 0.8, marginTop: 2, fontStyle: 'italic' },
  filtersContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 5 },
  pickerContainer: { flex: 1, backgroundColor: Colors.card, borderRadius: 15, marginRight: 10, ...Platform.select({ ios: { padding: 10, shadowColor: Colors.shadow, shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }) },
  picker: { height: 50, width: '100%' },
  pickerItem: { fontSize: 16 },
  datePickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card, borderRadius: 15, paddingVertical: 15, ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }) },
  datePickerText: { marginLeft: 10, fontSize: 16, color: Colors.primary, fontWeight: '600' },
  staffCard: { borderRadius: 15, padding: 15, marginBottom: 15, flexDirection: 'row', alignItems: 'center', shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  staffInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: Colors.lightText },
  staffDetails: { marginLeft: 12, flex: 1 },
  staffName: { fontSize: 17, fontWeight: 'bold', color: Colors.lightText },
  staffId: { fontSize: 14, color: Colors.lightText, opacity: 0.9 },
  roleContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginTop: 4, alignSelf: 'flex-start' },
  roleText: { fontSize: 13, fontWeight: 'bold', marginLeft: 6, textTransform: 'uppercase' },
  tagContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginTop: 5, alignSelf: 'flex-start' },
  attendanceType: { fontSize: 12, color: Colors.lightText, marginLeft: 5 },
  attendanceDetails: { alignItems: 'flex-end', marginLeft: 10, flex: 1 },
  timeEntry: { alignItems: 'flex-end', marginBottom: 5 },
  timeLabel: { fontSize: 13, color: Colors.lightText, fontWeight: '600' },
  reportContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 8, 
    padding: 8, 
    marginTop: 5,
    maxWidth: 200,
  },
  reportText: { 
    fontSize: 11, 
    color: Colors.lightText, 
    marginLeft: 5,
    flex: 1,
  },
  statusToggle: { position: 'absolute', top: 10, right: 10 },
  viewToggleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 15, marginTop: 10, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  viewToggleButtonText: { color: Colors.lightText, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  lottieEmpty: { width: 250, height: 250 },
  emptyText: { fontSize: 18, color: Colors.lightText, marginTop: -20, fontWeight: '600' },
  
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: { padding: 5 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, flex: 1, textAlign: 'center' },
  placeholder: { width: 34 },
  modalContent: { flex: 1, padding: 20 },
  
  // Teacher info card
  teacherInfoCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.card, 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teacherAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  teacherRole: { fontSize: 16, color: Colors.primary, marginBottom: 2 },
  teacherBranch: { fontSize: 14, color: Colors.gray },
  
  // Attendance table
  attendanceTable: { backgroundColor: Colors.card, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: Colors.border },
  tableTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 15, textAlign: 'center' },
  tableHeader: { flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 8, marginBottom: 8 },
  headerCell: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.white, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableCell: { flex: 1, fontSize: 12, color: Colors.text, textAlign: 'center' },
  statusCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  emptyTable: { alignItems: 'center', paddingVertical: 40 },
  emptyTableText: { fontSize: 16, color: Colors.gray, marginTop: 10 },
  
  // Updated styles for clickable cards
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 8, 
    padding: 6, 
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 12, color: Colors.lightText, marginLeft: 4, fontWeight: '600' },
  clickIndicator: { position: 'absolute', top: 15, right: 15 },
});
