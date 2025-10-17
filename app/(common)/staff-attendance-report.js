import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';

const { width } = Dimensions.get('window');

export default function StaffAttendanceReport() {
  const router = useRouter();
  const [reportType, setReportType] = useState('daily'); // daily, weekly, monthly
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState(['All']);
  const [selectedBranch, setSelectedBranch] = useState('All');

  useEffect(() => {
    loadBranches();
    generateReport();
  }, [reportType, selectedDate, selectedBranch]);

  const loadBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        setBranches(['All', ...result.data]);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/attendance/staff_attendance_report.php?type=${reportType}`;
      url += `&date=${selectedDate.toISOString().split('T')[0]}`;
      if (selectedBranch !== 'All') {
        url += `&branch_id=${selectedBranch}`;
      }

      const response = await authFetch(url);
      const result = await response.json();
      
      if (result.success) {
        setReportData(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [reportType, selectedDate, selectedBranch]);

  const getDateRangeText = () => {
    const date = selectedDate;
    switch (reportType) {
      case 'daily':
        return date.toLocaleDateString();
      case 'weekly':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      default:
        return date.toLocaleDateString();
    }
  };

  const renderSummaryCards = () => {
    if (!reportData?.summary) return null;

    const { summary } = reportData;
    
    return (
      <View style={styles.summaryContainer}>
        <Animatable.View animation="fadeInLeft" delay={100}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.summaryCard}>
            <MaterialCommunityIcons name="account-group" size={24} color={Colors.white} />
            <Text style={styles.summaryNumber}>{summary.total_staff}</Text>
            <Text style={styles.summaryLabel}>Total Staff</Text>
          </LinearGradient>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={200}>
          <LinearGradient colors={Colors.gradientSuccess} style={styles.summaryCard}>
            <MaterialCommunityIcons name="account-check" size={24} color={Colors.white} />
            <Text style={styles.summaryNumber}>{summary.present_count}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </LinearGradient>
        </Animatable.View>

        <Animatable.View animation="fadeInRight" delay={300}>
          <LinearGradient colors={Colors.gradientDanger} style={styles.summaryCard}>
            <MaterialCommunityIcons name="account-remove" size={24} color={Colors.white} />
            <Text style={styles.summaryNumber}>{summary.absent_count}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </LinearGradient>
        </Animatable.View>

        <Animatable.View animation="fadeInLeft" delay={400}>
          <LinearGradient colors={Colors.gradientWarning} style={styles.summaryCard}>
            <MaterialCommunityIcons name="clock-alert" size={24} color={Colors.white} />
            <Text style={styles.summaryNumber}>{summary.late_count}</Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </LinearGradient>
        </Animatable.View>
      </View>
    );
  };

  const renderAttendanceRate = () => {
    if (!reportData?.summary) return null;

    const rate = reportData.summary.attendance_rate || 0;
    const color = rate >= 90 ? Colors.success : rate >= 75 ? Colors.warning : Colors.danger;

    return (
      <Animatable.View animation="fadeInUp" delay={500} style={styles.rateContainer}>
        <Text style={styles.rateTitle}>Attendance Rate</Text>
        <View style={styles.rateCircle}>
          <Text style={[styles.rateText, { color }]}>{rate}%</Text>
        </View>
        <Text style={styles.rateSubtitle}>
          {rate >= 90 ? 'Excellent' : rate >= 75 ? 'Good' : 'Needs Improvement'}
        </Text>
      </Animatable.View>
    );
  };

  const renderStaffList = () => {
    if (!reportData?.staff_details) return null;

    return (
      <View style={styles.staffListContainer}>
        <Text style={styles.sectionTitle}>Staff Details</Text>
        {reportData.staff_details.map((staff, index) => (
          <Animatable.View 
            key={staff.id} 
            animation="fadeInUp" 
            delay={600 + (index * 100)}
            style={styles.staffItem}
          >
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{staff.name}</Text>
              <Text style={styles.staffRole}>{staff.role} - {staff.branch_name}</Text>
            </View>
            
            <View style={styles.staffStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{staff.present_days}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{staff.absent_days}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{staff.late_days}</Text>
                <Text style={styles.statLabel}>Late</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{staff.total_hours}h</Text>
                <Text style={styles.statLabel}>Hours</Text>
              </View>
            </View>
          </Animatable.View>
        ))}
      </View>
    );
  };

  const renderDepartmentBreakdown = () => {
    if (!reportData?.department_breakdown) return null;

    return (
      <View style={styles.departmentContainer}>
        <Text style={styles.sectionTitle}>Department Breakdown</Text>
        {reportData.department_breakdown.map((dept, index) => (
          <Animatable.View 
            key={dept.role} 
            animation="fadeInLeft" 
            delay={800 + (index * 100)}
            style={styles.departmentItem}
          >
            <View style={styles.departmentHeader}>
              <MaterialCommunityIcons 
                name={dept.role === 'Teacher' ? 'account-tie' : 'account-star'} 
                size={20} 
                color={Colors.primary} 
              />
              <Text style={styles.departmentName}>{dept.role}s</Text>
            </View>
            
            <View style={styles.departmentStats}>
              <Text style={styles.departmentStat}>
                {dept.present}/{dept.total} Present ({dept.attendance_rate}%)
              </Text>
            </View>
          </Animatable.View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Attendance Report</Text>
        <TouchableOpacity style={styles.exportButton}>
          <MaterialCommunityIcons name="download" size={24} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={reportType}
              onValueChange={setReportType}
              style={styles.picker}
            >
              <Picker.Item label="Daily Report" value="daily" />
              <Picker.Item label="Weekly Report" value="weekly" />
              <Picker.Item label="Monthly Report" value="monthly" />
            </Picker>
          </View>

          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
            <Text style={styles.dateText}>{getDateRangeText()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.branchPickerContainer}>
          <Picker
            selectedValue={selectedBranch}
            onValueChange={setSelectedBranch}
            style={styles.picker}
          >
            {branches.map(branch => (
              <Picker.Item 
                key={branch.id || 'All'} 
                label={branch.name || 'All Branches'} 
                value={branch.id || 'All'} 
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons name="loading" size={40} color={Colors.primary} />
            <Text style={styles.loadingText}>Generating report...</Text>
          </View>
        ) : (
          <>
            {renderSummaryCards()}
            {renderAttendanceRate()}
            {renderDepartmentBreakdown()}
            {renderStaffList()}
          </>
        )}
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setSelectedDate(date);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  exportButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
  },
  branchPickerContainer: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  summaryCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.9,
  },
  rateContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginVertical: 16,
    elevation: 3,
  },
  rateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  rateCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  rateSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  staffListContainer: {
    marginVertical: 16,
  },
  staffItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  staffInfo: {
    marginBottom: 12,
  },
  staffName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  staffRole: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  staffStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  departmentContainer: {
    marginVertical: 16,
  },
  departmentItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  departmentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  departmentStats: {
    marginLeft: 28,
  },
  departmentStat: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
