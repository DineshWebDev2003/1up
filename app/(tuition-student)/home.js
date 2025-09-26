import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, SafeAreaView, Animated, Dimensions, ImageBackground } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import ModernBackground from '../components/ModernBackground';
import VirtualIDCard from '../components/VirtualIDCard';
import * as Animatable from 'react-native-animatable';
const thirukkuralData = [
  {
    "குறள் எண்": 1,
    "குறள்": "அகர முதல எழுத்தெல்லாம் ஆதி \nபகவன் முதற்றே உலகு.",
    "விளக்கம்": "Just as the letter 'A' is the first of all letters, so the eternal God is the first in the world."
  },
  {
    "குறள் எண்": 2,
    "குறள்": "கற்றதனால் ஆய பயனென்கொல் வாலறிவன் \nநற்றாள் தொழாஅர் எனின்.",
    "விளக்கம்": "கற்றாலும், அறிவாளி இறைவனை வணங்காவிடில், அந்தக் கல்வி பயன் அளிக்காது."
  },
  {
    "குறள் எண்": 3,
    "குறள்": "மலர்மிசை ஏகினான் மாணடி சேர்ந்தார் \nநிலமிசை நீடுவாழ் வார்.",
    "விளக்கம்": "இறைவன் திருவடிகளை வணங்குவோர், இவ்வுலகில் நீண்ட ஆயுள் வாழ்வர்."
  }
];

const mockStudent = {
  id: '1',
  name: 'Aarav Sharma',
  studentId: 'TS001',
  branch: 'Tuition Center',
  class: '10th Grade',
  mobile: '123-456-7890',
  fatherName: 'Rakesh Sharma',
  bloodGroup: 'A+ve'
};

const { width } = Dimensions.get('window');

const TuitionStudentHomeScreen = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const thirukkural = thirukkuralData[Math.floor(Math.random() * thirukkuralData.length)];
  const kuralLines = thirukkural['குறள்'].split('\n');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Mock user data for tuition student
        setUser({
          name: 'Aarav Sharma',
          role: 'Tuition Student',
          branch: 'Tuition Center',
          class: '10th Grade'
        });
      } catch (error) {
        console.error('Error loading data:', error);
        setUser({ name: 'Tuition Student', role: 'Student', branch: 'Tuition Center' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <ModernBackground variant="main">
        <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </SafeAreaView>
      </ModernBackground>
    );
  }

  return (
    <ModernBackground variant="main">
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >

          {/* Profile Container */}
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
                      <Ionicons name="person" size={32} color="white" />
                    </LinearGradient>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.studentName}>{user?.name || 'Tuition Student'}</Text>
                    <Text style={styles.studentRole}>Tuition Student</Text>
                    <Text style={styles.studentBranch}>{user?.branch || 'Tuition Center'}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animatable.View>

          {/* Stats Cards */}
          <Animatable.View animation="fadeInUp" duration={600} delay={200}>
            <View style={styles.statsRow}>
              <View style={styles.statCardSmall}>
                <LinearGradient
                  colors={['#A8DEFF', '#C9E5FF']}
                  style={styles.statCard}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name="calendar" size={24} color="white" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValueSmall}>4</Text>
                    <Text style={styles.statLabelSmall}>Upcoming Classes</Text>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.statCardSmall}>
                <LinearGradient
                  colors={['#E0C3FC', '#8EC5FC']}
                  style={styles.statCard}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name="document-text" size={24} color="white" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValueSmall}>2</Text>
                    <Text style={styles.statLabelSmall}>Assignments</Text>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.statCardSmall}>
                <LinearGradient
                  colors={['#F7D94C', '#FFC837']}
                  style={styles.statCard}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name="star" size={24} color="white" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValueSmall}>88%</Text>
                    <Text style={styles.statLabelSmall}>Performance</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </Animatable.View>

          {/* Thirukkural Section */}
          <Animatable.View animation="fadeInUp" duration={600} delay={400}>
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
        </ScrollView>
      </SafeAreaView>
    </ModernBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.text,
  },
  profileContainer: {
    marginHorizontal: 10,
    marginBottom: 20,
  },
  profileCardGradient: {
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 15,
  },
  avatarBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  studentRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  studentBranch: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCardSmall: {
    flex: 1,
    marginHorizontal: 5,
  },
  statCard: {
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statIconContainer: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValueSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  statLabelSmall: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  thirukkuralContainer: {
    marginHorizontal: 10,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    minHeight: 150,
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  thirukkuralBackgroundImage: {
    borderRadius: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  thirukkuralTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  thirukkuralLine: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 10,
    marginHorizontal: 20,
  },
  thirukkuralExplanation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TuitionStudentHomeScreen;
