import { Tabs } from 'expo-router';
import React from 'react';
import CustomTabBar from '../components/CustomTabBar';

export default function TeacherLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="quick-action" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="attendance-report" options={{ href: null }} />
    </Tabs>
  );
}
