import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from './constants/colors';

const DebugRoutes = () => {
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { message, type, timestamp };
    setLogs(prev => [newLog, ...prev.slice(0, 19)]); // Keep last 20 logs
    console.log(`[${timestamp}] ${message}`);
  };

  const testRoute = async (route, routeName) => {
    try {
      addLog(`Testing ${routeName} (${route})...`, 'info');
      router.push(route);
      addLog(`✅ Successfully navigated to ${routeName}`, 'success');
    } catch (error) {
      addLog(`❌ Failed to navigate to ${routeName}: ${error.message}`, 'error');
    }
  };

  const setupStudentLogin = async () => {
    try {
      const mockStudentData = {
        id: 'debug-student-01',
        name: 'Debug Student',
        role: 'Student',
        class_name: 'Debug Class',
        branch_name: 'Debug Branch',
        profile_image: null
      };

      await AsyncStorage.setItem('userData', JSON.stringify(mockStudentData));
      await AsyncStorage.setItem('userRole', 'Student');
      
      addLog('✅ Mock student data setup complete', 'success');
      addLog(`Student data: ${JSON.stringify(mockStudentData)}`, 'info');
    } catch (error) {
      addLog(`❌ Failed to setup student data: ${error.message}`, 'error');
    }
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.clear();
      addLog('✅ Storage cleared', 'success');
    } catch (error) {
      addLog(`❌ Failed to clear storage: ${error.message}`, 'error');
    }
  };

  const checkStorage = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      const userRole = await AsyncStorage.getItem('userRole');
      
      addLog('=== STORAGE STATE ===', 'info');
      addLog(`User Role: ${userRole || 'None'}`, 'info');
      addLog(`User Data: ${userData || 'None'}`, 'info');
    } catch (error) {
      addLog(`❌ Failed to check storage: ${error.message}`, 'error');
    }
  };

  const routes = [
    { path: '/login', name: 'Login' },
    { path: '/(student)/home', name: 'Student Home' },
    { path: '/(admin)/home', name: 'Admin Home' },
    { path: '/(captain)/home', name: 'Captain Home' },
    { path: '/(teacher)/home', name: 'Teacher Home' },
    { path: '/(franchisee)/home', name: 'Franchisee Home' },
  ];

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#2196F3';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Navigation Debug Tool</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Setup & Storage</Text>
        <TouchableOpacity style={styles.button} onPress={setupStudentLogin}>
          <Text style={styles.buttonText}>Setup Student Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={checkStorage}>
          <Text style={styles.buttonText}>Check Storage</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearStorage}>
          <Text style={styles.buttonText}>Clear Storage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Routes</Text>
        {routes.map((route, index) => (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={() => testRoute(route.path, route.name)}
          >
            <Text style={styles.buttonText}>Test {route.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug Logs</Text>
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={() => setLogs([])}
        >
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
        
        <View style={styles.logsContainer}>
          {logs.length === 0 ? (
            <Text style={styles.noLogs}>No logs yet. Try testing some routes!</Text>
          ) : (
            logs.map((log, index) => (
              <View key={index} style={styles.logItem}>
                <Text style={[styles.logText, { color: getLogColor(log.type) }]}>
                  [{log.timestamp}] {log.message}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: Colors.primary,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  clearButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logsContainer: {
    maxHeight: 300,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 10,
  },
  logItem: {
    marginBottom: 5,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  noLogs: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default DebugRoutes;
