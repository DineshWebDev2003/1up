import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MonthlyAttendance from './monthly-attendance';
import authFetch from '../utils/api';

export default function MonthlyAttendanceScreen() {
  const { branch_id, branch_name, date, students: studentsParam } = useLocalSearchParams();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBranch, setCurrentBranch] = useState('');

  useEffect(() => {
    const loadStudents = async () => {
      try {
        // If students were passed as parameter, use them
        if (studentsParam) {
          const parsedStudents = JSON.parse(studentsParam);
          setStudents(parsedStudents);
          setLoading(false);
          return;
        }

        // Otherwise fetch students for the branch
        let studentsUrl = '/api/students/get_students.php';
        if (branch_id && branch_id !== 'All') {
          studentsUrl += `?branch_id=${branch_id}`;
        }
        
        const studentsResponse = await authFetch(studentsUrl);
        const studentsResult = await studentsResponse.json();

        if (studentsResult.success) {
          const studentsData = studentsResult.data || [];
          
          // Set current branch name
          if (branch_name) {
            setCurrentBranch(branch_name);
          } else if (branch_id && branch_id !== 'All') {
            // Try to get branch name from students data
            const firstStudent = studentsData[0];
            if (firstStudent && firstStudent.branch_name) {
              setCurrentBranch(firstStudent.branch_name);
            }
          }
          
          // Fetch attendance records for the current month
          const currentDate = date ? new Date(date) : new Date();
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth() + 1;
          
          try {
            const branchQuery = branch_id && branch_id !== 'All' ? `&branch_id=${branch_id}` : '';
            const attendanceRes = await authFetch(
              `/api/attendance/get_new_attendance.php?year=${year}&month=${month}${branchQuery}`
            );
            const attendanceData = await attendanceRes.json();
            
            const attendanceMap = new Map();
            if (attendanceData.success && Array.isArray(attendanceData.data)) {
              console.log('📊 Attendance data received:', attendanceData.data.length, 'records');
              console.log('📊 Sample attendance record:', attendanceData.data[0]);
              
              attendanceData.data.forEach((record, index) => {
                // Create multiple keys for different ID formats to ensure matching
                const keys = [
                  `${record.student_id}_${record.date}`,
                  `${record.student_code}_${record.date}`,
                  `${record.id}_${record.date}`
                ];
                
                if (index === 0) {
                  console.log('🔑 Sample keys created:', keys);
                }
                
                const attendanceRecord = {
                  date: record.date,
                  status: record.status,
                  check_in_time: record.in_time,
                  check_out_time: record.out_time,
                  remarks: record.remarks,
                  marked_by_name: record.marked_by_name || record.in_by || record.out_by,
                  guardian_type: record.in_guardian_type || record.out_guardian_type
                };
                
                // Store with all possible key combinations
                keys.forEach(key => {
                  if (key && !key.startsWith('undefined') && !key.startsWith('null')) {
                    attendanceMap.set(key, attendanceRecord);
                  }
                });
              });
              console.log('✅ Attendance map created with', attendanceMap.size, 'entries');
              console.log('🗺️ Sample map keys:', Array.from(attendanceMap.keys()).slice(0, 5));
            } else {
              console.error('❌ Attendance data error:', attendanceData);
            }
            
            console.log('👥 Sample student data:', studentsData[0]);
            
            const studentsWithAttendance = studentsData.map((student, index) => {
              const studentAttendance = [];
              
              // Try multiple ID formats to find attendance records
              const studentIds = [
                student.student_id,
                student.id,
                student.user_id,
                student.internal_id
              ].filter(id => id); // Remove null/undefined values
              
              if (index === 0) {
                console.log('🔍 Sample student:', student.name, 'with IDs:', studentIds);
              }
              
              // Generate attendance records for each day of the month
              const daysInMonth = new Date(year, month, 0).getDate();
              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                // Try all possible ID combinations
                let record = null;
                const triedKeys = [];
                for (const id of studentIds) {
                  const key = `${id}_${dateStr}`;
                  triedKeys.push(key);
                  record = attendanceMap.get(key);
                  if (record) {
                    if (index === 0 && day <= 5) {
                      console.log('✅ Found attendance for', student.name, 'on', dateStr, 'with key:', key, 'status:', record.status);
                    }
                    break;
                  }
                }
                
                if (!record && index === 0 && day <= 5) {
                  console.log('❌ No attendance found for', student.name, 'on', dateStr, 'tried keys:', triedKeys);
                }
                
                if (record) {
                  studentAttendance.push(record);
                }
              }
              
              if (index === 0) {
                console.log('📋 Sample student', student.name, 'has', studentAttendance.length, 'attendance records');
              }
              
              return {
                ...student,
                name: student.name || student.username || student.student_id || 'Unknown Student',
                attendanceRecords: studentAttendance
              };
            });
            
            setStudents(studentsWithAttendance);
          } catch (attendanceError) {
            console.error('Error fetching attendance data:', attendanceError);
            // Set students without attendance data
            const studentsWithoutAttendance = studentsData.map(student => ({
              ...student,
              name: student.name || student.username || student.student_id || 'Unknown Student',
              attendanceRecords: []
            }));
            setStudents(studentsWithoutAttendance);
          }
        } else {
          console.error('Failed to fetch students');
          setStudents([]);
        }
      } catch (error) {
        console.error('Error loading students:', error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [branch_id, studentsParam, date]);

  const handleBack = () => {
    router.back();
  };

  const currentDate = date ? new Date(date) : new Date();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          {/* Add loading indicator here if needed */}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MonthlyAttendance 
        students={students}
        date={currentDate}
        onBack={handleBack}
        branchFilter={currentBranch}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
