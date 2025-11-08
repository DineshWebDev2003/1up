import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';

const MyAttendanceScreen = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mock attendance data for the calendar
  const attendanceData = {
    '2024-07-01': { status: 'present' },
    '2024-07-02': { status: 'present' },
    '2024-07-03': { status: 'absent', reason: 'Sick Leave' },
    '2024-07-04': { status: 'present' },
    '2024-07-05': { status: 'leave', reason: 'Personal' },
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const generateCalendar = () => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendarDays = [];

    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ key: `empty-${i}`, empty: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      calendarDays.push({ key: dateStr, day, data: attendanceData[dateStr] });
    }

    return calendarDays;
  };

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  const renderDay = ({ item }) => {
    if (item.empty) {
      return <View style={styles.dayCell} />;
    }

    let statusStyle = {};
    if (item.data) {
      switch (item.data.status) {
        case 'present': statusStyle = styles.presentDay; break;
        case 'absent': statusStyle = styles.absentDay; break;
        case 'leave': statusStyle = styles.leaveDay; break;
      }
    }

    return (
      <View style={[styles.dayCell, statusStyle]}>
        <Text style={styles.dayText}>{item.day}</Text>
      </View>
    );
  };

  const summaryData = [
    { title: 'Total Present', value: '22', color: Colors.accent, icon: 'checkmark-circle' },
    { title: 'Total Absent', value: '3', color: Colors.danger, icon: 'close-circle' },
    { title: 'Leave Taken', value: '1', color: Colors.warning, icon: 'alert-circle' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.header}>
        <LottieView source={require('../../assets/lottie/calendar.json')} autoPlay loop style={styles.lottie} />
        <Text style={styles.headerTitle}>My Attendance</Text>
      </LinearGradient>

      <FlatList
        ListHeaderComponent={
          <>
            <Animatable.View animation="fadeInDown" duration={800} style={styles.summaryContainer}>
              {summaryData.map((item, index) => (
                <Animatable.View key={index} animation="zoomIn" duration={500} delay={200 + index * 100} style={[styles.summaryCard, { borderLeftColor: item.color }]}>
                  <Ionicons name={item.icon} size={30} color={item.color} />
                  <View>
                    <Text style={styles.summaryValue}>{item.value}</Text>
                    <Text style={styles.summaryTitle}>{item.title}</Text>
                  </View>
                </Animatable.View>
              ))}
            </Animatable.View>

            <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.calendarContainer}>
              <View style={styles.monthNavigator}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
                  <Ionicons name="chevron-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.monthYearText}>{`${monthName} ${year}`}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
                  <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.weekdaysContainer}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <Text key={day} style={styles.weekdayText}>{day}</Text>)}
              </View>
            </Animatable.View>
          </>
        }
        data={generateCalendar()}
        renderItem={renderDay}
        numColumns={7}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.lightGray },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  lottie: { width: 120, height: 120 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: Colors.white, marginTop: -10 },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 15,
    width: '31%',
    borderLeftWidth: 5,
    ...Platform.select({ ios: { shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }),
  },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: Colors.darkGray, marginLeft: 10 },
  summaryTitle: { fontSize: 12, color: Colors.gray, marginLeft: 10 },
  calendarContainer: { 
    backgroundColor: Colors.white, 
    marginHorizontal: 15, 
    borderRadius: 20, 
    padding: 15, 
    marginTop: 10,
    ...Platform.select({ ios: { shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }),
  },
  monthNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  navButton: { padding: 5 },
  monthYearText: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
  weekdaysContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  weekdayText: { color: Colors.gray, fontWeight: 'bold' },
  dayCell: { width: '14.2%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 25 },
  dayText: { fontSize: 16, color: Colors.darkGray },
  presentDay: { backgroundColor: 'rgba(46, 204, 113, 0.2)' },
  absentDay: { backgroundColor: 'rgba(231, 76, 60, 0.2)' },
  leaveDay: { backgroundColor: 'rgba(241, 196, 15, 0.2)' },
});

export default MyAttendanceScreen;
