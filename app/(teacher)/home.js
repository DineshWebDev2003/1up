import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  Dimensions, 
  ActivityIndicator, 
  Image, 
  RefreshControl,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../contexts/ThemeContext';
import * as Animatable from 'react-native-animatable';
import WhiteBackground from '../components/WhiteBackground';
import { API_URL } from '../../config';

const { width } = Dimensions.get('window');

const TeacherHomeScreen = () => {
  const router = useRouter();
  const Colors = useColors();
  const { isDarkMode } = useTheme();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    total_students: 0,
    present_students: 0,
    absent_students: 0,
    attendance_percentage: 0
  });
  const [clockInStatus, setClockInStatus] = useState({
    is_clocked_in: false,
    is_clocked_out: false,
    clock_in_time: null,
    clock_out_time: null,
    date: null,
    status: null
  });
  const [clockingIn, setClockingIn] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [dailyReport, setDailyReport] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [branchName, setBranchName] = useState('');
  const insets = useSafeAreaInsets();

  // Quick Actions for teacher - simplified to essential actions only
  const quickActions = [
    {
      title: 'Take Attendance',
      icon: 'clipboard-check',
      href: '/(common)/new-attendance',
      colors: ['#667eea', '#764ba2']
    },
    {
      title: 'Post Activity',
      icon: 'post',
      href: '/(common)/post-activity',
      colors: ['#43e97b', '#38f9d7']
    }
  ];

  const handleQuickAction = (action) => {
    try {
      if (router) {
        router.push(action.href);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate. Please try again.');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        console.log('Teacher data loaded:', userData);
        setUser(userData);
        setBranchName(userData.branch_name || userData.branch || 'Main Branch');

        // Fetch dashboard stats
        console.log('Fetching teacher dashboard stats...');
        const statsResponse = await authFetch('/api/dashboard/teacher_dashboard_stats.php');
        const statsResult = await statsResponse.json();
        console.log('Stats response:', statsResult);
        if (statsResult.success) {
          const data = statsResult.data;
          setStats({
            total_students: data.total_students || 0,
            present_students: data.present_students || 0,
            absent_students: (data.total_students || 0) - (data.present_students || 0),
            attendance_percentage: data.total_students > 0 ? Math.round((data.present_students / data.total_students) * 100) : 0
          });
        }

        // Fetch clock-in status
        console.log('Fetching clock-in status...');
        const clockStatusResponse = await authFetch('/api/attendance/staff_attendance.php');
        const clockResult = await clockStatusResponse.json();
        console.log('Clock status result:', clockResult);
        if (clockResult.success) {
          // Process the raw API data to create the expected format
          const rawData = clockResult.data;
          const processedStatus = {
            is_clocked_in: rawData && rawData.clock_in_time && !rawData.clock_out_time,
            is_clocked_out: rawData && rawData.clock_in_time && rawData.clock_out_time,
            clock_in_time: rawData?.clock_in_time || null,
            clock_out_time: rawData?.clock_out_time || null,
            date: rawData?.date || null,
            status: rawData?.status || null
          };
          console.log('Raw data:', rawData);
          console.log('Processed clock status:', processedStatus);
          setClockInStatus(processedStatus);
        } else {
          console.warn('Failed to fetch clock status:', clockResult.message);
          // Set default state if API fails
          setClockInStatus({
            is_clocked_in: false,
            is_clocked_out: false,
            clock_in_time: null,
            clock_out_time: null,
            date: null,
            status: null
          });
        }
      } else {
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClockInOut = async () => {
    if (clockingIn) return;
    
    // Check if user is already clocked out
    if (Boolean(clockInStatus?.is_clocked_out)) {
      Alert.alert('Already Clocked Out', 'You have already completed your attendance for today.');
      return;
    }
    
    const action = Boolean(clockInStatus?.is_clocked_in) ? 'clock_out' : 'clock_in';
    
    // If clocking out, show daily report modal
    if (action === 'clock_out') {
      setDailyReport('');
      setShowReportModal(true);
    } else {
      performClockAction(action);
    }
  };

  const handleReportSubmit = () => {
    if (dailyReport && dailyReport.trim()) {
      setShowReportModal(false);
      performClockAction('clock_out', dailyReport.trim());
    } else {
      Alert.alert('Error', 'Daily report is required to clock out.');
    }
  };

  const handleReportCancel = () => {
    setShowReportModal(false);
    setDailyReport('');
    console.log('Clock out cancelled');
  };

  const performClockAction = async (action, report = '') => {
    setClockingIn(true);
    try {
      console.log('🔄 Clock action:', action, '| Current status:', clockInStatus?.is_clocked_in);
      
      const requestBody = { action };
      if (action === 'clock_out' && report) {
        requestBody.report = report;
      }
      console.log('📤 Sending request:', requestBody);
      
      const response = await authFetch('/api/attendance/staff_attendance.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      console.log('Clock in/out result:', result);
      if (result.success) {
        // Update local state immediately for better UX
        const newStatus = {
          is_clocked_in: Boolean(action === 'clock_in'),
          is_clocked_out: Boolean(action === 'clock_out'),
          clock_in_time: action === 'clock_in' ? new Date().toLocaleTimeString() : (clockInStatus?.clock_in_time || null),
          clock_out_time: action === 'clock_out' ? new Date().toLocaleTimeString() : (clockInStatus?.clock_out_time || null),
          date: clockInStatus?.date || null,
          status: clockInStatus?.status || null
        };
        console.log('Updating clock status to:', newStatus);
        setClockInStatus(newStatus);
        
        // Then refresh all data
        await fetchData();
        Alert.alert(
          'Success', 
          action === 'clock_in' ? 'Successfully clocked in!' : 'Successfully clocked out!'
        );
      } else {
        console.log('❌ Clock action failed:', result.message);
        // Show more specific error message
        const errorTitle = action === 'clock_in' ? 'Clock In Failed' : 'Clock Out Failed';
        const errorMessage = result.message || `Failed to ${action.replace('_', ' ')}`;
        Alert.alert(errorTitle, errorMessage);
        
        // If the error suggests we're in wrong state, refresh data
        if (result.message && result.message.includes('already clocked')) {
          console.log('🔄 Refreshing data due to state mismatch');
          await fetchData();
        }
      }
    } catch (error) {
      console.error('Clock in/out error:', error);
      Alert.alert('Error', 'Failed to update clock status. Please try again.');
    } finally {
      setClockingIn(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Refresh data when screen comes into focus (e.g., returning from edit-profile)
      fetchData();
    }, [fetchData])
  );

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (Boolean(loading)) {
    return (
      <WhiteBackground>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator size="large" color={'#FFD700'} />
          <Text style={[styles.loadingText, { color: Colors.textSecondary }]}>Loading Dashboard...</Text>
        </SafeAreaView>
      </WhiteBackground>
    );
  }

  return (
    <WhiteBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={Boolean(refreshing)} 
              onRefresh={onRefresh}
              colors={['#FFD700']}
              tintColor={'#FFD700'}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Header */}
          <Animatable.View animation="fadeInDown" duration={600} delay={100}>
            <View style={[styles.welcomeHeader, { backgroundColor: Colors.surface }]}>
              <View style={styles.welcomeContent}>
                <Text style={[styles.welcomeGreeting, { color: Colors.textSecondary }]}>{getGreeting()},</Text>
                <Text style={[styles.welcomeName, { color: Colors.text }]}>{user?.name || 'Teacher'}</Text>
                <Text style={[styles.welcomeSubtitle, { color: Colors.textSecondary }]}>{branchName}</Text>
              </View>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push('/(teacher)/settings')}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Profile settings"
              >
                <Image 
                  source={
                    user?.avatar 
                      ? { uri: user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}` }
                      : user?.profile_image
                      ? { uri: user.profile_image.startsWith('http') ? user.profile_image : `${API_URL}${user.profile_image}` }
                      : require('../../assets/Avartar.png')
                  }
                  style={styles.headerProfilePic}
                  onError={(error) => {
                    console.log('Profile image load error:', error);
                  }}
                />
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>TR</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animatable.View>

          {/* Dashboard Stats Section */}
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
            <View style={[styles.dashboardContainer, { backgroundColor: Colors.surface }]}>
              <View style={styles.dashboardHeader}>
                <View style={styles.dashboardHeaderLeft}>
                  <MaterialIcons name="dashboard" size={24} color={'#FFD700'} />
                  <View style={styles.dashboardHeaderText}>
                    <Text style={[styles.dashboardTitle, { color: Colors.text }]}>Dashboard Overview</Text>
                    <Text style={[styles.dashboardSubtitle, { color: Colors.textSecondary }]}>
                      {currentTime.toLocaleDateString('en-IN', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.refreshIconButton}
                  onPress={onRefresh}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh data"
                >
                  <MaterialIcons name="refresh" size={20} color={'#FFD700'} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.statCardGradient}
                  >
                    <MaterialCommunityIcons name="account-group" size={28} color="white" />
                    <Text style={styles.statLabel}>Total Students</Text>
                    <Text style={styles.statValue}>{stats.total_students || '0'}</Text>
                  </LinearGradient>
                </View>
                
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#43e97b', '#38f9d7']}
                    style={styles.statCardGradient}
                  >
                    <MaterialCommunityIcons name="check-circle" size={28} color="white" />
                    <Text style={styles.statLabel}>Present Today</Text>
                    <Text style={styles.statValue}>{stats.present_students || '0'}</Text>
                  </LinearGradient>
                </View>
              </View>

            </View>
          </Animatable.View>

          {/* Clock In/Out Section */}
          <Animatable.View animation="fadeInUp" duration={800} delay={300}>
            <View style={[styles.clockContainer, { backgroundColor: Colors.surface }]}>
              <View style={styles.clockHeader}>
                <View style={styles.clockHeaderLeft}>
                  <MaterialCommunityIcons name="clock-check" size={24} color={'#FFD700'} />
                  <View style={styles.clockHeaderText}>
                    <Text style={[styles.clockTitle, { color: Colors.text }]}>Attendance</Text>
                    <Text style={[styles.clockSubtitle, { color: Colors.textSecondary }]}>
                      {Boolean(clockInStatus?.is_clocked_out) ? 'You are clocked out' : 
                       Boolean(clockInStatus?.is_clocked_in) ? 'You are clocked in' : 'Ready to clock in'}
                    </Text>
                    {/* Debug info */}
                    <Text style={[styles.clockSubtitle, { color: Colors.textSecondary, fontSize: 10 }]}>
                      Status: {Boolean(clockInStatus?.is_clocked_in) ? 'TRUE' : 'FALSE'} | Time: {clockInStatus?.clock_in_time || 'None'}
                    </Text>
                  </View>
                </View>
                {(clockInStatus?.clock_in_time || clockInStatus?.clock_out_time) && (
                  <View style={styles.clockTimeContainer}>
                    {Boolean(clockInStatus?.is_clocked_out) ? (
                      <>
                        <Text style={[styles.clockTimeLabel, { color: Colors.textSecondary }]}>Out at</Text>
                        <Text style={[styles.clockTimeValue, { color: Colors.text }]}>{clockInStatus.clock_out_time}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.clockTimeLabel, { color: Colors.textSecondary }]}>Since</Text>
                        <Text style={[styles.clockTimeValue, { color: Colors.text }]}>{clockInStatus.clock_in_time}</Text>
                      </>
                    )}
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={styles.clockButton}
                onPress={handleClockInOut}
                disabled={Boolean(clockingIn) || Boolean(clockInStatus?.is_clocked_out)}
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={Boolean(clockInStatus?.is_clocked_out) ? 'Already clocked out' : Boolean(clockInStatus?.is_clocked_in) ? 'Clock out' : 'Clock in'}
                accessibilityState={{
                  disabled: Boolean(clockingIn) || Boolean(clockInStatus?.is_clocked_out)
                }}
              >
                <LinearGradient
                  colors={Boolean(clockInStatus?.is_clocked_out) ? ['#95a5a6', '#7f8c8d'] :
                          Boolean(clockInStatus?.is_clocked_in) ? ['#ff6b6b', '#ee5a52'] : ['#51cf66', '#40c057']}
                  style={styles.clockButtonGradient}
                >
                  {Boolean(clockingIn) ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <MaterialCommunityIcons 
                      name={Boolean(clockInStatus?.is_clocked_out) ? 'check-circle' :
                            Boolean(clockInStatus?.is_clocked_in) ? 'clock-out' : 'clock-in'} 
                      size={24} 
                      color="white" 
                    />
                  )}
                  <Text style={styles.clockButtonText}>
                    {Boolean(clockingIn) ? 'Processing...' : 
                     Boolean(clockInStatus?.is_clocked_out) ? 'Clocked Out' :
                     Boolean(clockInStatus?.is_clocked_in) ? 'Clock Out' : 'Clock In'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animatable.View>

          {/* Quick Actions */}
          <Animatable.View animation="fadeInUp" duration={800} delay={400}>
            <View style={[styles.quickActionsContainer, { backgroundColor: Colors.surface }]}>
              <Text style={[styles.quickActionsTitle, { color: Colors.text }]}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.quickActionItem} 
                    onPress={() => handleQuickAction(action)} 
                    activeOpacity={0.8}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={action.title}
                  >
                    <LinearGradient
                      colors={action.colors}
                      style={styles.quickActionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <MaterialCommunityIcons name={action.icon} size={28} color="white" />
                      <Text style={styles.quickActionText}>{action.title}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animatable.View>

          {/* Spacer to prevent tab bar overlap */}
          <View style={{ height: 140 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Daily Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={Boolean(showReportModal)}
        onRequestClose={handleReportCancel}
        accessible={true}
        accessibilityViewIsModal={true}
      >
        <View style={styles.modalContainer}>
          <View 
            style={[styles.modalContent, { backgroundColor: Colors.surface }]}
            accessible={true}
            accessibilityLabel="Daily report dialog"
          >
            <Text style={[styles.modalTitle, { color: Colors.text }]}>Daily Report</Text>
            <Text style={[styles.modalSubtitle, { color: Colors.textSecondary }]}>
              Please provide a brief report of your day:
            </Text>
            
            <TextInput
              style={[styles.reportInput, { 
                backgroundColor: Colors.background, 
                color: Colors.text,
                borderColor: Colors.border 
              }]}
              placeholder="Enter your daily report here..."
              placeholderTextColor={Colors.textSecondary}
              value={dailyReport || ''}
              onChangeText={setDailyReport}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              accessible={true}
              accessibilityLabel="Daily report input"
              accessibilityHint="Enter your daily work report here"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: Colors.border }]} 
                onPress={handleReportCancel}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Cancel report"
                activeOpacity={0.7}
              >
                <Text style={[styles.buttonText, { color: Colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleReportSubmit}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Submit daily report"
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#51cf66', '#40c057']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={[styles.buttonText, { color: 'white' }]}>Submit</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </WhiteBackground>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Welcome Header (from franchisee home)
  welcomeHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileButton: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfilePic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Dashboard Container
  dashboardContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dashboardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dashboardHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  refreshIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },

  // Clock In/Out Container
  clockContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  clockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  clockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  clockTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  clockSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  clockTimeContainer: {
    alignItems: 'flex-end',
  },
  clockTimeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  clockTimeValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  clockButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  clockButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  clockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  clockInButton: {
    backgroundColor: '#34C759',
  },
  clockOutButton: {
    backgroundColor: '#FF3B30',
  },

  // Quick Actions
  quickActionsContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  quickActionsTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  quickActionItem: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    borderRadius: 16,
  },
  quickActionText: {
    color: 'white',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButton: {
    // LinearGradient will handle the styling
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TeacherHomeScreen;
