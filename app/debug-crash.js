import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from './constants/colors';
import { getCrashLogs, clearCrashLogs, checkAppHealth } from './utils/crashPrevention';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DebugCrashScreen() {
  const router = useRouter();
  const [crashLogs, setCrashLogs] = useState([]);
  const [appHealth, setAppHealth] = useState(null);
  const [storageInfo, setStorageInfo] = useState({});

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = async () => {
    try {
      // Get crash logs
      const logs = await getCrashLogs();
      setCrashLogs(logs);

      // Get app health
      const health = await checkAppHealth();
      setAppHealth(health);

      // Get storage info
      const keys = await AsyncStorage.getAllKeys();
      const storage = {};
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          storage[key] = value ? value.substring(0, 100) + '...' : 'null';
        } catch (e) {
          storage[key] = 'Error reading';
        }
      }
      setStorageInfo(storage);
    } catch (error) {
      console.error('Failed to load debug data:', error);
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Crash Logs',
      'Are you sure you want to clear all crash logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            await clearCrashLogs();
            setCrashLogs([]);
            Alert.alert('Success', 'Crash logs cleared');
          }
        }
      ]
    );
  };

  const handleClearStorage = () => {
    Alert.alert(
      'Clear App Storage',
      'This will log you out and clear all app data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            setStorageInfo({});
            Alert.alert('Success', 'App storage cleared. Please restart the app.');
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Crash Debug</Text>
        <TouchableOpacity onPress={loadDebugData} style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* App Health Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Health</Text>
          {appHealth ? (
            <View style={styles.healthContainer}>
              <Text style={styles.healthText}>Last Check: {formatDate(appHealth.timestamp)}</Text>
              <Text style={styles.healthText}>
                Memory Usage: {appHealth.memoryUsage !== 'Not available' ? 
                  `${Math.round(appHealth.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB` : 
                  'Not available'}
              </Text>
              <Text style={styles.healthText}>Total Crashes: {appHealth.crashLogs.length}</Text>
            </View>
          ) : (
            <Text style={styles.noDataText}>Loading health data...</Text>
          )}
        </View>

        {/* Crash Logs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Crash Logs ({crashLogs.length})</Text>
            <TouchableOpacity onPress={handleClearLogs} style={styles.clearButton}>
              <MaterialCommunityIcons name="delete" size={20} color={Colors.danger} />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          {crashLogs.length > 0 ? (
            crashLogs.map((crash, index) => (
              <View key={index} style={styles.crashItem}>
                <Text style={styles.crashTime}>{formatDate(crash.timestamp)}</Text>
                <Text style={styles.crashError}>{crash.error}</Text>
                <Text style={styles.crashContext}>
                  Source: {crash.context?.source || 'Unknown'}
                </Text>
                {crash.stack && (
                  <Text style={styles.crashStack} numberOfLines={3}>
                    {crash.stack}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No crash logs found</Text>
          )}
        </View>

        {/* Storage Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Storage Info</Text>
            <TouchableOpacity onPress={handleClearStorage} style={styles.clearButton}>
              <MaterialCommunityIcons name="delete-sweep" size={20} color={Colors.danger} />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          
          {Object.keys(storageInfo).length > 0 ? (
            Object.entries(storageInfo).map(([key, value]) => (
              <View key={key} style={styles.storageItem}>
                <Text style={styles.storageKey}>{key}</Text>
                <Text style={styles.storageValue}>{value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No storage data found</Text>
          )}
        </View>

        {/* Common Issues Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Crash Causes</Text>
          <View style={styles.issuesList}>
            <Text style={styles.issueItem}>• Network connectivity issues</Text>
            <Text style={styles.issueItem}>• Invalid data from API responses</Text>
            <Text style={styles.issueItem}>• Memory leaks from large images</Text>
            <Text style={styles.issueItem}>• Unhandled promise rejections</Text>
            <Text style={styles.issueItem}>• Navigation state corruption</Text>
            <Text style={styles.issueItem}>• AsyncStorage quota exceeded</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearButtonText: {
    color: Colors.danger,
    fontSize: 14,
  },
  healthContainer: {
    gap: 8,
  },
  healthText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  crashItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingBottom: 12,
    marginBottom: 12,
  },
  crashTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  crashError: {
    fontSize: 14,
    color: Colors.danger,
    fontWeight: '500',
    marginBottom: 4,
  },
  crashContext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  crashStack: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
    backgroundColor: Colors.lightGray,
    padding: 8,
    borderRadius: 4,
  },
  storageItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingBottom: 8,
    marginBottom: 8,
  },
  storageKey: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  storageValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  issuesList: {
    gap: 8,
  },
  issueItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
});
