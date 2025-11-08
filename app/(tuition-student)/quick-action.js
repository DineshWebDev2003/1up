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

// Tuition Student actions - focused on learning and homework
const tuitionStudentActions = [
  { icon: 'book-open-page-variant', title: 'My Homework', href: '/(common)/student-homework', category: 'learning' },
  { icon: 'clipboard-check', title: 'Submit Work', href: '/(common)/submit-homework', category: 'learning' },
  { icon: 'calendar-check', title: 'My Attendance', href: '/(common)/student-attendance', category: 'academic' },
  { icon: 'chart-line', title: 'My Progress', href: '/(common)/my-progress', category: 'academic' },
  { icon: 'calendar-clock', title: 'Class Schedule', href: '/(common)/my-schedule', category: 'academic' },
  { icon: 'account-tie', title: 'My Teachers', href: '/(common)/my-teachers', category: 'communication' },
  { icon: 'file-document', title: 'Study Materials', href: '/(common)/my-materials', category: 'resources' },
  { icon: 'message-text', title: 'Messages', href: '/(common)/student-messages', category: 'communication' },
  { icon: 'trophy', title: 'Achievements', href: '/(common)/my-achievements', category: 'academic' },
  { icon: 'bell-ring', title: 'Notifications', href: '/(common)/student-notifications', category: 'communication' },
].map((action, index) => ({ 
  ...action, 
  gradient: gradients[index % gradients.length],
  id: index 
}));

const categories = {
  learning: { title: '📚 Learning', color: Colors.gradientPrimary },
  academic: { title: '🎓 Academic', color: Colors.gradientSuccess },
  communication: { title: '💬 Communication', color: Colors.gradientWarning },
  resources: { title: '📖 Resources', color: Colors.gradientAccent },
};

export default function TuitionStudentQuickActionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userData, setUserData] = useState(null);

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
    ? tuitionStudentActions 
    : tuitionStudentActions.filter(action => action.category === selectedCategory);

  const handleActionPress = (action) => {
    router.push(action.href);
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

  return (
    <WhiteBackground>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
          <LinearGradient
            colors={Colors.gradientSuccess}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.headerTitle}>📖 Student Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              Welcome, {userData?.name || 'Student'}
            </Text>
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
});
