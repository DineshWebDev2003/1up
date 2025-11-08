import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import authFetch from '../utils/api';
import Colors from '../constants/colors';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || isProcessing) return;
    
    setScanned(true);
    setIsProcessing(true);
    
    try {
      let studentId;
      let studentName = 'Student';
      
      // Try to parse as JSON first (new format)
      try {
        const qrData = JSON.parse(data);
        if (qrData.student_id) {
          studentId = qrData.student_id;
          studentName = qrData.name || 'Student';
        } else if (qrData.id) {
          studentId = qrData.id;
          studentName = qrData.name || 'Student';
        } else {
          throw new Error('Invalid QR data structure');
        }
      } catch (jsonError) {
        // Fallback to integer parsing (old format)
        studentId = parseInt(data, 10);
        if (isNaN(studentId)) {
          Alert.alert('Invalid QR Code', 'This QR code does not contain a valid student ID.');
          setScanned(false);
          setIsProcessing(false);
          return;
        }
      }
      
      // Mark attendance as present
      const response = await authFetch('/api/attendance/mark_manual_attendance.php', {
        method: 'POST',
        body: JSON.stringify({ 
          student_id: studentId, 
          status: 'present',
          date: new Date().toISOString().split('T')[0]
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', `${studentName} marked as present!`, [
          {
            text: 'OK',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            }
          }
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark attendance.', [
          {
            text: 'OK',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            }
          }
        ]);
      }
    } catch (error) {
      console.error('QR Code processing error:', error);
      Alert.alert('Error', 'An error occurred while processing the QR code.', [
        {
          text: 'OK',
          onPress: () => {
            setScanned(false);
            setIsProcessing(false);
          }
        }
      ]);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="camera-off" size={80} color={Colors.danger} />
          <Text style={styles.errorText}>No access to camera</Text>
          <Text style={styles.errorSubtext}>Please enable camera permission in settings</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: ['qr', 'pdf417'],
        }}
      />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.7)']} style={styles.gradient}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan Student QR Code</Text>
            <Text style={styles.subtitle}>Point camera at student's QR code</Text>
          </View>
          
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
          
          <View style={styles.footer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.instructionText}>Position QR code within the frame</Text>
            )}
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: Colors.white,
    fontSize: 16,
    marginTop: 20,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  errorSubtext: {
    color: Colors.lightText,
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.lightText,
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  footer: {
    paddingBottom: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    color: Colors.white,
    fontSize: 16,
    marginTop: 10,
  },
  instructionText: {
    color: Colors.lightText,
    fontSize: 16,
    textAlign: 'center',
  },
});
