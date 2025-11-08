import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CustomTabBar from '../components/CustomTabBar';
import { View, StyleSheet, StatusBar } from 'react-native';
import Colors from '../constants/colors';

export default function DeveloperLayout() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen 
          name="home" 
          options={{
            title: 'Dashboard',
          }}
        />
        <Tabs.Screen 
          name="maintenance" 
          options={{
            title: 'Maintenance',
          }}
        />
        <Tabs.Screen 
          name="settings" 
          options={{
            title: 'Settings',
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
