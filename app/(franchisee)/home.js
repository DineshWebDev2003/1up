import React, { useState, useEffect, useRef } from 'react';
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
  ImageBackground,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';
import Profile from '../components/Profile';
import WhiteBackground from '../components/WhiteBackground';


const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_MARGIN = (width - CARD_WIDTH) / 2;

const FranchiseeHomeScreen = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    monthly_income: 0,
    total_students: 0,
    present_today: 0
  });
  const [incomeExpenseData, setIncomeExpenseData] = useState({
    total_income: 0,
    total_expense: 0,
    net_profit: 0,
    sharing_enabled: false,
    franchisee_share_percentage: 0,
    franchisee_share_amount: 0,
    admin_share_amount: 0
  });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [branchName, setBranchName] = useState('');
  const insets = useSafeAreaInsets();

  // Quick Actions for franchisee (Reports removed)
  const quickActions = [
    {
      title: 'Assign User',
      icon: 'account-plus',
      href: '/(common)/assign-new-user',
      colors: ['#667eea', '#764ba2']
    },
    {
      title: 'Live Camera',
      icon: 'video',
      href: '/(common)/live-monitoring',
      colors: ['#4facfe', '#00f2fe']
    },
    {
      title: 'Income/Expense',
      icon: 'chart-line',
      href: '/(common)/income-expense',
      colors: ['#43e97b', '#38f9d7']
    },
    
    {
      title: 'Newsletter',
      icon: 'newspaper-variant-outline',
      href: '/(common)/news-letter',
      colors: ['#a8edea', '#fed6e3']
    }
  ];

  const handleQuickAction = (action) => {
    try {
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

  // Time update effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load data function - moved outside useEffect so it can be reused
  const loadData = React.useCallback(async () => {
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
        setBranchName(currentUser.branch_name || currentUser.branch || 'Branch');

        // 🔍 DEBUG: Log user data and API URLs
        console.log('👤 Current User Data:', {
          name: currentUser.name,
          role: currentUser.role,
          branch_id: currentUser.branch_id,
          branch_name: currentUser.branch_name || currentUser.branch
        });
        
        const statsUrl = `/api/dashboard/get_stats.php?branch_id=${currentUser.branch_id}`;
        console.log('🌐 API URLs being called:', {
          statsUrl: statsUrl,
          messagesUrl: '/api/messages/get_messages.php?role=franchisee',
          incomeExpenseUrl: `/api/income_expense/get_income_expense.php?branch_id=${currentUser.branch_id}`
        });

        // Fetch stats, messages, and income/expense data in parallel
        const [statsResponse, messagesResponse, incomeExpenseResponse] = await Promise.all([
          authFetch(statsUrl),
          authFetch('/api/messages/get_messages.php?role=franchisee'),
          authFetch(`/api/income_expense/get_income_expense.php?branch_id=${currentUser.branch_id}`)
        ]);

        const statsResult = await statsResponse.json();
        
        // 🔍 DEBUG: Log the complete stats response
        console.log('📊 GET_STATS API Response:', {
          success: statsResult.success,
          data: statsResult.data,
          message: statsResult.message,
          fullResponse: statsResult
        });
        
        if (statsResult.success) {
          console.log('✅ Stats data received:', {
            monthly_income: statsResult.data?.monthly_income,
            total_students: statsResult.data?.total_students,
            present_today: statsResult.data?.present_today,
            total_income: statsResult.data?.total_income
          });
          
          setStats(statsResult.data);
          
          // 🔍 DEBUG: Log what gets set in state
          console.log('📝 Setting stats state to:', statsResult.data);
        } else {
          console.error('❌ Failed to fetch stats:', statsResult.message);
          console.error('📄 Full error response:', statsResult);
        }

        const messagesResult = await messagesResponse.json();
        if (messagesResult.success) {
          setMessages(messagesResult.data || []);
        } else {
          console.error('Failed to fetch messages:', messagesResult.message);
        }

        const incomeExpenseResult = await incomeExpenseResponse.json();
        if (incomeExpenseResult.success && incomeExpenseResult.summary) {
          setIncomeExpenseData(incomeExpenseResult.summary);
        } else {
          console.error('Failed to fetch income/expense data:', incomeExpenseResult.message);
        }
        
        // 🔍 DEBUG: Log final state after all data is loaded
        console.log('🎯 Final Data Loading Summary:', {
          statsLoaded: statsResult.success,
          messagesLoaded: messagesResult.success,
          incomeExpenseLoaded: incomeExpenseResult.success,
          currentStats: statsResult.success ? statsResult.data : null,
          timestamp: new Date().toISOString()
        });
        
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
  }, [router]);

  // Refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);


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
      <WhiteBackground>
        <SafeAreaView style={[styles.centered]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
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
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Welcome Header */}
          <Animatable.View animation="fadeInDown" duration={600} delay={100}>
            <View style={styles.welcomeHeader}>
              <View style={styles.welcomeContent}>
                <Text style={styles.welcomeGreeting}>Welcome back,</Text>
                <Text style={styles.welcomeName}>{user?.name || 'Franchisee'}</Text>
                <Text style={styles.welcomeSubtitle}>{branchName || 'No Branch Assigned'}</Text>
              </View>
              <TouchableOpacity 
                style={styles.profileButton} 
                onPress={() => router.push('/(common)/profile')}
                activeOpacity={0.7}
              >
                <Image
                  source={user?.avatar ? { uri: user.avatar } : require('../../assets/Avartar.png')}
                  style={styles.headerProfilePic}
                />
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>FR</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animatable.View>

          {/* Dashboard Stats Section */}
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
            <View style={styles.dashboardContainer}>
              <View style={styles.dashboardHeader}>
                <View style={styles.dashboardHeaderLeft}>
                  <MaterialIcons name="dashboard" size={24} color={Colors.primary} />
                  <View style={styles.dashboardHeaderText}>
                    <Text style={styles.dashboardTitle}>Dashboard Overview</Text>
                    <Text style={styles.dashboardSubtitle}>
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
                >
                  <MaterialIcons name="refresh" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.statCardGradient}
                  >
                    <MaterialIcons name="account-balance-wallet" size={28} color="white" />
                    <Text style={styles.statLabel}>Monthly Income</Text>
                    <Text style={styles.statValue}>₹{incomeExpenseData.total_income?.toLocaleString('en-IN') || '0'}</Text>
                  </LinearGradient>
                </View>
                
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#4facfe', '#00f2fe']}
                    style={styles.statCardGradient}
                  >
                    <MaterialIcons name="school" size={28} color="white" />
                    <Text style={styles.statLabel}>Total Students</Text>
                    <Text style={styles.statValue}>{stats.total_students || '0'}</Text>
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#43e97b', '#38f9d7']}
                    style={styles.statCardGradient}
                  >
                    <MaterialIcons name="people" size={28} color="white" />
                    <Text style={styles.statLabel}>Present Today</Text>
                    <Text style={styles.statValue}>{stats.present_today || '0'}</Text>
                  </LinearGradient>
                </View>
                
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#fa709a', '#fee140']}
                    style={styles.statCardGradient}
                  >
                    <MaterialIcons name="trending-up" size={28} color="white" />
                    <Text style={styles.statLabel}>Net Profit</Text>
                    <Text style={styles.statValue}>₹{incomeExpenseData.net_profit?.toLocaleString('en-IN') || '0'}</Text>
                  </LinearGradient>
                </View>
              </View>
            </View>
          </Animatable.View>

          {/* Franchisee Share Section - Simplified */}
          {incomeExpenseData.sharing_enabled && incomeExpenseData.net_profit > 0 && (
            <Animatable.View animation="fadeInUp" duration={800} delay={300}>
              <View style={styles.profitShareContainer}>
                <View style={styles.profitShareHeader}>
                  <View style={styles.profitShareHeaderLeft}>
                    <MaterialIcons name="pie-chart" size={24} color={Colors.primary} />
                    <View style={styles.profitShareHeaderText}>
                      <Text style={styles.profitShareTitle}>Your Profit Share</Text>
                      <Text style={styles.profitShareSubtitle}>
                        {incomeExpenseData.franchisee_share_percentage}% of net profit
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={() => router.push('/(common)/income-expense')}
                  >
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <MaterialIcons name="arrow-forward" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.profitShareRow}>
                  <View style={styles.profitShareCard}>
                    <LinearGradient
                      colors={['#11998e', '#38ef7d']}
                      style={styles.profitShareCardGradient}
                    >
                      <MaterialIcons name="account-balance-wallet" size={24} color="white" />
                      <Text style={styles.profitShareLabel}>Your Share</Text>
                      <Text style={styles.profitShareValue}>₹{incomeExpenseData.franchisee_share_amount?.toLocaleString('en-IN') || '0'}</Text>
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.profitShareCard}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.profitShareCardGradient}
                    >
                      <MaterialIcons name="business" size={24} color="white" />
                      <Text style={styles.profitShareLabel}>Admin Share</Text>
                      <Text style={styles.profitShareValue}>₹{incomeExpenseData.admin_share_amount?.toLocaleString('en-IN') || '0'}</Text>
                    </LinearGradient>
                  </View>
                </View>
              </View>
            </Animatable.View>
          )}

          {/* Quick Actions Section */}
          <Animatable.View animation="fadeInUp" duration={800} delay={400}>
            <View style={styles.quickActionsContainer}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, index) => (
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

          {/* Spacer to prevent tab bar overlap */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  
  // Welcome Header (from student home)
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
  roleBadge: {
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
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },

  // Dashboard Container
  dashboardContainer: {
    backgroundColor: Colors.white,
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
    color: Colors.text,
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  refreshIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
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

  // Profit Share Container
  profitShareContainer: {
    backgroundColor: Colors.white,
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
  profitShareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profitShareHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profitShareHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  profitShareTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  profitShareSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  profitShareRow: {
    flexDirection: 'row',
    gap: 12,
  },
  profitShareCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profitShareCardGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  profitShareLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  profitShareValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },

  // Quick Actions
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
});

export default FranchiseeHomeScreen;
