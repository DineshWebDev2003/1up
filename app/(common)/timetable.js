import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert, Modal, StatusBar } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import LottieView from 'lottie-react-native';
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
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
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a8edea', '#fed6e3'],
  ['#ff9a9e', '#fecfef'],
  ['#ffecd2', '#fcb69f'],
];

const subjectIcons = {
  'Math': 'calculator',
  'Mathematics': 'calculator',
  'English': 'book-alphabet',
  'Science': 'flask',
  'Physics': 'atom',
  'Chemistry': 'test-tube',
  'Biology': 'leaf',
  'History': 'book-clock',
  'Geography': 'earth',
  'Art': 'palette',
  'Music': 'music',
  'PE': 'run',
  'Sports': 'basketball',
  'Computer': 'laptop',
  'default': 'book-open-page-variant'
};

const getSubjectIcon = (subject) => {
  const key = Object.keys(subjectIcons).find(key => 
    subject.toLowerCase().includes(key.toLowerCase())
  );
  return subjectIcons[key] || subjectIcons.default;
};

export default function TimetableScreen() {
  const { branch: initialBranchName, branch_id: initialBranchId } = useLocalSearchParams();
  const [selectedDay, setSelectedDay] = useState(getToday());
  const [timetableData, setTimetableData] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  // Ensure initialBranchId is numeric
  const numericInitialBranchId = initialBranchId ? parseInt(initialBranchId, 10) : '';
  const [selectedBranch, setSelectedBranch] = useState(numericInitialBranchId);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditTimeModalVisible, setIsEditTimeModalVisible] = useState(false);
  const [newEntry, setNewEntry] = useState({ start_time: '', end_time: '', subject: '', room: '' });
  const [editingTime, setEditingTime] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [canEdit, setCanEdit] = useState(false);

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
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || '');
      
      // Check if user can edit timetable (only admin and franchisee)
      const roleLower = (role || '').toLowerCase();
      const hasEditPermission = roleLower.includes('admin') || roleLower.includes('administrator') || roleLower.includes('franchisee');
      setCanEdit(hasEditPermission);
      
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
      console.log('🏭 Fetching branches for user role:', userRole);
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      console.log('🏭 Branches API full response:', result);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log('🏭 Available branches data:', result.data);
        setBranches(result.data);
        
        // If no initial branch selected and branches available, select first one
        if (!numericInitialBranchId && result.data.length > 0) {
          const firstBranchId = parseInt(result.data[0].id, 10);
          console.log('🏭 Auto-selecting first branch:', firstBranchId);
          setSelectedBranch(firstBranchId);
        } else if (numericInitialBranchId) {
          console.log('🏭 Using initial branch ID:', numericInitialBranchId);
          setSelectedBranch(numericInitialBranchId);
        }
      } else {
        console.error('❌ Failed to fetch branches:', result.message || 'Invalid response format');
        setBranches([]);
        Alert.alert('Error', 'Failed to fetch branches.');
      }
    } catch (error) {
      console.error('Fetch branches error:', error);
      setBranches([]);
      if (error.message !== 'Unauthorized') {
        Alert.alert('Error', 'Failed to fetch branches.');
      }
    }
  };

  const fetchTeachers = async (branchId) => {
    try {
      // Ensure branchId is numeric
      const numericBranchId = parseInt(branchId, 10);
      if (isNaN(numericBranchId)) {
        console.error('Invalid branch ID for teachers:', branchId);
        setTeachers([]);
        return;
      }
      
      const response = await authFetch(`/api/teachers/get_teachers.php?branch_id=${numericBranchId}`);
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
      setTeachers([]);
      if (error.message !== 'Unauthorized') {
        console.log('Could not connect to the server to fetch teachers.');
      }
    }
  };

  const fetchTimetable = async (branchId) => {
    // Ensure branchId is numeric
    const numericBranchId = parseInt(branchId, 10);
    if (isNaN(numericBranchId)) {
      console.error('Invalid branch ID:', branchId);
      Alert.alert('Error', 'Invalid branch selected');
      setLoading(false);
      return;
    }
    
    console.log(`Fetching timetable for branch: ${numericBranchId}, day: ${selectedDay}`);
    setLoading(true);
    try {
      const response = await authFetch(`/api/timetable.php?branch_id=${numericBranchId}&day=${selectedDay}`);
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

    // Ensure branch_id is numeric
    const numericBranchId = parseInt(selectedBranch, 10);
    if (isNaN(numericBranchId)) {
      Alert.alert('Error', 'Please select a valid branch');
      return;
    }

    try {
      const response = await authFetch('/api/timetable.php', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: numericBranchId,
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInDown" duration={800}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="calendar-clock" size={32} color={Colors.white} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title}>Class Timetable</Text>
                  <Text style={styles.subtitle}>{currentBranchName}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.todayBadge}>
                  <Text style={styles.todayText}>{selectedDay}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animatable.View>

        {!initialBranchId && (
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedBranch}
                onValueChange={(itemValue) => {
                  // Ensure we're setting a numeric ID
                  const numericId = parseInt(itemValue, 10);
                  console.log('Branch selected:', numericId, 'from branches:', branches);
                  setSelectedBranch(numericId);
                }}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                enabled={branches.length > 0}
              >
                {branches.length > 0 ? (
                  branches.map((branch) => (
                    <Picker.Item 
                      key={branch.id} 
                      label={branch.name || `Branch ${branch.id}`} 
                      value={parseInt(branch.id, 10)} 
                    />
                  ))
                ) : (
                  <Picker.Item label="Loading branches..." value={0} enabled={false} />
                )}
              </Picker>
            </View>
          </Animatable.View>
        )}

        <Animatable.View animation="fadeInUp" duration={800} delay={400}>
          <View style={styles.daySelectorWrapper}>
            <Text style={styles.sectionTitle}>Select Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorContainer}>
              {(days && Array.isArray(days)) ? days.map((day, index) => {
                const isToday = day === getToday();
                const isSelected = selectedDay === day;
                return (
                  <Animatable.View key={day} animation="bounceIn" delay={index * 100}>
                    <TouchableOpacity
                      style={[
                        styles.dayButton, 
                        isSelected && styles.selectedDayButton,
                        isToday && !isSelected && styles.todayDayButton
                      ]}
                      onPress={() => { setSelectedDay(day); setEditingCell(null); }}
                      activeOpacity={0.8}
                    >
                      {isToday && !isSelected && (
                        <View style={styles.todayIndicator} />
                      )}
                      <Text style={[
                        styles.dayText, 
                        isSelected && styles.selectedDayText,
                        isToday && !isSelected && styles.todayDayText
                      ]}>{day}</Text>
                      {isSelected && (
                        <MaterialCommunityIcons name="check-circle" size={16} color="white" style={styles.selectedIcon} />
                      )}
                    </TouchableOpacity>
                  </Animatable.View>
                );
              }) : null}
            </ScrollView>
          </View>
        </Animatable.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <LottieView
              source={require('../../assets/Calendar Animation.json')}
              autoPlay
              loop
              style={styles.loadingAnimation}
            />
            <Text style={styles.loadingText}>Loading timetable...</Text>
          </View>
        ) : (
          <View style={styles.timetableContainer}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              <Text style={styles.scheduleCount}>
                {timetableData[selectedDay]?.length || 0} periods
              </Text>
            </View>
            
            {(timetableData[selectedDay] && timetableData[selectedDay].length > 0) ? (
              (timetableData[selectedDay] && Array.isArray(timetableData[selectedDay])) ? timetableData[selectedDay].map((item, index) => (
                <Animatable.View key={item.id} animation="slideInRight" duration={600} delay={index * 150}>
                  <View style={styles.cardWrapper}>
                    <LinearGradient colors={cardGradients[index % cardGradients.length]} style={styles.card}>
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <View style={styles.timeContainer}>
                            <MaterialCommunityIcons name="clock-outline" size={18} color="rgba(255,255,255,0.9)" />
                            {canEdit ? (
                              <TouchableOpacity onPress={() => { setEditingTime({ id: item.id, time: `${item.start_time} - ${item.end_time}` }); setIsEditTimeModalVisible(true); }}>
                                <Text style={styles.timeText}>{item.start_time} - {item.end_time}</Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={styles.timeText}>{item.start_time} - {item.end_time}</Text>
                            )}
                          </View>
                          {canEdit && (
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                              <MaterialCommunityIcons name="close-circle" size={24} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        <View style={styles.subjectContainer}>
                          <MaterialCommunityIcons 
                            name={getSubjectIcon(item.subject)} 
                            size={24} 
                            color="rgba(255,255,255,0.9)" 
                            style={styles.subjectIcon}
                          />
                          <View style={styles.subjectInfo}>
                            {canEdit ? (
                              <TouchableOpacity onPress={() => setEditingCell({ day: selectedDay, timeId: item.id, originalPeriod: item.subject })}>
                                {editingCell?.day === selectedDay && editingCell?.timeId === item.id ? (
                                  <TextInput
                                    defaultValue={item.subject}
                                    onEndEditing={(e) => handleUpdate(e.nativeEvent.text)}
                                    onBlur={() => setEditingCell(null)}
                                    autoFocus
                                    style={[styles.subjectText, styles.input]}
                                    placeholderTextColor="rgba(255,255,255,0.7)"
                                  />
                                ) : (
                                  <Text style={styles.subjectText}>{item.subject}</Text>
                                )}
                              </TouchableOpacity>
                            ) : (
                              <Text style={styles.subjectText}>{item.subject}</Text>
                            )}
                            {item.room && (
                              <View style={styles.roomContainer}>
                                <MaterialCommunityIcons name="map-marker" size={14} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.roomText}>{item.room}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      
                    </LinearGradient>
                  </View>
                </Animatable.View>
              )) : null
            ) : (
              <Animatable.View animation="fadeIn" duration={800}>
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="calendar-remove" size={64} color="#E0E0E0" />
                  <Text style={styles.emptyTitle}>No Classes Today</Text>
                  <Text style={styles.emptyText}>No schedule found for {selectedDay}</Text>
                  {canEdit && (
                    <TouchableOpacity style={styles.addFirstButton} onPress={() => setIsAddModalVisible(true)}>
                      <MaterialCommunityIcons name="plus" size={20} color="white" />
                      <Text style={styles.addFirstButtonText}>Add First Period</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animatable.View>
            )}
          </View>
        )}
      </ScrollView>

      {canEdit && timetableData[selectedDay]?.length > 0 && (
        <Animatable.View animation="bounceIn" delay={1000}>
          <TouchableOpacity style={styles.fab} onPress={() => setIsAddModalVisible(true)} activeOpacity={0.8}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.fabGradient}>
              <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>
      )}

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
              placeholderTextColor={Colors.textSecondary}
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
              placeholderTextColor={Colors.textSecondary}
              value={newEntry.start_time}
              onChangeText={(text) => setNewEntry({ ...newEntry, start_time: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="End Time (e.g., 10:00:00)"
              placeholderTextColor={Colors.textSecondary}
              value={newEntry.end_time}
              onChangeText={(text) => setNewEntry({ ...newEntry, end_time: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Subject/Period"
              placeholderTextColor={Colors.textSecondary}
              value={newEntry.subject}
              onChangeText={(text) => setNewEntry({ ...newEntry, subject: text })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Room (e.g., Room A1)"
              placeholderTextColor={Colors.textSecondary}
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
    paddingTop: Platform.OS === 'android' ? 50 : 30,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    backgroundColor: Colors.primary,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: Colors.white,
    marginBottom: 2,
  },
  subtitle: { 
    fontSize: 14, 
    color: Colors.textSecondary,
  },
  headerRight: {},
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  todayText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 15,
  },
  pickerContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: Colors.white,
    borderRadius: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  picker: { height: 50, width: '100%' },
  pickerItem: { fontSize: 16 },
  daySelectorWrapper: {
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  daySelectorContainer: { 
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  dayButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 6,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    minWidth: 60,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  selectedDayButton: { 
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    transform: [{ scale: 1.05 }],
  },
  todayDayButton: {
    borderColor: Colors.success,
    borderWidth: 2,
  },
  todayIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  dayText: { 
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDayText: { 
    color: Colors.white,
    fontWeight: '700',
  },
  todayDayText: {
    color: Colors.success,
    fontWeight: '700',
  },
  selectedIcon: {
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingAnimation: {
    width: 100,
    height: 100,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 15,
    fontWeight: '500',
  },
  timetableContainer: { 
    paddingHorizontal: 20, 
    paddingBottom: 40,
    paddingTop: 10,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  scheduleCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardContent: { 
    padding: 20,
  },
  cardHeader: { 
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: { 
    padding: 8,
  },
  timeText: { 
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 8,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subjectIcon: {
    marginRight: 15,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectText: { 
    fontSize: 18,
    color: 'white',
    fontWeight: '700',
    marginBottom: 4,
  },
  roomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addFirstButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 25,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 18,
    fontSize: 16,
    marginBottom: 20,
    color: '#2c3e50',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: 'white',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
