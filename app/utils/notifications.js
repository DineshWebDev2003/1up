import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert, Platform } from 'react-native';
import authFetch from './api';

export async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo Push Token:', token);
  } else {
    Alert.alert('Must use physical device for Push Notifications');
    return;
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (token) {
    // Store token locally for later use when user logs in
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('pendingPushToken', token);
      console.log('Push token stored locally for later registration.');
    } catch (error) {
      console.error('Failed to store push token locally:', error);
    }
  }
}

// Function to send push token after successful login
export async function sendPushTokenToServer() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token = await AsyncStorage.getItem('pendingPushToken');
    const sessionToken = await AsyncStorage.getItem('sessionToken');
    
    if (token && sessionToken) {
      // Add a small delay to ensure session is properly saved in database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await authFetch('/api/notifications/push_notification.php?action=register_token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      console.log('Push token sent to server successfully.');
      // Remove the pending token since it's now registered
      await AsyncStorage.removeItem('pendingPushToken');
    } else {
      console.log('Push token registration skipped - missing token or session');
    }
  } catch (error) {
    console.error('Failed to send push token to server:', error);
    // Don't throw error to prevent login flow interruption
  }
}

// Default export to fix warning
const NotificationUtils = {
  registerForPushNotificationsAsync,
  sendPushTokenToServer
};

export default NotificationUtils;
