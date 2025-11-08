import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import authFetch from '../utils/api';

export default function UpiSettingsScreen() {
  const [currentUpi, setCurrentUpi] = useState('');
  const [newUpi, setNewUpi] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchCurrentUpi = async () => {
    try {
      const res = await authFetch('/api/admin/upi_get.php');
      const json = await res.json();
      if (json.success) {
        setCurrentUpi(json.data.upi_id || '');
      } else {
        Alert.alert('Error', json.message || 'Failed to fetch UPI ID');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to fetch UPI ID');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUpi();
  }, []);

  const handleSendOtp = async () => {
    try {
      setSendingOtp(true);
      const res = await authFetch('/api/admin/upi_send_otp.php', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        Alert.alert('OTP Sent', 'Please check the admin phone for the OTP.');
      } else {
        Alert.alert('Error', json.message || 'Failed to send OTP');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleUpdate = async () => {
    if (!newUpi) {
      Alert.alert('Validation', 'Enter a new UPI ID');
      return;
    }
    if (!otp) {
      Alert.alert('Validation', 'Enter the OTP');
      return;
    }
    try {
      setUpdating(true);
      const res = await authFetch('/api/admin/upi_update.php', {
        method: 'POST',
        body: JSON.stringify({ upi_id: newUpi, otp })
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('Success', 'UPI ID updated successfully');
        setCurrentUpi(newUpi);
        setNewUpi('');
        setOtp('');
      } else {
        Alert.alert('Error', json.message || 'Failed to update UPI');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update UPI');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.header}>
        <Text style={styles.headerTitle}>UPI Settings</Text>
        <Ionicons name="qr-code-outline" size={28} color="#fff" />
      </LinearGradient>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Current UPI ID</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{currentUpi || 'Not set'}</Text>
          </View>

          <Text style={styles.label}>New UPI ID</Text>
          <TextInput
            placeholder="e.g. tnhappykids@oksbi"
            placeholderTextColor="#999"
            value={newUpi}
            onChangeText={setNewUpi}
            style={styles.input}
            autoCapitalize="none"
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleSendOtp} disabled={sendingOtp} style={{ flex: 1 }}>
              <LinearGradient colors={["#0ea5e9", "#2563eb"]} style={styles.button}>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.buttonText}>{sendingOtp ? 'Sending...' : 'Send OTP'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Enter OTP</Text>
          <TextInput
            placeholder="6-digit OTP"
            placeholderTextColor="#999"
            value={otp}
            onChangeText={setOtp}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
          />

          <TouchableOpacity onPress={handleUpdate} disabled={updating}>
            <LinearGradient colors={["#22c55e", "#16a34a"]} style={styles.button}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>{updating ? 'Updating...' : 'Update UPI'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700'
  },
  container: {
    padding: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 3
  },
  label: {
    color: '#111827',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6
  },
  readonlyField: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12
  },
  readonlyText: {
    color: '#111827'
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12
  },
  button: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700'
  }
});

