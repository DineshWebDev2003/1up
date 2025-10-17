import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  FlatList, Alert, Platform, RefreshControl, Modal, TextInput
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TeacherAttendanceReport() {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState('start'); // 'start' or 'end'
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);

  const fetchAttendanceData = useCallback(async (start, end) => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        
        const startDateStr = start.toISOString().split('T')[0];
        const endDateStr = end.toISOString().split('T')[0];
        
        const response = await authFetch(
          `/api/attendance/get_teacher_attendance.php?start_date=${startDateStr}&end_date=${endDateStr}`
        );
        const result = await response.json();
        
        if (result.success) {
          setAttendanceData(result.data);
        } else {
          Alert.alert('Error', result.message || 'Failed to fetch attendance data');
        }
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      Alert.alert('Error', 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAttendanceData(startDate, endDate);
    setRefreshing(false);
  }, [fetchAttendanceData, startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      fetchAttendanceData(startDate, endDate);
    }, [fetchAttendanceData, startDate, endDate])
  );

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (dateType === 'start') {
        setStartDate(selectedDate);
      } else {
        setEndDate(selectedDate);
      }
      fetchAttendanceData(
        dateType === 'start' ? selectedDate : startDate,
        dateType === 'end' ? selectedDate : endDate
      );
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (record) => {
    if (!record.clock_in_time) return Colors.gray;
    if (record.is_late == 1) return Colors.warning;
    if (record.clock_out_time) return Colors.success;
    return Colors.primary;
  };

  const getStatusText = (record) => {
    if (!record.clock_in_time) return 'Absent';
    if (record.is_late == 1) return 'Late';
    if (record.clock_out_time) return 'Present';
    return 'Clocked In';
  };

  const renderAttendanceRecord = ({ item }) => (
    <Animatable.View animation="fadeInUp" style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>{item.date}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
          <Text style={styles.statusText}>{getStatusText(item)}</Text>
        </View>
      </View>
      
      <View style={styles.recordDetails}>
        <View style={styles.timeRow}>
          <MaterialCommunityIcons name="clock-in" size={16} color={Colors.text} />
          <Text style={styles.timeLabel}>Clock In:</Text>
          <Text style={styles.timeValue}>{item.clock_in_formatted || '--:--'}</Text>
        </View>
        
        <View style={styles.timeRow}>
          <MaterialCommunityIcons name="clock-out" size={16} color={Colors.text} />
          <Text style={styles.timeLabel}>Clock Out:</Text>
          <Text style={styles.timeValue}>{item.clock_out_formatted || '--:--'}</Text>
        </View>
        
        {item.total_hours && (
          <View style={styles.timeRow}>
            <MaterialCommunityIcons name="timer" size={16} color={Colors.text} />
            <Text style={styles.timeLabel}>Total Hours:</Text>
            <Text style={styles.timeValue}>{item.total_hours.toFixed(1)}h</Text>
          </View>
        )}
        
        {item.daily_report && (
          <View style={styles.reportRow}>
            <MaterialCommunityIcons name="text-box-outline" size={16} color={Colors.text} />
            <Text style={styles.reportLabel}>Daily Report:</Text>
            <Text style={styles.reportValue}>{item.daily_report}</Text>
          </View>
        )}
      </View>
    </Animatable.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <Text style={styles.headerTitle}>My Attendance Report</Text>
        <Text style={styles.headerSubtitle}>
          {currentUser?.name} - {currentUser?.role}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
        {/* Date Range Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              setDateType('start');
              setShowDatePicker(true);
            }}
          >
            <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
            <Text style={styles.dateButtonText}>From: {formatDate(startDate)}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => {
              setDateType('end');
              setShowDatePicker(true);
            }}
          >
            <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
            <Text style={styles.dateButtonText}>To: {formatDate(endDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        {attendanceData?.summary && (
          <Animatable.View animation="fadeInUp" style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary ({attendanceData.date_range.start_date} to {attendanceData.date_range.end_date})</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{attendanceData.summary.present_days}</Text>
                <Text style={styles.statLabel}>Present Days</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{attendanceData.summary.late_days}</Text>
                <Text style={styles.statLabel}>Late Days</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{attendanceData.summary.total_hours}h</Text>
                <Text style={styles.statLabel}>Total Hours</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{attendanceData.summary.attendance_rate}%</Text>
                <Text style={styles.statLabel}>Attendance Rate</Text>
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Current Month Stats */}
        {attendanceData?.current_month_stats && (
          <Animatable.View animation="fadeInUp" style={styles.currentMonthCard}>
            <Text style={styles.summaryTitle}>Current Month Stats</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{attendanceData.current_month_stats.present_days}</Text>
                <Text style={styles.statLabel}>Present Days</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{attendanceData.current_month_stats.late_days}</Text>
                <Text style={styles.statLabel}>Late Days</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{attendanceData.current_month_stats.average_hours}h</Text>
                <Text style={styles.statLabel}>Avg Hours</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{attendanceData.current_month_stats.attendance_rate}%</Text>
                <Text style={styles.statLabel}>Attendance Rate</Text>
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Attendance Records */}
        <View style={styles.recordsSection}>
          <Text style={styles.sectionTitle}>Attendance Records</Text>
          
          {attendanceData?.attendance_records?.length > 0 ? (
            <FlatList
              data={attendanceData.attendance_records}
              renderItem={renderAttendanceRecord}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color={Colors.gray} />
              <Text style={styles.emptyText}>No attendance records found for the selected period</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={dateType === 'start' ? startDate : endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.lightText,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currentMonthCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 5,
  },
  recordsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 15,
  },
  recordCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  recordDetails: {
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: Colors.gray,
    marginLeft: 8,
    marginRight: 8,
  },
  timeValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
  },
  reportLabel: {
    fontSize: 14,
    color: Colors.gray,
    marginLeft: 8,
    marginRight: 8,
  },
  reportValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 10,
  },
});
