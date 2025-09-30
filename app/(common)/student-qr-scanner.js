import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator, Modal, Linking } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useRouter } from 'expo-router';
import authFetch from '../utils/api';
import Colors from '../constants/colors';

export default function StudentQRScannerScreen() {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scannedStudent, setScannedStudent] = useState(null);

  const openWebQRScanner = () => {
    const webQRUrl = `http://10.216.219.139/lastchapter/tn-happykids-playschool/web/qr-scanner.html`;
    
    Alert.alert(
      'QR Scanner',
      'This will open a web-based QR scanner with camera access. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Scanner', 
          onPress: () => {
            Linking.openURL(webQRUrl).catch(err => {
              console.error('Failed to open QR scanner:', err);
              Alert.alert('Error', 'Could not open QR scanner. Please try manual input.');
            });
          }
        }
      ]
    );
  };

  const openManualInput = () => {
    Alert.prompt(
      'Enter QR Code',
      'Enter the QR code data manually:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'OK', 
          onPress: (text) => {
            if (text) {
              processQRCode(text);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const processQRCode = async (qrData) => {
    setIsProcessing(true);
    
    try {
      let studentId;
      let studentCode = null;
      let studentName = 'Student';
      
      // Try to parse as JSON first (new format)
      try {
        const qrDataObj = JSON.parse(qrData);
        if (qrDataObj.student_id) {
          // Could be numeric id or alphanumeric student_code
          studentId = qrDataObj.student_id;
          if (typeof studentId === 'string' && isNaN(parseInt(studentId, 10))) {
            studentCode = studentId;
          }
          studentName = qrDataObj.name || 'Student';
        } else if (qrDataObj.id) {
          studentId = qrDataObj.id;
          studentName = qrDataObj.name || 'Student';
        } else {
          throw new Error('Invalid QR data structure');
        }
      } catch (jsonError) {
        // Fallback to integer parsing (old format)
        studentId = parseInt(qrData, 10);
        if (isNaN(studentId)) {
          Alert.alert('Invalid QR Code', 'This QR code does not contain a valid student ID.');
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
      }
    } catch (error) {
      console.error('QR Code processing error:', error);
      Alert.alert('Error', 'An error occurred while processing the QR code.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    setScannedStudent(null);
    setShowOptions(true);
  };

  const handleScanAnother = () => {
    setShowSuccessModal(false);
    setScannedStudent(null);
    setShowOptions(true);
  };

    return (
      <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student QR Scanner</Text>
        <View style={styles.placeholder} />
      </LinearGradient>
      
      <View style={styles.content}>
          <View style={styles.instructionsContainer}>
          <MaterialCommunityIcons name="qrcode-scan" size={80} color={Colors.primary} />
            <Text style={styles.instructionsTitle}>Scan Student QR Code</Text>
          <Text style={styles.instructionsText}>
            Choose how you want to scan the student's QR code to mark attendance
          </Text>
          </View>
          
        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionButton} onPress={openWebQRScanner}>
            <MaterialCommunityIcons name="camera" size={30} color={Colors.white} />
            <Text style={styles.optionTitle}>Camera Scanner</Text>
            <Text style={styles.optionSubtitle}>Use device camera to scan QR code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionButton, styles.manualOption]} onPress={openManualInput}>
            <MaterialCommunityIcons name="keyboard" size={30} color={Colors.primary} />
            <Text style={[styles.optionTitle, styles.manualTitle]}>Manual Input</Text>
            <Text style={[styles.optionSubtitle, styles.manualSubtitle]}>Enter QR code data manually</Text>
          </TouchableOpacity>
          </View>
          
        {isProcessing && (
              <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.processingText}>Processing attendance...</Text>
              </View>
        )}
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
    backgroundColor: Colors.background,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
  content: {
    flex: 1,
    padding: 20,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionsTitle: {
    color: Colors.darkText,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  instructionsText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 20,
  },
  optionButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  manualOption: {
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  optionTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  manualTitle: {
    color: Colors.primary,
  },
  optionSubtitle: {
    color: Colors.lightText,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
  },
  manualSubtitle: {
    color: Colors.textSecondary,
  },
  processingContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  processingText: {
    color: Colors.primary,
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
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
