import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fcmNotificationService from '../services/FCMNotificationService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      console.log('🔔 Initializing FCM notifications...');
      
      // Initialize FCM service
      const initialized = await fcmNotificationService.initialize();
      setIsInitialized(initialized);
      
      if (initialized) {
        const token = await fcmNotificationService.getStoredToken();
        setFcmToken(token);
        
        // Subscribe to general topics
        await subscribeToGeneralTopics();
        
        // Subscribe to user-specific topics if user is logged in
        await subscribeToUserTopics();
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
    }
  };

  const subscribeToGeneralTopics = async () => {
    try {
      await fcmNotificationService.subscribeToTopic('general_announcements');
      await fcmNotificationService.subscribeToTopic('system_updates');
      await fcmNotificationService.subscribeToTopic('app_updates');
      console.log('✅ Subscribed to general topics');
    } catch (error) {
      console.error('❌ Error subscribing to general topics:', error);
    }
  };

  const subscribeToUserTopics = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        await fcmNotificationService.subscribeToUserTopics(
          user.id,
          user.role,
          user.branch_id
        );
      }
    } catch (error) {
      console.error('❌ Error subscribing to user topics:', error);
    }
  };

  const contextValue = {
    isInitialized,
    fcmToken,
    fcmService: fcmNotificationService,
    subscribeToTopic: fcmNotificationService.subscribeToTopic.bind(fcmNotificationService),
    unsubscribeFromTopic: fcmNotificationService.unsubscribeFromTopic.bind(fcmNotificationService),
    subscribeToUserTopics,
    refreshToken: async () => {
      const token = await fcmNotificationService.getFCMToken();
      setFcmToken(token);
      return token;
    }
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
