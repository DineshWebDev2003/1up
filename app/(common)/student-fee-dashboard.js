import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullScreenSafeView } from '../components/FullScreenView';
import Colors from '../constants/colors';
import authFetch from '../utils/api';

export default function StudentFeeDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const studentId = params.student_id;

  useEffect(() => {
    loadCurrentUser();
    fetchFeeData();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchFeeData = async () => {
    try {
      const url = studentId 
        ? `/api/fees/unified_fees.php?student_id=${studentId}`
        : '/api/fees/unified_fees.php';
        
      const response = await authFetch(url);
      const result = await response.json();
      
      if (result.success) {
        setFeeData(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to fetch fee data');
      }
    } catch (error) {
      console.error('Error fetching fee data:', error);
      Alert.alert('Error', 'Failed to fetch fee data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeeData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'partial': return Colors.warning;
      case 'pending': return Colors.danger;
      default: return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return 'check-circle';
      case 'partial': return 'clock-outline';
      case 'pending': return 'alert-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const renderFeeRecord = (record, index) => (
    <Animatable.View 
      key={record.id} 
      animation="fadeInUp" 
      delay={index * 100}
      style={styles.feeRecord}
    >
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <Text style={styles.recordType}>{record.fee_type.toUpperCase()}</Text>
          <Text style={styles.recordDate}>Due: {formatDate(record.due_date)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) }]}>
          <MaterialCommunityIcons 
            name={getStatusIcon(record.status)} 
            size={16} 
            color={Colors.white} 
          />
          <Text style={styles.statusText}>{record.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.recordAmounts}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>{formatCurrency(record.amount)}</Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amountValue, { color: Colors.success }]}>
            {formatCurrency(record.paid_amount)}
          </Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>Pending</Text>
          <Text style={[styles.amountValue, { color: Colors.danger }]}>
            {formatCurrency(record.pending_amount)}
          </Text>
        </View>
      </View>
      
      {record.pending_amount > 0 && (
        <TouchableOpacity 
          style={styles.payButton}
          onPress={() => {
            // Navigate to payment screen
            router.push({
              pathname: '/(common)/fee-payment',
              params: { 
                fee_id: record.id,
                amount: record.pending_amount,
                student_name: feeData.student_info.name
              }
            });
          }}
        >
          <MaterialCommunityIcons name="credit-card" size={16} color={Colors.white} />
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}
    </Animatable.View>
  );

  if (loading) {
    return (
      <FullScreenSafeView backgroundColor={Colors.background}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={48} color={Colors.primary} />
          <Text style={styles.loadingText}>Loading fee details...</Text>
        </View>
      </FullScreenSafeView>
    );
  }

  if (!feeData) {
    return (
      <FullScreenSafeView backgroundColor={Colors.background}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={Colors.danger} />
          <Text style={styles.errorText}>No fee data available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchFeeData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </FullScreenSafeView>
    );
  }

  return (
    <FullScreenSafeView backgroundColor={Colors.background}>
      {/* Header */}
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Fee Details</Text>
          <Text style={styles.headerSubtitle}>{feeData.student_info.name}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <MaterialCommunityIcons name="refresh" size={24} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Student Info Card */}
        <Animatable.View animation="fadeInDown" style={styles.studentCard}>
          <View style={styles.studentHeader}>
            <MaterialCommunityIcons name="account-circle" size={48} color={Colors.primary} />
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{feeData.student_info.name}</Text>
              <Text style={styles.studentId}>ID: {feeData.student_info.student_id}</Text>
              <Text style={styles.studentClass}>
                {feeData.student_info.class} - {feeData.student_info.section}
              </Text>
              <Text style={styles.studentBranch}>{feeData.student_info.branch_name}</Text>
            </View>
          </View>
        </Animatable.View>

        {/* Fee Summary Cards */}
        <View style={styles.summaryContainer}>
          <Animatable.View animation="fadeInLeft" delay={200} style={styles.summaryCard}>
            <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.summaryGradient}>
              <MaterialCommunityIcons name="currency-inr" size={32} color={Colors.white} />
              <Text style={styles.summaryAmount}>{formatCurrency(feeData.fee_summary.total_fees)}</Text>
              <Text style={styles.summaryLabel}>Total Fees</Text>
            </LinearGradient>
          </Animatable.View>

          <Animatable.View animation="fadeInUp" delay={300} style={styles.summaryCard}>
            <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.summaryGradient}>
              <MaterialCommunityIcons name="check-circle" size={32} color={Colors.white} />
              <Text style={styles.summaryAmount}>{formatCurrency(feeData.fee_summary.amount_paid)}</Text>
              <Text style={styles.summaryLabel}>Amount Paid</Text>
            </LinearGradient>
          </Animatable.View>

          <Animatable.View animation="fadeInRight" delay={400} style={styles.summaryCard}>
            <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.summaryGradient}>
              <MaterialCommunityIcons name="clock-outline" size={32} color={Colors.white} />
              <Text style={styles.summaryAmount}>{formatCurrency(feeData.fee_summary.pending_amount)}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </LinearGradient>
          </Animatable.View>
        </View>

        {/* Payment Status */}
        <Animatable.View animation="fadeInUp" delay={500} style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons 
              name={getStatusIcon(feeData.fee_summary.payment_status)} 
              size={24} 
              color={getStatusColor(feeData.fee_summary.payment_status)} 
            />
            <Text style={[styles.statusTitle, { color: getStatusColor(feeData.fee_summary.payment_status) }]}>
              Payment Status: {feeData.fee_summary.payment_status.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.statusDetails}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Installments Paid</Text>
              <Text style={styles.statusValue}>
                {feeData.fee_summary.paid_installments} / {feeData.fee_summary.total_installments}
              </Text>
            </View>
            
            {feeData.fee_summary.next_due_date && (
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Next Due Date</Text>
                <Text style={styles.statusValue}>{formatDate(feeData.fee_summary.next_due_date)}</Text>
              </View>
            )}
            
            {feeData.fee_summary.last_payment_date && (
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Last Payment</Text>
                <Text style={styles.statusValue}>{formatDate(feeData.fee_summary.last_payment_date)}</Text>
              </View>
            )}
          </View>
        </Animatable.View>

        {/* Fee Records */}
        <Animatable.View animation="fadeInUp" delay={600} style={styles.recordsContainer}>
          <Text style={styles.recordsTitle}>Fee Records</Text>
          {feeData.fee_records.length > 0 ? (
            feeData.fee_records.map((record, index) => renderFeeRecord(record, index))
          ) : (
            <View style={styles.noRecords}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.noRecordsText}>No fee records found</Text>
            </View>
          )}
        </Animatable.View>

        {/* Action Buttons */}
        {feeData.fee_summary.pending_amount > 0 && (
          <Animatable.View animation="fadeInUp" delay={700} style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.payAllButton}
              onPress={() => {
                router.push({
                  pathname: '/(common)/fee-payment',
                  params: { 
                    student_id: feeData.student_info.user_id,
                    amount: feeData.fee_summary.pending_amount,
                    student_name: feeData.student_info.name,
                    payment_type: 'full'
                  }
                });
              }}
            >
              <LinearGradient colors={Colors.gradientPrimary} style={styles.payAllGradient}>
                <MaterialCommunityIcons name="credit-card" size={24} color={Colors.white} />
                <Text style={styles.payAllText}>Pay All Pending ({formatCurrency(feeData.fee_summary.pending_amount)})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        )}
      </ScrollView>
    </FullScreenSafeView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  studentCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentDetails: {
    marginLeft: 16,
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  studentId: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  studentClass: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  studentBranch: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 16,
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.white,
    marginTop: 4,
    opacity: 0.9,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusDetails: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recordsContainer: {
    marginVertical: 8,
  },
  recordsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  feeRecord: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  recordDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
    marginLeft: 4,
  },
  recordAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountItem: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  payButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  noRecords: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noRecordsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  actionContainer: {
    paddingVertical: 16,
  },
  payAllButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  payAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  payAllText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
