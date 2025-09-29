import { Tabs } from 'expo-router';
import { StatusBar } from 'react-native';
import React from 'react';
import CustomTabBar from '../components/CustomTabBar';
import Colors from '../constants/colors';

export default function AdminLayout() {
  return (
    <>
      <StatusBar 
        backgroundColor={Colors.primary} 
        barStyle="light-content" 
        translucent={false}
      />
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
