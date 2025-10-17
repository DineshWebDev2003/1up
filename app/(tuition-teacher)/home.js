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
  id: '2',
  name: 'Priya Singh',
  studentId: 'TS002',
  branch: 'Tuition Center',
  class: '9th Grade',
  mobile: '987-654-3210',
  fatherName: 'Anil Singh',
  bloodGroup: 'B+ve'
};

const TuitionTeacherHomeScreen = () => {
  const quickActions = [
    {
      id: 'homework',
      title: 'Homework',
      description: 'Manage student homework assignments',
      icon: 'book-outline',
      colors: ['#667eea', '#764ba2'],
      onPress: () => router.push('/(common)/homework'),
    },
    {
      id: 'tuition-attendance',
      title: 'Tuition Attendance',
      description: 'Mark and view student attendance',
      icon: 'checkmark-circle-outline',
      colors: ['#f093fb', '#f5576c'],
      onPress: () => router.push('/(common)/attendance'),
    },
  ];

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const thirukkural = thirukkuralData[Math.floor(Math.random() * thirukkuralData.length)];
  const kuralLines = thirukkural['குறள்'].split('\n');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

      } catch (error) {
        console.error('Error loading data:', error);
        setUser({ name: 'Tuition Teacher', role: 'Teacher', branch: 'Tuition Center' });
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
                    <Text style={styles.studentName}>{user?.name || 'Tuition Teacher'}</Text>
                    <Text style={styles.studentRole}>Tuition Teacher</Text>
                    <Text style={styles.studentBranch}>{user?.branch || 'Tuition Center'}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animatable.View>

          {/* Stats Cards */}
          <Animatable.View animation="fadeInUp" duration={600} delay={200}>
            <View style={styles.statsRow}>
              <View style={styles.statCardLarge}>
                <LinearGradient
                  colors={['#A8DEFF', '#C9E5FF']}
                  style={styles.statCard}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name="people" size={28} color="white" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValueLarge}>25</Text>
                    <Text style={styles.statLabelLarge}>Total Students</Text>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.statCardLarge}>
                <LinearGradient
                  colors={['#4CAF50', '#66BB6A']}
                  style={styles.statCard}
                >
                  <View style={styles.statIconContainer}>
                    <Ionicons name="checkmark-circle" size={28} color="white" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statValueLarge}>22</Text>
                    <Text style={styles.statLabelLarge}>Total Present</Text>
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

          {/* Quick Actions */}
          <Animatable.View animation="fadeInUp" duration={600} delay={500} style={styles.actionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={action.onPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={action.colors}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.actionContent}>
                    <View style={styles.actionIconContainer}>
                      <Ionicons name={action.icon} size={32} color="white" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionDescription}>{action.description}</Text>
                    </View>
                    <View style={styles.actionArrow}>
                      <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </Animatable.View>
        </ScrollView>
      </SafeAreaView>
    </ModernBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.primary,
  },
  profileContainer: {
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  profileCardGradient: {
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
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
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  userInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  studentRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  studentBranch: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCardLarge: {
    flex: 1,
    marginHorizontal: 5,
  },
  statCard: {
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statIconContainer: {
    marginRight: 10,
  },
  statContent: {
    flex: 1,
  },
  statValueLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabelLarge: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  thirukkuralContainer: {
    marginHorizontal: 10,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
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
    marginTop: 15,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  thirukkuralLine: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 3,
    paddingHorizontal: 15,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 10,
    marginHorizontal: 30,
  },
  thirukkuralExplanation: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  actionsContainer: {
    paddingHorizontal: 10,
    marginTop: 10,
  },
  quickActionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  actionCard: {
    marginBottom: 15,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  actionGradient: {
    borderRadius: 20,
    padding: 20,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  actionArrow: {
    marginLeft: 10,
  },
});

export default TuitionTeacherHomeScreen;
