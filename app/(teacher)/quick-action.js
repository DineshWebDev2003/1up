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
import { Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import GreenGradientBackground from '../components/GreenGradientBackground';

const { width } = Dimensions.get('window');

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
  { icon: 'car-outline', title: 'Track Cab', href: '/(common)/track-cab' },
  { icon: 'view-dashboard-outline', title: 'Attendance Hub', href: '/(common)/attendance-hub' },
  { icon: 'post-outline', title: 'Post Activity', href: '/(common)/post-activity' },
  { icon: 'food-apple-outline', title: 'Student Activities', href: '/(common)/kids-feed' },
  { icon: 'file-document-outline', title: 'Request Leave', href: '/(common)/leave-request' },
].map((action, index) => ({ 
  ...action, 
  colors: (gradients && Array.isArray(gradients) && gradients.length > 0) 
    ? gradients[index % gradients.length] 
    : Colors.gradientPrimary 
}));

const TeacherQuickActionScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const ActionButton = ({ action, index, onPress }) => (
    <Animatable.View 
      animation="fadeInUp" 
      duration={600} 
      delay={index * 100}
      style={styles.itemWrapper}
    >
      <TouchableOpacity 
        style={styles.itemContainer} 
        onPress={() => onPress(action.href)}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={action.colors} 
          style={styles.gradientBackground}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name={action.icon} 
              size={32} 
              color="white" 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.itemTitle}>{action.title}</Text>
            <Text style={styles.itemDescription}>Tap to access {action.title.toLowerCase()}</Text>
          </View>
          <View style={styles.arrowContainer}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="white" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderItem = ({ item, index }) => (
    <ActionButton action={item} index={index} onPress={(href) => router.push(href)} />
  );

  return (
    <GreenGradientBackground>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quick Actions</Text>
          <Text style={styles.headerSubtitle}>Choose an action to get started</Text>
        </View>
        <FlatList
          data={actions}
          renderItem={renderItem}
          keyExtractor={(item) => item.title}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </GreenGradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  itemWrapper: {
    marginBottom: 16,
  },
  itemContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  gradientBackground: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  arrowContainer: {
    marginLeft: 16,
  },
});

export default TeacherQuickActionScreen;
