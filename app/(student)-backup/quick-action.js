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

const actions = [
  { icon: 'camera-outline', title: 'Live Camera', href: '/(common)/live-monitoring' },
  { icon: 'wallet-outline', title: 'My Fees', href: '/(common)/income-expense' },
  { icon: 'map-marker-outline', title: 'Track Cab', href: '/(common)/track-cab' },
  { icon: 'clipboard-check-outline', title: 'Attendance', href: '/(common)/attendance-hub' },
  { icon: 'credit-card-outline', title: 'Payment History', href: '/(common)/payments-history' },
  { icon: 'food-apple-outline', title: 'Kids Feed', href: '/(common)/kids-feed' },
].map((action, index) => ({ 
  ...action, 
  colors: (gradients && Array.isArray(gradients) && gradients.length > 0) 
    ? gradients[index % gradients.length] 
    : Colors.gradientPrimary 
}));

const ActionButton = ({ action, index, onPress }) => (
  <Animatable.View 
    animation="fadeInUp" 
    duration={600} 
    delay={index * 80}
    style={styles.actionCard}
  >
    <TouchableOpacity 
      onPress={onPress} 
      style={styles.actionButton} 
      activeOpacity={0.9}
    >
      <LinearGradient 
        colors={action.colors || Colors.gradientPrimary} 
        style={styles.actionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.actionContent}>
          <View style={styles.actionIconContainer}>
            <MaterialCommunityIcons name={action.icon} size={28} color="white" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle} numberOfLines={1}>
              {action.title}
            </Text>
          </View>
          <View style={styles.actionArrow}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  </Animatable.View>
);

const StudentQuickActionScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [studentData, setStudentData] = useState({ id: null, branch_id: null });

  useEffect(() => {
    const loadStudentData = async () => {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // Fetch full details to ensure we have the branch_id
        try {
          const response = await authFetch(`/api/get_student_details.php?id=${user.id}`);
          const result = await response.json();
          if (result.success) {
            setStudentData(result.data);
          }
        } catch (error) {
          console.error("Failed to load student details for quick actions:", error);
        }
      }
    };
    loadStudentData();
  }, []);

    const handlePress = (action) => {
    if (!action.href) return;

    let params = {};
    if (action.title === 'Live Camera') {
      params.branch_id = studentData.branch_id;
    }

    router.push({ pathname: action.href, params });
  };

  return (
    <LinearGradient colors={Colors.gradientMain} style={styles.container}>
      <Animatable.View animation="fadeIn" duration={800} style={styles.animatedContainer}>
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
          {/* Header Section */}
          {/* <Animatable.View animation="fadeInDown" duration={600} style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Quick Actions</Text>
            <Text style={styles.headerSubtitle}>Access your student services</Text>
          </Animatable.View> */}

          {/* Actions List */}
          <FlatList
            data={actions.filter(item => item && item.title)}
            renderItem={({ item, index }) => (
              <ActionButton
                action={item}
                index={index}
                onPress={() => handlePress(item)}
              />
            )}
            keyExtractor={(item, index) => item?.title || `action-${index}`}
            contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Animatable.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  
  // Header
  headerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  
  // List Container
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  
  // Action Cards
  actionCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  actionButton: {
    borderRadius: 20,
  },
  actionGradient: {
    borderRadius: 20,
    padding: 20,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
  actionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StudentQuickActionScreen;
