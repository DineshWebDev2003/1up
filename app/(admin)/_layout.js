import { Tabs } from 'expo-router';
import { StatusBar } from 'react-native';
import React from 'react';
import CustomTabBar from '../components/CustomTabBar';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../contexts/ThemeContext';

export default function AdminLayout() {
  const Colors = useColors();
  const { isDarkMode } = useTheme();
  
  return (
    <>
      <StatusBar 
        backgroundColor={Colors.primary} 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
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
