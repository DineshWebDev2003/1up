import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  }, []);

  // Show loading screen while checking auth
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#8B5CF6' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}