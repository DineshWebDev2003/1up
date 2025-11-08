import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FCMService from '../../services/FCMService';
import Colors from '../constants/colors';
import WhiteBackground from '../components/WhiteBackground';

export default function TestNotificationsScreen() {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [userData, setUserData] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const user = JSON.parse(storedUserData);
        setUserData(user);
        addLog('✅ User data loaded', 'success');
        
        // Initialize FCM
        await initializeFCM();
      } else {
        addLog('❌ No user data found', 'error');
      }
    } catch (error) {
      addLog(`❌ Error loading user: ${error.message}`, 'error');
    }
  };

  const initializeFCM = async () => {
    try {
      setLoading(true);
      addLog('🔔 Initializing FCM...', 'info');
      
      const success = await FCMService.initialize();
      
      if (success) {
        setInitialized(true);
        const token = FCMService.getToken();
        setFcmToken(token);
        addLog('✅ FCM initialized successfully', 'success');
        addLog(`📱 Token: ${token?.substring(0, 30)}...`, 'info');
      } else {
        addLog('❌ FCM initialization failed', 'error');
        Alert.alert('Error', 'Failed to initialize notifications. Please grant permissions.');
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{
      id: Date.now(),
      message,
      type,
      timestamp
    }, ...prev].slice(0, 20)); // Keep last 20 logs
    console.log(message);
  };

  const sendTestToSelf = async () => {
    if (!initialized) {
      Alert.alert('Error', 'FCM not initialized. Please wait...');
      return;
    }

    try {
      setLoading(true);
      addLog('📤 Sending test notification to yourself...', 'info');

      const result = await FCMService.sendToUser(
        userData.id,
        'Test Notification',
        'FCM is working perfectly! 🎉',
        {
          type: 'test',
          screen: 'home',
          test_data: 'This is test data'
        }
      );

      if (result && result.success) {
        addLog(`✅ Sent to ${result.success_count} recipient(s)`, 'success');
        Alert.alert('Success', `Notification sent successfully to ${result.success_count} device(s)!`);
      } else {
        addLog(`❌ Failed: ${result?.message || 'Unknown error'}`, 'error');
        Alert.alert('Error', result?.message || 'Failed to send notification');
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendToRole = async (role) => {
    if (!initialized) {
      Alert.alert('Error', 'FCM not initialized. Please wait...');
      return;
    }

    try {
      setLoading(true);
      addLog(`📤 Sending to all ${role}s...`, 'info');

      const result = await FCMService.sendToRole(
        role,
        `Message for ${role}s`,
        `This is a test notification for all ${role}s in the system.`,
        {
          type: 'role_test',
          role: role,
          screen: 'home'
        }
      );

      if (result && result.success) {
        addLog(`✅ Sent to ${result.success_count} ${role}(s)`, 'success');
        Alert.alert('Success', `Notification sent to ${result.success_count} ${role}(s)!`);
      } else {
        addLog(`❌ Failed: ${result?.message || 'Unknown error'}`, 'error');
        Alert.alert('Error', result?.message || 'Failed to send notification');
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendToAll = async () => {
    if (!initialized) {
      Alert.alert('Error', 'FCM not initialized. Please wait...');
      return;
    }

    Alert.alert(
      'Confirm',
      'Send notification to ALL users?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setLoading(true);
              addLog('📤 Sending to ALL users...', 'info');

              const result = await FCMService.sendToAll(
                'Test Broadcast',
                'This is a test notification sent to all users.',
                {
                  type: 'broadcast',
                  screen: 'home'
                }
              );

              if (result && result.success) {
                addLog(`✅ Sent to ${result.success_count} user(s)`, 'success');
                Alert.alert('Success', `Notification sent to ${result.success_count} users!`);
              } else {
                addLog(`❌ Failed: ${result?.message || 'Unknown error'}`, 'error');
                Alert.alert('Error', result?.message || 'Failed to send notification');
              }
            } catch (error) {
              addLog(`❌ Error: ${error.message}`, 'error');
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('🧹 Logs cleared', 'info');
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return Colors.textSecondary;
    }
  };

  return (
    <WhiteBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animatable.View animation="fadeInDown" style={styles.header}>
            <MaterialCommunityIcons name="bell-ring" size={48} color={Colors.primary} />
            <Text style={styles.headerTitle}>Test Notifications</Text>
            <Text style={styles.headerSubtitle}>Firebase Cloud Messaging</Text>
          </Animatable.View>

          {/* Status Card */}
          <Animatable.View animation="fadeInUp" delay={200} style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>FCM Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: initialized ? '#10B981' : '#EF4444' }]}>
                <Text style={styles.statusBadgeText}>
                  {initialized ? 'Initialized ✓' : 'Not Initialized'}
                </Text>
              </View>
            </View>
            
            {userData && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>User:</Text>
                <Text style={styles.statusValue}>{userData.name} ({userData.role})</Text>
              </View>
            )}

            {fcmToken && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Token:</Text>
                <Text style={styles.statusValue} numberOfLines={1}>
                  {fcmToken.substring(0, 40)}...
                </Text>
              </View>
            )}
          </Animatable.View>

          {/* Test Buttons */}
          <Animatable.View animation="fadeInUp" delay={400} style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Tests</Text>

            <TouchableOpacity
              style={[styles.testButton, styles.primaryButton]}
              onPress={sendTestToSelf}
              disabled={loading || !initialized}
            >
              <MaterialCommunityIcons name="account-check" size={24} color="white" />
              <Text style={styles.testButtonText}>Send to Myself</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, styles.secondaryButton]}
              onPress={() => sendToRole('Student')}
              disabled={loading || !initialized}
            >
              <MaterialCommunityIcons name="school" size={24} color="white" />
              <Text style={styles.testButtonText}>Send to All Students</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, styles.secondaryButton]}
              onPress={() => sendToRole('Teacher')}
              disabled={loading || !initialized}
            >
              <MaterialCommunityIcons name="account-tie" size={24} color="white" />
              <Text style={styles.testButtonText}>Send to All Teachers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, styles.warningButton]}
              onPress={sendToAll}
              disabled={loading || !initialized}
            >
              <MaterialCommunityIcons name="bullhorn" size={24} color="white" />
              <Text style={styles.testButtonText}>Send to ALL Users</Text>
            </TouchableOpacity>

            {!initialized && (
              <TouchableOpacity
                style={[styles.testButton, styles.infoButton]}
                onPress={initializeFCM}
                disabled={loading}
              >
                <MaterialCommunityIcons name="refresh" size={24} color="white" />
                <Text style={styles.testButtonText}>Retry Initialization</Text>
              </TouchableOpacity>
            )}
          </Animatable.View>

          {/* Logs */}
          <Animatable.View animation="fadeInUp" delay={600} style={styles.section}>
            <View style={styles.logsHeader}>
              <Text style={styles.sectionTitle}>Console Logs</Text>
              <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
                <MaterialCommunityIcons name="delete-sweep" size={20} color={Colors.primary} />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.logsContainer}>
              {logs.length === 0 ? (
                <Text style={styles.noLogsText}>No logs yet...</Text>
              ) : (
                logs.map((log) => (
                  <View key={log.id} style={styles.logItem}>
                    <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                    <Text style={[styles.logMessage, { color: getLogColor(log.type) }]}>
                      {log.message}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Animatable.View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </WhiteBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 80,
  },
  statusValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: '#3B82F6',
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  infoButton: {
    backgroundColor: '#8B5CF6',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButtonText: {
    color: Colors.primary,
    fontSize: 14,
    marginLeft: 5,
  },
  logsContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 15,
    maxHeight: 400,
  },
  logItem: {
    marginBottom: 10,
  },
  logTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  logMessage: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noLogsText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  loadingOverlay: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
