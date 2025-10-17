import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Modal, Image, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';

const COLORS = {
    primary: '#5D9CEC', // Sky Blue
    secondary: '#90C695', // Grass Green
    accent: '#FF85A1', // Playful Pink
    danger: '#FF6B6B', // Coral Red
    white: '#FFFFFF',
    text: '#4F4F4F',
    background: '#F5F5F5',
    card: '#FFFFFF',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.6)',
    lightGray: '#E0E0E0',
};


import authFetch from '../utils/api';
import { API_URL } from '../../config';

const MarkAttendanceScreen = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendanceType, setAttendanceType] = useState(null);
  const [isWebViewVisible, setWebViewVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getPermissions();
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/attendance/get_attendance.php');
      const result = await response.json();
      if (result.success) {
        setStudents(result.data);
      } else {
        Alert.alert('Error', 'Failed to fetch students.');
      }
    } catch (error) {
      console.error('Fetch students error:', error);
      Alert.alert('Error', 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPress = (student, type) => {
    setSelectedStudent(student);
    setAttendanceType(type);
    setModalVisible(true);
  };

  const handleGuardianSelection = async (guardian) => {
    const endpoint = attendanceType === 'in' ? '/api/attendance/mark_manual_attendance.php' : '/api/attendance/mark_manual_attendance.php'; // Adjust if you have a separate endpoint for out
    try {
      const response = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudent.id,
          status: attendanceType === 'in' ? 'present' : 'absent', // or another status for out
          date: new Date().toISOString().split('T')[0],
          marked_by: guardian.name
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchStudents(); // Refresh the list
        Alert.alert('Success', `Attendance marked for ${selectedStudent.name}.`);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark attendance.');
      }
    } catch (error) {
      console.error('Mark attendance error:', error);
      Alert.alert('Error', 'An error occurred while marking attendance.');
    }
    setModalVisible(false);
  };

  const getStatusColors = (status) => {
    if (status === 'Present') return [COLORS.secondary, '#79A87D'];
    if (status === 'Absent') return [COLORS.danger, '#E05252'];
    return ['#FF7043', '#FF8A65']; // Orange gradient for unmarked students
  };

  const renderStudentItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={800} delay={index * 100}>
      <LinearGradient colors={getStatusColors(item.status)} style={styles.studentCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Image source={item.avatar ? { uri: `${API_URL}${item.avatar}` } : require('../../assets/Avartar.png')} style={styles.avatar} />
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentId}>{item.id}</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeEntry}>
              <Ionicons name="log-in-outline" size={16} color={COLORS.white} />
              <Text style={styles.timeText}>{item.inTime || '--:--'}</Text>
            </View>
            <View style={styles.timeEntry}>
              <Ionicons name="log-out-outline" size={16} color={COLORS.white} />
              <Text style={styles.timeText}>{item.outTime || '--:--'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => handleMarkPress(item, 'in')}>
            <LinearGradient colors={['#FFFFFF', '#F0F0F0']} style={styles.actionButton}><Text style={[styles.buttonText, { color: COLORS.secondary }]}>IN</Text></LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleMarkPress(item, 'out')}>
            <LinearGradient colors={['#FFFFFF', '#F0F0F0']} style={styles.actionButton}><Text style={[styles.buttonText, { color: COLORS.danger }]}>OUT</Text></LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <Text style={styles.headerSubtitle}>{new Date().toDateString()}</Text>
        </View>
        <LottieView source={require('../../assets/Calendar Animation.json')} autoPlay loop style={styles.lottie} />
      </LinearGradient>

      <TouchableOpacity style={styles.scanButton} onPress={() => setWebViewVisible(true)}>
        <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
        <Text style={styles.scanButtonText}>Scan QR Code for Quick Entry</Text>
      </TouchableOpacity>

      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No students to display.</Text>}
      />

      <Modal visible={isWebViewVisible} transparent={true} animationType="fade" onRequestClose={() => setWebViewVisible(false)}>
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={500} style={styles.scannerModalContent}>
            <Text style={styles.modalTitle}>Attendance Scanner</Text>
            <View style={styles.webviewContainer}>
              <WebView source={{ uri: 'https://webcamtests.com/' }} style={{ flex: 1 }} javaScriptEnabled={true} allowsInlineMediaPlayback={true} mediaPlaybackRequiresUserAction={false} originWhitelist={['*']} />
            </View>
            <TouchableOpacity onPress={() => setWebViewVisible(false)}>
              <LinearGradient colors={[COLORS.danger, '#E05252']} style={styles.closeModalButton}><Text style={styles.closeModalButtonText}>Cancel</Text></LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={500} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Who is with {selectedStudent?.name}?</Text>
            {selectedStudent && [
              { person: { name: selectedStudent.father_name, profilePic: selectedStudent.father_photo }, type: 'Father' },
              { person: { name: selectedStudent.mother_name, profilePic: selectedStudent.mother_photo }, type: 'Mother' },
              { person: { name: selectedStudent.guardian_name, profilePic: selectedStudent.guardian_photo }, type: 'Guardian' },
            ].filter(g => g.person.name).map(({ person, type }) => (
              <TouchableOpacity key={type} style={styles.guardianButton} onPress={() => handleGuardianSelection(person)}>
                <Image source={person.profilePic ? { uri: `${API_URL}${person.profilePic}` } : require('../../assets/Avartar.png')} style={styles.guardianModalAvatar} />
                <View>
                  <Text style={styles.guardianButtonText}>{person.name}</Text>
                  <Text style={styles.guardianTagText}>{type}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: { fontSize: 16, color: COLORS.white, opacity: 0.9 },
  lottie: { width: 100, height: 100 },
  scanButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, margin: 15, padding: 15, borderRadius: 15, elevation: 4, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  scanButtonText: { color: COLORS.primary, marginLeft: 12, fontSize: 16, fontWeight: '600' },
  listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
  studentCard: { flexDirection: 'row', borderRadius: 15, padding: 15, marginBottom: 12, alignItems: 'center', elevation: 5, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: COLORS.white, marginRight: 15 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  studentId: { fontSize: 14, color: COLORS.white, opacity: 0.8, marginBottom: 8 },
  timeRow: { flexDirection: 'row', gap: 15 },
  timeEntry: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: 14, color: COLORS.white, fontWeight: '500' },
  guardianAvatar: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: COLORS.white },
  actionButtons: { flexDirection: 'column', gap: 8 },
  actionButton: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 10, elevation: 2 },
  buttonText: { fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.overlay },
  modalContent: { width: '90%', backgroundColor: COLORS.card, borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: COLORS.text, textAlign: 'center' },
  scannerModalContent: { width: '95%', height: '70%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20, alignItems: 'center' },
  webviewContainer: { width: '100%', flex: 1, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.primary },
  closeModalButton: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25 },
  closeModalButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  guardianButton: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#F8F8F8', padding: 12, borderRadius: 15, marginBottom: 10, justifyContent: 'space-between' },
  guardianModalAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  guardianButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  guardianTagText: { fontSize: 12, color: COLORS.text, opacity: 0.7 },
  cancelButton: { marginTop: 15 },
  cancelButtonText: { color: COLORS.accent, fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#A0A0A0' },
});

export default MarkAttendanceScreen;
