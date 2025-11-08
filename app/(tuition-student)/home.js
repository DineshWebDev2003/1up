import React, { useState, useEffect } from 'react';
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
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import authFetch, { API_URL } from '../utils/api';
import Colors from '../constants/colors';
import WhiteBackground from '../components/WhiteBackground';
import * as Animatable from 'react-native-animatable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
const { width } = Dimensions.get('window');

const TuitionStudentHomeScreen = () => {
  const fadeAnim = new Animated.Value(0);
  const router = useRouter();
  const [studentData, setStudentData] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [thirukkural, setThirukkural] = useState(null);
  const [loadingThirukkural, setLoadingThirukkural] = useState(false);
  const [showComingSoonPopup, setShowComingSoonPopup] = useState(false);

  const calculateProfileCompletion = (data) => {
    if (!data) return 0;
    const fields = ['photo', 'father_name', 'mother_name', 'blood_group'];
    const filledFields = fields.filter(field => data[field] && data[field] !== '');
    return Math.round((filledFields.length / fields.length) * 100);
  };

  const fetchThirukkural = async () => {
    setLoadingThirukkural(true);
    try {
      const response = await authFetch('/api/content/get_thirukkural.php', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.success && response.data) {
        setThirukkural(response.data);
      }
    } catch (error) {
      console.error('Error fetching thirukkural:', error);
    } finally {
      setLoadingThirukkural(false);
    }
  };

  const handleQuickAction = (action) => {
    try {
      if (action.title === 'Live cab') {
        setShowComingSoonPopup(true);
        return;
      }
      if (router) {
        router.push(action.href);
      }
    } catch (error) {
      console.error('Quick action navigation error:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const completion = calculateProfileCompletion(user);
        setStudentData({
          id: user.id,
          name: user.name || 'Tuition Student',
          photo: user.avatar || user.photo,
          class_name: user.class || 'Tuition Class',
          branch_id: user.branch_id,
          father_name: user.father_name || '',
          mother_name: user.mother_name || '',
          blood_group: user.blood_group || ''
        });
        setBranchName(user.branch_name || user.branch || 'Tuition Center');
        setProfileCompletion(completion);
        fetchThirukkural();
      }
      setLoading(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    };
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          const completion = calculateProfileCompletion(user);
          setStudentData({
            id: user.id,
            name: user.name || 'Tuition Student',
            photo: user.avatar || user.photo,
            class_name: user.class || 'Tuition Class',
            branch_id: user.branch_id,
            father_name: user.father_name || '',
            mother_name: user.mother_name || '',
            blood_group: user.blood_group || ''
          });
          setBranchName(user.branch_name || user.branch || 'Tuition Center');
          setProfileCompletion(completion);
        }
      };
      refreshData();
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.primary, marginTop: 10, fontSize: 16, fontWeight: 'bold' }}>Loading Dashboard...</Text>
      </View>
    );
  }

  if (!studentData) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: Colors.text, fontSize: 16 }}>Could not load student data.</Text>
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
              <Text style={styles.welcomeSubtitle}>{branchName || 'Tuition Center'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={() => router.push('/(common)/edit-profile')}
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

        {/* Quick Stats Section */}
        <Animatable.View animation="fadeInUp" duration={800} delay={200}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <MaterialIcons name="school" size={24} color={Colors.primary} />
              <Text style={styles.statValue}>Tuition</Text>
              <Text style={styles.statLabel}>Student</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="location-on" size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{branchName?.split(' ')[0] || 'Center'}</Text>
              <Text style={styles.statLabel}>Branch</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="person" size={24} color={Colors.primary} />
              <Text style={styles.statValue}>{profileCompletion}%</Text>
              <Text style={styles.statLabel}>Profile</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Quick Actions Section */}
        <Animatable.View animation="fadeInUp" duration={800} delay={300}>
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {[
                { title: 'Homework', icon: 'book-open-variant', href: '/(common)/student-homework', colors: ['#FF6B6B', '#FF8E8E'] },
                { title: 'Newsletter', icon: 'newspaper-variant-outline', href: '/(common)/news-letter', colors: ['#4ECDC4', '#7EDDD8'] },
                { title: 'My Fees', icon: 'credit-card', href: '/(common)/my-fees', colors: ['#45B7D1', '#6BC5D8'] },
                { title: 'Timetable', icon: 'calendar-clock', href: '/(common)/timetable', colors: ['#e9ba21ff', '#c6f34cff'] },
                { title: 'Attendance', icon: 'calendar-check', href: '/(common)/my-attendance', colors: ['#96CEB4', '#B5D8C7'] },
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

        {/* Thirukkural Section */}
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

        {/* Spacer */}
        <View style={{ height: 120 }} />
      </ScrollView>

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
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  // Welcome Header
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeGreeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  profileButton: {
    position: 'relative',
  },
  headerProfilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  completionBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  completionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // Quick Actions
  quickActionsContainer: {
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: (width - 52) / 3,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  // Thirukkural Section
  thirukkuralContainer: {
    marginHorizontal: 0,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
    minHeight: 180,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  thirukkuralBackgroundImage: {
    borderRadius: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  thirukkuralTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  thirukkuralLine: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 6,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 12,
    marginHorizontal: 30,
  },
  thirukkuralExplanation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  // Coming Soon Popup
  comingSoonOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonPopup: {
    width: width * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  comingSoonGradient: {
    padding: 30,
    alignItems: 'center',
  },
  closeIconButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
    textAlign: 'center',
  },
  comingSoonDetails: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 24,
    textAlign: 'left',
  },
  comingSoonButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  comingSoonButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DDA0DD',
  },
});

export default TuitionStudentHomeScreen;
