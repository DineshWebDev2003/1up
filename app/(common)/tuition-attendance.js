import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useColors } from '../hooks/useColors';
import Header from '../components/Header';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TuitionAttendanceScreen() {
  const Colors = useColors();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [userData, setUserData] = useState(null);

  const getStyles = () => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    dateSelector: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    dateText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.text,
      marginHorizontal: 15,
    },
    dateButton: {
      padding: 10,
      borderRadius: 25,
      backgroundColor: Colors.primary,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 15,
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
      marginTop: 5,
    },
    studentCard: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 15,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    studentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    studentAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    studentInfo: {
      flex: 1,
    },
    studentName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.text,
    },
    studentId: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginTop: 2,
    },
    attendanceButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    attendanceButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    attendanceGradient: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    attendanceText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 5,
    },
    saveButton: {
      marginTop: 20,
      borderRadius: 15,
      overflow: 'hidden',
    },
    saveGradient: {
      paddingVertical: 15,
      alignItems: 'center',
    },
    saveText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: Colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 50,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.textSecondary,
      marginTop: 15,
    },
    emptySubtext: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: 'center',
      marginTop: 5,
    },
  });

  const styles = getStyles();

  useEffect(() => {
    loadUserData();
    loadStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      loadAttendance();
    }
  }, [selectedDate, students]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserData(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/tuition/get_students.php');
      const result = await response.json();
      
      if (result.success) {
        setStudents(result.data || []);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await authFetch(`/api/tuition/get_attendance.php?date=${selectedDate}`);
      const result = await response.json();
      
      if (result.success) {
        const attendanceMap = {};
        result.data.forEach(record => {
          attendanceMap[record.student_id] = record.status;
        });
        setAttendance(attendanceMap);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const changeDate = (days) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const saveAttendance = async () => {
    try {
      setLoading(true);
      
      const attendanceData = students.map(student => ({
        student_id: student.id,
        student_name: student.name,
        status: attendance[student.id] || 'absent',
        date: selectedDate,
        teacher_id: userData?.id,
      }));

      const response = await authFetch('/api/tuition/save_attendance.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attendance: attendanceData }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Attendance saved successfully!');
      } else {
        Alert.alert('Error', result.message || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      Alert.alert('Error', 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const total = students.length;
    const present = Object.values(attendance).filter(status => status === 'present').length;
    const absent = Object.values(attendance).filter(status => status === 'absent').length;
    const late = Object.values(attendance).filter(status => status === 'late').length;
    
    return { total, present, absent, late };
  };

  const renderStudentItem = ({ item, index }) => {
    const studentAttendance = attendance[item.id] || 'absent';
    
    return (
      <Animatable.View 
        animation="fadeInUp" 
        delay={index * 100} 
        duration={600}
        style={styles.studentCard}
      >
        <View style={styles.studentHeader}>
          <View style={styles.studentAvatar}>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentId}>ID: {item.student_id || item.id}</Text>
          </View>
        </View>

        <View style={styles.attendanceButtons}>
          <TouchableOpacity
            style={styles.attendanceButton}
            onPress={() => handleAttendanceChange(item.id, 'present')}
          >
            <LinearGradient
              colors={studentAttendance === 'present' ? Colors.gradientSuccess : ['#E0E0E0', '#BDBDBD']}
              style={styles.attendanceGradient}
            >
              <MaterialCommunityIcons 
                name="check-circle" 
                size={16} 
                color={studentAttendance === 'present' ? 'white' : '#666'} 
              />
              <Text style={[styles.attendanceText, { color: studentAttendance === 'present' ? 'white' : '#666' }]}>
                Present
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attendanceButton}
            onPress={() => handleAttendanceChange(item.id, 'late')}
          >
            <LinearGradient
              colors={studentAttendance === 'late' ? Colors.gradientWarning : ['#E0E0E0', '#BDBDBD']}
              style={styles.attendanceGradient}
            >
              <MaterialCommunityIcons 
                name="clock-alert" 
                size={16} 
                color={studentAttendance === 'late' ? 'white' : '#666'} 
              />
              <Text style={[styles.attendanceText, { color: studentAttendance === 'late' ? 'white' : '#666' }]}>
                Late
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attendanceButton}
            onPress={() => handleAttendanceChange(item.id, 'absent')}
          >
            <LinearGradient
              colors={studentAttendance === 'absent' ? ['#F44336', '#D32F2F'] : ['#E0E0E0', '#BDBDBD']}
              style={styles.attendanceGradient}
            >
              <MaterialCommunityIcons 
                name="close-circle" 
                size={16} 
                color={studentAttendance === 'absent' ? 'white' : '#666'} 
              />
              <Text style={[styles.attendanceText, { color: studentAttendance === 'absent' ? 'white' : '#666' }]}>
                Absent
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animatable.View>
    );
  };

  if (loading && students.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="📋 Take Attendance" subtitle="Mark student attendance" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getAttendanceStats();

  return (
    <SafeAreaView style={styles.container}>
      <Header title="📋 Take Attendance" subtitle="Mark student attendance" />
      
      <View style={styles.content}>
        {/* Date Selector */}
        <Animatable.View animation="fadeInDown" duration={600} style={styles.dateSelector}>
          <View style={styles.dateHeader}>
            <TouchableOpacity style={styles.dateButton} onPress={() => changeDate(-1)}>
              <MaterialCommunityIcons name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.dateText}>
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            
            <TouchableOpacity style={styles.dateButton} onPress={() => changeDate(1)}>
              <MaterialCommunityIcons name="chevron-right" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Stats */}
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
              <Text style={[styles.statNumber, { color: Colors.warning }]}>{stats.late}</Text>
              <Text style={styles.statLabel}>Late</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.error }]}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Students List */}
        {students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No Students Found</Text>
            <Text style={styles.emptySubtext}>
              No students are assigned to your tuition classes
            </Text>
          </View>
        ) : (
          <FlatList
            data={students}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        {/* Save Button */}
        {students.length > 0 && (
          <Animatable.View animation="fadeInUp" duration={600} style={styles.saveButton}>
            <TouchableOpacity onPress={saveAttendance} disabled={loading}>
              <LinearGradient colors={Colors.gradientPrimary} style={styles.saveGradient}>
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveText}>Save Attendance</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        )}
      </View>
    </SafeAreaView>
  );
}
