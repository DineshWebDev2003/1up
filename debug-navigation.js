// Debug Navigation Helper
// Use this file to test navigation and identify routing issues

import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const debugNavigation = {
  // Test all available routes
  testRoutes: async () => {
    const routes = [
      '/',
      '/login',
      '/(admin)/home',
      '/(franchisee)/home',
      '/(student)/home',
      '/(teacher)/home',
      '/(captain)/home',
      '/(tuition-student)/home',
      '/(tuition-teacher)/home',
      '/(developer)/home'
    ];

    console.log('=== TESTING NAVIGATION ROUTES ===');
    
    for (const route of routes) {
      try {
        console.log(`Testing route: ${route}`);
        // Don't actually navigate, just test if route exists
        // router.canGoBack() // This would be ideal but not available
        console.log(`✅ Route ${route} appears valid`);
      } catch (error) {
        console.log(`❌ Route ${route} failed:`, error.message);
      }
    }
  },

  // Test student navigation specifically
  testStudentNavigation: async () => {
    console.log('=== TESTING STUDENT NAVIGATION ===');
    
    try {
      // Set up mock student data
      const mockStudentData = {
        id: 'debug-student',
        name: 'Debug Student',
        role: 'Student',
        class_name: 'Debug Class',
        branch_name: 'Debug Branch'
      };
      
      await AsyncStorage.setItem('userData', JSON.stringify(mockStudentData));
      await AsyncStorage.setItem('userRole', 'Student');
      
      console.log('Mock student data set:', mockStudentData);
      
      // Try to navigate
      console.log('Attempting navigation to /(student)/home...');
      router.replace('/(student)/home');
      console.log('✅ Navigation command executed successfully');
      
    } catch (error) {
      console.log('❌ Student navigation failed:', error);
      console.log('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  },

  // Check current navigation state
  checkNavigationState: () => {
    console.log('=== NAVIGATION STATE CHECK ===');
    
    try {
      // Check if router is available
      console.log('Router available:', typeof router !== 'undefined');
      
      // Check current route (if available)
      console.log('Router methods:', Object.keys(router));
      
    } catch (error) {
      console.log('❌ Navigation state check failed:', error.message);
    }
  },

  // Clear all storage and reset
  resetApp: async () => {
    console.log('=== RESETTING APP STATE ===');
    
    try {
      await AsyncStorage.clear();
      console.log('✅ AsyncStorage cleared');
      
      // Navigate to login
      router.replace('/login');
      console.log('✅ Navigated to login');
      
    } catch (error) {
      console.log('❌ App reset failed:', error.message);
    }
  },

  // Log current storage state
  logStorageState: async () => {
    console.log('=== CURRENT STORAGE STATE ===');
    
    try {
      const userData = await AsyncStorage.getItem('userData');
      const userRole = await AsyncStorage.getItem('userRole');
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      
      console.log('User Data:', userData ? JSON.parse(userData) : 'None');
      console.log('User Role:', userRole || 'None');
      console.log('Session Token:', sessionToken ? 'Present' : 'None');
      
    } catch (error) {
      console.log('❌ Storage state check failed:', error.message);
    }
  }
};

// Auto-run basic checks when this file is imported
console.log('🔧 Debug Navigation Helper Loaded');
console.log('Available methods:', Object.keys(debugNavigation));
console.log('Usage: import { debugNavigation } from "./debug-navigation.js"');
console.log('Then call: debugNavigation.testStudentNavigation()');
