import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import authFetch from '../utils/api';

const mockNotifications = [
  {
    id: '1',
    type: 'new_user',
    title: 'New User Added',
    message: 'A new student, Anbu, has been added to the Chennai franchisee.',
    time: '10 minutes ago',
    icon: 'person-add-outline',
    read: false,
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment Received',
    message: 'Received a payment of INR 5,000 for school fees.',
    time: '1 hour ago',
    icon: 'wallet-outline',
    read: false,
  },
  {
    id: '3',
    type: 'expense',
    title: 'Expense Recorded',
    message: 'An expense of INR 1,200 for supplies has been recorded.',
    time: '3 hours ago',
    icon: 'cart-outline',
    read: true,
  },
  {
    id: '4',
    type: 'income',
    title: 'Income Recorded',
    message: 'An income of INR 15,000 from donations has been recorded.',
    time: '1 day ago',
    icon: 'cash-outline',
    read: true,
  },
];

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleNotificationPress = (item) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === item.id ? { ...notif, read: true } : notif
      )
    );

    // Navigate based on notification type
    switch (item.type) {
      case 'new_user':
        router.push('/(common)/manage-user');
        break;
      case 'payment':
        router.push('/(common)/income-expense');
        break;
      case 'expense':
        router.push('/(common)/income-expense');
        break;
      case 'income':
        router.push('/(common)/income-expense');
        break;
      case 'attendance':
        router.push('/(common)/attendance');
        break;
      case 'message':
        router.push('/(common)/chats');
        break;
      case 'activity':
        router.push('/(common)/post-activity');
        break;
      default:
        Alert.alert('Notification', item.message);
        break;
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.read && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
    >
      <Ionicons name={item.icon} size={24} color={Colors.primary} style={styles.icon} />
      <View style={styles.notificationContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#89f7fe', '#66a6ff']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <FlatList
          data={mockNotifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  listContainer: {
    paddingHorizontal: 15,
  },
  notificationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadItem: {
    backgroundColor: 'white',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  icon: {
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 5,
    textAlign: 'right',
  },
});

export default NotificationScreen;
