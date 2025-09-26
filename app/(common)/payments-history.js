import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Modal, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Invoice from './invoice';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
    primary: '#8B5CF6',
    secondary: '#06B6D4',
    accent: '#F59E0B',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    white: '#FFFFFF',
    text: '#1F2937',
    lightText: '#6B7280',
    background: '#F9FAFB',
    card: '#FFFFFF',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.6)',
    lightGray: '#E5E7EB',
    border: '#D1D5DB',
};

export default function PaymentsHistoryScreen() {
  const { branch, branch_id } = useLocalSearchParams();
  const [selectedBranch, setSelectedBranch] = useState(branch || 'All');
  const [selectedMethod, setSelectedMethod] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [branches, setBranches] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const invoiceRef = useRef();

  const paymentMethods = ['All', 'Cash', 'Online', 'Card'];


  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserRole(user.role);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
    fetchPaymentHistory();
    fetchBranches();
    
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(() => {
      fetchPaymentHistory();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success && result.data) {
        setBranches([{ id: 'All', name: 'All' }, ...result.data]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      let url = '/api/payments/payment_history.php';
      if (branch_id && branch_id !== 'all') {
        url += `?branch_id=${branch_id}`;
      }

      console.log('Fetching payment history from:', url);
      const response = await authFetch(url);
      const result = await response.json();
      
      console.log('Payment history response:', result);
      
      if (result.success) {
        setPaymentHistory(result.data || []);
      } else {
        console.log('Failed to fetch payment history:', result.message);
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = paymentHistory.filter(p => 
    (selectedBranch === 'All' || p.branch_name === selectedBranch) &&
    (selectedMethod === 'All' || p.payment_method === selectedMethod)
  );

  const openInvoice = (transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  };

  const handleDownload = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your media library to save the invoice.');
      return;
    }
    try {
      const uri = await invoiceRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success!', 'Invoice has been saved to your gallery.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save the invoice. Please try again.');
    }
  };

  const renderPaymentItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={800} delay={index * 100}>
      <LinearGradient
        colors={['#8B5CF6', '#06B6D4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <TouchableOpacity onPress={() => openInvoice(item)} style={styles.card}>
          <View style={styles.invoiceIcon}>
            <Ionicons name="receipt-outline" size={24} color={COLORS.white} />
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.student_name}</Text>
            <Text style={styles.invoiceNumber}>Invoice: {item.invoice_number}</Text>
            <Text style={styles.detailText}>{item.payment_type} • {item.branch_name}</Text>
            <Text style={styles.detailText}>{item.payment_date} • {item.payment_method}</Text>
          </View>
          <View style={styles.paymentDetails}>
            <Text style={styles.amountText}>₹{item.amount}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>PAID</Text>
            </View>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </Animatable.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#8B5CF6', '#06B6D4']} style={styles.header}>
        <LottieView source={require('../../assets/lottie/payment_history.json')} autoPlay loop style={styles.lottieAnimation} />
        <Text style={styles.headerTitle}>Invoice History</Text>
        <Text style={styles.headerSubtitle}>Live payment records</Text>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedBranch} onValueChange={setSelectedBranch} style={styles.picker} enabled={!branch}>
                {branches.map(b => <Picker.Item key={b.id} label={b.name} value={b.name} />)}
            </Picker>
        </View>
        <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedMethod} onValueChange={setSelectedMethod} style={styles.picker}>
                {paymentMethods.map(m => <Picker.Item key={m} label={m} value={m} />)}
            </Picker>
        </View>
      </View>

      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LottieView source={require('../../assets/lottie/empty.json')} autoPlay loop style={styles.emptyLottie} />
            <Text style={styles.emptyText}>No invoices found</Text>
            <Text style={styles.emptySubtext}>Generated invoices will appear here</Text>
          </View>
        }
      />

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" duration={500} style={styles.modalContent}>
            <ViewShot ref={invoiceRef} options={{ format: 'png', quality: 1 }}>
              <Invoice transaction={selectedTransaction} branchDetails={branches.find(b => b.name === selectedTransaction?.branch_name)} photo={selectedTransaction?.photo} />
            </ViewShot>
            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalButton, { backgroundColor: COLORS.lightGray }]}>
                <Text style={[styles.modalButtonText, { color: COLORS.text }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDownload}>
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.modalButton}>
                  <Ionicons name="download-outline" size={20} color={COLORS.white} />
                  <Text style={styles.modalButtonText}>Download</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { height: 240, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.white, marginTop: 80 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
  lottieAnimation: { width: 160, height: 160, position: 'absolute', top: 20 },
  filtersContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 15, marginTop: -30 },
  pickerWrapper: { flex: 1, backgroundColor: COLORS.card, borderRadius: 16, marginHorizontal: 8, elevation: 8, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  picker: { height: 50, color: COLORS.text },
  listContainer: { paddingHorizontal: 20, paddingTop: 20 },
  cardGradient: { borderRadius: 16, marginBottom: 16, elevation: 6, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10 },
  card: { flexDirection: 'row', backgroundColor: 'transparent', padding: 18, alignItems: 'center' },
  invoiceIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 18, fontWeight: 'bold', color: COLORS.white, marginBottom: 2 },
  invoiceNumber: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginBottom: 4 },
  detailText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  paymentDetails: { alignItems: 'flex-end' },
  amountText: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, marginBottom: 6 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  statusText: { color: COLORS.white, fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyLottie: { width: 200, height: 200, marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.lightText, textAlign: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.overlay },
  modalContent: { width: '90%', backgroundColor: 'transparent', borderRadius: 20, elevation: 10 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingHorizontal: 10, paddingBottom: 10 },
  modalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, minWidth: 120 },
  modalButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
});

