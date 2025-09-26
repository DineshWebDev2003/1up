import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

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
  useEffect(() => {
    // This listener is fired whenever a notification is received while the app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});