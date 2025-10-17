import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/colors';
import GreenGradientBackground from '../components/GreenGradientBackground';

const DeveloperSettingsScreen = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Clear all user-related data from storage
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('sessionToken');
      
      // Navigate to the login screen and replace the history
      router.replace('/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
      console.error('Logout error:', error);
    }
  };
  return (
    <GreenGradientBackground>
      <View style={styles.container}>
        <Text style={styles.header}>Developer Settings</Text>
        <Text style={styles.text}>This screen can be used for developer-specific settings, such as clearing cache, viewing logs, or other debugging tools.</Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </GreenGradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: Colors.white,
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: Colors.danger, // Or another appropriate color
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeveloperSettingsScreen;
