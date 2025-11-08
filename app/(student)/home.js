import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView, 
  Animated, 
  Dimensions, 
  ImageBackground,
  RefreshControl,
  Alert,
  Platform,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Reanimated, { 
  FadeIn, 
  FadeOut, 
  SlideInDown, 
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import VirtualIDCard from '../components/VirtualIDCard';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import authFetch, { API_URL } from '../utils/api';
import Colors from '../constants/colors';
import OnboardingModal from '../components/OnboardingModal';
import WhiteBackground from '../components/WhiteBackground';
import * as Animatable from 'react-native-animatable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');




const StudentHomeScreen = () => {
  console.log('🔥 FULL STUDENT HOME COMPONENT LOADING - UPDATED VERSION!');
  const fadeAnim = new Animated.Value(0);
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [studentData, setStudentData] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isTimetableExpanded, setTimetableExpanded] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState({ status: 'unmarked', inTime: null, outTime: null });
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [showAttendancePopup, setShowAttendancePopup] = useState(false);
  const [attendancePopupData, setAttendancePopupData] = useState(null);
  const [liveMonitoring, setLiveMonitoring] = useState(false);
  const [showComingSoonPopup, setShowComingSoonPopup] = useState(false);
  
  // Real data states
  const [timetable, setTimetable] = useState([]);
  const [authorizedPersons, setAuthorizedPersons] = useState([]);
  const [thirukkural, setThirukkural] = useState(null);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [loadingAuthorized, setLoadingAuthorized] = useState(false);
  const [loadingThirukkural, setLoadingThirukkural] = useState(false);

  // Quick Actions definitions
  const quickActions = [
    {
      title: 'Cab tracking',
      icon: 'calendar',
      href: '/(common)/live-cab',
    },
    {
      title: 'Live Camera',
      icon: 'video',
      href: '/(common)/live-monitoring',
    },
    {
      title: 'My Fees',
      icon: 'credit-card',
      href: '/(common)/my-fees',
    },
    {
      title: 'Track Cab',
      icon: 'car',
      href: '/(common)/track-cab',
    },
    {
      title: 'Student Activity',
      icon: 'run',
      href: '/(common)/kids-feed',
    },
    {
      title: 'Payment History',
      icon: 'history',
      href: '/(common)/payments-history',
    },
  ];

  const handleQuickAction = (action) => {
    try {
      // Show Coming Soon popup for Live cab
      if (action.title === 'Live cab') {
        setShowComingSoonPopup(true);
        return;
      }
      
      if (router) {
        if (action.title === 'Live Camera' && branchName) {
          router.push({ pathname: action.href, params: { branch: branchName } });
        } else {
          router.push(action.href);
        }
      }
    } catch (error) {
      console.error('Quick action navigation error:', error);
    }
  };
  

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update time every minute
    return () => clearInterval(timer); // Cleanup on component unmount
  }, []);

  const calculateProfileCompletion = (data) => {
      if (!data) return 0;
      const fields = [
        'photo',
        'father_name',
        'father_number',
        'mother_name',
        'mother_number',
        'guardian_name',
        'guardian_number',
        'blood_group',
        'home_latitude',
        'home_longitude',
        'home_address'
      ];
      const filledFields = (fields && Array.isArray(fields)) ? fields.filter(field => data[field] && data[field] !== '') : [];
      return Math.round((filledFields.length / fields.length) * 100);
    };

  // API functions to fetch real data
  const fetchTimetable = async (branchId) => {
    if (!branchId) return;
    
    setLoadingTimetable(true);
    try {
      const response = await authFetch('/api/timetable/get_timetable.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch_id: branchId,
          date: new Date().toISOString().split('T')[0] // Today's date
        })
      });

      if (response.success && response.data) {
        setTimetable(response.data);
      } else {
        console.log('No timetable data found');
        setTimetable([]);
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
      setTimetable([]);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const fetchAuthorizedPersons = async (studentId) => {
    if (!studentId) return;
    
    setLoadingAuthorized(true);
    try {
      const response = await authFetch('/api/students/get_authorized_persons.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId
        })
      });

      if (response.success && response.data) {
        setAuthorizedPersons(response.data);
      } else {
        console.log('No authorized persons found');
        setAuthorizedPersons([]);
      }
    } catch (error) {
      console.error('Error fetching authorized persons:', error);
      setAuthorizedPersons([]);
    } finally {
      setLoadingAuthorized(false);
    }
  };

  const fetchThirukkural = async () => {
    setLoadingThirukkural(true);
    try {
      const response = await authFetch('/api/content/get_thirukkural.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.success && response.data) {
        setThirukkural(response.data);
      } else {
        console.log('No thirukkural found');
        setThirukkural(null);
      }
    } catch (error) {
      console.error('Error fetching thirukkural:', error);
      setThirukkural(null);
    } finally {
      setLoadingThirukkural(false);
    }
  };

  const fetchTodayAttendance = async (userId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Clean up old popup flags (older than 7 days)
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const popupKeys = allKeys.filter(key => key.startsWith('attendance_popup_shown_'));
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        for (const key of popupKeys) {
          const dateStr = key.replace('attendance_popup_shown_', '');
          const keyDate = new Date(dateStr);
          if (keyDate < sevenDaysAgo) {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (cleanupError) {
        console.log('Error cleaning up old popup flags:', cleanupError);
      }
      
      // Check if attendance popup was already shown today
      const popupShownKey = `attendance_popup_shown_${today}`;
      const popupAlreadyShown = await AsyncStorage.getItem(popupShownKey);
      
      // Prefer new_attendance for live status
      try {
        const respNew = await authFetch(`/api/attendance/get_new_attendance.php?date=${today}&user_id=${userId}`);
        const resNew = await respNew.json();
        if (resNew.success && Array.isArray(resNew.data) && resNew.data.length > 0) {
          const rec = resNew.data[0];
          const newAttendance = {
            status: rec.in_time ? 'present' : (rec.status || 'unmarked'), // Always present if has in_time
            inTime: rec.in_time ? rec.in_time.slice(0, 5) : null,
            outTime: rec.out_time ? rec.out_time.slice(0, 5) : null,
            markedBy: rec.in_by || rec.out_by || null,
            guardianType: rec.in_guardian_type || rec.out_guardian_type || null,
            guardianName: rec.in_guardian_name || rec.out_guardian_name || null
          };
          
          // Show popup if student has both in and out time (complete attendance) AND popup not shown today
          if (rec.in_time && rec.out_time && !showAttendancePopup && !popupAlreadyShown) {
            setAttendancePopupData({
              studentName: studentData?.name || 'Student',
              inTime: rec.in_time ? rec.in_time.slice(0, 5) : '--:--',
              outTime: rec.out_time ? rec.out_time.slice(0, 5) : '--:--',
              inBy: rec.in_guardian_name || rec.in_by || 'System',
              outBy: rec.out_guardian_name || rec.out_by || 'System',
              date: today
            });
            setShowAttendancePopup(true);
            // Mark popup as shown for today
            await AsyncStorage.setItem(popupShownKey, 'true');
          }
          
          setTodayAttendance(newAttendance);
          return;
        }
      } catch (e) {
        // fallback to old attendance below
      }
      // For the old attendance API, use the actual student_id (TNHK25056) instead of userId
      const studentId = studentData?.student_id || userId;
      const response = await authFetch(`/api/attendance/get_attendance.php?date=${today}&student_id=${studentId}`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        const rec = result.data[0];
        const newAttendance = {
          status: rec.check_in_time ? 'present' : (rec.status || 'unmarked'), // Always present if has check_in_time
          inTime: rec.check_in_time ? rec.check_in_time.slice(0, 5) : null,
          outTime: rec.check_out_time ? rec.check_out_time.slice(0, 5) : null,
          markedBy: rec.marked_by_name,
          guardianType: rec.guardian_type || null
        };
        
        // Show popup if student has both in and out time AND popup not shown today
        if (rec.check_in_time && rec.check_out_time && !showAttendancePopup && !popupAlreadyShown) {
          setAttendancePopupData({
            studentName: studentData?.name || 'Student',
            inTime: rec.check_in_time ? rec.check_in_time.slice(0, 5) : '--:--',
            outTime: rec.check_out_time ? rec.check_out_time.slice(0, 5) : '--:--',
            inBy: rec.marked_by_name || 'System',
            outBy: rec.marked_by_name || 'System',
            date: today
          });
          setShowAttendancePopup(true);
          // Mark popup as shown for today
          await AsyncStorage.setItem(popupShownKey, 'true');
        }
        
        setTodayAttendance(newAttendance);
      } else {
        setTodayAttendance({ status: 'unmarked', inTime: null, outTime: null });
      }
    } catch (e) {
      setTodayAttendance({ status: 'unmarked', inTime: null, outTime: null });
    } finally {
      setLastCheckedAt(new Date());
    }
  };


  const fetchData = async (user, isUpdate = false) => {
      console.log('📊 fetchData called with user:', user);
      if (!user) {
        console.log('❌ No user data, setting loading to false');
        setLoading(false);
        return;
      }
      
      // Check if this is the first login of the session
      let isFirstLogin = true;
      try {
        const profileLoaded = await AsyncStorage.getItem('profile_loaded');
        isFirstLogin = !profileLoaded;
      } catch (error) {
        console.log('Error checking profile loaded status:', error);
      }
      
      try {
        // Fetch fresh profile from backend to ensure correct student_id and avatar URL
        const resp = await authFetch('/api/users/profile_crud.php');
        const prof = await resp.json();
        if (!prof.success) throw new Error(prof.message || 'Failed to load profile');
        
        // Mark profile as loaded to prevent repeated popups
        try {
          await AsyncStorage.setItem('profile_loaded', 'true');
        } catch (error) {
          console.log('Error saving profile loaded status:', error);
        }

        const p = prof.data || {};

        const avatarUrl = p.avatar_url
          ? p.avatar_url
          : (p.avatar ? (p.avatar.startsWith('http') ? p.avatar : `${API_URL}${p.avatar}`)
                      : (p.profile_image ? (p.profile_image.startsWith('http') ? p.profile_image : `${API_URL}${p.profile_image}`) : null));

        // Get photo URLs with API URL prefix if needed
        const getPhotoUrl = (photoPath) => {
          console.log('🏠 Student Home getPhotoUrl called with:', photoPath);
          console.log('🏠 API_URL in student home:', API_URL);
          
          if (!photoPath) return null;
          if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) return photoPath;
          
          // Use API_URL with fallback if undefined
          let baseUrl = API_URL;
          if (!baseUrl || baseUrl === 'undefined' || typeof baseUrl === 'undefined') {
            baseUrl = 'http://10.95.243.139/server_app/lastchapter';
            console.log('🏠 API_URL was undefined, using fallback:', baseUrl);
          } else {
            console.log('🏠 Using API_URL:', baseUrl);
          }
          
          // Handle different path formats
          if (photoPath.startsWith('uploads/students/')) {
            // New onboarding images are stored in api/uploads/students/
            const url = `${baseUrl}/api/${photoPath}`;
            console.log('🏠 Onboarding image URL:', url);
            return url;
          } else if (photoPath.startsWith('uploads/')) {
            // Legacy images might be in other upload folders
            const url = `${baseUrl}/${photoPath}`;
            console.log('🏠 Legacy image URL:', url);
            return url;
          } else {
            // Fallback for other formats
            const url = `${baseUrl}/${photoPath}`;
            console.log('🏠 Fallback image URL:', url);
            return url;
          }
        };

        const studentDataWithProfile = {
          id: p.id ?? user.id,
          name: p.name ?? user.name,
          photo: avatarUrl,
          // Prefer students.student_id surfaced by profile_crud
          student_id: p.student_id ?? user.student_id ?? '',
          father_name: p.father_name || user.father_name || '',
          father_number: p.father_phone || p.father_number || user.father_phone || user.father_number || '',
          father_photo: getPhotoUrl(p.father_photo || user.father_photo),
          mother_name: p.mother_name || user.mother_name || '',
          mother_number: p.mother_phone || p.mother_number || user.mother_phone || user.mother_number || '',
          mother_photo: getPhotoUrl(p.mother_photo || user.mother_photo),
          guardian_name: p.guardian_name || user.guardian_name || '',
          guardian_number: p.guardian_phone || p.guardian_number || user.guardian_phone || user.guardian_number || '',
          guardian_photo: getPhotoUrl(p.guardian_photo || user.guardian_photo),
          blood_group: p.blood_group || user.blood_group || '',
          class_name: p.class || user.class_name || 'Student',
          branch_id: p.branch_id ?? user.branch_id,
          home_latitude: p.home_latitude || user.home_latitude || '',
          home_longitude: p.home_longitude || user.home_longitude || '',
          home_address: p.home_address || user.home_address || '',
          pickup_location_notes: p.pickup_location_notes || user.pickup_location_notes || '',
          franchisee_number: p.franchisee_number || null,
          branch_name: p.branch_name || user.branch_name || user.branch || 'Branch'
        };

        const completion = calculateProfileCompletion(studentDataWithProfile);
        setStudentData(studentDataWithProfile);
        setProfileCompletion(completion);

        // Set branch name from user data
        setBranchName(studentDataWithProfile.branch_name);
        
        // Fetch additional data from APIs
        await Promise.all([
          // We will show timetable inside Live Monitoring for students, not on Home
          fetchAuthorizedPersons(user.id),
          fetchThirukkural(),
          fetchTodayAttendance(user.id)
        ]);
        
        console.log('✅ General student data loaded, setting loading to false');
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        // Set fallback data to prevent blank screen
        setStudentData({
          id: user.id,
          name: user.name || 'Student',
          photo: user.avatar || null,
          class_name: 'Loading...',
          branch_id: user.branch_id || null
        });
        setBranchName(user.branch_name || 'Branch');
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    const loadData = async () => {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        fetchData(user);
      } else {
        setLoading(false);
      }

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    };

    loadData();
  }, []);

  // Auto-open onboarding if profile incomplete (< 100%) after data load
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!loading && studentData) {
        const completion = calculateProfileCompletion(studentData);
        setProfileCompletion(completion);
        
        try {
          const hasShownOnboarding = await AsyncStorage.getItem('onboarding_shown');
          if (completion < 100 && hasShownOnboarding !== 'true') {
            setModalVisible(true);
            await AsyncStorage.setItem('onboarding_shown', 'true');
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
        }
      }
    };
    
    checkOnboardingStatus();
  }, [loading, studentData]);

  // Refresh data when screen comes into focus (e.g., returning from edit profile)
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          await fetchData(user, true); // Refetch data when screen focuses
        }
      };
      refreshData();
    }, [])
  );

  const handleProfileUpdate = async () => {
    setModalVisible(false);
    const storedUser = await AsyncStorage.getItem('userData');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      fetchData(user, true); // Refetch data after update
    }
  };

  // Loading and error states
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.primary, marginTop: 10, fontSize: 16, fontWeight: 'bold' }}>Loading Student Dashboard...</Text>
      </View>
    );
  }

  if (!studentData) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: Colors.text, fontSize: 16 }}>Could not load student data.</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 10, backgroundColor: Colors.primary, borderRadius: 8 }}
          onPress={() => {
            setLoading(true);
            const loadData = async () => {
              const storedUser = await AsyncStorage.getItem('userData');
              if (storedUser) {
                const user = JSON.parse(storedUser);
                fetchData(user);
              } else {
                setLoading(false);
              }
            };
            loadData();
          }}
        >
          <Text style={{ color: Colors.white, fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WhiteBackground>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <Animatable.View animation="fadeInDown" duration={600} delay={100}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeGreeting}>Welcome back,</Text>
              <Text style={styles.welcomeName}>{studentData.name}</Text>
              <Text style={styles.welcomeSubtitle}>{branchName || 'No Branch Assigned'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={() => setModalVisible(true)}
              activeOpacity={0.7}
            >
              <Image
                source={studentData.photo ? { uri: studentData.photo } : require('../../assets/Avartar.png')}
                style={styles.headerProfilePic}
              />
              <View style={styles.completionBadge}>
                <Text style={styles.completionText}>{profileCompletion}%</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {false && (
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.completeProfileBanner}>
            <Ionicons name="alert-circle-outline" size={28} color={Colors.primary} />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={styles.completeProfileTitle}>Complete Your Profile</Text>
              <Text style={styles.completeProfileSubtitle}>Tap here to add missing details.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.darkGray} />
          </TouchableOpacity>
        )}

        {/* Virtual ID Card removed */}

        {/* Quick Stats Section */}
        <Animatable.View animation="fadeInUp" duration={800} delay={200}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <MaterialIcons name="school" size={24} color={Colors.primary} />
              <Text style={styles.statValue}>Student</Text>
              <Text style={styles.statLabel}>Role</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="location-on" size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{branchName?.split(' ')[0] || 'Branch'}</Text>
              <Text style={styles.statLabel}>Branch</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="person" size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{profileCompletion}%</Text>
              <Text style={styles.statLabel}>Profile</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Live Attendance Status - Redesigned */}
        <Animatable.View animation="fadeInUp" duration={800} delay={250}>
          <View style={styles.attendanceContainer}>
            <View style={styles.attendanceHeader}>
              <View style={styles.attendanceHeaderLeft}>
                <MaterialIcons 
                  name={todayAttendance.status === 'present' ? 'check-circle' : 
                        todayAttendance.status === 'absent' ? 'cancel' : 'schedule'} 
                  size={24} 
                  color={todayAttendance.status === 'present' ? '#10B981' : 
                         todayAttendance.status === 'absent' ? '#EF4444' : '#F59E0B'} 
                />
                <View style={styles.attendanceHeaderText}>
                  <Text style={styles.attendanceTitle}>Today's Attendance</Text>
                  <Text style={styles.attendanceSubtitle}>
                    {todayAttendance.status === 'present' ? 'Present' :
                     todayAttendance.status === 'absent' ? 'Absent' : 'Not Marked'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.refreshIconButton}
                onPress={() => studentData?.id && fetchTodayAttendance(studentData.id)}
              >
                <MaterialIcons name="refresh" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.attendanceDetailsRow}>
              <View style={styles.timeCard}>
                <MaterialIcons name="login" size={20} color="#10B981" />
                <Text style={styles.timeLabel}>In Time</Text>
                <Text style={styles.timeValue}>{todayAttendance.inTime || '--:--'}</Text>
              </View>
              
              <View style={styles.timeCard}>
                <MaterialIcons name="logout" size={20} color="#EF4444" />
                <Text style={styles.timeLabel}>Out Time</Text>
                <Text style={styles.timeValue}>{todayAttendance.outTime || '--:--'}</Text>
              </View>
              
              <View style={[styles.statusCard, {
                backgroundColor: todayAttendance.status === 'present' ? '#10B98120' : 
                                todayAttendance.status === 'absent' ? '#EF444420' : '#F59E0B20'
              }]}>
                <Text style={[styles.statusBadge, {
                  color: todayAttendance.status === 'present' ? '#10B981' : 
                         todayAttendance.status === 'absent' ? '#EF4444' : '#F59E0B'
                }]}>
                  {todayAttendance.status === 'present' ? '✓ Present' :
                   todayAttendance.status === 'absent' ? '✗ Absent' : '⏰ Pending'}
                </Text>
              </View>
            </View>
            
            {lastCheckedAt && (
              <Text style={styles.lastUpdatedText}>
                Last updated: {lastCheckedAt.toLocaleTimeString()}
              </Text>
            )}
          </View>
        </Animatable.View>


        
        {false && (
          <TouchableOpacity onPress={() => setTimetableExpanded(!isTimetableExpanded)} activeOpacity={0.8}>
            <View style={styles.timetableContainer}>
              <View style={styles.timetableHeader}>
                <Text style={styles.sectionHeader}>Today's Timetable</Text>
                <View style={styles.activityCount}>
                  {loadingTimetable ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Text style={styles.activityCountText}>{timetable.length} Activities</Text>
                      <Ionicons name={isTimetableExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.text} />
                    </>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Authorized Person section removed */}

        {/* Quick Actions Section */}
        <Animatable.View animation="fadeInUp" duration={800} delay={200}>
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {[
                { title: 'Live Camera', icon: 'video', href: '/(common)/live-monitoring', colors: ['#FF6B6B', '#FF8E8E'] },
                { title: 'Newsletter', icon: 'newspaper-variant-outline', href: '/(common)/news-letter', colors: ['#4ECDC4', '#7EDDD8'] },
                { title: 'My Fees', icon: 'credit-card', href: '/(common)/my-fees', colors: ['#45B7D1', '#6BC5D8'] },
                { title: 'Student Activity', icon: 'run', href: '/(common)/kids-feed', colors: ['#96CEB4', '#B5D8C7'] },
                { title: 'Timetable', icon: 'calendar-clock', href: '/(common)/timetable', colors: ['#e9ba21ff', '#c6f34cff'] },
                { title: 'Live cab', icon: 'car', href: '/(common)/live-cab', colors: ['#DDA0DD', '#E8B8E8'] },
              ].map((action, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.quickActionItem} 
                  onPress={() => handleQuickAction(action)} 
                  activeOpacity={0.8}
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

        {loadingThirukkural ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading Thirukkural...</Text>
          </View>
        ) : thirukkural ? (
          <Animatable.View animation="fadeInUp" duration={800} delay={400}>
            <ImageBackground
              source={{ uri: 'https://i.pinimg.com/originals/eb/f0/a7/ebf0a721b780969928faeff800276ccd.jpg' }}
              style={styles.thirukkuralContainer}
              imageStyle={styles.thirukkuralBackgroundImage}
            >
              <View style={styles.overlay} />
              <Text style={styles.thirukkuralTitle}>திருக்குறள்</Text>
              <Text style={styles.thirukkuralLine}>{thirukkural.line1 || thirukkural.Line1}</Text>
              <Text style={styles.thirukkuralLine}>{thirukkural.line2 || thirukkural.Line2}</Text>
              <View style={styles.divider} />
              <Text style={styles.thirukkuralExplanation}>{thirukkural.explanation || thirukkural['விளக்கம்']}</Text>
            </ImageBackground>
          </Animatable.View>
        ) : null}

        {/* Spacer to prevent tab bar overlap */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Attendance Success Popup */}
      {showAttendancePopup && attendancePopupData && (
        <View style={styles.popupOverlay}>
          <Animatable.View animation="zoomIn" duration={600} style={styles.attendancePopup}>
            <LinearGradient
              colors={Colors.gradientSuccess}
              style={styles.popupGradient}
            >
              <MaterialIcons name="check-circle" size={60} color="white" />
              <Text style={styles.popupTitle}>Attendance Complete! 🎉</Text>
              <Text style={styles.popupSubtitle}>You are marked as Present today</Text>
              
              <View style={styles.popupDetails}>
                <View style={styles.popupRow}>
                  <MaterialIcons name="login" size={20} color="white" />
                  <Text style={styles.popupDetailText}>
                    In: {attendancePopupData.inTime} by {attendancePopupData.inBy}
                  </Text>
                </View>
                <View style={styles.popupRow}>
                  <MaterialIcons name="logout" size={20} color="white" />
                  <Text style={styles.popupDetailText}>
                    Out: {attendancePopupData.outTime} by {attendancePopupData.outBy}
                  </Text>
                </View>
                <View style={styles.popupRow}>
                  <MaterialIcons name="today" size={20} color="white" />
                  <Text style={styles.popupDetailText}>
                    Date: {new Date(attendancePopupData.date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.popupCloseButton}
                onPress={() => setShowAttendancePopup(false)}
              >
                <Text style={styles.popupCloseText}>Great! 👍</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animatable.View>
        </View>
      )}

      {/* Coming Soon Popup */}
      <Modal
        visible={showComingSoonPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowComingSoonPopup(false)}
      >
        <View style={styles.comingSoonOverlay}>
          <Animatable.View animation="bounceIn" duration={800} style={styles.comingSoonPopup}>
            <LinearGradient
              colors={['#DDA0DD', '#E8B8E8', '#F0C4F0']}
              style={styles.comingSoonGradient}
            >
              <TouchableOpacity 
                style={styles.closeIconButton}
                onPress={() => setShowComingSoonPopup(false)}
              >
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
              
              <Animatable.View animation="pulse" iterationCount="infinite" duration={2000}>
                <MaterialCommunityIcons name="car" size={80} color="white" />
              </Animatable.View>
              
              <Text style={styles.comingSoonTitle}>Coming Soon! 🚗</Text>
              <Text style={styles.comingSoonSubtitle}>Live Cab Tracking</Text>
              
              <View style={styles.comingSoonDetails}>
                <Text style={styles.comingSoonText}>
                  We're working hard to bring you real-time cab tracking features!
                </Text>
                <Text style={styles.comingSoonFeatures}>
                  ✨ Track your cab in real-time{'\n'}
                  ✨ Get arrival notifications{'\n'}
                  ✨ View driver details{'\n'}
                  ✨ Safe & secure journey
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.comingSoonButton}
                onPress={() => setShowComingSoonPopup(false)}
              >
                <Text style={styles.comingSoonButtonText}>Got it! 👍</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animatable.View>
        </View>
      </Modal>
      
        <OnboardingModal 
          isVisible={isModalVisible}
          onClose={() => setModalVisible(false)}
          studentData={studentData}
          onProfileUpdate={handleProfileUpdate}
        />
    </WhiteBackground>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 40,
  },
  quickActionsContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  quickActionsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginTop: 30, 
    borderRadius: 20,
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  timetableContainer: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  profilePicContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'absolute',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  profileRole: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  profileDetails: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scrollContainer: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  welcomeHeader: {
    marginHorizontal: 16,
    marginTop: 20,
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
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
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
    borderColor: Colors.primary,
  },
  completionBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  completionText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // New Attendance Container Styles
  attendanceContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attendanceHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  attendanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  attendanceSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  refreshIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  attendanceDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  statusCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  completeProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 20,
    marginTop: -10, // Overlap with header for a connected look
    marginBottom: 10,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    elevation: 2,
  },
  completeProfileTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  completeProfileSubtitle: {
    fontSize: 13,
    color: Colors.darkGray,
    paddingBottom: 20, // Keep some padding for visual spacing
  },
  idCardContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  timetableContainer: {
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Translucent white background
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  timetableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  activityCountText: {
    color: Colors.text,
    fontWeight: '600',
    marginRight: 5,
  },
  timetableContent: {
    marginTop: 15,
  },
  timetableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  timeSubjectContainer: {
    flex: 1,
  },
  timetableSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  timetableTime: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 3,
  },
  authorizedContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  authorizedSectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  personsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 10,
  },
  personContainer: {
    alignItems: 'center',
    backgroundColor: Colors.white, // White card background
    borderRadius: 15,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    maxWidth: '31%',
    borderWidth: 1, // Use a subtle border instead of shadow
    borderColor: '#e8e8e8',
  },
  personImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  personName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  personRelation: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  thirukkuralContainer: {
    padding: 24,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  thirukkuralBackgroundImage: {
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', // Dark overlay for text readability
  },
  thirukkuralTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightText,
    marginBottom: 15,
    textAlign: 'center',
  },
  thirukkuralLine: {
    fontSize: 14,
    color: Colors.lightText,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 10,
  },
  thirukkuralExplanation: {
    fontSize: 13,
    color: Colors.lightText,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  // Live monitoring styles
  liveMonitoringContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  liveMonitoringGradient: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  liveMonitoringTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  liveMonitoringSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  liveStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  lastCheckedText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  // Attendance Popup Styles
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  attendancePopup: {
    width: '85%',
    maxWidth: 350,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  popupGradient: {
    padding: 30,
    alignItems: 'center',
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 8,
  },
  popupSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  popupDetails: {
    width: '100%',
    marginBottom: 25,
  },
  popupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  popupDetailText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 12,
    fontWeight: '500',
  },
  popupCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  // Coming Soon Popup Styles
  comingSoonOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonPopup: {
    width: '85%',
    maxWidth: 380,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 20,
  },
  comingSoonGradient: {
    padding: 35,
    alignItems: 'center',
    position: 'relative',
  },
  closeIconButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  comingSoonSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 25,
    fontWeight: '600',
  },
  comingSoonDetails: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },
  comingSoonText: {
    fontSize: 15,
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  comingSoonFeatures: {
    fontSize: 14,
    color: 'white',
    textAlign: 'left',
    lineHeight: 24,
    fontWeight: '500',
  },
  comingSoonButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  comingSoonButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  popupCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StudentHomeScreen;
