import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { getApiUrl } from '../../config';
import { usePathname } from 'expo-router';

const MaintenanceOverlay = ({ children }) => {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceDetails, setMaintenanceDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const checkUserAndMaintenanceStatus = async () => {
      // First, get the user role
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          setUserRole(user.role || '');
          // If the user is a developer, we don't need to check for maintenance mode.
          if (user.role === 'Developer') {
            setIsMaintenance(false);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to get user role for maintenance check', e);
      }

      // If not a developer, check maintenance status
      try {
        // Use a public, unauthenticated request for maintenance status
        const API_URL = await getApiUrl();
        const response = await fetch(`${API_URL}/api/maintenance/maintenance_mode.php?check_status=true`);
        const result = await response.json();
        if (result.success && result.data.is_enabled) {
          setIsMaintenance(true);
          setMaintenanceDetails(result.data);
        } else {
          setIsMaintenance(false);
        }
      } catch (error) {
        // If API is down, we might want to assume it's not in maintenance
        // or handle it differently depending on desired behavior.
        setIsMaintenance(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndMaintenanceStatus();
    // Check every minute
    const interval = setInterval(checkUserAndMaintenanceStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  // Always allow login/auth flows even during maintenance
  if (pathname && (pathname.includes('/login') || pathname.includes('auth'))) {
    return children;
  }

  if (isMaintenance) {
    return (
      <Modal visible={true} transparent={false} animationType="fade">
        <View style={styles.maintenanceContainer}>
          <Ionicons name="build-outline" size={80} color={Colors.primary} />
          <Text style={styles.maintenanceTitle}>Under Maintenance</Text>
          <Text style={styles.maintenanceMessage}>{maintenanceDetails.message}</Text>
          {maintenanceDetails.scheduled_end_time && 
            <Text style={styles.maintenanceTime}>We expect to be back online by {new Date(maintenanceDetails.scheduled_end_time).toLocaleString()}</Text>
          }
        </View>
      </Modal>
    );
  }

  return children;
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  maintenanceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  maintenanceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 20,
  },
  maintenanceMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  maintenanceTime: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 20,
  },
});

export default MaintenanceOverlay;
