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
import WhiteBackground from '../components/WhiteBackground';

const gradients = [
  Colors.gradientPrimary,
  Colors.gradientSecondary,
  Colors.gradientAccent,
  Colors.gradientSuccess,
  Colors.gradientWarning,
  Colors.gradientInfo,
];

// Admin actions - comprehensive management tools
const adminActions = [
  { icon: 'calendar-check', title: 'View Attendance', href: '/(common)/unified-attendance', category: 'academic' },
  { icon: 'domain', title: 'Create Branch', href: '/(common)/create-branch', category: 'management' },
  { icon: 'account-plus', title: 'Assign User', href: '/(common)/assign-new-user', category: 'management' },
  { icon: 'pencil', title: 'Post Activity', href: '/(common)/post-activity', category: 'communication' },
  { icon: 'account-group', title: 'Manage Users', href: '/(common)/manage-user', category: 'management' },
  { icon: 'wallet', title: 'Income & Expense', href: '/(common)/income-expense', category: 'financial' },
  { icon: 'calendar', title: 'Timetable', href: '/(common)/timetable', category: 'academic' },
  { icon: 'clipboard-check', title: 'Kids Attendance', href: '/(common)/new-attendance', category: 'academic' },
 // { icon: 'calendar-remove', title: 'Leave Requests', href: '/(common)/request-leave', category: 'management' },
  { icon: 'cash', title: 'My Invoice 2.0', href: '/(common)/my-invoice', category: 'financial' },
  //{ icon: 'credit-card', title: 'UPI Settings', href: '/(common)/upi-settings', category: 'financial' },
  { icon: 'video', title: 'Live Monitoring', href: '/(common)/live-monitoring', category: 'monitoring' },
  //{ icon: 'bus', title: 'Live Cab', href: '/(common)/live-cab', category: 'monitoring' },
  { icon: 'card-account-details', title: 'ID Card', href: '/(common)/id-card', category: 'management' },
  { icon: 'school', title: 'Student Activities', href: '/(common)/kids-feed', category: 'communication' },
  { icon: 'newspaper', title: 'Newsletter', href: '/(common)/news-letter', category: 'communication' },
  { icon: 'calendar-month', title: 'Monthly Attendance', href: '/(common)/monthly-attendance-screen', category: 'academic' },
  { icon: 'account-details', title: 'Students List', href: '/(common)/student-info', category: 'academic' },
  //{ icon: 'cellphone-arrow-down', title: 'App Update', href: '/(common)/app-update', category: 'system' },
  //{ icon: 'bell-ring', title: 'Test Notifications', href: '/(common)/test-notifications', category: 'management' },
].map((action, index) => ({ 
  ...action, 
  colors: gradients[index % gradients.length]
}));

const ActionButton = ({ action, index, onPress }) => (
  <Animatable.View animation="fadeInUp" duration={600} delay={index * 50}>
    <TouchableOpacity onPress={onPress} style={styles.actionButton} activeOpacity={0.8}>
      <View style={styles.actionContent}>
        <LinearGradient colors={action.colors} style={styles.iconContainer}>
          <MaterialCommunityIcons name={action.icon} size={28} color="white" />
        </LinearGradient>
        <View style={styles.actionTextContainer}>
          <Text style={styles.actionTitle}>{action.title}</Text>
          <Text style={styles.actionCategory}>{action.category}</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  </Animatable.View>
);

const AdminQuickActionScreen = () => {
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
      <WhiteBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading Quick Actions...</Text>
          </View>
        </SafeAreaView>
      </WhiteBackground>
    );
  }

  return (
    <WhiteBackground>
      <SafeAreaView style={styles.container}>
        <Animatable.View animation="fadeInDown" duration={600} style={styles.header}>
          <Text style={styles.headerTitle}>Admin Actions</Text>
          <Text style={styles.headerSubtitle}>Manage your {user?.branch || 'School System'}</Text>
        </Animatable.View>
        
        <FlatList
          data={adminActions}
          renderItem={({ item, index }) => (
            <ActionButton
              action={item}
              index={index}
              onPress={() => handlePress(item.href)}
            />
          )}
          keyExtractor={(item, index) => `${item.title}-${index}`}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </WhiteBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 20,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  actionCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default AdminQuickActionScreen;
