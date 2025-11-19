import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, Linking, Platform 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch, { API_URL } from '../utils/api';
import Colors from '../constants/colors';

export default function EnhancedMonthlyAttendance() {
  const [currentUser, setCurrentUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('student'); // 'student' or 'teacher'

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  useEffect(() => {
    loadUserData();
    fetchBranches();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMonthlyData();
    }
  }, [selectedBranch, selectedYear, selectedMonth, reportType, currentUser]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        setBranches([{ id: 'all', name: 'All Branches' }, ...result.data]);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchMonthlyData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        month: selectedMonth.toString()
      });

      if (selectedBranch !== 'all') {
        params.append('branch_id', selectedBranch);
      }

      const response = await authFetch(`/api/attendance/get_monthly_attendance.php?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setAttendanceData(result.data || []);
      } else {
        Alert.alert('Error', result.message || 'Failed to fetch attendance data');
      }
    } catch (error) {
      console.error('Failed to fetch monthly data:', error);
      Alert.alert('Error', 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format) => {
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
        format: format, // 'pdf' or 'csv'
        type: reportType // 'student' or 'teacher'
      });

      if (selectedBranch !== 'all') {
        params.append('branch_id', selectedBranch);
      }

      const downloadUrl = `${API_URL}/api/attendance/download_monthly_report.php?${params}`;
      
      // Get session token for authentication
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (sessionToken) {
        // For authenticated downloads, we need to handle this differently
        // Since we can't set headers in Linking.openURL, we'll show the URL
        Alert.alert(
          'Download Report',
          `Your ${format.toUpperCase()} report is ready. Copy this link to download:\n\n${downloadUrl}`,
          [
            { text: 'Copy Link', onPress: () => {
              // In a real app, you'd copy to clipboard
              console.log('Download URL:', downloadUrl);
            }},
            { text: 'Open in Browser', onPress: () => Linking.openURL(downloadUrl) }
          ]
        );
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to generate report');
    }
  };

  const getAttendanceStats = () => {
    if (!attendanceData.length) return { total: 0, present: 0, absent: 0, percentage: 0 };
    
    const total = attendanceData.length;
    const present = attendanceData.filter(record => record.status === 'present').length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return { total, present, absent, percentage };
  };

  const stats = getAttendanceStats();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <Text style={styles.headerTitle}>Monthly Attendance Report</Text>
        <Text style={styles.headerSubtitle}>
          {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Controls */}
        <Animatable.View animation="fadeInUp" duration={600} style={styles.controlsCard}>
          <Text style={styles.cardTitle}>Report Settings</Text>
          
          {/* Report Type Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, reportType === 'student' && styles.toggleButtonActive]}
              onPress={() => setReportType('student')}
            >
              <MaterialIcons 
                name="school" 
                size={20} 
                color={reportType === 'student' ? Colors.white : Colors.primary} 
              />
              <Text style={[styles.toggleText, reportType === 'student' && styles.toggleTextActive]}>
                Students
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.toggleButton, reportType === 'teacher' && styles.toggleButtonActive]}
              onPress={() => setReportType('teacher')}
            >
              <MaterialIcons 
                name="person" 
                size={20} 
                color={reportType === 'teacher' ? Colors.white : Colors.primary} 
              />
              <Text style={[styles.toggleText, reportType === 'teacher' && styles.toggleTextActive]}>
                Teachers
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Selectors */}
          <View style={styles.dateSelectors}>
            <View style={styles.selectorContainer}>
              <Text style={styles.selectorLabel}>Month</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={setSelectedMonth}
                  style={styles.picker}
                >
                  {months.map(month => (
                    <Picker.Item key={month.value} label={month.label} value={month.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.selectorContainer}>
              <Text style={styles.selectorLabel}>Year</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={setSelectedYear}
                  style={styles.picker}
                >
                  {years.map(year => (
                    <Picker.Item key={year} label={year.toString()} value={year} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Branch Selector (for Admin/Franchisee) */}
          {currentUser?.role === 'Admin' && (
            <View style={styles.selectorContainer}>
              <Text style={styles.selectorLabel}>Branch</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedBranch}
                  onValueChange={setSelectedBranch}
                  style={styles.picker}
                >
                  {branches.map(branch => (
                    <Picker.Item key={branch.id} label={branch.name} value={branch.id} />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </Animatable.View>

        {/* Statistics */}
        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.statsCard}>
          <Text style={styles.cardTitle}>Attendance Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <MaterialIcons name="group" size={24} color={Colors.primary} />
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Records</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="check-circle" size={24} color={Colors.success} />
              <Text style={styles.statNumber}>{stats.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="cancel" size={24} color={Colors.error} />
              <Text style={styles.statNumber}>{stats.absent}</Text>
              <Text style={styles.statLabel}>Absent</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="trending-up" size={24} color={Colors.warning} />
              <Text style={styles.statNumber}>{stats.percentage}%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Download Buttons */}
        <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.downloadCard}>
          <Text style={styles.cardTitle}>Download Reports</Text>
          <View style={styles.downloadButtons}>
            <TouchableOpacity
              style={[styles.downloadButton, styles.pdfButton]}
              onPress={() => downloadReport('pdf')}
            >
              <MaterialIcons name="picture-as-pdf" size={24} color={Colors.white} />
              <Text style={styles.downloadButtonText}>Download PDF</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.downloadButton, styles.csvButton]}
              onPress={() => downloadReport('csv')}
            >
              <MaterialIcons name="table-chart" size={24} color={Colors.white} />
              <Text style={styles.downloadButtonText}>Download CSV</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* Data Preview */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading attendance data...</Text>
          </View>
        ) : (
          <Animatable.View animation="fadeInUp" duration={600} delay={600} style={styles.dataCard}>
            <Text style={styles.cardTitle}>Recent Records</Text>
            {attendanceData.slice(0, 10).map((record, index) => (
              <View key={index} style={styles.recordItem}>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordName}>
                    {record.student_name || record.teacher_name || 'Unknown'}
                  </Text>
                  <Text style={styles.recordDate}>{record.date}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  record.status === 'present' ? styles.presentBadge : styles.absentBadge
                ]}>
                  <Text style={styles.statusText}>{record.status}</Text>
                </View>
              </View>
            ))}
            {attendanceData.length === 0 && (
              <Text style={styles.noDataText}>No attendance records found for this period.</Text>
            )}
          </Animatable.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  controlsCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  dateSelectors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectorContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: Colors.text,
  },
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  downloadCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  downloadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  pdfButton: {
    backgroundColor: Colors.error,
  },
  csvButton: {
    backgroundColor: Colors.success,
  },
  downloadButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dataCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    marginBottom: 30,
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  recordDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  presentBadge: {
    backgroundColor: Colors.success,
  },
  absentBadge: {
    backgroundColor: Colors.error,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});
