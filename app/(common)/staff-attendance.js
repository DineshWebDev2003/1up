import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Platform, Alert } from 'react-native';
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
      const response = await authFetch(url);
      const result = await response.json();
      setStaff(result.success ? result.data : []);
    } catch (error) {
      console.error('Error fetching staff attendance:', error);
      setStaff([]);
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
      <LinearGradient
        colors={item.status === 'present' ? Colors.gradient3 : Colors.gradientDanger}
        style={styles.staffCard}
      >
        <View style={styles.staffInfo}>
          <Image source={item.avatar ? { uri: `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')} style={styles.avatar} />
          <View style={styles.staffDetails}>
            <Text style={styles.staffName}>{item.name}</Text>
            <Text style={styles.staffId}>{item.staffId} - {item.branch}</Text>
            <View style={styles.tagContainer}>
              <MaterialCommunityIcons name={item.type === 'QR Code' ? 'qrcode-scan' : 'account-edit-outline'} size={14} color={Colors.lightText} />
              <Text style={styles.attendanceType}>{item.type || 'N/A'}</Text>
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
        </View>
        <TouchableOpacity onPress={() => toggleAttendance(item.id, item.status)} style={styles.statusToggle}>
          <MaterialCommunityIcons name={item.status === 'present' ? 'check-circle' : 'close-circle'} size={30} color={Colors.lightText} />
        </TouchableOpacity>
      </LinearGradient>
    </Animatable.View>
  );

  const Header = () => (
    <Animatable.View animation="fadeInDown" duration={800}>
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <LottieView source={require('../../assets/lottie/staff.json')} autoPlay loop style={styles.lottie} />
        <Text style={styles.title}>Staff Attendance</Text>
        <Text style={styles.subtitle}>{branch ? `Branch: ${branch}` : 'All Branches'}</Text>
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
  tagContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, marginTop: 5, alignSelf: 'flex-start' },
  attendanceType: { fontSize: 12, color: Colors.lightText, marginLeft: 5 },
  attendanceDetails: { alignItems: 'flex-end', marginLeft: 10 },
  timeEntry: { alignItems: 'flex-end', marginBottom: 5 },
  timeLabel: { fontSize: 13, color: Colors.lightText, fontWeight: '600' },
  statusToggle: { position: 'absolute', top: 10, right: 10 },
  viewToggleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 15, marginTop: 10, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  viewToggleButtonText: { color: Colors.lightText, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  lottieEmpty: { width: 250, height: 250 },
  emptyText: { fontSize: 18, color: Colors.lightText, marginTop: -20, fontWeight: '600' },
});
