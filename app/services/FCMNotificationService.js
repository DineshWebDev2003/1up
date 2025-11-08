import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import authFetch from '../utils/api';

class FCMNotificationService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
  }

  async initialize() {
    try {
      console.log('🔔 Initializing FCM Notifications...');
      
      // Request permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('❌ FCM permission denied');
        return false;
      }

      // Get FCM token
      await this.getFCMToken();
      
      // Setup message handlers
      this.setupMessageHandlers();
      
      this.isInitialized = true;
      console.log('✅ FCM Notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing FCM notifications:', error);
      return false;
    }
  }

  async requestPermission() {
    try {
      if (Platform.OS === 'android') {
        // For Android 13+ (API level 33+), request POST_NOTIFICATIONS permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Android notification permission denied');
        }
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM Authorization status:', authStatus);
        return true;
      } else {
        console.log('❌ FCM Authorization denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting FCM permission:', error);
      return false;
    }
  }

  async getFCMToken() {
    try {
      // Get the device token
      const token = await messaging().getToken();
      
      if (token) {
        this.fcmToken = token;
        await AsyncStorage.setItem('fcm_token', token);
        await this.sendTokenToServer(token);
        console.log('📱 FCM Token obtained:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.log('❌ Failed to get FCM token');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      return null;
    }
  }

  async sendTokenToServer(token) {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const response = await authFetch('/api/notifications/register_token.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fcm_token: token,
            user_id: user.id,
            platform: Platform.OS,
            device_info: {
              os: Platform.OS,
              version: Platform.Version
            }
          })
        });
        
        const result = await response.json();
        if (result.success) {
          console.log('✅ FCM token registered with server');
        } else {
          console.log('❌ Failed to register FCM token:', result.message);
        }
      }
    } catch (error) {
      console.error('❌ Error sending FCM token to server:', error);
    }
  }

  setupMessageHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📱 Message handled in the background!', remoteMessage);
      this.handleNotification(remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('📱 A new FCM message arrived!', remoteMessage);
      this.handleForegroundNotification(remoteMessage);
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('📱 Notification caused app to open from background state:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Check whether an initial notification is available
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📱 Notification caused app to open from quit state:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        }
      });

    // Handle token refresh
    messaging().onTokenRefresh(token => {
      console.log('📱 FCM token refreshed:', token.substring(0, 20) + '...');
      this.fcmToken = token;
      AsyncStorage.setItem('fcm_token', token);
      this.sendTokenToServer(token);
    });
  }

  handleForegroundNotification(remoteMessage) {
    try {
      const { notification, data } = remoteMessage;
      
      if (notification) {
        // Show alert for foreground notifications
        Alert.alert(
          notification.title || 'Notification',
          notification.body || 'You have a new notification',
          [
            {
              text: 'Dismiss',
              style: 'cancel',
            },
            {
              text: 'View',
              onPress: () => this.handleNotificationTap(remoteMessage),
            },
          ]
        );
      }

      // Handle custom data
      if (data) {
        this.handleCustomData(data);
      }
    } catch (error) {
      console.error('Error handling foreground notification:', error);
    }
  }

  handleNotification(remoteMessage) {
    try {
      const { notification, data } = remoteMessage;
      
      console.log('📱 Processing notification:', {
        title: notification?.title,
        body: notification?.body,
        data: data
      });

      // Handle custom data
      if (data) {
        this.handleCustomData(data);
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  }

  handleNotificationTap(remoteMessage) {
    try {
      const { data } = remoteMessage;
      
      if (data) {
        this.navigateBasedOnData(data);
      }
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  }

  navigateBasedOnData(data) {
    try {
      const { type, screen, id, student_id } = data;
      
      // You can use expo-router or your navigation system here
      switch (type) {
        case 'attendance':
          console.log('📱 Navigate to attendance for student:', student_id);
          // router.push(`/attendance/${student_id}`);
          break;
        case 'activity':
          console.log('📱 Navigate to activity:', id);
          // router.push(`/activity/${id}`);
          break;
        case 'message':
          console.log('📱 Navigate to chat:', id);
          // router.push(`/chat/${id}`);
          break;
        case 'announcement':
          console.log('📱 Navigate to announcements');
          // router.push('/announcements');
          break;
        case 'student_info':
          console.log('📱 Navigate to student info:', student_id);
          // router.push(`/student-info/${student_id}`);
          break;
        default:
          console.log('📱 Unknown notification type:', type);
      }
    } catch (error) {
      console.error('Error navigating based on notification data:', error);
    }
  }

  handleCustomData(data) {
    try {
      const { type, action, payload } = data;
      
      switch (action) {
        case 'refresh_data':
          console.log('📱 Refreshing app data...');
          // Trigger data refresh
          break;
        case 'update_badge':
          console.log('📱 Updating badge count:', payload);
          // Update badge count
          break;
        case 'sync_offline':
          console.log('📱 Syncing offline data...');
          // Sync offline data
          break;
        default:
          console.log('📱 Custom action:', action, payload);
      }
    } catch (error) {
      console.error('Error handling custom data:', error);
    }
  }

  async subscribeToTopic(topic) {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`✅ Subscribed to topic: ${topic}`);
      
      // Also register with server
      await authFetch('/api/notifications/subscribe_topic.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fcm_token: this.fcmToken,
          topic: topic
        })
      });
    } catch (error) {
      console.error('❌ Error subscribing to topic:', error);
    }
  }

  async unsubscribeFromTopic(topic) {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`✅ Unsubscribed from topic: ${topic}`);
      
      // Also unregister with server
      await authFetch('/api/notifications/unsubscribe_topic.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fcm_token: this.fcmToken,
          topic: topic
        })
      });
    } catch (error) {
      console.error('❌ Error unsubscribing from topic:', error);
    }
  }

  async subscribeToUserTopics(userId, role, branchId) {
    try {
      const topics = [
        'all_users',
        `role_${role.toLowerCase()}`,
        `branch_${branchId}`,
        `user_${userId}`
      ];

      for (const topic of topics) {
        await this.subscribeToTopic(topic);
      }
      
      console.log('✅ Subscribed to user-specific topics');
    } catch (error) {
      console.error('❌ Error subscribing to user topics:', error);
    }
  }

  async getStoredToken() {
    try {
      const token = await AsyncStorage.getItem('fcm_token');
      return token;
    } catch (error) {
      console.error('Error getting stored FCM token:', error);
      return null;
    }
  }

  isReady() {
    return this.isInitialized && this.fcmToken !== null;
  }
}

// Create singleton instance
const fcmNotificationService = new FCMNotificationService();
export default fcmNotificationService;
