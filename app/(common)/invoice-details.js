import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useLocalSearchParams } from 'expo-router';
import authFetch from '../utils/api';
import Colors from '../constants/colors';

const { width, height } = Dimensions.get('window');

export default function InvoiceDetailsScreen() {
  const { id: feeId } = useLocalSearchParams();
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (feeId) {
      loadFeeDetails();
    }
  }, [feeId]);

  const loadFeeDetails = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/fees/fee_management.php?action=student_fees&student_id=${feeId}`);
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setFee(result.data[0]);
        setEditData({
          payer_name: result.data[0].payer_name || '',
          payer_phone: result.data[0].payer_phone || '',
          payer_email: result.data[0].payer_email || '',
          notes: result.data[0].notes || '',
        });
      } else {
        Alert.alert('Error', 'Fee details not found');
      }
    } catch (error) {
      console.error('Error loading fee details:', error);
      Alert.alert('Error', 'Failed to load fee details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fee) return;

    try {
      const response = await authFetch('/api/fees/fee_management.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          fee_id: fee.id,
          payer_name: editData.payer_name,
          payer_phone: editData.payer_phone,
          payer_email: editData.payer_email,
          notes: editData.notes,
        })
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Invoice details updated successfully');
        setEditing(false);
        loadFeeDetails();
      } else {
        Alert.alert('Error', result.message || 'Failed to update invoice details');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      Alert.alert('Error', 'Failed to update invoice details');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'pending': return Colors.warning;
      case 'overdue': return Colors.danger;
      case 'cancelled': return Colors.textSecondary;
      default: return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return 'check-circle';
      case 'pending': return 'clock';
      case 'overdue': return 'alert-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getVerificationColor = (status) => {
    switch (status) {
      case 'verified': return Colors.success;
      case 'pending': return Colors.warning;
      case 'rejected': return Colors.danger;
      default: return Colors.textSecondary;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading invoice details...</Text>
      </View>
    );
  }

  if (!fee) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={Colors.danger} />
        <Text style={styles.errorText}>Invoice not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <Text style={styles.headerTitle}>Invoice Details</Text>
        <Text style={styles.headerSubtitle}>Fee Invoice #{fee.id}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Invoice Header */}
        <Animatable.View animation="fadeInUp" duration={600} style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <View style={styles.invoiceTitleContainer}>
              <Text style={styles.invoiceTitle}>Fee Invoice</Text>
              <Text style={styles.invoiceNumber}>#{fee.id}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(fee.status) }]}>
              <Ionicons name={getStatusIcon(fee.status)} size={16} color="white" />
              <Text style={styles.statusText}>{fee.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.invoiceInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Issue Date:</Text>
              <Text style={styles.infoValue}>{formatDate(fee.created_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Due Date:</Text>
              <Text style={[styles.infoValue, fee.status === 'overdue' && styles.overdueText]}>
                {formatDate(fee.due_date)}
              </Text>
            </View>
            {fee.paid_date && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Paid Date:</Text>
                <Text style={styles.infoValue}>{formatDate(fee.paid_date)}</Text>
              </View>
            )}
          </View>
        </Animatable.View>

        {/* Student Information */}
        <Animatable.View animation="fadeInUp" duration={600} delay={100} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.studentInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Student Name:</Text>
              <Text style={styles.infoValue}>{fee.student_name}</Text>
            </View>
            {fee.fee_category !== 'admission' && fee.student_number && fee.student_number !== '0' && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Student ID:</Text>
                <Text style={styles.infoValue}>{fee.student_number}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Branch:</Text>
              <Text style={styles.infoValue}>{fee.branch_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Guardian Name:</Text>
              <Text style={styles.infoValue}>{fee.guardian_name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Guardian Phone:</Text>
              <Text style={styles.infoValue}>{fee.guardian_phone || 'N/A'}</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Fee Details */}
        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Fee Details</Text>
          <View style={styles.feeDetails}>
            <View style={styles.feeItem}>
              <Text style={styles.feeItemName}>{fee.fee_name}</Text>
              <Text style={styles.feeItemDescription}>{fee.fee_description}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Amount:</Text>
              <Text style={styles.amountValue}>{formatCurrency(fee.amount)}</Text>
            </View>
            {fee.paid_amount > 0 && (
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Paid Amount:</Text>
                <Text style={[styles.amountValue, { color: Colors.success }]}>
                  {formatCurrency(fee.paid_amount)}
                </Text>
              </View>
            )}
            {fee.paid_amount < fee.amount && (
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Outstanding:</Text>
                <Text style={[styles.amountValue, { color: Colors.danger }]}>
                  {formatCurrency(fee.amount - fee.paid_amount)}
                </Text>
              </View>
            )}
          </View>
        </Animatable.View>

        {/* Payment Information */}
        <Animatable.View animation="fadeInUp" duration={600} delay={300} style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(!editing)}
            >
              <Ionicons name={editing ? "checkmark" : "pencil"} size={16} color={Colors.primary} />
              <Text style={styles.editButtonText}>
                {editing ? "Save" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.paymentInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Method:</Text>
              <Text style={styles.infoValue}>{fee.payment_method || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transaction ID:</Text>
              <Text style={styles.infoValue}>{fee.transaction_id || 'N/A'}</Text>
            </View>
            
            {editing ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payer Name:</Text>
                  <TextInput
                    style={styles.input}
                    value={editData.payer_name}
                    onChangeText={(text) => setEditData({...editData, payer_name: text})}
                    placeholder="Enter payer name"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payer Phone:</Text>
                  <TextInput
                    style={styles.input}
                    value={editData.payer_phone}
                    onChangeText={(text) => setEditData({...editData, payer_phone: text})}
                    placeholder="Enter payer phone number"
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payer Email:</Text>
                  <TextInput
                    style={styles.input}
                    value={editData.payer_email}
                    onChangeText={(text) => setEditData({...editData, payer_email: text})}
                    placeholder="Enter payer email"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes:</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editData.notes}
                    onChangeText={(text) => setEditData({...editData, notes: text})}
                    placeholder="Additional notes"
                    multiline
                    numberOfLines={3}
                  />
                </View>
                {editing && (
                  <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payer Name:</Text>
                  <Text style={styles.infoValue}>{fee.payer_name || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payer Phone:</Text>
                  <Text style={styles.infoValue}>{fee.payer_phone || 'N/A'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Payer Email:</Text>
                  <Text style={styles.infoValue}>{fee.payer_email || 'N/A'}</Text>
                </View>
                {fee.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{fee.notes}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </Animatable.View>

        {/* Payment Proof */}
        {fee.payment_proof_url && (
          <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payment Proof</Text>
            <View style={styles.proofContainer}>
              <Image
                source={{ uri: `https://your-domain.com${fee.payment_proof_url}` }}
                style={styles.proofImage}
                resizeMode="contain"
              />
            </View>
          </Animatable.View>
        )}

        {/* Verification Status */}
        {fee.verification_status && (
          <Animatable.View animation="fadeInUp" duration={600} delay={500} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Verification Status</Text>
            <View style={styles.verificationContainer}>
              <View style={[styles.verificationBadge, { backgroundColor: getVerificationColor(fee.verification_status) }]}>
                <Ionicons name="shield-checkmark" size={16} color="white" />
                <Text style={styles.verificationText}>{fee.verification_status.toUpperCase()}</Text>
              </View>
              {fee.verified_at && (
                <Text style={styles.verificationDate}>
                  Verified on: {formatDate(fee.verified_at)}
                </Text>
              )}
            </View>
          </Animatable.View>
        )}

        {/* QR Code */}
        {fee.qr_code_data && fee.status === 'pending' && (
          <Animatable.View animation="fadeInUp" duration={600} delay={600} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payment QR Code</Text>
            <View style={styles.qrContainer}>
              <View style={styles.qrCodePlaceholder}>
                <Ionicons name="qr-code" size={80} color={Colors.primary} />
                <Text style={styles.qrCodeText}>Scan to Pay</Text>
              </View>
              <TouchableOpacity
                style={styles.paymentButton}
                onPress={() => {
                  // Open payment URL
                  Alert.alert('Payment', 'Opening payment link...');
                }}
              >
                <Ionicons name="link" size={20} color="white" />
                <Text style={styles.paymentButtonText}>Open Payment Link</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.danger,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  invoiceCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  invoiceTitleContainer: {
    flex: 1,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  invoiceNumber: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  invoiceInfo: {
    gap: 10,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  studentInfo: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  overdueText: {
    color: Colors.danger,
    fontWeight: 'bold',
  },
  feeDetails: {
    gap: 15,
  },
  feeItem: {
    marginBottom: 10,
  },
  feeItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  feeItemDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  amountLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  paymentInfo: {
    gap: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 10,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  proofContainer: {
    alignItems: 'center',
  },
  proofImage: {
    width: width - 80,
    height: 200,
    borderRadius: 8,
  },
  verificationContainer: {
    alignItems: 'center',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  verificationText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  verificationDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCodePlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: Colors.background,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  qrCodeText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  paymentButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
});
