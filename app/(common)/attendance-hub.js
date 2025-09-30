import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import Colors from '../constants/colors';
import { useFocusEffect } from 'expo-router';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AttendanceHubScreen = () => {
  const router = useRouter();
  const { branch } = useLocalSearchParams();
  const [studentAttendance, setStudentAttendance] = useState({ present: 0, total: 0 });
  const [staffAttendance, setStaffAttendance] = useState({ present: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [canViewStaffAttendance, setCanViewStaffAttendance] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get user role first
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role);
      }
      
      const response = await authFetch('/api/dashboard/attendance_hub_stats.php');
      const result = await response.json();
      if (result.success) {
        setStudentAttendance(result.data.student_attendance);
        setStaffAttendance(result.data.staff_attendance);
        setUserRole(result.data.user_role);
        setCanViewStaffAttendance(result.data.can_view_staff_attendance);
      } else {
        console.error('Failed to fetch attendance stats');
      }
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchStats();
    }, [])
  );

  const menuItems = [
    {
      title: 'Student Attendance',
      icon: 'account-group-outline',
      screen: '/(common)/attendance',
      gradient: Colors.gradientPrimary,
      roles: ['Admin', 'Franchisee', 'Teacher', 'Tuition Teacher'] // All roles can access student attendance
    },
  
    {
      title: 'Staff Attendance',
      icon: 'account-tie-outline',
      screen: '/(common)/staff-attendance',
      gradient: Colors.gradientSecondary,
      roles: ['Admin', 'Franchisee'] // Only Admin and Franchisee can access staff attendance
    },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    userRole && item.roles.includes(userRole)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Animatable.View animation="fadeInDown" duration={800}>
          <LinearGradient colors={Colors.gradientMain} style={styles.header}>
            <LottieView
              source={require('../../assets/Calendar Animation.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
            <Text style={styles.title}>Attendance Hub</Text>
            <Text style={styles.subtitle}>{branch ? `Branch: ${branch}` : 'All Branches'}</Text>
          </LinearGradient>
        </Animatable.View>

        <View style={styles.statsContainer}>
          <Animatable.View animation="zoomIn" duration={700} delay={100} style={styles.statBox}>
            <MaterialCommunityIcons name="school-outline" size={30} color={Colors.primary} />
            <Text style={styles.statLabel}>Student Attendance</Text>
            <Text style={styles.statValue}>{studentAttendance.present} / {studentAttendance.total}</Text>
          </Animatable.View>
          {canViewStaffAttendance && (
            <Animatable.View animation="zoomIn" duration={700} delay={250} style={styles.statBox}>
              <MaterialCommunityIcons name="account-tie-outline" size={30} color={Colors.accent} />
              <Text style={styles.statLabel}>Staff Attendance</Text>
              <Text style={styles.statValue}>{staffAttendance.present} / {staffAttendance.total}</Text>
            </Animatable.View>
          )}
        </View>

        <View style={styles.menuContainer}>
          {filteredMenuItems.map((item, index) => (
            <Animatable.View key={index} animation="fadeInUp" duration={800} delay={200 + index * 150}>
              <TouchableOpacity onPress={() => router.push({ pathname: item.screen, params: { branch } })}>
                <LinearGradient colors={item.gradient} style={styles.button}>
                  <MaterialCommunityIcons name={item.icon} size={40} color={Colors.lightText} />
                  <Text style={styles.buttonText}>{item.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>
          ))}
          {filteredMenuItems.length === 0 && (
            <Animatable.View animation="fadeInUp" duration={800} delay={200}>
              <View style={styles.noAccessContainer}>
                <MaterialCommunityIcons name="lock-outline" size={60} color={Colors.primary} />
                <Text style={styles.noAccessText}>No Attendance Access</Text>
                <Text style={styles.noAccessSubtext}>Your role doesn't have access to attendance features.</Text>
              </View>
            </Animatable.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, paddingBottom: 40 },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 30,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  lottieAnimation: { width: 150, height: 150, marginBottom: -10 },
  title: { fontSize: 34, fontWeight: 'bold', color: Colors.lightText, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.lightText, opacity: 0.9, textAlign: 'center', marginTop: 4 },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginTop: -20, // Overlap with header's bottom radius
  },
  statBox: {
    backgroundColor: Colors.lightText,
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  statLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: Colors.darkText, 
    marginTop: 8 
  },
  statValue: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: Colors.darkText, 
    marginTop: 4 
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: Colors.lightText,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 15,
  },
  noAccessContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noAccessText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 15,
    marginBottom: 8,
  },
  noAccessSubtext: {
    fontSize: 16,
    color: Colors.darkText,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default AttendanceHubScreen;
