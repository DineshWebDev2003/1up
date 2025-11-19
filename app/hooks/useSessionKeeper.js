import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import sessionKeeper from '../utils/sessionKeeper';

export const useSessionKeeper = () => {
  useEffect(() => {
    let appStateSubscription;

    const initializeSessionKeeper = async () => {
      try {
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        const userData = await AsyncStorage.getItem('userData');
        
        if (sessionToken && userData) {
          console.log('🔐 User logged in, starting session keeper');
          await sessionKeeper.start();
        } else {
          console.log('🔓 No valid session found, session keeper not started');
        }
      } catch (error) {
        console.error('❌ Failed to initialize session keeper:', error);
      }
    };

    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, check if we need to start session keeper
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        if (sessionToken && !sessionKeeper.isActive) {
          console.log('📱 App active, restarting session keeper');
          await sessionKeeper.start();
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background, keep session keeper running but reduce frequency
        console.log('📱 App backgrounded, session keeper continues');
      }
    };

    // Initialize session keeper
    initializeSessionKeeper();

    // Listen for app state changes
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup on unmount
    return () => {
      if (appStateSubscription) {
        appStateSubscription.remove();
      }
      // Don't stop session keeper on component unmount, let it run globally
    };
  }, []);

  // Return methods for manual control
  return {
    startSessionKeeper: () => sessionKeeper.start(),
    stopSessionKeeper: () => sessionKeeper.stop(),
    refreshSession: () => sessionKeeper.manualRefresh(),
    isActive: sessionKeeper.isActive
  };
};
