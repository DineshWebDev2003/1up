import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from './utils/notifications';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import SimpleErrorBoundary from './components/SimpleErrorBoundary';
import { setupGlobalErrorHandlers } from './utils/crashPrevention';

// Configure the notification handler for when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    // Setup crash prevention
    setupGlobalErrorHandlers();
    
    // Register for push notifications
    registerForPushNotificationsAsync();
  }, []);

  return (
    <SimpleErrorBoundary>
      <SafeAreaProvider>
        <StatusBar 
          style="light" 
          backgroundColor="#8B5CF6" 
          translucent={Platform.OS === 'android'} 
        />
        <MaintenanceOverlay>
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(franchisee)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(tuition-teacher)" />
        <Stack.Screen name="(tuition-student)" />
        <Stack.Screen name="(common)/create-branch" />
        <Stack.Screen name="(common)/assign-new-user" />
        <Stack.Screen name="(common)/post-activity" />
        <Stack.Screen name="(common)/manage-user" />
        <Stack.Screen name="(common)/income-expense" />
        <Stack.Screen name="(common)/timetable" />
        <Stack.Screen name="(common)/staff-attendance" />
        <Stack.Screen name="(common)/request-leave" />
        <Stack.Screen name="(common)/fees-update" />
        <Stack.Screen name="(common)/live-monitoring" />
        <Stack.Screen name="(common)/live-cab" />
        <Stack.Screen name="(common)/id-card" />
        <Stack.Screen name="(common)/payments-history" />
        <Stack.Screen name="(common)/kids-feed" />
        <Stack.Screen name="(common)/news-letter" />
        <Stack.Screen name="(common)/track-cab" />
        <Stack.Screen name="(common)/invoice-generator" />
        <Stack.Screen name="debug-routes" />
        <Stack.Screen name="(developer)" />
        </Stack>
        </MaintenanceOverlay>
      </SafeAreaProvider>
    </SimpleErrorBoundary>
  );
}
