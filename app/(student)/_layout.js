import { Tabs } from 'expo-router';
import React from 'react';
import CustomTabBar from '../components/CustomTabBar';

export default function StudentLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="my-idcard" options={{
        title: 'My ID',
        tabBarIcon: ({ color, size }) => null,
        tabBarLabel: 'My ID',
      }} />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
