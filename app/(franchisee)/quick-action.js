import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import authFetch from '../utils/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import GreenGradientBackground from '../components/GreenGradientBackground';

const gradients = [
  Colors.gradientPrimary,
  Colors.gradientSecondary,
  Colors.gradientAccent,
  Colors.gradientSuccess,
  Colors.gradientWarning,
  Colors.gradientInfo,
];

// Franchisee actions - similar to admin but limited to assigned branch
const franchiseeActions = [
    //{ icon: 'calendar-today', title: 'View Attendance', route: '/(common)/unified-attendance', category: 'academic', description: 'View and manage attendance records' },

  { icon: 'calendar-check', title: 'View Attendance', href: '/(common)/unified-attendance' },
  { icon: 'pencil', title: 'Post Activity', href: '/(common)/post-activity' },
  { icon: 'wallet', title: 'Income & Expense', href: '/(common)/income-expense' },
  { icon: 'scale-balance', title: 'Settlements', href: '/(common)/settlements' },
  { icon: 'calendar', title: 'Timetable', href: '/(common)/timetable' },
  { icon: 'clipboard-check', title: 'Kids Attendance', href: '/(common)/new-attendance' },
  { icon: 'account-clock', title: 'Staff Attendance', href: '/(common)/staff-attendance' },
  { icon: 'calendar-remove', title: 'Leave Requests', href: '/(common)/request-leave' },
  { icon: 'cash', title: 'Update Fees', href: '/(common)/fees-update' },
  { icon: 'video', title: 'Live Monitoring', href: '/(common)/live-monitoring' },
  { icon: 'car', title: 'Track Cab', href: '/(common)/track-cab' },
  { icon: 'card-account-details', title: 'ID Card', href: '/(common)/id-card' },
  { icon: 'history', title: 'Payments History', href: '/(common)/payments-history' },
  { icon: 'school', title: 'Student Activity', href: '/(common)/kids-feed' },
  { icon: 'account-plus', title: 'Assign User', href: '/(common)/assign-new-user' },
  { icon: 'account-group', title: 'Manage Users', href: '/(common)/manage-user' },
  { icon: 'receipt', title: 'Generate Invoice', href: '/(common)/invoice-generator' },
].map((action, index) => ({ 
  ...action, 
  colors: (gradients && Array.isArray(gradients) && gradients.length > 0) 
    ? gradients[index % gradients.length] 
    : Colors.gradientPrimary 
}));

const ActionButton = ({ action, index, onPress }) => (
  <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
    <TouchableOpacity onPress={onPress} style={styles.button} activeOpacity={0.8}>
      <LinearGradient colors={action.colors} style={styles.iconContainer}>
        <MaterialCommunityIcons name={action.icon} size={30} color="white" />
      </LinearGradient>
      <Text style={styles.buttonText}>{action.title}</Text>
      <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.text} />
    </TouchableOpacity>
  </Animatable.View>
);

const FranchiseeQuickActionScreen = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadUserFromStorage = async () => {
      setLoading(true);
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          setUser(JSON.parse(storedUserData));
        } else {
          console.warn('No user data found in storage for quick actions.');
          // Optionally, redirect to login
          router.replace('/login');
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUserFromStorage();
  }, []);

  const handlePress = (href) => {
    if (href && user) {
      router.push({ pathname: href, params: { branch: user.branch, branch_id: user.branch_id } });
    }
  };

  if (loading) {
    return (
      <GreenGradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={[styles.loadingContainer]}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </GreenGradientBackground>
    );
  }

  return (
    <GreenGradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={styles.headerTitle}>Quick Actions</Text>
          <Text style={styles.headerSubtitle}>{user?.branch || 'Branch'}</Text>
        </View>
        <FlatList
          data={franchiseeActions || []}
          renderItem={({ item, index }) => (
            <ActionButton
              action={item}
              index={index}
              onPress={() => handlePress(item.href)}
            />
          )}
          keyExtractor={(item, index) => item?.title || `action-${index}`}
          contentContainerStyle={[styles.listContainer, { paddingTop: 20, paddingBottom: insets.bottom + 95 }]}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </GreenGradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.gradientPrimary[0],
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 5,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default FranchiseeQuickActionScreen;
