import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, Alert, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/colors';
import Profile from '../components/Profile';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';
import { MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

// Import local JSON data
import ThirukkuralData from '../assets/thirukkural.json';
import InspirationsData from '../assets/inspirations.json';


const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_MARGIN = (width - CARD_WIDTH) / 2;


const AdminHomeScreen = () => {
  const router = useRouter();
    const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total_income: 0, total_students: 0, total_branches: 0, total_franchisee: 0 });
  const [loading, setLoading] = useState(true);
  const [inspirationTranslations, setInspirationTranslations] = useState({});
  const insets = useSafeAreaInsets();
  const [dailyItems, setDailyItems] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const inspirationScrollRef = useRef(null);

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
      try {
        setLoading(true);
        
        // Check if user is authenticated first
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        
        if (!sessionToken) {
          console.warn('No session token found - redirecting to authentication screen');
          setLoading(false);
          return;
        }
        
        console.log('Session token found, loading user data...');

        // Load user data from AsyncStorage first
        // Load user data from AsyncStorage first
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
            setUser(JSON.parse(storedUserData));
        } else {
            // If there's a session token but no user data, something is wrong.
            // We should not invent a default user. We'll let the auth check handle it.
            console.warn('Session token found but no user data. The user might need to log in again.');
            // Optionally, force a re-log
            // router.replace('/login');
            // return;
        }

        const statsResponse = await authFetch(`/api/dashboard/get_stats.php`);
        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          setStats(statsResult.data);
        }

      } catch (error) {
        console.error('Failed to load admin data:', error);
        // If authentication fails completely, redirect to login
        if (error.message && error.message.includes('Authentication required')) {
          router.replace('/login');
          return;
        }
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

  // Modern stat card component
  const StatCard = ({ title, value, icon, gradient }) => (
    <View style={styles.statCard}>
      <LinearGradient colors={gradient} style={styles.statCardGradient}>
        <View style={styles.statCardContent}>
          <MaterialIcons name={icon} size={32} color="rgba(255,255,255,0.9)" />
          <Text style={styles.statCardTitle}>{title}</Text>
          <Text style={styles.statCardValue}>{value}</Text>
        </View>
      </LinearGradient>
    </View>
  );


  // Function to clear AsyncStorage completely
  const clearStorage = async () => {
    try {
      await AsyncStorage.clear(); // Clear everything
      console.log('AsyncStorage completely cleared');
      Alert.alert('Storage Cleared', 'All stored data has been cleared. Please restart the app and log in again.');
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  };

  // Show login prompt if no session token
  if (!user && !loading) {
    return (
      <LinearGradient colors={Colors.gradientMain} style={styles.container}>
        <View style={styles.loginPromptContainer}>
          <Text style={styles.loginPromptTitle}>Authentication Required</Text>
          <Text style={styles.loginPromptText}>Please log in to access the admin dashboard</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.loginButton, { marginTop: 10, backgroundColor: 'rgba(255,0,0,0.2)' }]}
            onPress={clearStorage}
          >
            <Text style={styles.loginButtonText}>Clear Storage</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  console.log('Final user data for Profile component:', user);

  return (
    <LinearGradient colors={Colors.gradientMain} style={styles.container}>
      <ScrollView 
        style={[styles.scrollView, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
          {user && (
            <Profile 
              name={user.name}
              role={user.role}
              branch={user.branch || user.branch_name || 'All Branches'}
              profileImage={user.avatar}
            />
          )}
        </Animatable.View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
          ) : stats && (
            <View>
              <View style={styles.fullWidthCard}>
                <LinearGradient colors={['#6a11cb', '#2575fc']} style={styles.fullWidthCardGradient}>
                  <View style={styles.fullWidthCardHeader}>
                    <MaterialIcons name="account-balance-wallet" size={24} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.fullWidthCardTitle}>Monthly Income</Text>
                  </View>
                  <Text style={styles.fullWidthCardValue}>{`₹${stats.total_income ? stats.total_income.toLocaleString('en-IN') : '0'}`}</Text>
                </LinearGradient>
              </View>

              <View style={styles.statsGrid}>
                <StatCard title="Total Students" value={stats.total_students || '0'} icon="school" gradient={Colors.gradientSecondary} />
                <StatCard title="Total Branches" value={stats.total_branches || '0'} icon="business" gradient={Colors.gradientAccent} />
                <StatCard title="Franchisees" value={stats.total_franchisee || '0'} icon="people" gradient={Colors.gradientSuccess} />
              </View>
            </View>
          )}
        </View>

        {/* Daily Inspiration Section */}
        <View style={styles.inspirationSection}>
          <Text style={styles.sliderTitle}>Daily Inspiration</Text>
          <ScrollView
            ref={inspirationScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentSlideIndex(slideIndex);
            }}
            style={styles.inspirationSlider}
          >
            {dailyItems.map((item, index) => (
              <View key={index} style={[styles.inspirationSlide, { width }]}>
                <LinearGradient 
                  colors={item.type === 'kural' ? ['#8B5CF6', '#06B6D4'] : ['#F59E0B', '#EF4444']} 
                  style={styles.inspirationCard}
                >
                  <Animatable.View animation="fadeIn" style={styles.inspirationContent}>
                    {item.type === 'kural' ? (
                      <>
                        <Text style={styles.kuralText}>{item.kural_tamil}</Text>
                        <View style={styles.divider} />
                        <Text style={styles.explanationText}>{item.explanation_tamil}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.quoteText}>
                          {inspirationTranslations[item.id] ? item.quote_ta : item.quote_en}
                        </Text>
                        <Text style={styles.authorText}>- {item.author}</Text>
                        <TouchableOpacity style={styles.translateButton} onPress={() => toggleInspirationTranslation(item.id)}>
                          <Text style={styles.translateButtonText}>{inspirationTranslations[item.id] ? 'English' : 'தமிழ்'}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </Animatable.View>
                  
                  {/* Dots inside the card */}
                  <View style={styles.cardDotsContainer}>
                    {dailyItems.map((_, dotIndex) => (
                      <TouchableOpacity
                        key={dotIndex}
                        style={[
                          styles.cardDot,
                          currentSlideIndex === dotIndex ? styles.activeCardDot : styles.inactiveCardDot
                        ]}
                        onPress={() => {
                          inspirationScrollRef.current?.scrollTo({ x: dotIndex * width, animated: true });
                          setCurrentSlideIndex(dotIndex);
                        }}
                      />
                    ))}
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Increased bottom padding
  },
  
  // Header
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  
  // Section Titles
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sliderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  
  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: Colors.white,
    marginTop: 12,
    fontSize: 16,
    opacity: 0.8,
  },
  
  // Stats section
  statsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  fullWidthCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  fullWidthCardGradient: {
    padding: 24,
    borderRadius: 20,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (width - 56) / 3,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statCardGradient: {
    borderRadius: 20,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  statCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 8,
    flex: 1,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  
  // Inspiration Section
  inspirationSection: {
    marginTop: 32,
    paddingHorizontal: 0,
    marginBottom: 40, // Added margin to avoid tab bar overlap
  },
  sliderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  inspirationCard: {
    borderRadius: 20,
    padding: 24,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    flex: 1,
    marginHorizontal: 8,
  },
  kuralText: {
    fontSize: 17,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '40%',
    alignSelf: 'center',
    marginVertical: 16,
  },
  explanationText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  quoteText: {
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 30,
  },
  authorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
    marginTop: 8,
  },
  translateButton: {
    marginTop: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  translateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Slider styles
  inspirationSlider: {
    height: 220,
  },
  inspirationSlide: {
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inspirationContent: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  
  // Dots styles
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.2 }],
  },
  inactiveDot: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  
  // Card dots (inside inspiration cards)
  cardDotsContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  activeCardDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    transform: [{ scale: 1.3 }],
  },
  inactiveCardDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  loginPromptText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 30,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminHomeScreen;
