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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';

// Add safety check for Colors object
const safeColors = Colors || {
  text: '#000000',
  textSecondary: '#666666',
  white: '#FFFFFF',
  border: '#E0E0E0',
  gradientPrimary: ['#FFD700', '#FFC400'],
  gradientSecondary: ['#000000', '#333333'],
  gradientAccent: ['#FFA000', '#FF8F00'],
  gradientSuccess: ['#FFD700', '#FFC400'],
  gradientWarning: ['#FFA000', '#FF8F00'],
  gradientInfo: ['#FFD700', '#FFC400'],
};
import WhiteBackground from '../components/WhiteBackground';

const gradients = [
  safeColors.gradientPrimary,
  safeColors.gradientSecondary,
  safeColors.gradientAccent,
  safeColors.gradientSuccess,
  safeColors.gradientWarning,
  safeColors.gradientInfo,
];

// Teacher actions - focused on teaching and student management
const teacherActions = [
    { icon: 'account-details', title: 'Students List', href: '/(common)/student-info', category: 'academic' },

  { icon: 'clipboard-check', title: 'Take Attendance', href: '/(common)/new-attendance', category: 'academic' },
  { icon: 'video', title: 'Live Monitoring', href: '/(common)/live-monitoring', category: 'monitoring' },
  { icon: 'post', title: 'Post Activity', href: '/(common)/post-activity', category: 'communication' },
  { icon: 'school', title: 'Student Activities', href: '/(common)/kids-feed', category: 'communication' },
  //{ icon: 'calendar-remove', title: 'Request Leave', href: '/(common)/request-leave', category: 'management' },
  { icon: 'bus', title: 'Track Cab', href: '/(common)/track-cab', category: 'monitoring' },
  { icon: 'calendar-check', title: 'View Attendance', href: '/(common)/unified-attendance', category: 'academic' },
  { icon: 'newspaper', title: 'Newsletter', href: '/(common)/news-letter', category: 'communication' },
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
      <MaterialCommunityIcons name="chevron-right" size={20} color={safeColors.textSecondary} />
    </TouchableOpacity>
  </Animatable.View>
);

const TeacherQuickActionScreen = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadUserFromStorage = async () => {
      setLoading(true);
      try {
        // Add null check for AsyncStorage
        if (!AsyncStorage) {
          console.error('AsyncStorage is undefined');
          router.replace('/login');
          return;
        }
        
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          setUser(JSON.parse(storedUserData));
        } else {
          console.warn('No user data found in storage for quick actions.');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Failed to load user from storage:', error);
        console.error('Error details:', error.message);
        console.error('AsyncStorage available:', !!AsyncStorage);
      } finally {
        setLoading(false);
      }
    };
    loadUserFromStorage();
  }, [router]);

  const handlePress = (href) => {
    try {
      if (href && user && router) {
        router.push({ pathname: href, params: { branch: user.branch, branch_id: user.branch_id } });
      } else {
        console.warn('Navigation failed:', { href: !!href, user: !!user, router: !!router });
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const renderItem = ({ item, index }) => (
    <ActionButton 
      action={item} 
      index={index} 
      onPress={() => handlePress(item.href)} 
    />
  );

  if (loading) {
    return (
      <WhiteBackground>
        <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
          <View style={[styles.header, { justifyContent: 'center', flex: 1 }]}>
            <Text style={styles.headerTitle}>Loading...</Text>
          </View>
        </SafeAreaView>
      </WhiteBackground>
    );
  }

  return (
    <WhiteBackground>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Teacher Actions</Text>
          <Text style={styles.headerSubtitle}>Quick access to teaching tools</Text>
        </View>
        <FlatList
          data={teacherActions}
          renderItem={renderItem}
          keyExtractor={(item) => item.title}
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
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: safeColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: safeColors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  actionButton: {
    backgroundColor: safeColors.white,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: safeColors.border,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: safeColors.text,
    marginBottom: 2,
  },
  actionCategory: {
    fontSize: 12,
    color: safeColors.textSecondary,
    textTransform: 'capitalize',
  },
});

export default TeacherQuickActionScreen;
