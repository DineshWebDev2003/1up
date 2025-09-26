import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';

const { width } = Dimensions.get('window');

// Modern gradient colors for different categories
const categoryGradients = {
  management: Colors.gradientPrimary || ['#8B5CF6', '#A78BFA'],
  financial: Colors.gradientSecondary || ['#06B6D4', '#22D3EE'],
  academic: Colors.gradientAccent || ['#F59E0B', '#FBBF24'],
  communication: Colors.gradientSuccess || ['#10B981', '#34D399'],
  monitoring: Colors.gradientInfo || ['#3B82F6', '#60A5FA'],
  default: Colors.gradientPrimary || ['#8B5CF6', '#A78BFA']
};

const actions = [
  { icon: 'store', title: 'Create Branch', route: '/(common)/create-branch', category: 'management', description: 'Set up new branch locations' },
  { icon: 'person-add', title: 'Assign User', route: '/(common)/assign-new-user', category: 'management', description: 'Add new team members' },
  { icon: 'post-add', title: 'Post Activity', route: '/(common)/post-activity', category: 'communication', description: 'Share updates and news' },
  { icon: 'manage-accounts', title: 'Manage User', route: '/(common)/manage-user', category: 'management', description: 'Edit user permissions' },
  { icon: 'account-balance-wallet', title: 'Income & Expense', route: '/(common)/income-expense', category: 'financial', description: 'Track financial records' },
  { icon: 'schedule', title: 'Timetable', route: '/(common)/timetable', category: 'academic', description: 'Manage class schedules' },
  { icon: 'check-circle', title: 'Attendance', route: '/(common)/attendance-hub', category: 'academic', description: 'Track student presence' },
  { icon: 'payment', title: 'Update Fees', route: '/(common)/fees-update', category: 'financial', description: 'Manage fee structure' },
  { icon: 'videocam', title: 'Live Monitoring', route: '/(common)/live-monitoring', category: 'monitoring', description: 'Real-time surveillance' },
  { icon: 'directions-bus', title: 'Live Cab', route: '/(common)/live-cab', category: 'monitoring', description: 'Track transportation' },
  { icon: 'location-on', title: 'Track Cab', route: '/(common)/track-cab', category: 'monitoring', description: 'Real-time cab tracking' },
  { icon: 'badge', title: 'ID Card', route: '/(common)/id-card', category: 'management', description: 'Generate ID cards' },
  { icon: 'history', title: 'Payments History', route: '/(common)/payments-history', category: 'financial', description: 'View payment records' },
  { icon: 'child-care', title: 'Student Activities', route: '/(common)/kids-feed', category: 'communication', description: 'View student activities' },
  { icon: 'newspaper', title: 'News Letter', route: '/(common)/news-letter', category: 'communication', description: 'Create newsletters' },
  { icon: 'receipt', title: 'Generate Invoice', route: '/(common)/generate-invoice', category: 'financial', description: 'Create student invoices' }
];

// Process actions with proper error handling
const processedActions = actions.map((action, index) => {
  if (!action || !action.title) return null;
  
  return { 
    ...action, 
    colors: categoryGradients[action.category] || categoryGradients.default,
    id: index.toString()
  };
}).filter(Boolean);

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
        colors={action.colors} 
        style={styles.actionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.actionContent}>
          <View style={styles.actionIconContainer}>
            <MaterialIcons name={action.icon} size={28} color="white" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle} numberOfLines={1}>
              {action.title}
            </Text>
            <Text style={styles.actionDescription} numberOfLines={2}>
              {action.description}
            </Text>
          </View>
          <View style={styles.actionArrow}>
            <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  </Animatable.View>
);

const AdminQuickActionScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = (route) => {
    if (route) {
      router.push(route);
    }
  };

  return (
    <LinearGradient colors={Colors.gradientMain} style={styles.container}>
      <Animatable.View animation="fadeIn" duration={800} style={styles.animatedContainer}>
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
          {/* Header Section */}
          <Animatable.View animation="fadeInDown" duration={600} style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Quick Actions</Text>
            <Text style={styles.headerSubtitle}>Manage your playschool, daycare, and toddler care efficiently</Text>
          </Animatable.View>

          {/* Actions Grid */}
          <FlatList
            data={processedActions}
            renderItem={({ item, index }) => {
              if (!item || !item.title) return null;
              return (
                <ActionButton
                  action={item}
                  index={index}
                  onPress={() => handlePress(item.route)}
                />
              );
            }}
            keyExtractor={(item, index) => item?.id || `action-${index}`}
            contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            numColumns={1}
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
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  actionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
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

export default AdminQuickActionScreen;
