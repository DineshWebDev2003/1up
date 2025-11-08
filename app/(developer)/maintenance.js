import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import GreenGradientBackground from '../components/GreenGradientBackground';

const MaintenanceScreen = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  const fetchMaintenanceStatus = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/maintenance/maintenance_mode.php');
      const result = await response.json();
      if (result.success) {
        setIsEnabled(result.data.is_enabled);
        setMessage(result.data.message);
        setEndTime(result.data.scheduled_end_time || '');
      } else {
        Alert.alert('Error', 'Failed to fetch maintenance status.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while fetching status.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await authFetch('/api/maintenance/maintenance_mode.php', {
        method: 'POST',
        body: JSON.stringify({ 
          is_enabled: isEnabled, 
          message: message, 
          scheduled_end_time: endTime 
        }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Maintenance mode updated.');
      } else {
        Alert.alert('Error', result.message || 'Failed to update maintenance mode.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <GreenGradientBackground>
      <View style={styles.container}>
        <Text style={styles.header}>Maintenance Mode</Text>
        <View style={styles.controlRow}>
          <Text style={styles.label}>Enable Maintenance Mode</Text>
          <Switch
            trackColor={{ false: '#767577', true: Colors.primaryLight }}
            thumbColor={isEnabled ? Colors.primary : '#f4f3f4'}
            onValueChange={() => setIsEnabled(previousState => !previousState)}
            value={isEnabled}
          />
        </View>
        <Text style={styles.label}>Maintenance Message</Text>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Enter maintenance message"
          multiline
        />
        <Text style={styles.label}>Scheduled End Time (Optional)</Text>
        <TextInput
          style={styles.input}
          value={endTime}
          onChangeText={setEndTime}
          placeholder="YYYY-MM-DD HH:MM:SS"
        />
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: Colors.white,
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 40,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MaintenanceScreen;
