import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAYS_OF_WEEK = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 }
];

export default function TimetableManagementScreen() {
  const [timetable, setTimetable] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  // Form states
  const [subject, setSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  
  // Time picker states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startTimeDate, setStartTimeDate] = useState(new Date());
  const [endTimeDate, setEndTimeDate] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [selectedBranch]);

  const loadData = async () => {
    try {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || '');
      
      await fetchBranches();
      await fetchTeachers();
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        setBranches(result.data || []);
        // Keep selectedBranch as 'all' by default
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await authFetch('/api/users/get_teachers.php');
      const result = await response.json();
      if (result.success) {
        setTeachers(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchTimetable = async () => {
    try {
      // Clear existing data first
      setTimetable([]);
      
      let url = `/api/timetable/timetable_crud.php?branch_id=${selectedBranch}&_t=${Date.now()}`;
      if (selectedBranch !== 'all') {
        url += `&day=${dayOfWeek}`;
      };
      
      console.log('Fetching timetable from:', url);
      const response = await authFetch(url);
      const result = await response.json();
      
      console.log('Timetable API response:', result);
      
      if (result.success) {
        setTimetable(result.data || []);
        console.log('Timetable data set:', result.data || []);
      } else {
        console.error('Failed to fetch timetable:', result.message);
        setTimetable([]);
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
      setTimetable([]);
    }
  };

  const handleSaveEntry = async () => {
    const startTime = startTimeDate.toTimeString().slice(0, 5);
    const endTime = endTimeDate.toTimeString().slice(0, 5);

    if (!subject.trim() || !startTime || !endTime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (selectedBranch === 'all') {
        // Apply to all branches
        const promises = branches.map(branch => {
          const entryData = {
            branch_id: parseInt(branch.id),
            class_id: 1,
            subject: subject.trim(),
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            room: room.trim(),
            notes: notes.trim()
          };

          return authFetch('/api/timetable/timetable_crud.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData),
          });
        });

        await Promise.all(promises);
        Alert.alert('Success', 'Timetable entry added to all branches');
      } else {
        // Single branch
        const entryData = {
          branch_id: parseInt(selectedBranch),
          class_id: 1,
          subject: subject.trim(),
          day_of_week: dayOfWeek,
          start_time: startTime.trim(),
          end_time: endTime.trim(),
          room: room.trim(),
          notes: notes.trim()
        };

        if (editingEntry) {
          entryData.id = editingEntry.id;
        }

        const method = editingEntry ? 'PUT' : 'POST';
        const response = await authFetch('/api/timetable/timetable_crud.php', {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData),
        });

        const result = await response.json();
        if (!result.success) {
          Alert.alert('Error', result.message || 'Failed to save timetable entry');
          return;
        }
        Alert.alert('Success', result.message);
      }

      closeModal();
      fetchTimetable();
    } catch (error) {
      console.error('Error saving timetable entry:', error);
      Alert.alert('Error', 'Failed to save timetable entry');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this timetable entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authFetch('/api/timetable/timetable_crud.php', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: entryId }),
              });

              const result = await response.json();
              if (result.success) {
                Alert.alert('Success', 'Timetable entry deleted successfully');
                fetchTimetable();
              } else {
                Alert.alert('Error', result.message || 'Failed to delete entry');
              }
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          }
        }
      ]
    );
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Timetable',
      'Are you sure you want to delete ALL timetable entries? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authFetch('/api/timetable/timetable_crud.php', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clear_all: true }),
              });

              const result = await response.json();
              if (result.success) {
                Alert.alert('Success', `Cleared ${result.data.deleted_count} timetable entries`);
                setTimetable([]);
              } else {
                Alert.alert('Error', result.message || 'Failed to clear timetable');
              }
            } catch (error) {
              console.error('Error clearing timetable:', error);
              Alert.alert('Error', 'Failed to clear timetable');
            }
          }
        }
      ]
    );
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setSubject('');
    setDayOfWeek(1);
    setRoom('');
    setNotes('');
    // Reset time picker dates
    const now = new Date();
    setStartTimeDate(now);
    setEndTimeDate(new Date(now.getTime() + 60 * 60 * 1000)); // 1 hour later
    setModalVisible(true);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setSubject(entry.subject);
    setDayOfWeek(entry.day_of_week);
    setRoom(entry.room || '');
    setNotes(entry.notes || '');
    
    // Convert time strings to Date objects for time pickers
    const today = new Date();
    const [startHour, startMin] = entry.start_time.split(':');
    const [endHour, endMin] = entry.end_time.split(':');
    
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(startHour), parseInt(startMin));
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(endHour), parseInt(endMin));
    
    setStartTimeDate(startDate);
    setEndTimeDate(endDate);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingEntry(null);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
  };

  const onStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setStartTimeDate(selectedTime);
      const timeString = selectedTime.toTimeString().slice(0, 5); // HH:MM format
      setStartTime(timeString);
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEndTimeDate(selectedTime);
      const timeString = selectedTime.toTimeString().slice(0, 5); // HH:MM format
      setEndTime(timeString);
    }
  };

  const getDayName = (dayNumber) => {
    const day = DAYS_OF_WEEK.find(d => d.value === dayNumber);
    return day ? day.label : 'Unknown';
  };

  const renderTimetableEntry = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
      <LinearGradient colors={Colors.gradientPrimary} style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <Text style={styles.subjectText}>{item.subject}</Text>
          <View style={styles.entryActions}>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
              <Ionicons name="pencil" size={20} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteEntry(item.id)} style={styles.actionButton}>
              <Ionicons name="trash" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.entryDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={Colors.white} />
            <Text style={styles.detailText}>{getDayName(item.day_of_week)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color={Colors.white} />
            <Text style={styles.detailText}>{item.start_time} - {item.end_time}</Text>
          </View>
          {item.room && (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color={Colors.white} />
              <Text style={styles.detailText}>{item.room}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading timetable...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <LottieView source={require('../../assets/Calendar Animation.json')} autoPlay loop style={styles.lottieAnimation} />
        <Animatable.Text animation="fadeInDown" style={styles.title}>Timetable Management</Animatable.Text>
      </LinearGradient>

      <View style={styles.controlsContainer}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedBranch}
            onValueChange={(itemValue) => setSelectedBranch(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="All Branches" value="all" />
            {branches.map(branch => (
              <Picker.Item key={branch.id} label={branch.name} value={branch.id.toString()} />
            ))}
          </Picker>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <LinearGradient colors={['#5D9CEC', '#90C695']} style={styles.buttonGradient}>
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.buttonText}>Add Entry</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={fetchTimetable} style={styles.refreshButton}>
            <LinearGradient colors={['#FFA500', '#FFB84D']} style={styles.buttonGradient}>
              <Ionicons name="refresh" size={20} color={Colors.white} />
              <Text style={styles.buttonText}>Refresh</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.buttonGradient}>
              <Ionicons name="trash" size={20} color={Colors.white} />
              <Text style={styles.buttonText}>Clear All</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={timetable}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTimetableEntry}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank" size={60} color={Colors.lightText} />
            <Text style={styles.emptyText}>No timetable entries found.</Text>
            <Text style={styles.emptySubText}>Add your first entry to get started.</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <Animatable.View animation="fadeInUpBig" style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingEntry ? 'Edit Entry' : 'Add New Entry'}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={22} color={Colors.gray} style={styles.inputIcon} />
                <Picker
                  selectedValue={selectedBranch}
                  onValueChange={(itemValue) => setSelectedBranch(itemValue)}
                  style={styles.pickerInput}
                >
                  <Picker.Item label="All Branches" value="all" />
                  {branches.map(branch => (
                    <Picker.Item key={branch.id} label={branch.name} value={branch.id.toString()} />
                  ))}
                </Picker>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="book-outline" size={22} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Subject *"
                  placeholderTextColor={Colors.gray}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={22} color={Colors.gray} style={styles.inputIcon} />
                <Picker
                  selectedValue={dayOfWeek}
                  onValueChange={(itemValue) => setDayOfWeek(itemValue)}
                  style={styles.pickerInput}
                >
                  {DAYS_OF_WEEK.map(day => (
                    <Picker.Item key={day.value} label={day.label} value={day.value} />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity style={styles.inputContainer} onPress={() => setShowStartTimePicker(true)}>
                <Ionicons name="time-outline" size={22} color={Colors.gray} style={styles.inputIcon} />
                <Text style={[styles.input, styles.timePickerText]}>
                  {startTimeDate.toTimeString().slice(0, 5) || 'Select Start Time *'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.gray} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.inputContainer} onPress={() => setShowEndTimePicker(true)}>
                <Ionicons name="time-outline" size={22} color={Colors.gray} style={styles.inputIcon} />
                <Text style={[styles.input, styles.timePickerText]}>
                  {endTimeDate.toTimeString().slice(0, 5) || 'Select End Time *'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.gray} />
              </TouchableOpacity>

              {/* Time Pickers */}
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTimeDate}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartTimeChange}
                />
              )}

              {showEndTimePicker && (
                <DateTimePicker
                  value={endTimeDate}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onEndTimeChange}
                />
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={22} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Room (optional)"
                  placeholderTextColor={Colors.gray}
                  value={room}
                  onChangeText={setRoom}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="document-text-outline" size={22} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Notes (optional)"
                  placeholderTextColor={Colors.gray}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.button} onPress={closeModal}>
                <LinearGradient colors={['#BDBDBD', '#9E9E9E']} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleSaveEntry}>
                <LinearGradient colors={['#5D9CEC', '#90C695']} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>{editingEntry ? 'Update' : 'Add'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  lottieAnimation: { width: 120, height: 120, position: 'absolute', top: 0, right: 0, opacity: 0.3 },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.white, textAlign: 'center' },
  controlsContainer: { paddingHorizontal: 16, paddingTop: 20 },
  pickerContainer: { backgroundColor: Colors.white, borderRadius: 10, marginBottom: 15, elevation: 2 },
  picker: { height: 50, color: Colors.text },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  addButton: { flex: 1, marginRight: 4, borderRadius: 10, overflow: 'hidden' },
  refreshButton: { flex: 1, marginHorizontal: 4, borderRadius: 10, overflow: 'hidden' },
  clearButton: { flex: 1, marginLeft: 4, borderRadius: 10, overflow: 'hidden' },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
  buttonText: { color: Colors.white, fontWeight: 'bold', marginLeft: 8 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 80 },
  entryCard: { borderRadius: 15, padding: 15, marginBottom: 12, elevation: 3 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subjectText: { fontSize: 18, fontWeight: 'bold', color: Colors.white, flex: 1 },
  entryActions: { flexDirection: 'row' },
  actionButton: { marginLeft: 10, padding: 5 },
  entryDetails: { marginTop: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  detailText: { color: Colors.white, marginLeft: 8, fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  emptyText: { textAlign: 'center', marginTop: 15, fontSize: 18, color: Colors.text, fontWeight: '600' },
  emptySubText: { textAlign: 'center', marginTop: 5, fontSize: 14, color: Colors.lightText },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: Colors.text },
  
  // Modal styles
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: Colors.white, borderRadius: 20, padding: 25, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: Colors.text, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 16, color: Colors.text },
  timePickerText: { 
    lineHeight: 50, 
    color: Colors.text,
    fontSize: 16
  },
  pickerInput: { flex: 1, height: 50 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  button: { flex: 1, marginHorizontal: 5, borderRadius: 10, overflow: 'hidden' },
});
