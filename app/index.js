import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const decide = async () => {
      try {
        const token = await AsyncStorage.getItem('sessionToken');
        const role = await AsyncStorage.getItem('userRole');
        if (token && role) {
          const roleLower = role.toLowerCase();
          if (roleLower.includes('student')) return setTarget('/(student)/home');
          if (roleLower.includes('teacher')) return setTarget('/(teacher)/home');
          if (roleLower.includes('tuition student')) return setTarget('/(tuition-student)/home');
          if (roleLower.includes('tuition teacher')) return setTarget('/(tuition-teacher)/home');
          if (roleLower.includes('franchisee')) return setTarget('/(franchisee)/home');
          if (roleLower.includes('admin') || roleLower.includes('administrator')) return setTarget('/(admin)/home');
        }
      } catch {}
      setTarget('/login');
    };
    decide();
  }, []);

  if (!target) return null;
  return <Redirect href={target} />;
}
