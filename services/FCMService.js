import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import authFetch from '../app/utils/api';

/**
 * Firebase Cloud Messaging Service
 * Handles push notifications using React Native Firebase
 * Works for ALL users (development and production)
 */

class FCMService {
  constructor() {
    this.fcmToken = null;
    this.unsubscribeOnMessage = null;
    this.unsubscribeOnNotificationOpenedApp = null;
    this.initialized = false;
  }

  /**
   * Initialize FCM and request permissions
   */
  async initialize() {
    try {
      console.log('🔔 Initializing FCM Service...');

      // Request user permission for notifications
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('⚠️ Failed to get push notification permissions');
        return false;
      }

      console.log('✅ Notification permissions granted');

      // Get FCM token
      const token = await messaging().getToken();
      this.fcmToken = token;
      console.log('✅ FCM Token:', token);

      // Save token to backend
      await this.saveTokenToBackend(token);

      // Set up notification listeners
      this.setupNotificationListeners();

      // Handle background/quit state notifications
      this.setupBackgroundHandler();

      this.initialized = true;
      console.log('✅ FCM Service initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ FCM initialization failed:', error);
      return false;
    }
  }

  /**
   * Save FCM token to backend
   */
  async saveTokenToBackend(token) {
    try {
      const response = await authFetch('/api/notifications/save_fcm_token.php', {
        method: 'POST',
        body: JSON.stringify({
          fcm_token: token,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ FCM token saved to backend');
      } else {
        console.error('❌ Failed to save FCM token:', result.message);
      }
    } catch (error) {
      console.error('❌ Error saving FCM token:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Listener for notifications received while app is in foreground
    this.unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('📬 Foreground notification received:', remoteMessage);
      
      const { notification, data } = remoteMessage;
      console.log('Title:', notification?.title);
      console.log('Body:', notification?.body);
      console.log('Data:', data);
      
      // You can show a local notification here if needed
      // or update UI directly
    });

    // Listener for when user taps on notification (app in background)
    this.unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('👆 Notification opened app from background:', remoteMessage);
      
      const data = remoteMessage.data;
      
      // Handle navigation based on notification data
      if (data?.screen) {
        console.log('Navigate to screen:', data.screen);
        // You can use router.push() here to navigate
      }
    });

    // Check if app was opened from a notification (quit state)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('👆 Notification opened app from quit state:', remoteMessage);
          
          const data = remoteMessage.data;
          if (data?.screen) {
            console.log('Navigate to screen:', data.screen);
          }
        }
      });
  }

  /**
   * Set up background message handler
   */
  setupBackgroundHandler() {
    // Register background handler (must be done outside of component)
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📬 Background notification received:', remoteMessage);
      // Handle background notification
    });
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(userId, title, message, data = {}) {
    try {
      const response = await authFetch('/api/notifications/send_fcm.php', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'user',
          target_value: userId,
          title: title,
          message: message,
          data: data,
        }),
      });

      const result = await response.json();
      console.log('📤 Notification sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return null;
    }
  }

  /**
   * Send notification to role
   */
  async sendToRole(role, title, message, data = {}) {
    try {
      const response = await authFetch('/api/notifications/send_fcm.php', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'role',
          target_value: role,
          title: title,
          message: message,
          data: data,
        }),
      });

      const result = await response.json();
      console.log('📤 Notification sent to role:', role, result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return null;
    }
  }

  /**
   * Send notification to branch
   */
  async sendToBranch(branchId, title, message, data = {}) {
    try {
      const response = await authFetch('/api/notifications/send_fcm.php', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'branch',
          target_value: branchId,
          title: title,
          message: message,
          data: data,
        }),
      });

      const result = await response.json();
      console.log('📤 Notification sent to branch:', branchId, result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return null;
    }
  }

  /**
   * Send notification to all users
   */
  async sendToAll(title, message, data = {}) {
    try {
      const response = await authFetch('/api/notifications/send_fcm.php', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'all',
          title: title,
          message: message,
          data: data,
        }),
      });

      const result = await response.json();
      console.log('📤 Notification sent to all:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return null;
    }
  }

  /**
   * Handle token refresh
   */
  setupTokenRefreshListener() {
    messaging().onTokenRefresh(async token => {
      console.log('🔄 FCM Token refreshed:', token);
      this.fcmToken = token;
      await this.saveTokenToBackend(token);
    });
  }

  /**
   * Get push token
   */
  getToken() {
    return this.fcmToken;
  }

  /**
   * Check if initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get badge count (iOS only)
   */
  async getBadgeCount() {
    if (Platform.OS === 'ios') {
      return await messaging().getBadge();
    }
    return 0;
  }

  /**
   * Set badge count (iOS only)
   */
  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      await messaging().setBadge(count);
    }
  }

  /**
   * Delete FCM token
   */
  async deleteToken() {
    try {
      await messaging().deleteToken();
      this.fcmToken = null;
      console.log('🗑️ FCM token deleted');
    } catch (error) {
      console.error('❌ Failed to delete token:', error);
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup() {
    if (this.unsubscribeOnMessage) {
      this.unsubscribeOnMessage();
    }
    if (this.unsubscribeOnNotificationOpenedApp) {
      this.unsubscribeOnNotificationOpenedApp();
    }
    this.initialized = false;
    console.log('🧹 FCM Service cleaned up');
  }
}

// Export singleton instance
export default new FCMService();
