import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
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

// Developer actions - full system control
const developerActions = [
  { icon: 'shield-lock', title: 'Screen Blocking', href: '/(common)/screen-blocking', category: 'security', requiresAuth: true },
  { icon: 'database', title: 'Database CRUD', href: '/(common)/database-crud', category: 'database', requiresAuth: true },
  { icon: 'key-change', title: 'Password Changes', href: '/(common)/password-management', category: 'security', requiresAuth: true },
  { icon: 'update', title: 'App Updates', href: '/(common)/app-updates', category: 'system', requiresAuth: false },
  { icon: 'account-multiple', title: 'User Management', href: '/(common)/dev-user-management', category: 'management', requiresAuth: true },
  { icon: 'cog', title: 'System Settings', href: '/(common)/system-settings', category: 'system', requiresAuth: true },
  { icon: 'bug', title: 'Debug Console', href: '/(common)/debug-console', category: 'development', requiresAuth: true },
  { icon: 'server', title: 'Server Status', href: '/(common)/server-status', category: 'system', requiresAuth: false },
  { icon: 'backup-restore', title: 'Backup & Restore', href: '/(common)/backup-restore', category: 'database', requiresAuth: true },
  { icon: 'chart-timeline-variant', title: 'System Analytics', href: '/(common)/system-analytics', category: 'analytics', requiresAuth: false },
].map((action, index) => ({ 
  ...action, 
  gradient: gradients[index % gradients.length],
  id: index 
}));

const categories = {
  security: { title: '🔒 Security', color: Colors.gradientPrimary },
  database: { title: '🗄️ Database', color: Colors.gradientWarning },
  system: { title: '⚙️ System', color: Colors.gradientInfo },
  management: { title: '👥 Management', color: Colors.gradientSuccess },
  development: { title: '🔧 Development', color: Colors.gradientAccent },
  analytics: { title: '📊 Analytics', color: Colors.gradientSecondary },
};

export default function DeveloperQuickActionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userData, setUserData] = useState(null);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserData(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const filteredActions = selectedCategory === 'all' 
    ? developerActions 
    : developerActions.filter(action => action.category === selectedCategory);

  const handleActionPress = (action) => {
    if (action.requiresAuth && !isAuthenticated) {
      setPendingAction(action);
      setAuthModalVisible(true);
    } else {
      router.push(action.href);
    }
  };

  const handleAuthentication = async () => {
    try {
      // In a real app, you'd validate against a secure endpoint
      const response = await authFetch('/api/developer/authenticate.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();
      
      if (result.success) {
        setIsAuthenticated(true);
        setAuthModalVisible(false);
        setPassword('');
        
        if (pendingAction) {
          router.push(pendingAction.href);
          setPendingAction(null);
        }
        
        Alert.alert('Success', 'Authentication successful');
        
        // Auto-logout after 30 minutes
        setTimeout(() => {
          setIsAuthenticated(false);
          Alert.alert('Session Expired', 'Please authenticate again for secure actions');
        }, 30 * 60 * 1000);
        
      } else {
        Alert.alert('Authentication Failed', 'Invalid developer password');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Authentication failed');
    }
  };

  const renderActionItem = ({ item, index }) => (
    <Animatable.View 
      animation="fadeInUp" 
      delay={index * 100} 
      duration={600}
      style={styles.actionContainer}
    >
      <TouchableOpacity
        style={styles.actionItem}
        onPress={() => handleActionPress(item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={item.gradient}
          style={styles.actionGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name={item.icon} 
              size={32} 
              color="white" 
            />
            {item.requiresAuth && (
              <View style={styles.lockBadge}>
                <MaterialCommunityIcons 
                  name={isAuthenticated ? "lock-open" : "lock"} 
                  size={12} 
                  color="white" 
                />
              </View>
            )}
          </View>
          <Text style={styles.actionTitle}>{item.title}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {categories[item.category]?.title.split(' ')[0]}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderCategoryFilter = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, selectedCategory === 'all' && styles.activeFilter]}
        onPress={() => setSelectedCategory('all')}
      >
        <Text style={[styles.filterText, selectedCategory === 'all' && styles.activeFilterText]}>
          All
        </Text>
      </TouchableOpacity>
      {Object.entries(categories).map(([key, category]) => (
        <TouchableOpacity
          key={key}
          style={[styles.filterButton, selectedCategory === key && styles.activeFilter]}
          onPress={() => setSelectedCategory(key)}
        >
          <Text style={[styles.filterText, selectedCategory === key && styles.activeFilterText]}>
            {category.title.split(' ')[0]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAuthModal = () => (
    <Modal
      visible={authModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setAuthModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Animatable.View animation="slideInUp" style={styles.modalContainer}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            style={styles.modalHeader}
          >
            <MaterialCommunityIcons name="shield-lock" size={32} color="white" />
            <Text style={styles.modalTitle}>Developer Authentication</Text>
            <Text style={styles.modalSubtitle}>Enter developer password to continue</Text>
          </LinearGradient>
          
          <View style={styles.modalContent}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Developer Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setAuthModalVisible(false);
                  setPassword('');
                  setPendingAction(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.authButton}
                onPress={handleAuthentication}
              >
                <LinearGradient
                  colors={Colors.gradientSuccess}
                  style={styles.authButtonGradient}
                >
                  <Text style={styles.authButtonText}>Authenticate</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );

  return (
    <WhiteBackground>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
          <LinearGradient
            colors={Colors.gradientWarning}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.headerTitle}>🔧 Developer Console</Text>
            <Text style={styles.headerSubtitle}>
              Full System Access • {userData?.name || 'Developer'}
            </Text>
            {isAuthenticated && (
              <View style={styles.authStatus}>
                <MaterialCommunityIcons name="shield-check" size={16} color="white" />
                <Text style={styles.authStatusText}>Authenticated</Text>
              </View>
            )}
          </LinearGradient>
        </Animatable.View>

        {/* Category Filters */}
        {renderCategoryFilter()}

        {/* Actions Grid */}
        <FlatList
          data={filteredActions}
          renderItem={renderActionItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.row}
        />

        {renderAuthModal()}
      </SafeAreaView>
    </WhiteBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerGradient: {
    padding: 25,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  authStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  authStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilter: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeFilterText: {
    color: 'white',
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  actionContainer: {
    width: '48%',
    marginBottom: 15,
  },
  actionItem: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 2,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 18,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  categoryText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
  },
  modalHeader: {
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  modalContent: {
    padding: 25,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: Colors.surfaceVariant,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  authButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  authButtonGradient: {
    padding: 15,
    alignItems: 'center',
  },
  authButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
