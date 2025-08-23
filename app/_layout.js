import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

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
    // Request notification permissions when the app starts
    async function requestPermissions() {
      await Notifications.requestPermissionsAsync();
    }

    requestPermissions();

    // Set a timer to trigger the notification after 5 seconds
    const timer = setTimeout(() => {
      Notifications.scheduleNotificationAsync({
        content: {
          title: "Live View Available! 📸",
          body: "Tap to see what your child is doing at playschool now.",
        },
        trigger: null, // null means trigger immediately
      });
    }, 5000);

    // Clean up the timer when the component unmounts
    return () => clearTimeout(timer);
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(franchisee)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="(tuition-teacher)" />
      <Stack.Screen name="(tuition-student)" />
    </Stack>
  );
}
