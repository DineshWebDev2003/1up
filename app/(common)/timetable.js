import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import LottieView from 'lottie-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const getToday = () => {
  const dayIndex = new Date().getDay();
  return dayIndex >= 1 && dayIndex <= 6 ? days[dayIndex - 1] : days[0];
};

const cardGradients = [
  Colors.gradient1,
  Colors.gradient2,
  Colors.gradient3,
  Colors.gradient4,
  Colors.gradient5,
  Colors.gradient6,
];

export default function TimetableScreen() {
  const { branch: initialBranchId } = useLocalSearchParams();
  const [selectedDay, setSelectedDay] = useState(getToday());
  const [timetableData, setTimetableData] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(initialBranchId || '');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditTimeModalVisible, setIsEditTimeModalVisible] = useState(false);
  const [newEntry, setNewEntry] = useState({ start_time: '', end_time: '', subject: '', room: '' });
  const [editingTime, setEditingTime] = useState(null);

  const handleUpdateTime = async () => {
    if (!editingTime) return;

    const { id, time } = editingTime;
    const originalTime = timetableData[selectedDay].find(item => item.id === id).time;

    const updatedDaySchedule = (timetableData[selectedDay] && Array.isArray(timetableData[selectedDay])) ? 
      timetableData[selectedDay].map(item =>
        item.id === id ? { ...item, time: time } : item
      ) : [];
    setTimetableData({ ...timetableData, [selectedDay]: updatedDaySchedule });
    setIsEditTimeModalVisible(false);

    try {
      const response = await authFetch('/api/timetable.php', {
        method: 'PUT',
        body: JSON.stringify({ id: id, time: time }),
      });
      const result = await response.json();
      if (!result.success) {
        Alert.alert('Update Failed', result.message || 'Could not save time changes.');
        const revertedDaySchedule = (timetableData[selectedDay] && Array.isArray(timetableData[selectedDay])) ?
          timetableData[selectedDay].map(item =>
            item.id === id ? { ...item, time: originalTime } : item
          ) : [];
        setTimetableData({ ...timetableData, [selectedDay]: revertedDaySchedule });
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', 'Failed to update timetable time.');
      }
      const revertedDaySchedule = (timetableData[selectedDay] && Array.isArray(timetableData[selectedDay])) ?
        timetableData[selectedDay].map(item =>
          item.id === id ? { ...item, time: originalTime } : item
        ) : [];
      setTimetableData({ ...timetableData, [selectedDay]: revertedDaySchedule });
    } finally {
      setEditingTime(null);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this period?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const originalTimetableData = { ...timetableData };
            const updatedDaySchedule = timetableData[selectedDay].filter(item => item.id !== id);
            setTimetableData({ ...timetableData, [selectedDay]: updatedDaySchedule });

            try {
              const response = await authFetch('/api/timetable.php', {
                method: 'DELETE',
                body: JSON.stringify({ id: id }),
              });
              const result = await response.json();
              if (!result.success) {
                Alert.alert('Delete Failed', result.message || 'Could not delete the entry.');
                setTimetableData(originalTimetableData);
              }
            } catch (error) {
              if (error.message !== 'Unauthorized') {
                Alert.alert('API Error', 'Failed to delete the timetable entry.');
              }
              setTimetableData(originalTimetableData);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const loadBranches = async () => {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (sessionToken) {
        fetchBranches();
      }
    };
    loadBranches();
  }, []);

  useEffect(() => {
    console.log('Selected branch changed:', selectedBranch);
    if (selectedBranch) {
      fetchTimetable(selectedBranch);
      fetchTeachers(selectedBranch);
    }
  }, [selectedBranch, selectedDay]);

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      console.log('Branches API response:', result);
      if (result.success) {
        setBranches(result.data);
        if (!initialBranchId && result.data.length > 0) {
          setSelectedBranch(result.data[0].id);
        } else if (initialBranchId) {
          setSelectedBranch(initialBranchId);
        }
      } else {
        Alert.alert('Error', 'Failed to fetch branches.');
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', 'Could not connect to the server to fetch branches.');
      }
    }
  };

  const fetchTeachers = async (branchId) => {
    try {
      const response = await authFetch(`/api/teachers/get_teachers.php?branch_id=${branchId}`);
      const result = await response.json();
      console.log('Teachers API response:', result);
      if (result.success) {
        setTeachers(result.data);
      } else {
        console.log('Failed to fetch teachers:', result.message);
        setTeachers([]);
      }
    } catch (error) {
      console.error('Fetch teachers error:', error);
      if (error.message !== 'Unauthorized') {
        console.log('Could not connect to the server to fetch teachers.');
      }
      setTeachers([]);
    }
  };

  const fetchTimetable = async (branchId) => {
    console.log(`Fetching timetable for branch: ${branchId}, day: ${selectedDay}`);
    setLoading(true);
    try {
      const response = await authFetch(`/api/timetable.php?branch_id=${branchId}&day=${selectedDay}`);
      const result = await response.json();
      console.log('Timetable API response:', result);
      if (result.success) {
        // API returns data for the requested day only, not all days
        const completeTimetable = days.reduce((acc, day) => {
          acc[day] = day === selectedDay ? result.data : [];
          return acc;
        }, {});
        setTimetableData(completeTimetable);
      } else {
        Alert.alert('Error', result.message || 'Failed to fetch timetable.');
        setTimetableData({});
      }
    } catch (error) {
      console.error('Fetch timetable error:', error);
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', 'Could not connect to the server to fetch the timetable.');
      }
      setTimetableData({});
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (text) => {
    if (!editingCell) return;
    const { day, timeId, originalPeriod } = editingCell;

    const updatedDaySchedule = (timetableData[day] && Array.isArray(timetableData[day])) ?
      timetableData[day].map(item =>
        item.id === timeId ? { ...item, period: text } : item
      ) : [];
    setTimetableData({ ...timetableData, [day]: updatedDaySchedule });

        try {
      const response = await authFetch('/api/timetable.php', {
        method: 'PUT',
        body: JSON.stringify({ id: timeId, period: text }),
      });
      const result = await response.json();
      if (!result.success) {
        Alert.alert('Update Failed', result.message || 'Could not save changes.');
        const revertedDaySchedule = (timetableData[day] && Array.isArray(timetableData[day])) ?
          timetableData[day].map(item =>
            item.id === timeId ? { ...item, period: originalPeriod } : item
          ) : [];
        setTimetableData({ ...timetableData, [day]: revertedDaySchedule });
      }
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            Alert.alert('API Error', 'Failed to update timetable.');
        }
       const revertedDaySchedule = (timetableData[day] && Array.isArray(timetableData[day])) ?
        timetableData[day].map(item =>
          item.id === timeId ? { ...item, period: originalPeriod } : item
        ) : [];
      setTimetableData({ ...timetableData, [day]: revertedDaySchedule });
    } finally {
        setEditingCell(null);
    }
  };

    const handleSave = async () => {
    if (!newEntry.start_time || !newEntry.end_time || !newEntry.subject) {
      Alert.alert('Validation Error', 'Start time, end time, and subject are required.');
      return;
    }

    try {
      const response = await authFetch('/api/timetable.php', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: selectedBranch,
          day: selectedDay,
          start_time: newEntry.start_time,
          end_time: newEntry.end_time,
          subject: newEntry.subject,
          room: newEntry.room,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const newTimetableEntry = {
          id: result.data.id,
          start_time: newEntry.start_time,
          end_time: newEntry.end_time,
          subject: newEntry.subject,
          room: newEntry.room || '',
          day: selectedDay
        };

        const updatedDaySchedule = [...(timetableData[selectedDay] || []), newTimetableEntry];
        setTimetableData({ ...timetableData, [selectedDay]: updatedDaySchedule });

        setIsAddModalVisible(false);
        setNewEntry({ start_time: '', end_time: '', subject: '', room: '' });
      } else {
        Alert.alert('Save Failed', result.message || 'Could not save the new entry.');
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', 'Failed to save the new timetable entry.');
      }
    }
  };

  const currentBranchName = branches.find(b => b.id === selectedBranch)?.name || 'Loading...';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInDown" duration={800}>
          <LinearGradient colors={[Colors.primary, '#87CEEB']} style={styles.header}>
            <LottieView
              source={require('../../assets/Calendar Animation.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
            <Text style={styles.title}>Timetable</Text>
            <Text style={styles.subtitle}>{currentBranchName}</Text>
          </LinearGradient>
        </Animatable.View>

        {!initialBranchId && (
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedBranch}
                onValueChange={(itemValue) => setSelectedBranch(itemValue)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                enabled={branches.length > 0}
              >
                {(branches && Array.isArray(branches)) ? branches.map((b) => <Picker.Item key={b.id} label={b.name} value={b.id} />) : null}
              </Picker>
            </View>
          </Animatable.View>
        )}

        <Animatable.View animation="fadeInUp" duration={800} delay={400}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorContainer}>
            {(days && Array.isArray(days)) ? days.map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.dayButton, selectedDay === day && styles.selectedDayButton]}
                onPress={() => { setSelectedDay(day); setEditingCell(null); }}
              >
                <Text style={[styles.dayText, selectedDay === day && styles.selectedDayText]}>{day}</Text>
              </TouchableOpacity>
            )) : null}
          </ScrollView>
        </Animatable.View>

        {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : (
            <View style={styles.timetableContainer}>
            {(timetableData[selectedDay] && timetableData[selectedDay].length > 0) ? (
                (timetableData[selectedDay] && Array.isArray(timetableData[selectedDay])) ? timetableData[selectedDay].map((item, index) => (
                <Animatable.View key={item.id} animation="fadeInUp" duration={600} delay={index * 100}>
                    <LinearGradient colors={cardGradients[index % cardGradients.length]} style={styles.card}>
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardRow}>
                                <MaterialCommunityIcons name="clock-time-four-outline" size={22} color={Colors.lightText} style={styles.icon} />
                                <TouchableOpacity onPress={() => { setEditingTime({ id: item.id, time: `${item.start_time} - ${item.end_time}` }); setIsEditTimeModalVisible(true); }}>
                                    <Text style={styles.timeText}>{item.start_time} - {item.end_time}</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                                <MaterialCommunityIcons name="trash-can-outline" size={24} color={Colors.lightText} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={styles.cardRow} onPress={() => setEditingCell({ day: selectedDay, timeId: item.id, originalPeriod: item.subject })}>
                        <MaterialCommunityIcons name="book-open-page-variant-outline" size={22} color={Colors.lightText} style={styles.icon} />
                        {editingCell?.day === selectedDay && editingCell?.timeId === item.id ? (
                            <TextInput
                            defaultValue={item.subject}
                            onEndEditing={(e) => handleUpdate(e.nativeEvent.text)}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            style={[styles.periodText, styles.input]}
                            placeholderTextColor="#9E9E9E"
                            />
                        ) : (
                            <Text style={styles.periodText}>{item.subject}</Text>
                        )}
                        </TouchableOpacity>
                        {item.room && (
                        <View style={styles.cardRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={22} color={Colors.lightText} style={styles.icon} />
                        <Text style={styles.classroomText}>{item.room}</Text>
                        </View>
                        )}
                    </View>
                    </LinearGradient>
                </Animatable.View>
                )) : null
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No schedule for {selectedDay}.</Text>
                </View>
            )}
            </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setIsAddModalVisible(true)}>
        <MaterialCommunityIcons name="plus" size={30} color={Colors.lightText} />
      </TouchableOpacity>

      <Modal
        visible={isEditTimeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditTimeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={500} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Time</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Time (e.g., 09:00-10:00)"
              placeholderTextColor="#9E9E9E"
              value={editingTime?.time}
              onChangeText={(text) => setEditingTime({ ...editingTime, time: text })}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setIsEditTimeModalVisible(false); setEditingTime(null); }}>
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateTime}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>

      <Modal
        visible={isAddModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={500} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Period</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Start Time (e.g., 09:00:00)"
              placeholderTextColor="#9E9E9E"
              value={newEntry.start_time}
              onChangeText={(text) => setNewEntry({ ...newEntry, start_time: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="End Time (e.g., 10:00:00)"
              placeholderTextColor="#9E9E9E"
              value={newEntry.end_time}
              onChangeText={(text) => setNewEntry({ ...newEntry, end_time: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Subject/Period"
              placeholderTextColor="#9E9E9E"
              value={newEntry.subject}
              onChangeText={(text) => setNewEntry({ ...newEntry, subject: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Room (e.g., Room A1)"
              placeholderTextColor="#9E9E9E"
              value={newEntry.room}
              onChangeText={(text) => setNewEntry({ ...newEntry, room: text })}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsAddModalVisible(false)}>
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  title: { fontSize: 34, fontWeight: 'bold', color: Colors.lightText, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.lightText, opacity: 0.9, textAlign: 'center', marginTop: 4 },
  lottieAnimation: { width: 120, height: 120, marginBottom: -10 },
  pickerContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: Colors.card,
    borderRadius: 15,
    ...Platform.select({
      ios: { padding: 10, shadowColor: Colors.shadow, shadowRadius: 5, shadowOpacity: 0.1 },
      android: { elevation: 3 },
    }),
  },
  picker: { height: 50, width: '100%' },
  pickerItem: { fontSize: 16 },
  daySelectorContainer: { paddingVertical: 20, paddingHorizontal: 15 },
  dayButton: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 25,
    marginHorizontal: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedDayButton: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dayText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  selectedDayText: { color: Colors.lightText },
  timetableContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  cardContent: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  deleteButton: { padding: 5 },
  icon: { marginRight: 12 },
  timeText: { fontSize: 16, fontWeight: '700', color: Colors.lightText },
  periodText: { fontSize: 18, color: Colors.lightText, flex: 1, fontWeight: '500' },
  teacherText: { fontSize: 16, color: Colors.lightText, flex: 1, fontWeight: '400', opacity: 0.9 },
  classroomText: { fontSize: 16, color: Colors.lightText, flex: 1, fontWeight: '400', opacity: 0.9 },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 10,
    color: Colors.lightText,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    padding: 20,
  },
  emptyText: {
      fontSize: 16,
      color: Colors.text,
  },
  fab: {
    position: 'absolute',
    right: 30,
    bottom: 40,
    backgroundColor: Colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowRadius: 5,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: 'transparent',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  cancelButton: {
    backgroundColor: '#B0B0B0',
  },
  cancelButtonText: {
    color: Colors.black,
  },
  modalButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
