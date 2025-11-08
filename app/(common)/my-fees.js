import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  Clipboard,
  Dimensions,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import authFetch from '../utils/api';
import { useColors } from '../hooks/useColors';
import Header from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function MyFeesScreen() {
  const Colors = useColors();
  
  const getStyles = () => StyleSheet.create({
    container: {
      flex: 1,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: Colors.surface,
      marginHorizontal: 20,
      marginTop: 20,
      borderRadius: 15,
      padding: 4,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
    },
    activeTab: {
      backgroundColor: Colors.primary,
    },
    tabText: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '600',
      color: Colors.textSecondary,
    },
    activeTabText: {
      color: Colors.textOnPrimary,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    paymentTab: {
      flex: 1,
    },
    feesBox: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 30,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    feesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    feesInfo: {
      flex: 1,
      marginLeft: 15,
    },
    feesLabel: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '500',
    },
    feesAmount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: Colors.textOnDark,
      marginVertical: 4,
    },
    feesSubtext: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    feesBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
    },
    feesBadgeText: {
      color: Colors.textOnDark,
      fontSize: 12,
      fontWeight: '600',
    },
    studentDetails: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 15,
      padding: 15,
    },
    studentDetailText: {
      color: Colors.textOnDark,
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 5,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    actionButton: {
      flex: 1,
      marginHorizontal: 5,
      borderRadius: 15,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    buttonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      paddingHorizontal: 10,
    },
    buttonText: {
      color: Colors.textOnPrimary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    invoiceTab: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: Colors.text,
      marginTop: 15,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: Colors.textSecondary,
    },
    
    // QR Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    qrModalContainer: {
      width: width * 0.9,
      maxHeight: '80%',
      backgroundColor: Colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
    },
    qrModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    qrModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: Colors.text,
    },
    qrContent: {
      padding: 20,
    },
    qrCodeContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    qrCodeBox: {
      width: 200,
      height: 200,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    qrCodeText: {
      color: Colors.textOnPrimary,
      fontSize: 16,
      fontWeight: '600',
      marginTop: 10,
    },
    paymentDetails: {
      backgroundColor: Colors.surfaceVariant,
      borderRadius: 15,
      padding: 15,
      marginBottom: 20,
    },
    paymentDetailTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 10,
    },
    paymentDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    paymentDetailLabel: {
      fontSize: 14,
      color: Colors.textSecondary,
      fontWeight: '500',
    },
    paymentDetailValue: {
      fontSize: 14,
      color: Colors.text,
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    copyUrlButton: {
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    copyUrlGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
    },
    copyUrlText: {
      color: Colors.textOnPrimary,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    
    // Invoice Card Styles
    invoiceCard: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 15,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    invoiceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    invoiceId: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.text,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: Colors.textOnPrimary,
    },
    invoiceDetails: {
      marginBottom: 15,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    detailLabel: {
      fontSize: 14,
      color: Colors.textSecondary,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 14,
      color: Colors.text,
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    amountText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.primary,
    },
    invoiceActions: {
      alignItems: 'center',
    },
    invoiceActionButton: {
      borderRadius: 12,
      overflow: 'hidden',
      width: '100%',
    },
    invoiceActionGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    invoiceActionText: {
      color: Colors.textOnPrimary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
  });
  
  const styles = getStyles();
  const [activeTab, setActiveTab] = useState('payment'); // payment or invoice
  const [studentFees, setStudentFees] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [upiSettings, setUpiSettings] = useState(null);
  const [studentInvoices, setStudentInvoices] = useState([]);

  useEffect(() => {
    loadUserData();
    loadStudentFees();
  }, []);

  useEffect(() => {
    if (userData && activeTab === 'invoice') {
      loadStudentInvoices();
    }
  }, [userData, activeTab]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserData(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadStudentFees = async () => {
    setLoading(true);
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const user = JSON.parse(userDataStr);
        console.log('💵 Loading student fees for user ID:', user.id);
        
        const response = await authFetch(`/api/students/get_student_info.php?user_id=${user.id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('✅ Student fees loaded:', result.data.fees);
          setStudentFees(result.data.fees);
        } else {
          console.log('❌ Failed to load student fees:', result.message);
          Alert.alert('Error', result.message || 'Failed to load student fees');
        }
      }
    } catch (error) {
      console.error('❌ Error loading student fees:', error);
      Alert.alert('Error', 'Failed to load student fees');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = () => {
    Alert.alert('Pay Now', 'Payment functionality will be implemented');
  };

  const loadUpiSettings = async () => {
    try {
      const response = await authFetch('/api/upi/get_upi_settings.php');
      const result = await response.json();
      
      if (result.success && result.data) {
        setUpiSettings(result.data);
      } else {
        Alert.alert('Error', 'UPI settings not configured');
      }
    } catch (error) {
      console.error('Error loading UPI settings:', error);
      Alert.alert('Error', 'Failed to load UPI settings');
    }
  };

  const handleQRCode = async () => {
    await loadUpiSettings();
    setQrModalVisible(true);
  };

  const generatePaymentUrl = () => {
    if (!upiSettings || !studentFees || !userData) return '';
    
    const amount = parseFloat(studentFees).toFixed(2);
    const payeeName = upiSettings.payee_name || 'School';
    const upiId = upiSettings.upi_id || '';
    const note = `Fee payment for ${userData.name} (ID: ${userData.student_id || userData.id})`;
    
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  };

  const copyPaymentUrl = () => {
    const url = generatePaymentUrl();
    if (url) {
      Clipboard.setString(url);
      Alert.alert('Copied!', 'Payment URL copied to clipboard');
    }
  };

  const loadStudentInvoices = async () => {
    try {
      setLoading(true);
      
      // Try multiple student ID formats for better matching
      const studentId = userData?.student_id || userData?.id;
      const userId = userData?.id;
      
      console.log('🔍 Loading invoices for student:', {
        userData: userData,
        studentId: studentId,
        userId: userId,
        student_id_field: userData?.student_id,
        id_field: userData?.id
      });
      
      // First try with student_id - ONLY PAID INVOICES
      let response = await authFetch(`/api/invoices/get_invoices.php?student_id=${studentId}&status=paid`);
      let result = await response.json();
      
      console.log('📋 Invoice API response:', result);
      console.log('📋 Invoice data details:', result.data);
      
      if (result.success && result.data && result.data.length > 0) {
        console.log('✅ Found invoices with student_id:', result.data.length);
        console.log('📊 Invoice statuses:', result.data.map(inv => ({ id: inv.id, status: inv.status, number: inv.invoice_number })));
        setStudentInvoices(result.data);
      } else {
        // If no results with student_id, try with user_id - ONLY PAID INVOICES
        console.log('🔄 No invoices found with student_id, trying with user_id...');
        response = await authFetch(`/api/invoices/get_invoices.php?student_id=${userId}&status=paid`);
        result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          console.log('✅ Found invoices with user_id:', result.data.length);
          console.log('📊 Invoice statuses (user_id):', result.data.map(inv => ({ id: inv.id, status: inv.status, number: inv.invoice_number })));
          setStudentInvoices(result.data);
        } else {
          console.log('❌ No invoices found with either ID');
          setStudentInvoices([]);
        }
      }
    } catch (error) {
      console.error('Error loading student invoices:', error);
      setStudentInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoicePDF = async (invoice) => {
    try {
      setLoading(true);
      
      console.log('📄 Generating PDF for invoice:', invoice);
      
      const response = await authFetch('/api/invoices/generate_pdf.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoice_id: invoice.id }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Automatically open PDF and show success message
        if (result.pdf_url || result.data?.pdf_url) {
          try {
            // Get the dynamic API URL and create full URL for the PDF
            const { getApiUrl } = require('../../config');
            const apiUrl = await getApiUrl();
            const pdfUrl = `${apiUrl}${result.pdf_url || result.data.pdf_url}?t=${Date.now()}`;
            console.log('🔗 Opening PDF URL:', pdfUrl);
            
            // Open the PDF URL in browser for download
            const supported = await Linking.canOpenURL(pdfUrl);
            if (supported) {
              await Linking.openURL(pdfUrl);
            } else {
              console.log('Cannot open URL, PDF saved on server');
            }
          } catch (error) {
            console.error('Error opening PDF:', error);
          }
        }
        
        // Show success message with file type info
        const fileType = result.data?.file_type || 'file';
        const message = fileType === 'pdf' 
          ? `Invoice ${invoice.invoice_number || invoice.id} PDF generated successfully!`
          : `Invoice ${invoice.invoice_number || invoice.id} opened in browser - use "Print to PDF" to save as PDF.`;
          
        Alert.alert('✅ Success!', message);
      } else {
        Alert.alert('❌ Error', result.message || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('❌ Error', 'Failed to generate PDF. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    Alert.alert('Upload', 'Upload payment proof functionality will be implemented');
  };

  const renderQRModal = () => (
    <Modal
      visible={qrModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setQrModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Animatable.View animation="slideInUp" duration={600} style={styles.qrModalContainer}>
          <View style={styles.qrModalHeader}>
            <Text style={styles.qrModalTitle}>Payment QR Code</Text>
            <TouchableOpacity onPress={() => setQrModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.qrContent}>
            {upiSettings ? (
              <>
                <View style={styles.qrCodeContainer}>
                  <LinearGradient colors={Colors.gradientPrimary} style={styles.qrCodeBox}>
                    <Ionicons name="qr-code" size={120} color={Colors.textOnPrimary} />
                    <Text style={styles.qrCodeText}>Scan to Pay</Text>
                  </LinearGradient>
                </View>
                
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentDetailTitle}>Payment Details</Text>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Amount:</Text>
                    <Text style={styles.paymentDetailValue}>₹{studentFees ? parseFloat(studentFees).toFixed(2) : '0.00'}</Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Payee:</Text>
                    <Text style={styles.paymentDetailValue}>{upiSettings.payee_name || 'School'}</Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>UPI ID:</Text>
                    <Text style={styles.paymentDetailValue}>{upiSettings.upi_id || 'N/A'}</Text>
                  </View>
                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailLabel}>Student:</Text>
                    <Text style={styles.paymentDetailValue}>{userData?.name || 'Student'}</Text>
                  </View>
                </View>
                
                <TouchableOpacity style={styles.copyUrlButton} onPress={copyPaymentUrl}>
                  <LinearGradient colors={Colors.gradientAccent} style={styles.copyUrlGradient}>
                    <Ionicons name="copy" size={20} color={Colors.textOnPrimary} />
                    <Text style={styles.copyUrlText}>Copy Payment URL</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading UPI settings...</Text>
              </View>
            )}
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      {/* App Theme Header */}
      <Header 
        title="💰 My Fees"
        subtitle={`${userData?.name || 'Student'} • ${userData?.branch || 'Branch'}`}
        variant="gradient"
      />

      {/* Tab Container */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payment' && styles.activeTab]}
          onPress={() => setActiveTab('payment')}
        >
          <Ionicons 
            name="card" 
            size={20} 
            color={activeTab === 'payment' ? Colors.white : Colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'payment' && styles.activeTabText]}>
            Payment Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoice' && styles.activeTab]}
          onPress={() => setActiveTab('invoice')}
        >
          <Ionicons 
            name="receipt" 
            size={20} 
            color={activeTab === 'invoice' ? Colors.white : Colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'invoice' && styles.activeTabText]}>
            My Invoice
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'payment' && (
          <Animatable.View animation="fadeInUp" duration={600} style={styles.paymentTab}>
            {/* Student Fees Box */}
            <LinearGradient colors={Colors.gradientSuccess} style={styles.feesBox}>
              <View style={styles.feesHeader}>
                <Ionicons name="wallet" size={32} color={Colors.white} />
                <View style={styles.feesInfo}>
                  <Text style={styles.feesLabel}>Monthly Fees</Text>
                  <Text style={styles.feesAmount}>
                    ₹{studentFees ? parseFloat(studentFees).toFixed(2) : '0.00'}
                  </Text>
                  <Text style={styles.feesSubtext}>Per Month</Text>
                </View>
                <View style={styles.feesBadge}>
                  <Text style={styles.feesBadgeText}>Active</Text>
                </View>
              </View>
              
              {/* Student Details */}
              <View style={styles.studentDetails}>
                <Text style={styles.studentDetailText}>
                  Student ID: {userData?.student_id || 'N/A'}
                </Text>
                <Text style={styles.studentDetailText}>
                  Name: {userData?.name || 'Student Name'}
                </Text>
                <Text style={styles.studentDetailText}>
                  Branch: {userData?.branch || 'Branch Name'}
                </Text>
              </View>
            </LinearGradient>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handlePayNow}>
                <LinearGradient colors={Colors.gradientPrimary} style={styles.buttonGradient}>
                  <Ionicons name="card" size={20} color={Colors.textOnPrimary} />
                  <Text style={styles.buttonText}>Pay Now</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleQRCode}>
                <LinearGradient colors={Colors.gradientWarning} style={styles.buttonGradient}>
                  <Ionicons name="qr-code" size={20} color={Colors.textOnPrimary} />
                  <Text style={styles.buttonText}>QR Code</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleUpload}>
                <LinearGradient colors={Colors.gradientInfo} style={styles.buttonGradient}>
                  <Ionicons name="cloud-upload" size={20} color={Colors.textOnPrimary} />
                  <Text style={styles.buttonText}>Upload</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        )}

        {activeTab === 'invoice' && (
          <Animatable.View animation="fadeInUp" duration={600} style={styles.invoiceTab}>
            {/* Paid Invoices Header */}
            <View style={{ backgroundColor: Colors.success, padding: 12, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={{ color: Colors.white, fontSize: 14, fontWeight: '600', marginLeft: 8 }}>
                Showing Paid Invoices Only
              </Text>
            </View>
            
            {studentInvoices.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>No Paid Invoices</Text>
                <Text style={styles.emptySubtext}>
                  Only paid invoices will appear here.{'\n'}
                  Pending invoices are not shown.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {(() => {
                  console.log('🎨 Rendering invoices:', studentInvoices.length, 'invoices');
                  console.log('🎨 Invoice details for rendering:', studentInvoices.map(inv => ({ 
                    id: inv.id, 
                    status: inv.status, 
                    number: inv.invoice_number,
                    amount: inv.amount 
                  })));
                  return null;
                })()}
                {studentInvoices.map((invoice, index) => (
                  <Animatable.View 
                    key={invoice.id} 
                    animation="fadeInUp" 
                    duration={600} 
                    delay={index * 100}
                    style={styles.invoiceCard}
                  >
                    <View style={styles.invoiceHeader}>
                      <Text style={styles.invoiceId}>{invoice.invoice_number || `INV-${invoice.id}`}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: invoice.status === 'paid' ? Colors.success : invoice.status === 'pending' ? Colors.warning : Colors.error }]}>
                        <Text style={styles.statusText}>{(invoice.status || 'pending').toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.invoiceDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Category:</Text>
                        <Text style={styles.detailValue}>{invoice.fee_category}</Text>
                      </View>
                      {invoice.month_year && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Period:</Text>
                          <Text style={styles.detailValue}>{invoice.month_year}</Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount:</Text>
                        <Text style={[styles.detailValue, styles.amountText]}>
                          ₹{parseFloat(invoice.amount).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      {invoice.description && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Description:</Text>
                          <Text style={styles.detailValue}>{invoice.description}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.invoiceActions}>
                      <TouchableOpacity 
                        style={styles.invoiceActionButton} 
                        onPress={() => downloadInvoicePDF(invoice)}
                      >
                        <LinearGradient colors={Colors.gradientPrimary} style={styles.invoiceActionGradient}>
                          <Ionicons name="download" size={16} color={Colors.textOnPrimary} />
                          <Text style={styles.invoiceActionText}>Download PDF</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </Animatable.View>
                ))}
              </ScrollView>
            )}
          </Animatable.View>
        )}
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading fees...</Text>
        </View>
      )}
      
      {renderQRModal()}
    </SafeAreaView>
  );
}