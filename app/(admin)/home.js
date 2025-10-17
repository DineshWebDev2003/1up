import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, Alert, FlatList, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/colors';
import Profile from '../components/Profile';
import { LinearGradient } from 'expo-linear-gradient';
import GreenGradientBackground from '../components/GreenGradientBackground';
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


// Helper function to get icon name based on index
const getIconForIndex = (index) => {
  const icons = [
    'school', 'people', 'business', 'account-balance', 'trending-up', 
    'event', 'assignment', 'description', 'book', 'library-books',
    'local-library', 'menu-book', 'bookmark', 'bookmark-border', 'class',
    'computer', 'desktop-mac', 'devices', 'important-devices', 'laptop',
    'phone-android', 'phone-iphone', 'tablet-android'
  ];
  return icons[index % icons.length];
};

// CountingBox Component
const CountingBox = ({ title, value, icon, gradient }) => (
  <View style={styles.countingBox}>
    <LinearGradient colors={gradient} style={styles.countingBoxGradient}>
      <View style={styles.countingBoxContent}>
        <MaterialIcons name={icon} size={20} color="rgba(255,255,255,0.9)" />
        <Text style={styles.countingBoxValue}>{value}</Text>
        <Text style={styles.countingBoxTitle}>{title}</Text>
      </View>
    </LinearGradient>
  </View>
);

// QuickActionBox Component
const QuickActionBox = ({ title, icon, onPress, gradient }) => (
  <TouchableOpacity style={styles.quickActionBox} onPress={onPress}>
    <LinearGradient colors={gradient} style={styles.quickActionBoxGradient}>
      <View style={styles.quickActionBoxContent}>
        <MaterialIcons name={icon} size={18} color="rgba(255,255,255,0.9)" />
        <Text style={styles.quickActionBoxTitle}>{title}</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

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

  // Modern stat card component with proper positioning
  const StatCard = ({ title, value, icon, gradient }) => (
    <View style={styles.statCard}>
      <LinearGradient colors={gradient} style={styles.statCardGradient}>
        <View style={styles.statCardContent}>
          {/* Icon at top center */}
          <View style={styles.statCardIconContainer}>
            <MaterialIcons name={icon} size={28} color="rgba(255,255,255,0.9)" />
          </View>
          {/* Title below icon */}
          <Text style={styles.statCardTitle}>{title}</Text>
          {/* Value at bottom center */}
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
      <GreenGradientBackground>
        <StatusBar backgroundColor={Colors.primary} barStyle="light-content" translucent={false} />
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
      </GreenGradientBackground>
    );
  }

  console.log('Final user data for Profile component:', user);

  return (
    <GreenGradientBackground>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" translucent={false} />
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
                <StatCard title="Franchisees" value={stats.total_franchisee || '0'} icon="people" gradient={Colors.gradientSecondary} />
              </View>
            </View>
          )}
        </View>

        {/* Quick Action Section */}
        <View style={styles.quickActionSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionRow}>
            <QuickActionBox 
              title="Manage User" 
              icon="people-alt" 
              onPress={() => router.push('/(common)/manage-user')}
              gradient={Colors.gradientPrimary}
            />
            <QuickActionBox 
              title="Assign New User" 
              icon="person-add" 
              onPress={() => router.push('/(common)/assign-new-user')}
              gradient={Colors.gradientSecondary}
            />
            <QuickActionBox 
              title="Newsletter" 
              icon="mail" 
              onPress={() => router.push('/(common)/news-letter')}
              gradient={Colors.gradientAccent}
            />
            <QuickActionBox 
              title="Income/Expense" 
              icon="account-balance" 
              onPress={() => router.push('/(common)/income-expense')}
              gradient={['#FF8E53', '#FE6B8B']}
            />
          </View>
        </View>

      </ScrollView>
    </GreenGradientBackground>
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
    height: 130,
    justifyContent: 'space-between',
  },
  statCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statCardIconContainer: {
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Compact Dots Navigation
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
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  
  // Counting Containers Styles
  countingSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  countingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  countingBox: {
    width: (width - 64) / 4,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  countingBoxGradient: {
    borderRadius: 12,
    padding: 10,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countingBoxContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countingBoxValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 5,
  },
  countingBoxTitle: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 3,
  },
  
  // Quick Action Styles
  quickActionSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickActionBox: {
    width: (width - 80) / 4,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionBoxGradient: {
    borderRadius: 10,
    padding: 8,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionBoxContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBoxTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    marginTop: 5,
  },
});

export default AdminHomeScreen;
