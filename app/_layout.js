import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import SimpleErrorBoundary from './components/SimpleErrorBoundary';
import { setupGlobalErrorHandlers } from './utils/crashPrevention';
import GlobalStatusBar, { YELLOW_COLORS } from './components/GlobalStatusBar';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

export default function RootLayout() {
  useEffect(() => {
    // Setup crash prevention
    setupGlobalErrorHandlers();
  }, []);

  return (
    <SimpleErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <NotificationProvider>
            <GlobalStatusBar 
              color={YELLOW_COLORS.primary}
              barStyle="dark-content"
              translucent={Platform.OS === 'android'} 
            />
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
            <Stack.Screen name="(common)/payment-management" />
            <Stack.Screen name="(common)/my-fees" />
            <Stack.Screen name="(common)/unified-chat-list" />
            <Stack.Screen name="(common)/unified-chat-detail" />
            <Stack.Screen name="(common)/invoice-details" />
            <Stack.Screen name="(common)/live-monitoring" />
            <Stack.Screen name="(common)/live-cab" />
            <Stack.Screen name="(common)/id-card" />
            <Stack.Screen name="(common)/payments-history" />
            <Stack.Screen name="(common)/kids-feed" />
            <Stack.Screen name="(common)/news-letter" />
            <Stack.Screen name="(common)/student-info" />
            <Stack.Screen name="(common)/track-cab" />
            <Stack.Screen name="debug-routes" />
            <Stack.Screen name="(developer)" />
          </Stack>
          </NotificationProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </SimpleErrorBoundary>
  );
}
