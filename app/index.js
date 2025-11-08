import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from './components/SplashScreen';

export default function Index() {
  const [target, setTarget] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const decide = async () => {
      console.log('🔄 Index.js: Starting route decision...');
      try {
        const token = await AsyncStorage.getItem('sessionToken');
        const role = await AsyncStorage.getItem('userRole');
        console.log('🔄 Index.js: Token exists:', !!token, 'Role:', role);
        
        if (token && role) {
          const roleLower = role.toLowerCase();
          console.log('🔄 Index.js: Processing role:', roleLower);
          
          if (roleLower.includes('student')) {
            console.log('✅ Index.js: Will redirect to student home');
            return setTarget('/(student)/home');
          }
          if (roleLower.includes('teacher')) {
            console.log('✅ Index.js: Will redirect to teacher home');
            return setTarget('/(teacher)/home');
          }
          if (roleLower.includes('tuition student')) {
            console.log('✅ Index.js: Will redirect to tuition student home');
            return setTarget('/(tuition-student)/home');
          }
          if (roleLower.includes('tuition teacher')) {
            console.log('✅ Index.js: Will redirect to tuition teacher home');
            return setTarget('/(tuition-teacher)/home');
          }
          if (roleLower.includes('franchisee')) {
            console.log('✅ Index.js: Will redirect to franchisee home');
            return setTarget('/(franchisee)/home');
          }
          if (roleLower.includes('admin') || roleLower.includes('administrator')) {
            console.log('✅ Index.js: Will redirect to admin home');
            return setTarget('/(admin)/home');
          }
        }
      } catch (error) {
        console.error('❌ Index.js: Error during route decision:', error);
      }
      
      console.log('✅ Index.js: No valid session, will redirect to login');
      setTarget('/login');
    };
    
    decide();
  }, []);

  const handleSplashComplete = () => {
    console.log('🎬 Index.js: Splash animation completed');
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  // After splash, redirect to appropriate screen
  if (target) {
    console.log('🚀 Index.js: Final redirect to:', target);
    return <Redirect href={target} />;
  }

  // Fallback - should not reach here
  return <Redirect href="/login" />;
}
