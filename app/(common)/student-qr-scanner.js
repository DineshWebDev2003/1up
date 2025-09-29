import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useRouter } from 'expo-router';
import authFetch from '../utils/api';
import Colors from '../constants/colors';

export default function StudentQRScannerScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scannedStudent, setScannedStudent] = useState(null);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
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
      let studentCode = null;
      let studentName = 'Student';
      
      // Try to parse as JSON first (new format)
      try {
        const qrData = JSON.parse(data);
        if (qrData.student_id) {
          // Could be numeric id or alphanumeric student_code
          studentId = qrData.student_id;
          if (typeof studentId === 'string' && isNaN(parseInt(studentId, 10))) {
            studentCode = studentId;
          }
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
          ...(studentCode ? { student_code: studentCode } : { student_id: studentId }), 
          status: 'present',
          date: new Date().toISOString().split('T')[0]
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setScannedStudent({ name: studentName, id: studentId });
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark attendance.');
        setScanned(false);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('QR Code processing error:', error);
      Alert.alert('Error', 'An error occurred while processing the QR code.');
      setScanned(false);
      setIsProcessing(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    setScannedStudent(null);
    setScanned(false);
    setIsProcessing(false);
  };

  const handleScanAnother = () => {
    setShowSuccessModal(false);
    setScannedStudent(null);
    setScanned(false);
    setIsProcessing(false);
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BarCodeScanner
        style={StyleSheet.absoluteFillObject}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr, BarCodeScanner.Constants.BarCodeType.pdf417]}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student QR Scanner</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Overlay */}
      <View style={styles.overlay}>
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.7)']} style={styles.gradient}>
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Scan Student QR Code</Text>
            <Text style={styles.instructionsText}>Point camera at student's QR code to mark attendance</Text>
          </View>
          
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {!scanned && <View style={styles.scanLine} />}
            </View>
          </View>
          
          <View style={styles.footer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.processingText}>Processing attendance...</Text>
              </View>
            ) : scanned ? (
              <View style={styles.scannedContainer}>
                <MaterialCommunityIcons name="check-circle" size={50} color={Colors.accent} />
                <Text style={styles.scannedText}>QR Code Scanned!</Text>
              </View>
            ) : (
              <Text style={styles.instructionText}>Position QR code within the frame</Text>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseSuccess}
      >
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
            <View style={styles.successIcon}>
              <MaterialCommunityIcons name="check-circle" size={80} color={Colors.accent} />
            </View>
            <Text style={styles.successTitle}>Attendance Marked!</Text>
            <Text style={styles.successSubtitle}>
              {scannedStudent?.name} has been marked as present
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.scanAnotherButton} onPress={handleScanAnother}>
                <MaterialCommunityIcons name="qrcode-scan" size={20} color={Colors.white} />
                <Text style={styles.scanAnotherText}>Scan Another</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneButton} onPress={handleCloseSuccess}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  overlay: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  instructionsTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  instructionsText: {
    color: Colors.lightText,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.accent,
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
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    backgroundColor: Colors.accent,
    opacity: 0.8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
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
  scannedContainer: {
    alignItems: 'center',
  },
  scannedText: {
    color: Colors.accent,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  instructionText: {
    color: Colors.lightText,
    fontSize: 16,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  scanAnotherButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  scanAnotherText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  doneButton: {
    backgroundColor: Colors.lightGray,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  doneText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
