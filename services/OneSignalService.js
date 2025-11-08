import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

/**
 * OneSignal Push Notification Service
 * App ID: 2c4862ca-c58a-499c-abdd-4d4b1648270
 */

const ONESIGNAL_APP_ID = '2c4862ca-c58a-499c-abdd-4d4b1648270';
const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1';

class OneSignalService {
  constructor() {
    this.playerId = null;
    this.userId = null;
    this.userRole = null;
    this.initialized = false;
  }

  /**
   * Initialize OneSignal
   */
  async initialize(userId, userRole) {
    try {
      console.log('🔔 Initializing OneSignal...');
      
      this.userId = userId;
      this.userRole = userRole;

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        return false;
      }

      // Get or create player ID
      await this.registerDevice();
      
      this.initialized = true;
      console.log('✅ OneSignal initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ OneSignal initialization failed:', error);
      return false;
    }
  }

  /**
   * Register device with OneSignal
   */
  async registerDevice() {
    try {
      // Check if already registered
      const existingPlayerId = await AsyncStorage.getItem('onesignal_player_id');
      if (existingPlayerId) {
        this.playerId = existingPlayerId;
        console.log('📱 Using existing player ID:', this.playerId);
        return this.playerId;
      }

      // Get device info
      const deviceInfo = {
        device_type: Platform.OS === 'ios' ? 0 : 1, // 0 = iOS, 1 = Android
        language: 'en',
        timezone: new Date().getTimezoneOffset() * -60,
        game_version: Constants.expoConfig?.version || '1.0.0',
        device_model: Device.modelName,
        device_os: Platform.Version,
        sdk: Constants.expoConfig?.sdkVersion,
        tags: {
          user_id: this.userId?.toString(),
          role: this.userRole,
        }
      };

      // Register with OneSignal REST API
      const response = await fetch(`${ONESIGNAL_API_URL}/players`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          ...deviceInfo,
        }),
      });

      const data = await response.json();
      
      if (data.id) {
        this.playerId = data.id;
        await AsyncStorage.setItem('onesignal_player_id', this.playerId);
        console.log('✅ Device registered with OneSignal:', this.playerId);
        return this.playerId;
      } else {
        throw new Error('Failed to get player ID from OneSignal');
      }
    } catch (error) {
      console.error('❌ Device registration failed:', error);
      return null;
    }
  }

  /**
   * Update user tags
   */
  async updateTags(tags) {
    if (!this.playerId) {
      console.warn('⚠️ No player ID available');
      return false;
    }

    try {
      const response = await fetch(`${ONESIGNAL_API_URL}/players/${this.playerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          tags: {
            ...tags,
            user_id: this.userId?.toString(),
            role: this.userRole,
          },
        }),
      });

      if (response.ok) {
        console.log('✅ Tags updated successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to update tags:', error);
      return false;
    }
  }

  /**
   * Send notification to specific user
   */
  async sendToUser(targetUserId, title, message, data = {}) {
    try {
      const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic YOUR_REST_API_KEY', // Replace with your REST API key
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          filters: [
            { field: 'tag', key: 'user_id', relation: '=', value: targetUserId.toString() }
          ],
          headings: { en: title },
          contents: { en: message },
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
      const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic YOUR_REST_API_KEY', // Replace with your REST API key
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          filters: [
            { field: 'tag', key: 'role', relation: '=', value: role }
          ],
          headings: { en: title },
          contents: { en: message },
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
   * Send notification to all users
   */
  async sendToAll(title, message, data = {}) {
    try {
      const response = await fetch(`${ONESIGNAL_API_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic YOUR_REST_API_KEY', // Replace with your REST API key
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          included_segments: ['All'],
          headings: { en: title },
          contents: { en: message },
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
   * Logout - clear player ID
   */
  async logout() {
    try {
      await AsyncStorage.removeItem('onesignal_player_id');
      this.playerId = null;
      this.userId = null;
      this.userRole = null;
      this.initialized = false;
      console.log('👋 OneSignal logged out');
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  }

  /**
   * Get player ID
   */
  getPlayerId() {
    return this.playerId;
  }

  /**
   * Check if initialized
   */
  isInitialized() {
    return this.initialized;
  }
}

// Export singleton instance
export default new OneSignalService();
