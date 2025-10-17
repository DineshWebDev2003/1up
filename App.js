import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// This handler decides how to handle notifications that are received while the app is running.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Use these properties to fix the deprecation warning
    shouldShowBanner: true, // For Android banner
    shouldShowList: true,   // For iOS list view

    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Check authentication status and redirect accordingly
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('sessionToken');
        const userRole = await AsyncStorage.getItem('userRole');
        
        if (token && userRole) {
          // User is authenticated, redirect to appropriate dashboard
          router.replace(`/(${userRole})/home`);
        } else {
          // User is not authenticated, redirect to login
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/login');
      }
    };

    checkAuth();

    // This listener is fired whenever a notification is received while the app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
    };
  }, []);

  // Show loading screen while checking auth
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8B5CF6' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}