import React, { useState, useEffect } from 'react';
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

const { width } = Dimensions.get('window');

const FranchiseeHomeScreen = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    monthly_income: 0,
    total_students: 0,
    present_today: 0
  });
  const [messages, setMessages] = useState([]);
  const [thirukkural, setThirukkural] = useState(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

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

        // Fetch stats, messages, and thirukkural in parallel
        const [statsResponse, messagesResponse, thirukkuralResponse] = await Promise.all([
          authFetch(`/api/dashboard/get_stats.php?branch_id=${currentUser.branch_id}`),
          authFetch('/api/messages/get_messages.php?role=franchisee'),
          fetch(`${authFetch.defaults.baseURL}/api/misc/get_thirukkural.php`)
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

        const thirukkuralResult = await thirukkuralResponse.json();
        if (thirukkuralResult.success) {
          setThirukkural(thirukkuralResult.data);
        } else {
          console.error('Failed to fetch Thirukkural:', thirukkuralResult.message);
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

          {/* Thirukkural Section */}
          <Animatable.View animation="fadeInUp" duration={600} delay={400}>
            <ImageBackground
              source={{ uri: 'https://i.pinimg.com/originals/eb/f0/a7/ebf0a721b780969928faeff800276ccd.jpg' }}
              style={styles.thirukkuralContainer}
              imageStyle={styles.thirukkuralBackgroundImage}
            >
              <View style={styles.overlay} />
              <Text style={styles.thirukkuralTitle}>திருக்குறள்</Text>
              {thirukkural ? (
                <>
                  {thirukkural.kural.split('\n').map((line, index) => (
                    <Text key={index} style={styles.thirukkuralLine}>{line}</Text>
                  ))}
                  <View style={styles.divider} />
                  <Text style={styles.thirukkuralExplanation}>{thirukkural.explanation}</Text>
                </>
              ) : (
                <Text style={styles.thirukkuralExplanation}>Could not load inspiration for today.</Text>
              )}
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
});

export default FranchiseeHomeScreen;
