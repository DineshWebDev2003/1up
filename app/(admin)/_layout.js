import { Tabs } from 'expo-router';
import { StatusBar } from 'react-native';
import React from 'react';
import CustomTabBar from '../components/CustomTabBar';

export default function AdminLayout() {
  return (
    <>
      <StatusBar hidden />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="quick-action" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="settings" />
      </Tabs>
    </>
  );
}
