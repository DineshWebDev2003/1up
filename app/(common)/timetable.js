import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import LottieView from 'lottie-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const getToday = () => {
  const dayIndex = new Date().getDay(); // Sunday: 0, Monday: 1, ..., Saturday: 6
  if (dayIndex >= 1 && dayIndex <= 6) {
    return days[dayIndex - 1];
  }
  return days[0]; // Default to Monday for Sunday
};

const initialTimetableData = days.reduce((acc, day) => {
  acc[day] = [
    { id: '1', time: '9:00 - 10:00', period: 'Playschool Period' },
    { id: '2', time: '10:00 - 11:00', period: 'Playschool Period' },
    { id: '3', time: '11:00 - 12:00', period: 'Playschool Period' },
    { id: '4', time: '12:00 - 1:00', period: 'Playschool Period' },
  ];
  return acc;
}, {});

const newColors = {
  primary: '#4287f5', // Blue
  accent: '#f56e45',  // Orange
  background: '#ffffff', // White
  textPrimary: '#333333',
  textOnPrimary: '#ffffff',
  textOnAccent: '#ffffff',
  borderColor: '#e0e0e0',
};

export default function TimetableScreen() {
  const [selectedDay, setSelectedDay] = useState(getToday());
  const [timetableData, setTimetableData] = useState(initialTimetableData);
  const [editingCell, setEditingCell] = useState(null);

  const getTitle = () => {
    const today = getToday();
    if (selectedDay === today) {
      return "Today's Timetable";
    }
    const dayNames = {
      Mon: 'Monday',
      Tue: 'Tuesday',
      Wed: 'Wednesday',
      Thu: 'Thursday',
      Fri: 'Friday',
      Sat: 'Saturday',
    };
    return `${dayNames[selectedDay]}'s Timetable`;
  };

  const handleUpdate = (text) => {
    if (!editingCell) return;
    const { day, timeId } = editingCell;
    const updatedDayData = timetableData[day].map(item =>
      item.id === timeId ? { ...item, period: text } : item
    );
    setTimetableData({ ...timetableData, [day]: updatedDayData });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{getTitle()}</Text>
        <LottieView
          source={require('../../assets/Calendar Animation.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />

        <View style={styles.dayPickerContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.daySelectorContainer}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    selectedDay === day && styles.selectedDayButton,
                  ]}
                  onPress={() => {
                    setSelectedDay(day);
                    setEditingCell(null);
                  }}
                >
                  <Text style={[styles.dayText, selectedDay === day && styles.selectedDayText]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.timetableContainer}>
          <ScrollView contentContainerStyle={styles.timetableScrollView}>
            {timetableData[selectedDay].map((item, index) => (
              <LinearGradient
                key={item.id}
                colors={index % 2 === 0 ? ['#ffffff', '#f8f9fa'] : ['#ffffff', '#f1f3f5']}
                style={styles.card}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardRow}>
                    <MaterialCommunityIcons name="clock-time-four-outline" size={22} color={newColors.primary} style={styles.icon} />
                    <Text style={styles.timeText}>{item.time}</Text>
                  </View>
                  <TouchableOpacity style={styles.cardRow} onPress={() => setEditingCell({ day: selectedDay, timeId: item.id })}>
                    <MaterialCommunityIcons name="book-open-page-variant-outline" size={22} color={newColors.accent} style={styles.icon} />
                    {editingCell && editingCell.day === selectedDay && editingCell.timeId === item.id ? (
                      <TextInput
                        value={item.period}
                        onChangeText={handleUpdate}
                        onBlur={() => setEditingCell(null)}
                        autoFocus
                        style={[styles.periodText, styles.input]}
                      />
                    ) : (
                      <Text style={styles.periodText}>{item.period}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: newColors.background },
  container: { flex: 1, padding: 20 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: newColors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  lottieAnimation: {
    width: 800,
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
  },
  dayPickerContainer: {
    backgroundColor: newColors.background,
    borderRadius: 25,
    marginBottom: 20,
    paddingVertical: 5,
  },
  daySelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: newColors.background,
    borderWidth: 2,
    borderColor: newColors.primary,
  },
  selectedDayButton: {
    backgroundColor: newColors.accent,
    borderColor: newColors.accent,
  },
  dayText: {
    color: newColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedDayText: {
    color: newColors.textOnAccent,
  },
  timetableContainer: {
    flex: 1,
    backgroundColor: newColors.background,
  },
  timetableScrollView: {
    padding: 10,
  },
  card: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardContent: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    marginRight: 12,
  },
  timeText: {
    fontSize: 17,
    fontWeight: '600',
    color: newColors.primary,
  },
  periodText: {
    fontSize: 17,
    color: newColors.textPrimary,
    flex: 1,
  },
  input: {
    backgroundColor: 'rgba(66, 135, 245, 0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 17,
  },
});
