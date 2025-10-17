import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  Platform, 
  Alert, 
  Image, 
  Modal,
  TextInput,
  ScrollView,
  RefreshControl
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { safeApiCall, safeSetState } from '../utils/crashPrevention';
import ErrorBoundary from '../components/ErrorBoundary';

export default function EnhancedStaffAttendanceScreen() {
  const { branch, branch_id } = useLocalSearchParams();
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [branches, setBranches] = useState(['All']);
  const [selectedBranchId, setSelectedBranchId] = useState(branch_id);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal states
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [timeAction, setTimeAction] = useState(''); // 'in' or 'out'
  const [customTime, setCustomTime] = useState(new Date());
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [notes, setNotes] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    onTime: 0
  });

  useEffect(() => {
    loadCurrentUser();
    loadBranches();
  }, []);

  useEffect(() => {
    fetchStaffAttendance(date, selectedBranchId);
  }, [date, selectedBranchId]);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadBranches = async () => {
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
  };

  const fetchStaffAttendance = useCallback(async (currentDate, currentBranchId) => {
    safeSetState(setLoading, true);
    
    const apiCall = async () => {
      const formattedDate = currentDate.toISOString().split('T')[0];
      let url = `/api/attendance/get_enhanced_staff_attendance.php?date=${formattedDate}`;
      if (currentBranchId && currentBranchId !== 'All') {
        url += `&branch_id=${currentBranchId}`;
      }
      
      console.log('🔍 Fetching staff attendance from:', url);
      const response = await authFetch(url);
      const result = await response.json();
      
      console.log('📊 Staff attendance response:', result);
      
      if (result.success) {
        const staffData = result.data || [];
        console.log('✅ Staff data received:', staffData.length, 'members');
        safeSetState(setStaff, staffData);
        calculateStats(staffData);
      } else {
        console.warn('⚠️ API returned error:', result.message);
        safeSetState(setStaff, []);
        calculateStats([]);
      }
    };

    try {
      await safeApiCall(apiCall, { success: false, data: [] });
    } catch (error) {
      console.error('❌ Error fetching staff attendance:', error);
      safeSetState(setStaff, []);
      calculateStats([]);
    } finally {
      safeSetState(setLoading, false);
    }
  }, []);

  const calculateStats = (staffData) => {
    const total = staffData.length;
    const present = staffData.filter(s => s.status === 'present').length;
    const absent = staffData.filter(s => s.status === 'absent').length;
    const late = staffData.filter(s => s.is_late).length;
    const onTime = present - late;

    setStats({ total, present, absent, late, onTime });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStaffAttendance(date, selectedBranchId).finally(() => {
      setRefreshing(false);
    });
  }, [date, selectedBranchId, fetchStaffAttendance]);

  const handleTimeAction = (staffMember, action) => {
    setSelectedStaff(staffMember);
    setTimeAction(action);
    setCustomTime(new Date());
    setNotes('');
    setShowTimeModal(true);
  };

  const submitTimeEntry = async () => {
    if (!selectedStaff || !timeAction) return;

    try {
      const timeString = customTime.toTimeString().split(' ')[0]; // HH:MM:SS format
      
      const response = await authFetch('/api/attendance/mark_staff_time.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          date: date.toISOString().split('T')[0],
          action: timeAction,
          time: timeString,
          notes: notes.trim(),
          marked_by: currentUser?.name || 'Admin'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', `${timeAction === 'in' ? 'Clock In' : 'Clock Out'} time recorded successfully`);
        setShowTimeModal(false);
        fetchStaffAttendance(date, selectedBranchId);
      } else {
        Alert.alert('Error', result.message || 'Failed to record time');
      }
    } catch (error) {
      console.error('Time entry error:', error);
      Alert.alert('Error', 'Failed to record time entry');
    }
  };

  const markQuickAttendance = async (staffId, status) => {
    try {
      const response = await authFetch('/api/attendance/mark_staff_attendance.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: staffId,
          status: status,
          date: date.toISOString().split('T')[0],
          marked_by: currentUser?.name || 'Admin'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', `Staff marked as ${status}`);
        fetchStaffAttendance(date, selectedBranchId);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Quick attendance error:', error);
      Alert.alert('Error', 'Failed to mark attendance');
    }
  };

  const getStatusColor = (status, isLate) => {
    if (status === 'absent') return Colors.gradientDanger;
    if (isLate) return Colors.gradientWarning;
    return Colors.gradientSuccess;
  };

  const getStatusIcon = (status, isLate) => {
    if (status === 'absent') return 'account-remove';
    if (isLate) return 'clock-alert';
    return 'account-check';
  };

  const renderStaffItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={600} delay={index * 50}>
      <LinearGradient
        colors={getStatusColor(item.status, item.is_late)}
        style={styles.staffCard}
      >
        <View style={styles.staffHeader}>
          <View style={styles.staffInfo}>
            <Image 
              source={item.avatar ? { uri: `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')} 
              style={styles.avatar} 
            />
            <View style={styles.staffDetails}>
              <Text style={styles.staffName}>{item.name}</Text>
              <Text style={styles.staffId}>{item.employee_id || item.id} - {item.branch_name}</Text>
              <View style={styles.roleContainer}>
                <MaterialCommunityIcons 
                  name={item.role === 'Teacher' ? 'account-tie' : 'account-star'} 
                  size={16} 
                  color={Colors.white} 
                />
                <Text style={styles.roleText}>{item.role}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons 
              name={getStatusIcon(item.status, item.is_late)} 
              size={24} 
              color={Colors.white} 
            />
            <Text style={styles.statusText}>
              {item.status === 'present' ? (item.is_late ? 'Late' : 'Present') : 'Absent'}
            </Text>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <View style={styles.timeRow}>
            <View style={styles.timeEntry}>
              <Text style={styles.timeLabel}>Clock In</Text>
              <Text style={styles.timeValue}>{item.clock_in_time || '--:--'}</Text>
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => handleTimeAction(item, 'in')}
              >
                <MaterialCommunityIcons name="clock-in" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.timeEntry}>
              <Text style={styles.timeLabel}>Clock Out</Text>
              <Text style={styles.timeValue}>{item.clock_out_time || '--:--'}</Text>
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => handleTimeAction(item, 'out')}
              >
                <MaterialCommunityIcons name="clock-out" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {item.total_hours && (
            <View style={styles.hoursContainer}>
              <MaterialCommunityIcons name="timer" size={16} color={Colors.white} />
              <Text style={styles.hoursText}>Total: {item.total_hours} hours</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.presentButton]}
            onPress={() => markQuickAttendance(item.id, 'present')}
          >
            <MaterialCommunityIcons name="check" size={16} color={Colors.white} />
            <Text style={styles.actionButtonText}>Present</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.absentButton]}
            onPress={() => markQuickAttendance(item.id, 'absent')}
          >
            <MaterialCommunityIcons name="close" size={16} color={Colors.white} />
            <Text style={styles.actionButtonText}>Absent</Text>
          </TouchableOpacity>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <MaterialCommunityIcons name="note-text" size={14} color={Colors.white} />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </LinearGradient>
    </Animatable.View>
  );

  const StatsHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: Colors.success }]}>{stats.present}</Text>
        <Text style={styles.statLabel}>Present</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: Colors.danger }]}>{stats.absent}</Text>
        <Text style={styles.statLabel}>Absent</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: Colors.warning }]}>{stats.late}</Text>
        <Text style={styles.statLabel}>Late</Text>
      </View>
    </View>
  );

  const Header = () => (
    <Animatable.View animation="fadeInDown" duration={800}>
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Staff Attendance</Text>
        <TouchableOpacity style={styles.reportButton} onPress={() => router.push('/(common)/staff-attendance-report')}>
          <MaterialCommunityIcons name="chart-line" size={24} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>
      
      <View style={styles.filtersContainer}>
        {!branch_id && (
          <View style={styles.pickerContainer}>
            <Picker 
              selectedValue={selectedBranchId} 
              onValueChange={(itemValue) => setSelectedBranchId(itemValue)} 
              style={styles.picker}
            >
              {branches.map(b => (
                <Picker.Item key={b.id || 'All'} label={b.name || 'All'} value={b.id || 'All'} />
              ))}
            </Picker>
          </View>
        )}
        
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)} 
          style={styles.datePickerButton}
        >
          <MaterialCommunityIcons name="calendar" size={22} color={Colors.primary} />
          <Text style={styles.datePickerText}>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
      </View>

      <StatsHeader />
    </Animatable.View>
  );

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={staff}
          renderItem={renderStaffItem}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>
              {loading ? 'Loading staff attendance...' : 'No staff attendance data found'}
            </Text>
          </View>
        )}
      />

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) setDate(selectedDate);
          }}
        />
      )}

      {/* Time Entry Modal */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {timeAction === 'in' ? 'Clock In' : 'Clock Out'} Time
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedStaff?.name}
            </Text>

            <TouchableOpacity 
              style={styles.timePickerButton}
              onPress={() => setShowCustomTimePicker(true)}
            >
              <MaterialCommunityIcons name="clock" size={20} color={Colors.primary} />
              <Text style={styles.timePickerText}>
                {customTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={styles.notesInput}
              placeholder="Add notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTimeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitTimeEntry}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Time Picker */}
      {showCustomTimePicker && (
        <DateTimePicker
          value={customTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowCustomTimePicker(Platform.OS === 'ios');
            if (selectedTime) setCustomTime(selectedTime);
          }}
        />
      )}
    </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  reportButton: {
    padding: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 8,
    elevation: 2,
  },
  picker: {
    height: 50,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  datePickerText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    paddingVertical: 16,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  staffCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  staffInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  staffDetails: {
    marginLeft: 12,
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  staffId: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    color: Colors.white,
    marginLeft: 4,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: Colors.white,
    marginTop: 4,
    fontWeight: '600',
  },
  timeContainer: {
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeEntry: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
  },
  timeValue: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  timeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 4,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 8,
  },
  hoursText: {
    fontSize: 14,
    color: Colors.white,
    marginLeft: 4,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  presentButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  absentButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  notesText: {
    fontSize: 12,
    color: Colors.white,
    marginLeft: 4,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  timePickerText: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.lightGray,
  },
  submitButton: {
    backgroundColor: Colors.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  submitButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
});
