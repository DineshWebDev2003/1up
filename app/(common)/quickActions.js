import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';

const actions = [
  { id: '1', title: 'Live Camera', icon: 'camera-outline' },
  { id: '2', title: 'Wallet', icon: 'wallet-outline' },
  { id: '3', title: 'Live Cab', icon: 'bus-outline' },
  { id: '4', title: 'News Letter', icon: 'newspaper-variant-outline' },
  { id: '5', title: 'Kids Feed', icon: 'food-apple-outline' },
  { id: '6', title: 'Leave Request', icon: 'calendar-check-outline' },
];

const QuickActions = () => {
  const renderItem = ({ item, index }) => (
    <Animatable.View animation="zoomIn" duration={500} delay={index * 100} style={styles.actionButtonContainer}>
      <TouchableOpacity style={styles.actionButton}>
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          style={styles.gradient}
        >
          <MaterialCommunityIcons name={item.icon} size={32} color={Colors.white} />
          <Text style={styles.actionText}>{item.title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <Animatable.View animation="fadeInUp" duration={800} style={styles.container}>
      <Text style={styles.sectionHeader}>Quick Actions</Text>
      <FlatList
        data={actions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
      />
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginTop: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 15,
    ...Platform.select({ 
      ios: { shadowRadius: 10, shadowOpacity: 0.1 }, 
      android: { elevation: 5 }
    }),
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 15,
  },
  row: {
    justifyContent: 'space-around',
  },
  actionButtonContainer: {
    flex: 1,
    maxWidth: '33%',
    alignItems: 'center',
  },
  actionButton: {
    width: 90,
    height: 90,
    margin: 6,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({ 
      ios: { shadowRadius: 5, shadowOpacity: 0.15 }, 
      android: { elevation: 3 }
    }),
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  actionText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default QuickActions;
