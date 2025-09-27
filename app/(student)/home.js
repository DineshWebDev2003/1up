import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, SafeAreaView, Animated, Dimensions, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import VirtualIDCard from '../components/VirtualIDCard';
import Svg, { Circle } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import authFetch, { API_URL } from '../utils/api';
import Colors from '../constants/colors';
import OnboardingModal from '../components/OnboardingModal';
import ModernBackground from '../components/ModernBackground';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

const mockTimetable = [
    { time: '09:00 AM', subject: 'Rhymes & Stories', icon: 'musical-notes', color: '#FF9A8B' },
    { time: '10:00 AM', subject: 'Arts & Craft', icon: 'color-palette', color: '#F7CE68' },
    { time: '11:00 AM', subject: 'Indoor Play', icon: 'game-controller', color: '#88D8B0' },
    { time: '12:00 PM', subject: 'Lunch Break', icon: 'restaurant', color: '#FF6B6B' },
    { time: '01:00 PM', subject: 'Nap Time', icon: 'moon', color: '#A0C4FF' },
    { time: '02:00 PM', subject: 'Outdoor Play', icon: 'sunny', color: '#FAD02E' },
];

const authorizedPersons = [
  { name: 'John Doe', relation: 'Father', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { name: 'Jane Doe', relation: 'Mother', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { name: 'Jim Beam', relation: 'Guardian', avatar: 'https://randomuser.me/api/portraits/men/36.jpg' },
];

const thirukkural = {
  "Line1": "அகர முதல எழுத்தெல்லாம் ஆதி",
  "Line2": "பகவன் முதற்றே உலகு.",
  "விளக்கம்": "Just as the letter 'A' is the first of all letters, so the eternal God is the first in the world."
};
const kuralLines = [thirukkural.Line1, thirukkural.Line2];

const StudentHomeScreen = () => {
  console.log('🔥 FULL STUDENT HOME COMPONENT LOADING - UPDATED VERSION!');
  const fadeAnim = new Animated.Value(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [studentData, setStudentData] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isTimetableExpanded, setTimetableExpanded] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

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

  const fetchData = async (user, isUpdate = false) => {
      console.log('📊 fetchData called with user:', user);
      if (!user) {
        console.log('❌ No user data, setting loading to false');
        setLoading(false);
        return;
      }

      // If it's the mock student, load mock data directly
      if (user.role === 'Student') {
        // Use existing user data directly (no API call needed)
        const studentDataWithProfile = {
          id: user.id,
          name: user.name,
          photo: user.profile_image ? 
            (user.profile_image.startsWith('http') ? user.profile_image : `${API_URL}${user.profile_image}`) :
            null,
          father_name: user.father_name || '',
          father_number: user.father_number || '',
          mother_name: user.mother_name || '',
          mother_number: user.mother_number || '',
          guardian_name: user.guardian_name || '',
          guardian_number: user.guardian_number || '',
          blood_group: user.blood_group || '',
          class_name: user.class_name || 'Student',
          branch_id: user.branch_id,
          home_latitude: user.home_latitude || '',
          home_longitude: user.home_longitude || '',
          home_address: user.home_address || '',
          pickup_location_notes: user.pickup_location_notes || ''
        };
        
        const completion = calculateProfileCompletion(studentDataWithProfile);
        setStudentData(studentDataWithProfile);
        setProfileCompletion(completion);
        setBranchName(user.branch_name || 'Branch');
        
        if (completion < 100 && !isUpdate) {
          setModalVisible(true);
        }
        console.log('✅ Student data loaded for role Student, setting loading to false');
        setLoading(false);
        return;
      }

      // If it's the mock student, load mock data directly
      if (user.id === 'mock-student-01') {
        const mockStudentData = {
          id: 'mock-student-01',
          name: 'Balaji',
          photo: 'https://randomuser.me/api/portraits/men/32.jpg',
          father_name: 'Murugan',
          father_number: '9876543210',
          mother_name: 'Lakshmi',
          mother_number: '9876543211',
          guardian_name: 'Suresh',
          guardian_number: '9876543212',
          blood_group: 'O+',
          class_name: 'Playschool',
          branch_id: 'mock-branch-01',
          home_latitude: '11.0168',
          home_longitude: '76.9558',
          home_address: 'Sample Address, Coimbatore, Tamil Nadu'
        };
        const completion = calculateProfileCompletion(mockStudentData);
        setStudentData(mockStudentData);
        setProfileCompletion(completion);
        setBranchName('Mock Branch');
        if (completion < 100 && !isUpdate) {
          setModalVisible(true);
        }
        setLoading(false);
        return;
      }

      try {
        // Use the user data from login since API endpoint doesn't exist
        const studentDataWithProfile = {
          id: user.id,
          name: user.name,
          photo: user.profile_image ? 
            (user.profile_image.startsWith('http') ? user.profile_image : `${API_URL}${user.profile_image}`) :
            null,
          father_name: user.father_name || '',
          father_number: user.father_number || '',
          mother_name: user.mother_name || '',
          mother_number: user.mother_number || '',
          guardian_name: user.guardian_name || '',
          guardian_number: user.guardian_number || '',
          blood_group: user.blood_group || '',
          class_name: user.class_name || 'Student',
          branch_id: user.branch_id,
          home_latitude: user.home_latitude || '',
          home_longitude: user.home_longitude || '',
          home_address: user.home_address || '',
          pickup_location_notes: user.pickup_location_notes || ''
        };
        
        const completion = calculateProfileCompletion(studentDataWithProfile);
        setStudentData(studentDataWithProfile);
        setProfileCompletion(completion);

        if (completion < 100 && !isUpdate) {
          setModalVisible(true);
        }

        // Set branch name from user data
        setBranchName(user.branch || 'Branch');
        console.log('✅ General student data loaded, setting loading to false');
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        // Set fallback data to prevent blank screen
        setStudentData({
          id: user.id,
          name: user.name || 'Student',
          photo: user.profile_image || null,
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
    <ModernBackground variant="main">
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInDown" duration={600} delay={100}>
          <View style={styles.profileContainer}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              style={styles.profileCardGradient}
            >
              <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                    style={styles.avatarBackground}
                  >
                    <Image
                      source={studentData.photo ? { uri: studentData.photo } : require('../../assets/Avartar.png')}
                      style={styles.profilePic}
                    />
                  </LinearGradient>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.studentName}>{studentData.name}</Text>
                  <Text style={styles.studentRole}>Student</Text>
                  <Text style={styles.studentBranch}>{branchName || 'No Branch Assigned'}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.completionButton} 
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.completionIconContainer}>
                  <Text style={styles.completionPercentage}>{profileCompletion}%</Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animatable.View>

        {profileCompletion < 100 && (
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.completeProfileBanner}>
            <Ionicons name="alert-circle-outline" size={28} color={Colors.primary} />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={styles.completeProfileTitle}>Complete Your Profile</Text>
              <Text style={styles.completeProfileSubtitle}>Tap here to add missing details.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.darkGray} />
          </TouchableOpacity>
        )}

        <View style={styles.idCardContainer}>
          <VirtualIDCard 
            student={{
              id: studentData.id,
              studentId: studentData.student_id,
              name: studentData.name,
              father_name: studentData.father_name,
              father_number: studentData.father_number,
              class_name: studentData.class_name,
              class: studentData.class_name || 'N/A',
              branch: branchName,
              branch_id: studentData.branch_id,
              photo: studentData.photo
            }}
            branchData={{
              name: branchName,
              franchisee_number: studentData.franchisee_number // Add this if available
            }}
          />
        </View>

        
        <TouchableOpacity onPress={() => setTimetableExpanded(!isTimetableExpanded)} activeOpacity={0.8}>
          <View style={styles.timetableContainer}>
              <View style={styles.timetableHeader}>
                  <Text style={styles.sectionHeader}>Today's Timetable</Text>
                  <View style={styles.activityCount}>
                      <Text style={styles.activityCountText}>{(mockTimetable && Array.isArray(mockTimetable)) ? mockTimetable.length : 0} Activities</Text>
                      <Ionicons name={isTimetableExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.text} />
                  </View>
              </View>
              {isTimetableExpanded && (
                  <Reanimated.View style={styles.timetableContent} entering={FadeIn.duration(400)} exiting={FadeOut.duration(400)}>
                      {(mockTimetable && Array.isArray(mockTimetable)) ? mockTimetable.map((item, index) => (
                          <View key={index} style={styles.timetableRow}>
                              <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                  <Ionicons name={item.icon} size={22} color={Colors.white} />
                              </View>
                              <View style={styles.timeSubjectContainer}>
                                  <Text style={styles.timetableSubject}>{item.subject}</Text>
                                  <Text style={styles.timetableTime}>{item.time}</Text>
                              </View>
                          </View>
                      )) : null}
                  </Reanimated.View>
              )}
          </View>
        </TouchableOpacity>

        <View style={styles.authorizedContainer}>
          <Text style={styles.authorizedSectionHeader}>Authorized Person to Receive Student</Text>
          <View style={styles.personsRow}>
              {(authorizedPersons && Array.isArray(authorizedPersons)) ? authorizedPersons.map((person, index) => (
                  <View key={index} style={styles.personContainer}>
                      <Image source={{ uri: person.avatar }} style={styles.personImage} />
                      <Text style={styles.personName}>{person.name}</Text>
                      <Text style={styles.personRelation}>{person.relation}</Text>
                  </View>
              )) : null}
          </View>
        </View>

        <Animatable.View animation="fadeInUp" duration={800} delay={400}>
          <ImageBackground
            source={{ uri: 'https://i.pinimg.com/originals/eb/f0/a7/ebf0a721b780969928faeff800276ccd.jpg' }}
            style={styles.thirukkuralContainer}
            imageStyle={styles.thirukkuralBackgroundImage}
          >
            <View style={styles.overlay} />
            <Text style={styles.thirukkuralTitle}>திருக்குறள்</Text>
            <Text style={styles.thirukkuralLine}>{kuralLines[0]}</Text>
            <Text style={styles.thirukkuralLine}>{kuralLines[1]}</Text>
            <View style={styles.divider} />
            <Text style={styles.thirukkuralExplanation}>{thirukkural['விளக்கம்']}</Text>
          </ImageBackground>
        </Animatable.View>

        {/* Spacer to prevent tab bar overlap */}
        <View style={{ height: 120 }} />
      </ScrollView>
      
      <OnboardingModal 
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        studentData={studentData}
        onProfileUpdate={handleProfileUpdate}
      />
    </ModernBackground>
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginTop: 20, 
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
  profileContainer: {
    marginHorizontal: 8,
    marginVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  profileCardGradient: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarBackground: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  studentRole: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    marginBottom: 4,
  },
  studentBranch: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  completionButton: {
    padding: 8,
  },
  completionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  completionPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
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
});

export default StudentHomeScreen;
