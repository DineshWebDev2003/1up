import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

// Mock data for monthly attendance
const monthlyData = {
  'S001': { name: 'John Doe', attendance: { '1': 'P', '2': 'P', '3': 'A', '4': 'P', '5': 'P' /* ... more days */ } },
  'S003': { name: 'Alex Johnson', attendance: { '1': 'P', '2': 'A', '3': 'P', '4': 'P', '5': 'P' /* ... */ } },
  'S004': { name: 'Patricia Brown', attendance: { '1': 'A', '2': 'P', '3': 'P', '4': 'A', '5': 'P' /* ... */ } },
};

const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

export default function MonthlyAttendance({ students, date, onBack }) {
  const reportRef = useRef();

  const handleCellPress = (studentName, day, status) => {
    Alert.alert(
      `Attendance for ${studentName}`,
      `Date: ${day}/${date.getMonth() + 1}/${date.getFullYear()}\nStatus: ${status === 'P' ? 'Present' : 'Absent'}`
    );
  };

  const handleDownload = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access media library is required.');
      return;
    }

    try {
      const uri = await reportRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'Monthly report saved to gallery!');
    } catch (error) {
      console.error('Failed to save report:', error);
      Alert.alert('Error', 'Failed to save report.');
    }
  };
  const filteredStudents = students.filter(s => monthlyData[s.studentId]);

  return (
    <View style={styles.container}>
      <ViewShot ref={reportRef} options={{ format: 'png', quality: 1 }}>
        <View style={{ backgroundColor: '#fff', paddingVertical: 10 }}>
          <Text style={styles.title}>Monthly Report - {date.toLocaleString('default', { month: 'long' })} {date.getFullYear()}</Text>
          <Text style={styles.branchTitle}>Branch: All</Text> {/* This can be made dynamic later */}
          <ScrollView horizontal>
            <View>
              {/* Header Row */}
              <View style={styles.row}>
                <Text style={[styles.cell, styles.headerCell, styles.nameCell]}>Student Name</Text>
                {daysInMonth.map(day => <Text key={day} style={[styles.cell, styles.headerCell]}>{day}</Text>)}
              </View>

              {/* Student Rows */}
              {filteredStudents.map(student => (
                <View key={student.id} style={styles.row}>
                  <Text style={[styles.cell, styles.nameCell]}>{student.name}</Text>
                  {daysInMonth.map(day => {
                    const status = monthlyData[student.studentId]?.attendance[day] || '';
                    return (
                      <TouchableOpacity key={day} onPress={() => handleCellPress(student.name, day, status)} style={[styles.cell, status === 'P' ? styles.present : styles.absent]}>
                        <Text style={styles.cellText}>{status}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ViewShot>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
          <Text style={styles.buttonText}>Download Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.buttonText}>Back to Daily View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  branchTitle: { fontSize: 16, textAlign: 'center', marginBottom: 15, color: '#555' },
  row: { flexDirection: 'row' },
  cell: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  headerCell: { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
  nameCell: { width: 150, justifyContent: 'flex-start', paddingLeft: 10 },
  present: { backgroundColor: '#d4edda' },
  absent: { backgroundColor: '#f8d7da' },
  cellText: { fontSize: 14 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15 },
  downloadButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, alignItems: 'center', flex: 1, marginRight: 10 },
  backButton: { backgroundColor: '#6c757d', padding: 15, borderRadius: 10, alignItems: 'center', flex: 1 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
