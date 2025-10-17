import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const response = await authFetch('/api/notifications/push_notification.php');
      const result = await response.json();
      
      if (result.success) {
        const formattedNotifications = result.data.map(notification => ({
          id: notification.id.toString(),
          type: notification.type || 'general',
          title: notification.title,
          message: notification.message,
          time: formatTimeAgo(notification.created_at),
          icon: getIconForType(notification.type),
          read: notification.is_read,
          sender_name: notification.sender_name,
          sender_role: notification.sender_role,
          image_url: notification.image_url || null
        }));
        setNotifications(formattedNotifications);
      } else {
        Alert.alert('Error', 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  };

  const getIconForType = (type) => {
    const iconMap = {
      'new_user': 'person-add-outline',
      'payment': 'wallet-outline',
      'expense': 'cart-outline',
      'income': 'cash-outline',
      'attendance': 'checkmark-circle-outline',
      'message': 'chatbubble-outline',
      'activity': 'megaphone-outline',
      'fees': 'card-outline',
      'user_created': 'person-add-outline',
      'fee_payment': 'wallet-outline',
      'login': 'log-in-outline'
    };
    return iconMap[type] || 'notifications-outline';
  };

  const markAsRead = async (notificationId) => {
    try {
      await authFetch('/api/notifications/mark_as_read.php', {
        method: 'POST',
        body: JSON.stringify({ notification_id: notificationId })
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = async (item) => {
    // Mark as read in the database
    if (!item.read) {
      await markAsRead(item.id);
      
      // Update local state
      const updatedNotifications = notifications.map(notification =>
        notification.id === item.id ? { ...notification, read: true } : notification
      );
      setNotifications(updatedNotifications);
    }

    // Navigate based on notification type
    switch (item.type) {
      case 'new_user':
      case 'user_created':
        router.push('/(admin)/users');
        break;
      case 'payment':
      case 'fee_payment':
      case 'income':
        router.push('/(admin)/income-expense');
        break;
      case 'expense':
        router.push('/(admin)/income-expense');
        break;
      case 'attendance':
        router.push('/(admin)/attendance');
        break;
      case 'message':
        router.push('/(admin)/chat');
        break;
      default:
        // Do nothing for other types
        break;
    }
  };

  const renderItem = ({ item }) => (
    <Animatable.View
      animation="fadeInUp"
      duration={600}
      delay={100}
      style={styles.notificationWrapper}
    >
      <TouchableOpacity 
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={!item.read ? ['#4A90E2', '#357ABD'] : ['#E3F2FD', '#BBDEFB']}
          style={styles.iconContainer}
        >
          <Ionicons name={item.icon} size={28} color={!item.read ? '#FFFFFF' : '#4A90E2'} />
        </LinearGradient>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
            <Text style={[styles.time, !item.read && styles.unreadTime]}>{item.time}</Text>
          </View>
          <Text style={[styles.message, !item.read && styles.unreadMessage]}>{item.message}</Text>
          {item.image_url ? (
            <View style={styles.thumbnailWrapper}>
              <Image source={{ uri: item.image_url }} style={styles.thumbnail} resizeMode="cover" />
            </View>
          ) : null}
          {!item.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    </Animatable.View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>Stay updated with latest updates</Text>
          </View>
          <Animatable.View style={styles.loadingContainer} animation="fadeIn" duration={800}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </Animatable.View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Animatable.View style={styles.header} animation="fadeInDown" duration={800}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>Stay updated with latest updates</Text>
        </Animatable.View>

        {notifications.length === 0 ? (
          <Animatable.View style={styles.emptyContainer} animation="fadeIn" duration={1000}>
            <LinearGradient colors={['#FFFFFF', '#F8F9FA']} style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off-outline" size={80} color="#D1D5DB" />
            </LinearGradient>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubText}>You'll see notifications here when they arrive</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <LinearGradient colors={['#4A90E2', '#357ABD']} style={styles.refreshButtonGradient}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FFFFFF']}
                tintColor="#FFFFFF"
                progressBackgroundColor="#4A90E2"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 25,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 20,
    marginTop:20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  notificationWrapper: {
    marginBottom: 15,
  },
  notificationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  unreadItem: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
    marginRight: 10,
  },
  unreadTitle: {
    color: '#1A202C',
  },
  message: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    marginBottom: 8,
  },
  unreadMessage: {
    color: '#4A5568',
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  unreadTime: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  unreadDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  thumbnailWrapper: {
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden'
  },
  thumbnail: {
    width: '100%',
    height: 160
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  refreshButton: {
    marginTop: 20,
  },
  refreshButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default NotificationScreen;
