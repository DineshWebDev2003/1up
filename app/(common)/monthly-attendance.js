import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
// import LottieView from 'lottie-react-native'; // DISABLED TO FIX ERRORS
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';

const MonthlyAttendance = ({ students, date, onBack, branchFilter }) => {
  const [currentDate, setCurrentDate] = useState(date || new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState(null);
  const reportRef = useRef();

  // Ensure currentDate is always a valid Date object
  const validDate = currentDate instanceof Date && !isNaN(currentDate) ? currentDate : new Date();
  const year = validDate.getFullYear();
  const month = validDate.getMonth();
  const numDays = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: numDays }, (_, i) => {
    const dayDate = new Date(year, month, i + 1);
    return {
      day: i + 1,
      dayName: dayDate.toLocaleString('en-US', { weekday: 'short' }).substring(0, 3)
    };
  });

  const handleDayPress = (studentName, day, attendanceData) => {
    setSelectedDayData({ studentName, day, ...attendanceData });
    setModalVisible(true);
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const changeYear = (offset) => {
    const newDate = new Date(validDate);
    newDate.setFullYear(newDate.getFullYear() + offset);
    setCurrentDate(newDate);
  };

  const selectMonth = (monthIndex) => {
    const newDate = new Date(validDate);
    newDate.setMonth(monthIndex);
    setCurrentDate(newDate);
    setShowMonthPicker(false);
  };

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required.');
        return;
      }
      
      const uri = await reportRef.current.capture();
      const asset = await MediaLibrary.createAssetAsync(uri);
      const album = await MediaLibrary.getAlbumAsync('School Reports');
      
      if (album === null) {
        await MediaLibrary.createAlbumAsync('School Reports', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
      
      Alert.alert('Success', 'Monthly attendance report saved to gallery!');
    } catch (error) {
      console.error('Failed to save report:', error);
      Alert.alert('Error', 'Failed to save report. Please try again.');
    }
  };



  const renderDay = ({ item: dayData, student }) => {
    // Get real attendance data for this student and day
    const dayDate = new Date(year, month, dayData.day);
    const dayDateStr = dayDate.toISOString().split('T')[0];
    
    // Find attendance record for this student and date
    const attendanceRecord = student.attendanceRecords?.find(record => 
      record.date === dayDateStr
    );
    
    // Only show real attendance data - no mock data
    const attendanceData = attendanceRecord ? {
      status: attendanceRecord.status,
      inTime: attendanceRecord.check_in_time ? attendanceRecord.check_in_time.slice(0, 5) : '--:--',
      outTime: attendanceRecord.check_out_time ? attendanceRecord.check_out_time.slice(0, 5) : '--:--',
      reason: attendanceRecord.remarks || 'No reason provided',
      markedBy: attendanceRecord.marked_by_name || 'N/A',
      guardianType: attendanceRecord.guardian_type || 'N/A',
      isMockData: false
    } : null; // Return null for unmarked days

    return (
      <TouchableOpacity style={styles.dayCell} onPress={() => attendanceData && handleDayPress(student.name, dayData.day, attendanceData)}>
        {attendanceData ? (
          <Ionicons 
            name={
              attendanceData.status === 'present' ? "checkmark-circle" : 
              attendanceData.status === 'absent' ? "close-circle" : 
              "ellipse-outline"
            } 
            size={18} 
            color={
              attendanceData.status === 'present' ? Colors.accent : 
              attendanceData.status === 'absent' ? Colors.danger : 
              Colors.textSecondary
            } 
          />
        ) : (
          // Empty cell for unmarked attendance
          <View style={styles.emptyCell} />
        )}
      </TouchableOpacity>
    );
  };



  const renderStudentRow = ({ item }) => {
    // Use only real attendance data - no mock data
    return (
      <View style={styles.studentRow}>
        <View style={styles.studentNameCell}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={styles.studentId}>(Student ID: {item.id})</Text>
        </View>
        <FlatList
          data={daysArray}
          renderItem={({ item: dayData }) => renderDay({ item: dayData, student: item })}
          keyExtractor={(dayData) => dayData.day.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ViewShot ref={reportRef} options={{ format: 'png', quality: 1 }}>
        <View style={{ backgroundColor: Colors.lightGray }}>
          <LinearGradient colors={Colors.gradient1} style={styles.headerContainer}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              {/* <LottieView source={require('../../assets/lottie/attendance.json')} autoPlay loop style={styles.lottie} /> */}
              <Text style={styles.title}>Monthly Attendance</Text>
              {branchFilter && <Text style={styles.branchText}>{branchFilter}</Text>}
            </View>
            <TouchableOpacity onPress={handleDownload} style={styles.downloadButton}>
              <Ionicons name="download-outline" size={24} color={Colors.white} />
            </TouchableOpacity>
          </LinearGradient>

          <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.dateNavigatorContainer}>
            <View style={styles.dateNavigator}>
              <TouchableOpacity onPress={() => changeYear(-1)} style={styles.navButton}>
                <Ionicons name="chevron-back" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.yearText}>{year}</Text>
              <TouchableOpacity onPress={() => changeYear(1)} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMonthPicker(true)} style={styles.monthDisplay}>
                <Text style={styles.monthText}>{months[month]}</Text>
                <Ionicons name="caret-down" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </Animatable.View>

          <Modal transparent={true} visible={showMonthPicker} onRequestClose={() => setShowMonthPicker(false)} animationType="fade">
            <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowMonthPicker(false)}>
              <Animatable.View animation="zoomIn" duration={400} style={styles.monthPickerContainer}>
                <FlatList
                  data={months}
                  keyExtractor={(item) => item}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity style={styles.monthButton} onPress={() => selectMonth(index)}>
                      <Text style={styles.monthPickerText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </Animatable.View>
            </TouchableOpacity>
          </Modal>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Animatable.View animation="fadeIn" duration={800} delay={400}>
              <View style={styles.headerRow}>
                <View style={[styles.studentNameCell, styles.headerCell]}><Text style={styles.headerCellText}>Student</Text></View>
                {daysArray.map(({ day, dayName }) => (
                  <View key={day} style={[styles.dayCell, styles.headerCell]}>
                    <Text style={styles.dayNameText}>{dayName}</Text>
                    <Text style={styles.dayText}>{day}</Text>
                  </View>
                ))}
              </View>
              <FlatList
                data={students}
                renderItem={renderStudentRow}
                keyExtractor={(item) => item.id}
              />
            </Animatable.View>
          </ScrollView>
        </View>
      </ViewShot>

      <Modal transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(!modalVisible)}>
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={400} style={styles.modalView}>
            <LinearGradient colors={Colors.gradient1} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendance Details</Text>
            </LinearGradient>
            {selectedDayData && (
              <View style={styles.modalContent}>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Student:</Text> {selectedDayData.studentName}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Date:</Text> {selectedDayData.day}/{month + 1}/{year}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Status:</Text> {selectedDayData.status === 'present' ? 'Present' : selectedDayData.status === 'absent' ? 'Absent' : 'Unmarked'}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>In-Time:</Text> {selectedDayData.inTime}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Out-Time:</Text> {selectedDayData.outTime}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Marked By:</Text> {selectedDayData.markedBy}</Text>
                <Text style={styles.modalText}><Text style={styles.modalLabel}>Guardian Type:</Text> {selectedDayData.guardianType}</Text>
                {selectedDayData.reason && selectedDayData.reason !== 'Not marked' && (
                  <Text style={styles.modalText}><Text style={styles.modalLabel}>Remarks:</Text> {selectedDayData.reason}</Text>
                )}
              </View>
            )}
            <TouchableOpacity onPress={() => setModalVisible(!modalVisible)}>
              <LinearGradient colors={[Colors.accent, Colors.danger]} style={styles.buttonClose}>
                <Text style={styles.textStyle}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingTop: Platform.OS === 'android' ? 40 : 20, 
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { alignItems: 'center' },
  lottie: { width: 100, height: 100, marginBottom: -15 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white },
  branchText: { fontSize: 14, color: Colors.white, opacity: 0.9, marginTop: 2 },
  backButton: { padding: 8 },
  downloadButton: { padding: 8 },
  dateNavigatorContainer: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    margin: 15,
    padding: 10,
    ...Platform.select({ ios: { shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }),
  },
  dateNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  navButton: { padding: 5 },
  yearText: { fontSize: 18, fontWeight: 'bold', color: Colors.darkGray },
  monthDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  monthText: { fontSize: 16, fontWeight: 'bold', color: Colors.white, marginRight: 5 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white, marginTop: 10 },
  studentRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  studentNameCell: { width: 150, padding: 12, justifyContent: 'center', backgroundColor: Colors.lightGray },
  studentName: { fontSize: 14, fontWeight: 'bold', color: Colors.darkGray },
  studentId: { fontSize: 12, color: Colors.gray },
  dayCell: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: Colors.border },
  headerCell: { backgroundColor: Colors.primary, borderRightColor: Colors.lightGray },
  headerCellText: { color: Colors.white, fontWeight: 'bold' },
  dayNameText: { fontSize: 12, color: Colors.white, opacity: 0.8 },
  dayText: { fontSize: 14, fontWeight: 'bold', color: Colors.white },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { 
    width: '85%',
    backgroundColor: Colors.white, 
    borderRadius: 20, 
    overflow: 'hidden',
    ...Platform.select({ ios: { shadowRadius: 10, shadowOpacity: 0.15 }, android: { elevation: 10 } }),
  },
  modalHeader: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.white, textAlign: 'center' },
  modalContent: { padding: 20 },
  modalText: { marginBottom: 12, fontSize: 16, color: Colors.darkGray },
  modalLabel: { fontWeight: 'bold', color: Colors.primary },
  buttonClose: { borderRadius: 15, padding: 12, margin: 20, alignItems: 'center' },
  textStyle: { color: Colors.white, fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  monthPickerContainer: { backgroundColor: Colors.white, borderRadius: 15, padding: 10, width: '70%', maxHeight: '60%' },
  monthButton: { paddingVertical: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  monthPickerText: { fontSize: 18, color: Colors.primary },
  mockDataIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 8, backgroundColor: '#fef3c7', borderRadius: 8, alignSelf: 'flex-start' },
  mockDataText: { fontSize: 12, color: '#92400e', marginLeft: 5, fontWeight: '600' },
  emptyCell: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#f3f4f6' },
});

export default MonthlyAttendance;
