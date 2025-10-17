import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Image, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from '@react-navigation/native';
import authFetch from '../utils/api';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import ModernBackground from '../components/ModernBackground';

export default function FeesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feesData, setFeesData] = useState(null);
  const [user, setUser] = useState(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [instructionsModalVisible, setInstructionsModalVisible] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFeesData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadFeesData();
    }, [])
  );

  const loadFeesData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;
      const currentUser = JSON.parse(userData);
      setUser(currentUser);
      const studentId = currentUser.id;
      const response = await authFetch(`/api/fees/student_fees_display.php?student_id=${studentId}`);
      const data = await response.json();
      if (data.success) setFeesData(data.data);
    } catch (error) {
      console.error('Error loading fees data:', error);
      Alert.alert('Error', 'Failed to load fees information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => loadFeesData(true);

  const generateQRCode = async () => {
    if (!feesData?.fee_summary?.pending_amount || feesData.fee_summary.pending_amount <= 0) {
      Alert.alert('No Pending Amount', 'You have no pending fees to pay.');
      return;
    }
    try {
      const response = await authFetch('/api/fees/generate_qr_code.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.student_id || user.id,
          amount: feesData.fee_summary.pending_amount
        })
      });
      const result = await response.json();
      if (result.success) {
        setQrData(result.data);
        setQrModalVisible(true);
      } else {
        Alert.alert('Error', result.message || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload payment screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
      setInstructionsModalVisible(true);
    }
  };

  const payWithRazorpay = async () => {
    if (!feesData?.fee_summary?.pending_amount || feesData.fee_summary.pending_amount <= 0) {
      Alert.alert('No Pending Amount', 'You have no pending fees to pay.');
      return;
    }
    try {
      const amountRupees = Number(feesData.fee_summary.pending_amount) || 0;
      const response = await authFetch('/api/payments/create_razorpay_order.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amountRupees * 100),
          currency: 'INR',
          student_id: user?.student_id || user?.id,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to create order');
      }
      const { order_id, key_id } = result.data;
      router.push({
        pathname: '/(common)/razorpay-checkout',
        params: {
          order_id,
          key_id,
          amount: String(Math.round(amountRupees * 100)),
          name: user?.name || 'TN HappyKids Fees',
          description: 'Fees Payment',
          student_id: String(user?.student_id || user?.id),
        },
      });
    } catch (err) {
      console.error('Razorpay order error:', err);
      Alert.alert('Payment Error', err.message || 'Could not initiate payment');
    }
  };

  const uploadPaymentScreenshot = async () => {
    if (!selectedImage) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: 'payment_screenshot.jpg',
      });
      // Prefer numeric user.id for backend lookup, also include student_code
      formData.append('student_id', String(user.id));
      if (user.student_id) {
        formData.append('student_code', String(user.student_id));
      }
      formData.append('amount', String(feesData?.fee_summary?.pending_amount || '0'));
      formData.append('payment_method', 'upi');
      formData.append('reference_number', 'Mobile Payment');

      const response = await authFetch('/api/fees/upload_payment_screenshot.php', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', result.message);
        setInstructionsModalVisible(false);
        setSelectedImage(null);
        loadFeesData();
      } else {
        Alert.alert('Error', result.message || 'Failed to upload screenshot');
      }
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      Alert.alert('Error', 'Failed to upload payment screenshot');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <ModernBackground variant="main">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading Fees Information...</Text>
        </View>
      </ModernBackground>
    );
  }

  // Simplified, unified 3 cards with equal sizes
  const total = feesData?.fee_summary?.total_fees ?? 0;
  const pending = feesData?.fee_summary?.pending_amount ?? 0;
  const lastPayment = feesData?.recent_transactions?.[0];
  const cards = [
    { title: 'Total Fees', value: `₹${total}`, icon: 'receipt', color: '#4F46E5' },
    { title: 'Pending', value: `₹${pending}`, icon: 'alert-circle', color: '#F59E0B' },
    { title: 'Last Paid', value: lastPayment ? `₹${lastPayment.amount}` : '₹0', icon: 'checkmark-done', color: '#10B981' },
  ];

  return (
    <ModernBackground variant="main">
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
        >
          <Animatable.View animation="fadeInDown" duration={600}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.header}>
              <Text style={styles.headerTitle}>Fees Details</Text>
              <Text style={styles.headerSubtitle}>Manage your fees and payments</Text>
            </LinearGradient>
          </Animatable.View>

          <View style={styles.cardsRow}>
            {cards.map((c, i) => (
              <Animatable.View key={i} animation="fadeInUp" duration={600} delay={i * 120} style={styles.cardWrap}>
                <LinearGradient colors={[c.color, c.color + 'CC']} style={styles.card}>
                  <Ionicons name={c.icon} size={22} color="white" style={styles.cardIcon} />
                  <Text style={styles.cardTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.cardValue} numberOfLines={1}>{c.value}</Text>
                </LinearGradient>
              </Animatable.View>
            ))}
          </View>

          {pending > 0 && (
            <Animatable.View animation="fadeInUp" duration={600} delay={300}>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.qrButton} onPress={generateQRCode}>
                  <LinearGradient colors={['#8B5CF6', '#06B6D4']} style={styles.buttonGradient}>
                    <Ionicons name="qr-code" size={24} color="white" />
                    <Text style={styles.buttonText}>Get QR Code</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadButton} onPress={payWithRazorpay}>
                  <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.buttonGradient}>
                    <Ionicons name="card" size={24} color="white" />
                    <Text style={styles.buttonText}>Pay Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.buttonGradient}>
                    <Ionicons name="cloud-upload" size={24} color="white" />
                    <Text style={styles.buttonText}>Upload Screenshot</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animatable.View>
          )}

          {feesData?.recent_transactions?.length > 0 && (
            <Animatable.View animation="fadeInUp" duration={600} delay={400}>
              <View style={styles.transactionsContainer}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                {feesData.recent_transactions.map((t, idx) => (
                  <View key={idx} style={styles.transactionItem}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionAmount}>₹{t.amount}</Text>
                      <Text style={styles.transactionDate}>{t.payment_date}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: t.status === 'verified' ? '#10B981' : t.status === 'rejected' ? '#EF4444' : '#F59E0B' }]}>
                      <Text style={styles.statusText}>{t.status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animatable.View>
          )}
        </ScrollView>

        {/* QR Code Modal */}
        <Modal visible={qrModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Scan QR Code to Pay</Text>
              {qrData && (
                <View style={styles.qrContainer}>
                  <QRCode value={qrData.qr_code_data} size={200} backgroundColor="white" color="#8B5CF6" />
                  <Text style={styles.qrAmount}>Amount: ₹{qrData.amount}</Text>
                  <Text style={styles.qrUpi}>UPI ID: {qrData.upi_id}</Text>
                  <TouchableOpacity onPress={() => {
                    try {
                      // Attempt to open UPI URL directly
                      import('react-native').then(({ Linking }) => {
                        Linking.openURL(qrData.qr_code_data);
                      });
                    } catch {}
                  }} style={{ marginTop: 12 }}>
                    <LinearGradient colors={['#22C55E', '#16A34A']} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}>
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Open in UPI App</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={() => setQrModalVisible(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Instructions Modal */}
        <Modal visible={instructionsModalVisible} transparent={false} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { maxWidth: '100%', maxHeight: '100%' }]}>
              <Text style={styles.modalTitle}>Payment Instructions</Text>
              <Text style={styles.instructionText}>After completing payment, upload the success screenshot for verification.</Text>
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.uploadConfirmButton} onPress={uploadPaymentScreenshot} disabled={uploading}>
                  {uploading ? (<ActivityIndicator color="white" />) : (<Text style={styles.uploadConfirmText}>Upload Screenshot</Text>)}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setInstructionsModalVisible(false); setSelectedImage(null); }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ModernBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingBottom: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: Colors.primary, fontWeight: 'bold' },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  headerSubtitle: { fontSize: 16, color: 'white', textAlign: 'center', opacity: 0.9, marginTop: 5 },
  cardsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 15, marginTop: 20 },
  cardWrap: { width: '30%', marginVertical: 10 },
  card: { padding: 14, borderRadius: 16, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, height: 120, justifyContent: 'center', overflow: 'hidden' },
  cardIcon: { marginBottom: 6 },
  cardTitle: { fontSize: 12, color: 'white', textAlign: 'center', marginTop: 2, fontWeight: '600', alignSelf: 'stretch' },
  cardValue: { fontSize: 16, color: 'white', textAlign: 'center', marginTop: 4, fontWeight: 'bold', alignSelf: 'stretch' },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 30 },
  qrButton: { width: '48%', marginBottom: 12 },
  uploadButton: { width: '48%', marginBottom: 12 },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  buttonText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
  transactionsContainer: { marginHorizontal: 20, marginTop: 30, backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 15 },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  transactionInfo: { flex: 1 },
  transactionAmount: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  transactionDate: { fontSize: 12, color: Colors.lightText, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  statusText: { color: 'white', fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', maxWidth: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 20, textAlign: 'center' },
  qrContainer: { alignItems: 'center', marginBottom: 20 },
  qrAmount: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginTop: 15 },
  qrUpi: { fontSize: 14, color: Colors.lightText, marginTop: 5 },
  closeButton: { backgroundColor: Colors.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  closeButtonText: { color: 'white', fontWeight: 'bold' },
  instructionText: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 20, textAlign: 'left' },
  previewImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  uploadConfirmButton: { backgroundColor: '#10B981', flex: 1, marginRight: 10, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  uploadConfirmText: { color: 'white', fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#EF4444', flex: 1, marginLeft: 10, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: 'white', fontWeight: 'bold' },
});


