import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MyAttendanceViewScreen() {
  const router = useRouter();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'monthly'
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await authFetch(`/api/attendance/get_attendance.php?date=${dateStr}`);
      const result = await response.json();
      
      if (result.success) {
        setAttendanceData(result.data || []);
      } else {
        setAttendanceData([]);
      }
    } catch (error) {
      console.error('Fetch attendance error:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyAttendance = async () => {
    try {
      setLoading(true);
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth() + 1;
      const response = await authFetch(`/api/attendance/get_monthly_attendance.php?year=${year}&month=${month}`);
      const result = await response.json();
      
      if (result.success) {
        setMonthlyData(result.data || []);
      } else {
        setMonthlyData([]);
      }
    } catch (error) {
      console.error('Fetch monthly attendance error:', error);
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleMonthChange = (event, date) => {
    setShowMonthPicker(false);
    if (date) {
      setSelectedMonth(date);
      fetchMonthlyAttendance();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return { name: 'checkmark-circle', color: Colors.success };
      case 'absent':
        return { name: 'close-circle', color: Colors.danger };
      case 'late':
        return { name: 'time', color: Colors.warning };
      default:
        return { name: 'ellipse-outline', color: Colors.textSecondary };
    }
  };

  const renderDailyView = () => (
    <ScrollView style={styles.content}>
      <Animatable.View animation="fadeInUp" duration={800}>
        <LinearGradient colors={Colors.gradientPrimary} style={styles.dateCard}>
          <MaterialCommunityIcons name="calendar-today" size={24} color={Colors.white} />
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
            <Ionicons name="calendar-outline" size={24} color={Colors.white} />
          </TouchableOpacity>
        </LinearGradient>
      </Animatable.View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading attendance...</Text>
        </View>
      ) : attendanceData.length > 0 ? (
        attendanceData.map((record, index) => {
          const statusIcon = getStatusIcon(record.status);
          return (
            <Animatable.View key={record.id} animation="fadeInUp" duration={800} delay={index * 100}>
              <LinearGradient colors={Colors.gradient1} style={styles.attendanceCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.statusIndicator}>
                    <Ionicons name={statusIcon.name} size={28} color={statusIcon.color} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.statusText}>{record.status?.toUpperCase() || 'UNKNOWN'}</Text>
                    <Text style={styles.dateTextSmall}>{record.date}</Text>
                  </View>
                </View>

                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="clock-in" size={20} color={Colors.text} />
                    <Text style={styles.detailText}>
                      Check In: {record.check_in_time || 'Not recorded'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="clock-out" size={20} color={Colors.text} />
                    <Text style={styles.detailText}>
                      Check Out: {record.check_out_time || 'Not recorded'}
                    </Text>
                  </View>

                  {record.remarks && (
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="note-text" size={20} color={Colors.text} />
                      <Text style={styles.detailText}>{record.remarks}</Text>
                    </View>
                  )}

                  {record.marked_by_name && (
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="account-check" size={20} color={Colors.text} />
                      <Text style={styles.detailText}>Marked by: {record.marked_by_name}</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </Animatable.View>
          );
        })
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="calendar-remove" size={60} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>No attendance record for this date</Text>
        </View>
      )}

      <TouchableOpacity 
        onPress={() => {
          setViewMode('monthly');
          fetchMonthlyAttendance();
        }}
        style={styles.monthlyButton}
      >
        <LinearGradient colors={Colors.gradient4} style={styles.monthlyButtonGradient}>
          <MaterialCommunityIcons name="chart-bar" size={24} color={Colors.white} />
          <Text style={styles.monthlyButtonText}>View Monthly Report</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderMonthlyView = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const numDays = new Date(year, month + 1, 0).getDate();
    const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);

    const getAttendanceForDay = (day) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return monthlyData.find(record => record.date === dateStr);
    };

    return (
      <ScrollView style={styles.content}>
        <Animatable.View animation="fadeInUp" duration={800}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.monthHeader}>
            <TouchableOpacity onPress={() => {
              const newDate = new Date(selectedMonth);
              newDate.setMonth(selectedMonth.getMonth() - 1);
              setSelectedMonth(newDate);
              fetchMonthlyAttendance();
            }}>
              <Ionicons name="chevron-back" size={28} color={Colors.white} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowMonthPicker(true)}>
              <Text style={styles.monthText}>
                {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => {
              const newDate = new Date(selectedMonth);
              newDate.setMonth(selectedMonth.getMonth() + 1);
              setSelectedMonth(newDate);
              fetchMonthlyAttendance();
            }}>
              <Ionicons name="chevron-forward" size={28} color={Colors.white} />
            </TouchableOpacity>
          </LinearGradient>
        </Animatable.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading monthly attendance...</Text>
          </View>
        ) : (
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
            <LinearGradient colors={Colors.gradient1} style={styles.monthlyCalendar}>
              <View style={styles.calendarGrid}>
                {daysArray.map((day) => {
                  const attendance = getAttendanceForDay(day);
                  const statusIcon = attendance ? getStatusIcon(attendance.status) : null;
                  
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.calendarDay,
                        attendance && styles.calendarDayWithData
                      ]}
                      onPress={() => {
                        if (attendance) {
                          Alert.alert(
                            `Day ${day}`,
                            `Status: ${attendance.status}\nCheck In: ${attendance.check_in_time || 'N/A'}\nCheck Out: ${attendance.check_out_time || 'N/A'}`,
                            [{ text: 'OK' }]
                          );
                        }
                      }}
                    >
                      <Text style={styles.calendarDayNumber}>{day}</Text>
                      {statusIcon && (
                        <Ionicons name={statusIcon.name} size={16} color={statusIcon.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </LinearGradient>

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <Ionicons name="close-circle" size={20} color={Colors.danger} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <Ionicons name="time" size={20} color={Colors.warning} />
                <Text style={styles.legendText}>Late</Text>
              </View>
            </View>
          </Animatable.View>
        )}

        <TouchableOpacity 
          onPress={() => setViewMode('daily')}
          style={styles.backButton}
        >
          <LinearGradient colors={Colors.gradient2} style={styles.backButtonGradient}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
            <Text style={styles.backButtonText}>Back to Daily View</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={Colors.gradientPrimary} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Attendance</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      {viewMode === 'daily' ? renderDailyView() : renderMonthlyView()}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {showMonthPicker && (
        <DateTimePicker
          value={selectedMonth}
          mode="date"
          display="default"
          onChange={handleMonthChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backIcon: { padding: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.white },
  headerRight: { width: 44 },
  content: { flex: 1, padding: 16 },
  dateCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 15, marginBottom: 16, gap: 12 },
  dateText: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.white },
  dateButton: { padding: 8 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary },
  attendanceCard: { padding: 16, borderRadius: 15, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusIndicator: { marginRight: 12 },
  cardInfo: { flex: 1 },
  statusText: { fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  dateTextSmall: { fontSize: 14, color: Colors.white, opacity: 0.9 },
  cardDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { flex: 1, fontSize: 14, color: Colors.white },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  monthlyButton: { marginTop: 20, marginBottom: 20 },
  monthlyButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 15, gap: 10 },
  monthlyButtonText: { fontSize: 16, fontWeight: '600', color: Colors.white },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 15, marginBottom: 16 },
  monthText: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  monthlyCalendar: { padding: 16, borderRadius: 15, marginBottom: 16 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  calendarDay: { width: '13%', aspectRatio: 1, backgroundColor: Colors.lightGray, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  calendarDayWithData: { backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.primary },
  calendarDayNumber: { fontSize: 12, fontWeight: '600', color: Colors.text },
  legendContainer: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, backgroundColor: Colors.white, borderRadius: 15, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 14, color: Colors.text },
  backButton: { marginTop: 20, marginBottom: 20 },
  backButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 15, gap: 10 },
  backButtonText: { fontSize: 16, fontWeight: '600', color: Colors.white },
});

