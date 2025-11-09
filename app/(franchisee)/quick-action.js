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

// Franchisee actions - redesigned and optimized (Leave Requests and Live Cab Screen removed)
const franchiseeActions = [
    { icon: 'account-details', title: 'Students List', href: '/(common)/student-info', category: 'academic' },
  { icon: 'calendar-check', title: 'View Attendance', href: '/(common)/unified-attendance', category: 'attendance' },
  { icon: 'pencil', title: 'Post Activity', href: '/(common)/post-activity', category: 'content' },
  { icon: 'wallet', title: 'Income & Expense', href: '/(common)/income-expense', category: 'finance' },
  { icon: 'calendar', title: 'Timetable', href: '/(common)/timetable', category: 'academic' },
  { icon: 'clipboard-check', title: 'Kids Attendance', href: '/(common)/new-attendance', category: 'attendance' },
  //{ icon: 'account-clock', title: 'Staff Attendance', href: '/(common)/staff-attendance', category: 'attendance' },
  { icon: 'video', title: 'Live Monitoring', href: '/(common)/live-monitoring', category: 'security' },
  { icon: 'card-account-details', title: 'ID Card', href: '/(common)/id-card', category: 'management' },
  { icon: 'school', title: 'Student Activity', href: '/(common)/kids-feed', category: 'content' },
  { icon: 'account-plus', title: 'Assign User', href: '/(common)/assign-new-user', category: 'management' },
  { icon: 'newspaper', title: 'Newsletter', href: '/(common)/news-letter', category: 'content' },
  { icon: 'account-group', title: 'Manage Users', href: '/(common)/manage-user', category: 'management' },
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
          <Text style={styles.headerTitle}>Quick Actions</Text>
          <Text style={styles.headerSubtitle}>Manage your {user?.branch || 'Branch'}</Text>
        </Animatable.View>
        
        <FlatList
          data={franchiseeActions}
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

export default FranchiseeQuickActionScreen;
