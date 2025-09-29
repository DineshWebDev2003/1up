import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';
import Profile from '../components/Profile';
import ModernBackground from '../components/ModernBackground';

// Import local JSON data
import ThirukkuralData from '../assets/thirukkural.json';
import InspirationsData from '../assets/inspirations.json';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_MARGIN = (width - CARD_WIDTH) / 2;

const FranchiseeHomeScreen = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    monthly_income: 0,
    total_students: 0,
    present_today: 0
  });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspirationTranslations, setInspirationTranslations] = useState({});
  const [dailyItems, setDailyItems] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const inspirationScrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const kuralOfTheDay = { ...ThirukkuralData[dayOfYear % ThirukkuralData.length], type: 'kural', id: 'kural' };
    const inspirationOfTheDay = { ...InspirationsData[dayOfYear % InspirationsData.length], type: 'inspiration', id: 'inspiration' };
    
    // Create array of daily items for manual scrolling
    const items = [kuralOfTheDay, inspirationOfTheDay];
    setDailyItems(items);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Check if user is authenticated first
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        if (!sessionToken) {
          console.warn('No session token found, user needs to log in');
          setLoading(false);
          router.replace('/login');
          return;
        }

        const storedUserData = await AsyncStorage.getItem('userData');
        if (!storedUserData) {
          console.warn('No user data found in storage, redirecting to login.');
          router.replace('/login');
          setLoading(false);
          return;
        }
        const currentUser = JSON.parse(storedUserData);
        setUser(currentUser);

        // Fetch stats and messages in parallel
        const [statsResponse, messagesResponse] = await Promise.all([
          authFetch(`/api/dashboard/get_stats.php?branch_id=${currentUser.branch_id}`),
          authFetch('/api/messages/get_messages.php?role=franchisee')
        ]);

        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          setStats(statsResult.data);
        } else {
          console.error('Failed to fetch stats:', statsResult.message);
        }

        const messagesResult = await messagesResponse.json();
        if (messagesResult.success) {
          setMessages(messagesResult.data || []);
        } else {
          console.error('Failed to fetch messages:', messagesResult.message);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (error.message && error.message.includes('Authentication required')) {
          router.replace('/login');
          return;
        }
        setUser({ name: 'Error', role: 'Franchisee', branch: 'Could not load' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);


  // Refresh user data when screen comes into focus (e.g., returning from edit profile)
  useFocusEffect(
    React.useCallback(() => {
      const refreshUserData = async () => {
        try {
          const storedUserData = await AsyncStorage.getItem('userData');
          if (storedUserData) {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      };
      refreshUserData();
    }, [])
  );

  const toggleInspirationTranslation = (id) => {
    setInspirationTranslations(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

          {/* Header Section */}
          <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
            {user && (
              <Profile 
                name={user.name} 
                role={user.role} 
                branch={user.branch || user.branch_name || 'Branch'}
                profileImage={user.avatar}
              />
            )}
          </Animatable.View>

          {/* Stats Cards */}
          <Animatable.View animation="fadeInUp" duration={600} delay={200}>
            <View style={styles.statsContainer}>
              {/* Full width Monthly Income card */}
              <Animatable.View animation="fadeInUp" duration={600} delay={300} style={styles.fullWidthCard}>
                <LinearGradient colors={Colors.gradientPrimary} style={styles.fullWidthCardGradient}>
                  <View style={styles.fullWidthCardContent}>
                    <View style={styles.fullWidthCardHeader}>
                      <MaterialIcons name="account-balance-wallet" size={32} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.fullWidthCardTitle}>Monthly Income</Text>
                    </View>
                    <Text style={styles.fullWidthCardValue}>{`INR ${stats.total_income ? stats.total_income.toLocaleString('en-IN') : '0'}`}</Text>
                  </View>
                </LinearGradient>
              </Animatable.View>

              {/* Stats Grid for other cards */}
              <View style={styles.statsGrid}>
                <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.statCardLarge}>
                  <LinearGradient colors={Colors.gradientSecondary} style={styles.statCardLargeGradient}>
                    <View style={styles.statCardLargeContent}>
                      <MaterialIcons name="school" size={32} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.statCardLargeTitle}>Total Students</Text>
                      <Text style={styles.statCardLargeValue}>{stats.total_students || '0'}</Text>
                    </View>
                  </LinearGradient>
                </Animatable.View>

                <Animatable.View animation="fadeInUp" duration={600} delay={500} style={styles.statCardLarge}>
                  <LinearGradient colors={Colors.gradientAccent} style={styles.statCardLargeGradient}>
                    <View style={styles.statCardLargeContent}>
                      <MaterialIcons name="people" size={32} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.statCardLargeTitle}>Present Today</Text>
                      <Text style={styles.statCardLargeValue}>{stats.present_today || '0'}</Text>
                    </View>
                  </LinearGradient>
                </Animatable.View>
              </View>
            </View>
          </Animatable.View>

          {/* Daily Inspiration Section - Compact Horizontal Cards */}
          <View style={styles.inspirationSection}>
            <Animatable.View animation="fadeInDown" duration={1000} style={styles.inspirationHeader}>
              <View style={styles.headerIconContainer}>
                <MaterialIcons name="auto-awesome" size={24} color={Colors.white} />
              </View>
              <View style={styles.headerDecoration} />
            </Animatable.View>
            <Text style={styles.sliderTitle}>Daily Inspiration</Text>
            
            <ScrollView
              ref={inspirationScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const slideIndex = Math.round(event.nativeEvent.contentOffset.x / (width * 0.9));
                setCurrentSlideIndex(slideIndex);
              }}
              style={styles.compactInspirationSlider}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              {dailyItems.map((item, index) => (
                <View key={index} style={[styles.compactInspirationSlide, { width: width * 0.9 }]}>
                  <Animatable.View 
                    animation="fadeInUp" 
                    duration={1000}
                    delay={index * 200}
                    style={styles.compactInspirationCard}
                  >
                    {/* Card Background Gradient */}
                    <LinearGradient
                      colors={item.type === 'kural' ? ['#667eea', '#764ba2'] : ['#f093fb', '#f5576c']}
                      style={styles.compactCardGradientBackground}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    
                    {/* Card Content Container */}
                    <View style={styles.compactCardContentContainer}>
                      {/* Card Header */}
                      <View style={styles.compactCardHeader}>
                        <View style={styles.compactIconContainer}>
                          <MaterialIcons 
                            name={item.type === 'kural' ? 'menu-book' : 'format-quote'} 
                            size={20} 
                            color="rgba(255,255,255,0.9)" 
                          />
                        </View>
                        <Text style={styles.compactCardTypeText}>
                          {item.type === 'kural' ? 'Thirukkural' : 'Daily Quote'}
                        </Text>
                      </View>

                      {/* Card Content */}
                      <View style={styles.compactContentContainer}>
                        {item.type === 'kural' ? (
                          <>
                            <Text style={styles.compactKuralText}>{item.kural_tamil}</Text>
                            <Text style={styles.compactExplanationText}>{item.explanation_tamil}</Text>
                </>
              ) : (
                          <>
                            <Text style={styles.compactQuoteText}>
                              {inspirationTranslations[item.id] ? item.quote_ta : item.quote_en}
                            </Text>
                            <Text style={styles.compactAuthorText}>- {item.author}</Text>
                            <TouchableOpacity 
                              style={styles.compactTranslateButton} 
                              onPress={() => toggleInspirationTranslation(item.id)}
                            >
                              <MaterialIcons 
                                name="translate" 
                                size={12} 
                                color="rgba(255,255,255,0.9)" 
                              />
                              <Text style={styles.compactTranslateButtonText}>
                                {inspirationTranslations[item.id] ? 'EN' : 'தமிழ்'}
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
          </Animatable.View>
                </View>
              ))}
            </ScrollView>

            {/* Compact Dots Navigation */}
            <View style={styles.compactDotsContainer}>
              {dailyItems.map((_, dotIndex) => (
                <TouchableOpacity
                  key={dotIndex}
                  style={[
                    styles.compactDot,
                    currentSlideIndex === dotIndex ? styles.compactActiveDot : styles.compactInactiveDot
                  ]}
                  onPress={() => {
                    inspirationScrollRef.current?.scrollTo({ x: dotIndex * (width * 0.9), animated: true });
                    setCurrentSlideIndex(dotIndex);
                  }}
                />
              ))}
            </View>
          </View>
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
  header: {
    marginBottom: 20,
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
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  fullWidthCard: {
    marginBottom: 15,
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
  // Stats Container
  statsContainer: {
    gap: 16,
  },
  
  // Full Width Card (Monthly Income)
  fullWidthCard: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 16,
  },
  fullWidthCardGradient: {
    borderRadius: 24,
    padding: 24,
    minHeight: 120,
  },
  fullWidthCardContent: {
    justifyContent: 'space-between',
  },
  fullWidthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fullWidthCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginLeft: 12,
    flex: 1,
  },
  fullWidthCardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  // Large Stat Cards
  statCardLarge: {
    flex: 1,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statCardLargeGradient: {
    borderRadius: 20,
    padding: 20,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  statCardLargeContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLargeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginVertical: 8,
  },
  statCardLargeValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  
  statIconContainer: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  statLabelSmall: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  thirukkuralContainer: {
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 25,
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
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
  // Compact Inspiration Section Styles
  inspirationSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  inspirationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  headerDecoration: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 12,
    borderRadius: 1,
  },
  compactInspirationSlider: {
    marginBottom: 16,
  },
  compactInspirationSlide: {
    paddingHorizontal: 8,
  },
  compactInspirationCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  compactCardGradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  compactCardContentContainer: {
    padding: 16,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  compactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  compactCardTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactContentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  compactKuralText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  compactExplanationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'left',
    lineHeight: 18,
    fontStyle: 'italic',
    flexWrap: 'wrap',
  },
  compactQuoteText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 6,
    fontFamily: 'serif',
    flexWrap: 'wrap',
  },
  compactAuthorText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  compactTranslateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  compactTranslateButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
  },
  compactDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  compactDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  compactActiveDot: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 24,
  },
  compactInactiveDot: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 8,
  },
});

export default FranchiseeHomeScreen;
