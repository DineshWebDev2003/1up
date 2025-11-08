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
      console.log('🔧 MaintenanceOverlay: Checking maintenance status...');
      
      // First, get the user role
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          setUserRole(user.role || '');
          console.log('🔧 MaintenanceOverlay: User role:', user.role);
          // If the user is a developer, we don't need to check for maintenance mode.
          if (user.role === 'Developer') {
            console.log('✅ MaintenanceOverlay: Developer user, skipping maintenance check');
            setIsMaintenance(false);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('❌ MaintenanceOverlay: Failed to get user role:', e);
      }

      // If not a developer, check maintenance status with timeout
      try {
        console.log('🔧 MaintenanceOverlay: Checking API maintenance status...');
        const API_URL = await getApiUrl();
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${API_URL}/api/maintenance/maintenance_mode.php?check_status=true`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const result = await response.json();
        console.log('🔧 MaintenanceOverlay: API response:', result);
        
        if (result.success && result.data.is_enabled) {
          console.log('⚠️ MaintenanceOverlay: Maintenance mode enabled');
          setIsMaintenance(true);
          setMaintenanceDetails(result.data);
        } else {
          console.log('✅ MaintenanceOverlay: No maintenance mode');
          setIsMaintenance(false);
        }
      } catch (error) {
        console.log('⚠️ MaintenanceOverlay: API check failed, assuming no maintenance:', error.message);
        // If API is down, assume it's not in maintenance to allow app usage
        setIsMaintenance(false);
      } finally {
        console.log('✅ MaintenanceOverlay: Check complete, setting loading to false');
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
