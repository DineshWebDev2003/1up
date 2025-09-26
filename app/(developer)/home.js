import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import GreenGradientBackground from '../components/GreenGradientBackground';

const DeveloperHomeScreen = () => {
  const router = useRouter();

  return (
    <GreenGradientBackground>
      <View style={styles.container}>
        <Text style={styles.header}>Developer Dashboard</Text>
        
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(developer)/maintenance')}>
          <Ionicons name="build-outline" size={32} color={Colors.primary} />
          <Text style={styles.cardTitle}>Maintenance Mode</Text>
          <Text style={styles.cardDescription}>Enable or disable maintenance mode for all users.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/(developer)/settings')}>
          <Ionicons name="settings-outline" size={32} color={Colors.primary} />
          <Text style={styles.cardTitle}>Settings</Text>
          <Text style={styles.cardDescription}>Developer-specific settings and tools.</Text>
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
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
});

export default DeveloperHomeScreen;
