import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, FlatList, Alert, Platform, Modal, Switch, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
// import LottieView from 'lottie-react-native'; // Removed to fix loading issues
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';

import authFetch from '../utils/api';
import Colors from '../constants/colors';

const SummaryCard = ({ icon, title, value, colors, delay }) => (
  <Animatable.View animation="fadeInUp" delay={delay}>
    <LinearGradient colors={colors} style={styles.summaryTab}>
      <View style={styles.summaryCardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={28} color="#FFF" />
        </View>
      </View>
      <Text style={styles.summaryTabText}>{title}</Text>
      <Text style={styles.summaryTabValue}>{value}</Text>
      <View style={styles.cardGlow} />
    </LinearGradient>
  </Animatable.View>
);

const StudentFeeScreen = ({ studentFeeData, loading }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading financial data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryTabsContainer}>
        <SummaryCard icon="receipt" title="Total Fee" value={`₹${parseFloat(studentFeeData?.total_fees || 0).toFixed(2)}`} colors={['#8B5CF6', '#06B6D4']} delay={100} />
        <SummaryCard icon="checkmark-circle" title="Amount Paid" value={`₹${parseFloat(studentFeeData?.amount_paid || 0).toFixed(2)}`} colors={['#4CAF50', '#2E7D32']} delay={200} />
        <SummaryCard icon="time" title="Pending Amount" value={`₹${parseFloat(studentFeeData?.pending_amount || 0).toFixed(2)}`} colors={['#FF9800', '#F57C00']} delay={300} />
      </View>
    </ScrollView>
  );
};

const StudentPaymentHistoryScreen = ({ payments, loading }) => {
  const renderPaymentItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" delay={index * 100}>
      <LinearGradient colors={['#8B5CF6', '#06B6D4']} style={styles.historyItem}>
        <View style={styles.historyDetails}>
          <Text style={styles.historyTitle}>Payment Received</Text>
          <Text style={styles.historyDate}>{new Date(item.payment_date).toLocaleDateString('en-GB')}</Text>
        </View>
        <View style={styles.historyRightContent}>
          <Text style={[styles.historyAmount, { color: '#FFF' }]}>
            +₹{parseFloat(item.amount).toFixed(2)}
          </Text>
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={payments}
      renderItem={renderPaymentItem}
      keyExtractor={item => item.id.toString()}
      style={styles.tabContentContainer}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyText}>No payment history found.</Text>
        </View>
      )}
    />
  );
};

const TransactionForm = ({ isIncome, onIsIncomeChange, description, onDescriptionChange, amount, onAmountChange, date, onDateChange, onShowDatePicker, showDatePicker, loggedInUser, onSave, receivedBy, onReceivedByChange, shareEnabled, onShareEnabledChange }) => (
  <Animatable.View animation="fadeInUp" delay={500} style={styles.formContainer}>
    <View style={styles.formHeader}>
      <MaterialIcons name="add-circle" size={24} color="#8B5CF6" />
      <Text style={styles.formTitle}>Add New Transaction</Text>
    </View>
    <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={onDescriptionChange} />
    <TextInput style={styles.input} placeholder="Amount" value={amount} onChangeText={onAmountChange} keyboardType="numeric" />
    <TouchableOpacity onPress={onShowDatePicker} style={styles.datePickerButton}>
      <Text>{date.toLocaleDateString('en-GB')}</Text>
    </TouchableOpacity>
    {showDatePicker && (
      <DateTimePicker
        value={date}
        mode="date"
        display="default"
        onChange={(event, selectedDate) => {
          setShowDatePicker(false);
          if (selectedDate) {
            setDate(selectedDate);
          }
        }}
      />
    )}
    <View style={styles.switchContainer}>
      <Text style={styles.switchLabel}>Expense</Text>
      <Switch value={isIncome} onValueChange={onIsIncomeChange} trackColor={{ false: '#FF85A1', true: '#90C695' }} thumbColor={'#FFF'} />
      <Text style={styles.switchLabel}>Income</Text>
    </View>
    {isIncome && (
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Received By:</Text>
        <Picker
          selectedValue={receivedBy}
          onValueChange={onReceivedByChange}
          style={styles.picker}
        >
          <Picker.Item label="Admin" value="admin" />
          <Picker.Item label="Franchisee" value="franchisee" />
        </Picker>
      </View>
    )}
    <View style={styles.switchContainer}>
      <Text style={styles.switchLabel}>Enable Sharing:</Text>
      <Switch 
        value={shareEnabled} 
        onValueChange={onShareEnabledChange} 
        trackColor={{ false: '#ccc', true: '#4CAF50' }} 
        thumbColor={'#FFF'} 
      />
      <Text style={styles.switchLabel}>{shareEnabled ? 'Yes' : 'No'}</Text>
    </View>
    <TextInput style={[styles.input, styles.disabledInput]} placeholder="Added By" value={loggedInUser?.name} editable={false} />
    <View style={styles.buttonRow}>
      <TouchableOpacity onPress={onSave} style={styles.halfButton}>
        <LinearGradient colors={['#8B5CF6', '#06B6D4']} style={styles.submitButton}>
          <MaterialIcons name="save" size={24} color="#FFF" />
          <Text style={styles.submitButtonText}>Save Transaction</Text>
        </LinearGradient>
      </TouchableOpacity>
      

    </View>
  </Animatable.View>
);

const HomeScreen = ({ totalIncome, totalExpense, netBalance, sharePercentage, onSharePercentageChange, isAdmin, isFranchisee, transactionProps, homeStartDate, homeEndDate, setShowHomeStartDatePicker, setShowHomeEndDatePicker, showHomeStartDatePicker, showHomeEndDatePicker, setHomeStartDate, setHomeEndDate }) => (
  <ScrollView style={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
    <View style={styles.dateRangeContainer}>
      <TouchableOpacity onPress={() => setShowHomeStartDatePicker(true)} style={styles.datePickerButton}>
        <Text>Start: {homeStartDate.toLocaleDateString('en-GB')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setShowHomeEndDatePicker(true)} style={styles.datePickerButton}>
        <Text>End: {homeEndDate.toLocaleDateString('en-GB')}</Text>
      </TouchableOpacity>
      {showHomeStartDatePicker && (
        <DateTimePicker
          value={homeStartDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowHomeStartDatePicker(false);
            if (selectedDate) setHomeStartDate(selectedDate);
          }}
        />
      )}
      {showHomeEndDatePicker && (
        <DateTimePicker
          value={homeEndDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowHomeEndDatePicker(false);
            if (selectedDate) setHomeEndDate(selectedDate);
          }}
        />
      )}
    </View>
    <View style={styles.summaryTabsContainer}>
      <SummaryCard icon="wallet-outline" title="Total Income" value={`INR ${totalIncome.toFixed(2)}`} colors={['#90C695', '#5D9CEC']} delay={100} />
      <SummaryCard icon="card-outline" title="Total Expense" value={`INR ${totalExpense.toFixed(2)}`} colors={['#FF85A1', '#FFD700']} delay={200} />
      <SummaryCard icon="stats-chart-outline" title="Net Balance" value={`INR ${netBalance.toFixed(2)}`} colors={['#4DB6AC', '#BA68C8']} delay={300} />
    </View>
    <TransactionForm {...transactionProps} />
    {(isAdmin || isFranchisee) && (
      <Animatable.View animation="fadeInUp" delay={600} style={styles.sharePercentageContainer}>
        <Text style={styles.sharePercentageLabel}>Franchisee Share (%):</Text>
        <TextInput
          style={styles.sharePercentageInput}
          value={String(sharePercentage)}
          onChangeText={onSharePercentageChange}
          keyboardType="numeric"
          editable={isAdmin || isFranchisee}
        />
      </Animatable.View>
    )}
  </ScrollView>
);

const RequestScreen = ({ requests, loading, loggedInUser, onUpdateRequestStatus }) => {
  const renderRequestItem = ({ item, index }) => {
    // Determine gradient colors - orange for pending
    const gradientColors = ['#f39c12', '#e67e22'];
    
    return (
      <Animatable.View animation="fadeInUp" delay={index * 100}>
        <LinearGradient colors={gradientColors} style={styles.historyItem}>
          <View style={styles.historyDetails}>
            <Text style={styles.historyTitle}>{item.description}</Text>
            <Text style={styles.historyDate}>
              {new Date(item.transaction_date || item.date || item.created_at).toLocaleDateString('en-GB')} - by {item.created_by_name || item.user_name}
            </Text>
            <Text style={[styles.statusText, { color: '#FFF', fontWeight: 'bold' }]}>
              ⏳ Pending Admin Approval
            </Text>
          </View>
          <View style={styles.historyRightContent}>
            <Text style={[styles.historyAmount, { color: '#FFF' }]}>
              {item.type === 'income' ? '+' : '-'}₹{item.amount}
            </Text>
            {loggedInUser.role === 'Admin' && (
              <View style={styles.adminActions}>
                <TouchableOpacity 
                  onPress={() => onUpdateRequestStatus(item.id, 'approved')} 
                  style={[styles.actionButton, {backgroundColor: 'rgba(46, 204, 113, 0.9)'}]}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => onUpdateRequestStatus(item.id, 'rejected')} 
                  style={[styles.actionButton, {backgroundColor: 'rgba(231, 76, 60, 0.9)'}]}
                >
                  <Ionicons name="close-circle-outline" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </LinearGradient>
      </Animatable.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading pending requests...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      renderItem={renderRequestItem}
      keyExtractor={(item, index) => `pending-${item.id}-${index}`}
      style={styles.tabContentContainer}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No pending transactions.</Text>
        </View>
      )}
    />
  );
};

const HistoryScreen = ({ historyData, onEdit, onDelete, loading, loggedInUser, onUpdateRequestStatus, onGeneratePdf, startDate, onStartDateChange, endDate, onEndDateChange, onShowStartDatePicker, onShowEndDatePicker, showStartDatePicker, showEndDatePicker }) => {
  const renderHistoryItem = ({ item, index }) => {
    if (item.dataType === 'request') {
      const statusColors = {
        pending: '#f39c12',
        approved: '#27ae60',
        rejected: '#c0392b',
      };
      return (
        <Animatable.View animation="fadeInUp" delay={index * 100}>
          <View style={[styles.historyItem, {backgroundColor: '#e9ecef'}]}>
            <View style={styles.historyDetails}>
              <Text style={styles.historyTitle}>Fund Request: {item.description}</Text>
              <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString('en-GB')} - by {item.user_name}</Text>
              <Text style={[styles.statusText, { color: statusColors[item.status] }]}>Status: {item.status}</Text>
            </View>
            <View style={styles.historyRightContent}>
              <Text style={[styles.historyAmount, { color: '#3498db' }]}>INR {item.amount}</Text>
              {loggedInUser.role === 'Admin' && item.status === 'inactive' && (
                <View style={styles.adminActions}>
                  <TouchableOpacity onPress={() => onUpdateRequestStatus(item.id, 'approved')} style={[styles.actionButton, {backgroundColor: '#2ecc71'}]}>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onUpdateRequestStatus(item.id, 'rejected')} style={[styles.actionButton, {backgroundColor: '#e74c3c'}]}>
                    <Ionicons name="close-circle-outline" size={22} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Animatable.View>
      );
    }

    // Determine gradient colors based on status
    const isRejected = item.status === 'rejected';
    const gradientColors = isRejected
      ? ['#c0392b', '#e74c3c'] // Red for rejected
      : item.type === 'income' 
        ? ['#4CAF50', '#2E7D32'] 
        : ['#FF5722', '#D84315'];

    return (
      <Animatable.View animation="fadeInUp" delay={index * 100}>
        <LinearGradient colors={gradientColors} style={styles.historyItem}>
          <View style={styles.historyDetails}>
            <Text style={styles.historyTitle}>{item.description}</Text>
            <Text style={styles.historyDate}>{new Date(item.transaction_date || item.date).toLocaleDateString('en-GB')} - by {item.created_by_name || item.user_name}</Text>
            {isRejected && (
              <Text style={[styles.statusText, { color: '#FFF', fontWeight: 'bold' }]}>❌ Rejected</Text>
            )}
          </View>
          <View style={styles.historyRightContent}>
            <Text style={[styles.historyAmount, { color: '#FFF' }]}>
              {item.type === 'income' ? '+' : '-'}₹{item.amount}
            </Text>
            {!isRejected && (
              <View style={styles.historyActions}>
                <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}>
                  <MaterialIcons name="edit" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item)} style={styles.actionButton}>
                  <MaterialIcons name="delete" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </LinearGradient>
      </Animatable.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.dateRangeContainer}>
        <TouchableOpacity onPress={() => onShowStartDatePicker(true)} style={styles.datePickerButton}>
          <Text>Start: {startDate.toLocaleDateString('en-GB')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onShowEndDatePicker(true)} style={styles.datePickerButton}>
          <Text>End: {endDate.toLocaleDateString('en-GB')}</Text>
        </TouchableOpacity>
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={onStartDateChange}
          />
        )}
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={onEndDateChange}
          />
        )}
      </View>
      <TouchableOpacity onPress={onGeneratePdf} style={{ marginVertical: 15 }}>
        <LinearGradient colors={['#8B5CF6', '#06B6D4']} style={styles.submitButton}>
          <MaterialIcons name="picture-as-pdf" size={24} color="#FFF" />
          <Text style={styles.submitButtonText}>Download PDF Report</Text>
        </LinearGradient>
      </TouchableOpacity>
      <FlatList
        data={historyData}
        renderItem={renderHistoryItem}
        keyExtractor={(item, index) => `${item.dataType || 'transaction'}-${item.id}-${index}`}
        style={styles.tabContentContainer}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📄</Text>
          </View>
        )}
      />
    </View>
  );
};

export default function IncomeExpenseScreen() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [isIncome, setIsIncome] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState(new Date());
  const [homeStartDate, setHomeStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [homeEndDate, setHomeEndDate] = useState(new Date());
  const [showHomeStartDatePicker, setShowHomeStartDatePicker] = useState(false);
  const [showHomeEndDatePicker, setShowHomeEndDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Home');
  const [sharePercentage, setSharePercentage] = useState(30);
  const [receivedBy, setReceivedBy] = useState('admin');
  const [shareEnabled, setShareEnabled] = useState(false);
  const [incomeExpenseSummary, setIncomeExpenseSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_profit: 0,
    sharing_enabled: false,
    franchisee_share_percentage: 0,
    franchisee_share_amount: 0,
    admin_share_amount: 0
  });
  const [branchFranchiseeUser, setBranchFranchiseeUser] = useState(null);

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  // Student State
  const [studentFeeData, setStudentFeeData] = useState(null);

  // Separate pending transactions from approved/rejected ones
  const pendingTransactions = useMemo(() => {
    return (transactions && Array.isArray(transactions)) 
      ? transactions.filter(t => t.status === 'pending').map(t => ({ ...t, dataType: 'transaction', sortDate: new Date(t.date) }))
      : [];
  }, [transactions]);

  const combinedHistory = useMemo(() => {
    // Only include approved and rejected transactions in history
    const formattedTransactions = (transactions && Array.isArray(transactions)) 
      ? transactions.filter(t => t.status !== 'pending').map(t => ({ ...t, dataType: 'transaction', sortDate: new Date(t.date) })) 
      : [];
    const formattedRequests = (requests && Array.isArray(requests)) ? requests.map(r => ({ ...r, dataType: 'request', sortDate: new Date(r.created_at) })) : [];
    return [...formattedTransactions, ...formattedRequests].sort((a, b) => b.sortDate - a.sortDate);
  }, [transactions, requests]);

  // Calculate totals
    const totalIncome = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return 0;
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.transaction_date || t.date);
        return t.type === 'income' && transactionDate >= homeStartDate && transactionDate <= homeEndDate;
      })
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [transactions, homeStartDate, homeEndDate]);

    const totalExpense = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return 0;
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.transaction_date || t.date);
        return t.type === 'expense' && transactionDate >= homeStartDate && transactionDate <= homeEndDate;
      })
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  }, [transactions, homeStartDate, homeEndDate]);

  const netBalance = useMemo(() => {
    return totalIncome - totalExpense;
  }, [totalIncome, totalExpense]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (!userData) {
          router.replace('/login');
          return;
        }
        const currentUser = JSON.parse(userData);
        setLoggedInUser(currentUser);
        
        console.log('👤 USER INITIALIZATION - SHARE SETTINGS DATA:');
        console.log('📊 User Role:', currentUser?.role);
        console.log('📊 User Sharing Enabled:', currentUser?.sharing_enabled);
        console.log('📊 User Franchisee Share:', currentUser?.franchisee_share);
        console.log('📊 User Branch ID:', currentUser?.branch_id);
        console.log('📊 Full User Data:', currentUser);
      } catch (error) {
        console.error('Authentication error:', error);
        router.replace('/login');
      } finally {
        setLoadingUser(false);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!loggedInUser) return;
      setLoading(true);
      try {
        if (loggedInUser.role === 'Student') {
          await fetchStudentFees();
        } else {
          const branchId = await fetchBranchesAndSetSelection();
          if (branchId) {
            await Promise.all([fetchTransactions(branchId), fetchRequests(branchId)]);
          }
        }
      } catch (error) {
        console.error("Error during data fetch sequence:", error);
        if (error.message !== 'Unauthorized') {
          Alert.alert('Error', 'An error occurred while loading data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [loggedInUser]);

  // Refetch data when selected branch changes
  useEffect(() => {
    if (loggedInUser && selectedBranch && loggedInUser.role !== 'Student') {
      fetchBranchFranchiseeUser(selectedBranch);
      fetchTransactions(selectedBranch);
      fetchRequests(selectedBranch);
    }
  }, [selectedBranch]);

  // Refresh data when screen comes into focus (e.g., returning from edit user screen)
  useFocusEffect(
    React.useCallback(() => {
      if (loggedInUser && selectedBranch && loggedInUser.role !== 'Student') {
        console.log('🔄 Screen focused - refreshing income/expense data');
        fetchBranchFranchiseeUser(selectedBranch);
        fetchTransactions(selectedBranch);
        fetchRequests(selectedBranch);
      }
    }, [loggedInUser, selectedBranch])
  );

  const fetchStudentFees = async () => {
    if (!loggedInUser?.id) return;
    // setLoading(true) is handled by the main useEffect
    try {
      const response = await authFetch(`/api/fees/get_student_fees.php?student_id=${loggedInUser.id}`);
      const result = await response.json();
      if (result.success) {
        setStudentFeeData(result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to fetch fee details.');
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') Alert.alert('API Error', error.message);
    }
    // setLoading(false) is handled by the main useEffect
  };

  const fetchBranchesAndSetSelection = async () => {
    if (!loggedInUser) return null;
    try {
      let url = '/api/branches/get_branches.php';
      if (loggedInUser.role === 'Franchisee') {
        url = `/api/branches/get_branches.php?id=${loggedInUser.branch_id}`;
      }
      const response = await authFetch(url);
      const result = await response.json();
      if (result.success) {
        const branchesData = Array.isArray(result.data) ? result.data : [result.data];
        setBranches(branchesData);
        
        let branchIdToSelect = selectedBranch;
        if (loggedInUser.role === 'Franchisee' && loggedInUser.branch_id) {
          branchIdToSelect = loggedInUser.branch_id;
        } else if (loggedInUser.role === 'Admin' && branchesData.length > 0 && !branchIdToSelect) {
          branchIdToSelect = branchesData[0].id;
        }

        if(branchIdToSelect !== selectedBranch) {
          setSelectedBranch(branchIdToSelect);
        }
        return branchIdToSelect;
      } else {
        Alert.alert('Error', 'Failed to fetch branches.');
        return null;
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', error.message);
      }
      return null;
    }
  };

  const fetchBranchFranchiseeUser = async (branchId) => {
    if (!branchId) return;
    try {
      // Fetch franchisee user for the selected branch
      const response = await authFetch(`/api/users/user_crud.php?branch_id=${branchId}&role=Franchisee`);
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        const franchiseeUser = result.data[0]; // Get first franchisee for this branch
        setBranchFranchiseeUser(franchiseeUser);
        console.log('👤 BRANCH FRANCHISEE USER LOADED:', {
          name: franchiseeUser.name,
          franchisee_share: franchiseeUser.franchisee_share,
          sharing_enabled: franchiseeUser.sharing_enabled,
          branch_id: franchiseeUser.branch_id
        });
      } else {
        setBranchFranchiseeUser(null);
        console.log('❌ No franchisee user found for branch:', branchId);
      }
    } catch (error) {
      console.error('Error fetching branch franchisee user:', error);
      setBranchFranchiseeUser(null);
    }
  };

  const fetchTransactions = async (branchId) => {
    if (!branchId) return;
    try {
      const response = await authFetch(`/api/income_expense/get_income_expense.php?branch_id=${branchId}`);
      const result = await response.json();
      setTransactions(result.success ? result.data : []);
      
      // Update income/expense summary with franchisee share data
      if (result.success && result.summary) {
        setIncomeExpenseSummary(result.summary);
        // Update share percentage from API response (fallback to branch franchisee user's actual share)
        const actualFranchiseeShare = branchFranchiseeUser?.franchisee_share || 
                                     result.summary.franchisee_share_percentage || 
                                     parseFloat(loggedInUser?.franchisee_share || 0);
        setSharePercentage(actualFranchiseeShare);
        
        console.log('🔄 FETCHING TRANSACTIONS - SHARE SETTINGS DATA:');
        console.log('📊 API Response Summary:', result.summary);
        console.log('📊 Branch Franchisee User Share:', branchFranchiseeUser?.franchisee_share);
        console.log('📊 API franchisee share:', result.summary.franchisee_share_percentage);
        console.log('📊 Logged in user share fallback:', loggedInUser?.franchisee_share);
        console.log('📊 Final calculated share percentage:', actualFranchiseeShare);
        console.log('📊 Branch Franchisee User:', branchFranchiseeUser);
        console.log('📊 Full API result:', result);
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', error.message);
      }
      setTransactions([]);
    }
  };

  const fetchRequests = async (branchId) => {
    if (!branchId) return;
    try {
      const response = await authFetch(`/api/income_expense/get_requests.php?branch_id=${branchId}`);
      const result = await response.json();
      setRequests(result.success ? result.data : []);
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', `Failed to fetch requests: ${error.message}`);
      }
      setRequests([]);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setDate(new Date());
    setIsIncome(true);
    setIsModalVisible(false);
    setReceivedBy('admin');
    setShareEnabled(false);
    setIsEditMode(false);
    setCurrentTransaction(null);
  };

  const handleSaveTransaction = async () => {
    if (!description || !amount) {
      Alert.alert('Validation Error', 'Please fill all fields.');
      return;
    }

    try {
      const response = await authFetch('/api/income_expense/add_income_expense.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: isIncome ? 'income' : 'expense',
          category: isIncome ? (description.toLowerCase().includes('admission') ? 'admission_fee' : 'fees') : 'general',
          description: description.trim(),
          amount: parseFloat(amount),
          transaction_date: date.toISOString().split('T')[0],
          payment_method: 'cash',
          received_by: isIncome ? receivedBy : null,
          share_enabled: shareEnabled,
          branch_id: selectedBranch,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchTransactions(selectedBranch);
        resetForm();
        Alert.alert('Success', 'Transaction saved successfully.');
      } else {
        Alert.alert('Error', result.message || 'Failed to save transaction.');
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', error.message);
      }
    }
  };

  const handleUpdateTransaction = async () => {
    if (!amount || !description) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    if (loggedInUser.role === 'Franchisee' && !isIncome) {
      const requestData = {
        branch_id: selectedBranch,
        user_id: loggedInUser.id,
        amount,
        description,
      };

      try {
        const response = await authFetch('/api/income_expense/add_request.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });
        const result = await response.json();

        if (result.success) {
          Alert.alert('Success', 'Expense request submitted successfully.');
          fetchRequests(); // Refresh the requests list
          resetForm();
        } else {
          Alert.alert('Error', result.message || 'Failed to submit expense request.');
        }
      } catch (error) {
        console.error('Failed to submit expense request:', error);
        Alert.alert('Error', 'An error occurred while submitting the expense request.');
      }
      return;
    }

    const payload = {
      id: currentTransaction.id,
      type: isIncome ? 'income' : 'expense',
      category: isIncome ? (description.toLowerCase().includes('admission') ? 'admission_fee' : 'fees') : 'general',
      amount: parseFloat(amount),
      description: description.trim(),
      transaction_date: date.toISOString().split('T')[0],
      payment_method: 'cash',
      branch_id: selectedBranch,
    };

    try {
      const endpoint = isEditMode ? '/api/income_expense/update_income_expense.php' : '/api/income_expense/add_income_expense.php';
      const response = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', `Transaction ${isEditMode ? 'updated' : 'added'} successfully.`);
        fetchTransactions(selectedBranch);
        resetForm();
      } else {
        Alert.alert('Error', result.message || 'Failed to save transaction.');
      }
    } catch (error) {
      console.error('Failed to save transaction:', error);
      Alert.alert('Error', 'An error occurred while saving the transaction.');
    }
  };

  const openEditModal = (transaction) => {
    setCurrentTransaction(transaction);
    setIsEditMode(true);
    setAmount(transaction.amount.toString());
    setDescription(transaction.description);
    setIsIncome(transaction.type === 'income');
    setDate(new Date(transaction.transaction_date));
    setIsModalVisible(true);
  };

  const openDeleteModal = (transaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => handleDeleteTransaction(transaction.id)
        }
      ]
    );
  };

  const handleDeleteTransaction = async (transactionId) => {
    try {
      const response = await authFetch('/api/income_expense/delete_income_expense.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transactionId }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Transaction deleted successfully.');
        fetchTransactions(selectedBranch);
      } else {
        Alert.alert('Error', result.message || 'Failed to delete transaction.');
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', error.message);
      }
    }
  };

  const handleUpdateRequestStatus = async (id, status) => {
    try {
      // Use the approve_transaction endpoint for transaction approval
      const response = await authFetch('/api/income_expense/approve_transaction.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transaction_id: id, 
          action: status === 'approved' ? 'approve' : 'reject'
        }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', `Transaction has been ${status}.`);
        fetchRequests(selectedBranch);
        fetchTransactions(selectedBranch); // Refresh transactions
      } else {
        Alert.alert('Error', result.message || 'Failed to update transaction status.');
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', error.message);
      }
    }
  };


  const generatePdf = async () => {
    try {
      // Calculate settlement details - include ALL transactions for complete money flow analysis
      const totalAllIncome = combinedHistory
        .filter(item => item.type === 'income')
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      const totalShareableIncome = combinedHistory
        .filter(item => item.type === 'income' && item.category !== 'admission_fee' && item.share_enabled)
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      const admissionFees = combinedHistory
        .filter(item => item.type === 'income' && item.category === 'admission_fee')
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      const nonShareableIncome = combinedHistory
        .filter(item => item.type === 'income' && item.category !== 'admission_fee' && !item.share_enabled)
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      const totalAllExpenses = combinedHistory
        .filter(item => item.type === 'expense')
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      const totalShareableExpenses = combinedHistory
        .filter(item => item.type === 'expense' && item.share_enabled)
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      const nonShareableExpenses = combinedHistory
        .filter(item => item.type === 'expense' && !item.share_enabled)
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      // Use the correct franchisee share percentage - same logic as UI
      const actualSharePercentage = parseFloat(
        (loggedInUser?.role === 'Admin' ? branchFranchiseeUser?.franchisee_share : loggedInUser?.franchisee_share) ||
        incomeExpenseSummary.franchisee_share_percentage || 
        sharePercentage ||
        0
      );
      
      // Determine if sharing is enabled for this branch
      const isSharingEnabled = (loggedInUser?.role === 'Admin' ? branchFranchiseeUser?.sharing_enabled : loggedInUser?.sharing_enabled) ||
                               incomeExpenseSummary.sharing_enabled;
      
      console.log('📄 PDF GENERATION - SHARE PERCENTAGE CALCULATION:');
      console.log('📊 User Role:', loggedInUser?.role);
      console.log('📊 Branch Franchisee User:', branchFranchiseeUser);
      console.log('📊 Branch Franchisee Sharing Enabled:', branchFranchiseeUser?.sharing_enabled);
      console.log('📊 Logged In User Sharing Enabled:', loggedInUser?.sharing_enabled);
      console.log('📊 API Sharing Enabled:', incomeExpenseSummary.sharing_enabled);
      console.log('📊 Final Sharing Enabled Status:', isSharingEnabled);
      console.log('📊 Branch Franchisee Share:', branchFranchiseeUser?.franchisee_share);
      console.log('📊 Logged In User Share:', loggedInUser?.franchisee_share);
      console.log('📊 API Share Percentage:', incomeExpenseSummary.franchisee_share_percentage);
      console.log('📊 State Share Percentage:', sharePercentage);
      console.log('📊 Final PDF Share Percentage:', actualSharePercentage);
      console.log('📄 PDF CALCULATION AMOUNTS:');
      console.log('💰 Total All Income:', totalAllIncome);
      console.log('💰 Total Shareable Income:', totalShareableIncome);
      console.log('💰 Non-Shareable Income:', nonShareableIncome);
      console.log('💰 Admission Fees:', admissionFees);
      console.log('💰 Total All Expenses:', totalAllExpenses);
      console.log('💰 Total Shareable Expenses:', totalShareableExpenses);
      console.log('💰 Non-Shareable Expenses:', nonShareableExpenses);
      
      // Debug individual transactions sharing status
      console.log('📄 TRANSACTION SHARING DEBUG:');
      combinedHistory.forEach((item, index) => {
        if (index < 5) { // Show first 5 transactions for debugging
          console.log(`Transaction ${index + 1}:`, {
            description: item.description,
            type: item.type,
            amount: item.amount,
            share_enabled: item.share_enabled,
            category: item.category
          });
        }
      });
      
      // Calculate net profit from shareable transactions
      const netShareableProfit = totalShareableIncome - totalShareableExpenses;
      
      // Share calculations for shareable profit
      const franchiseeShareFromProfit = (netShareableProfit * actualSharePercentage) / 100;
      const adminShareFromProfit = netShareableProfit - franchiseeShareFromProfit;
      
      // Admin gets all admission fees and non-shareable income
      const adminOnlyIncome = admissionFees + nonShareableIncome;
      
      // Overall totals
      const totalNetProfit = totalAllIncome - totalAllExpenses;
      
      // Final settlement calculation - respect sharing status
      const franchiseeFinalAmount = isSharingEnabled ? franchiseeShareFromProfit : 0;
      const adminFinalAmount = isSharingEnabled ? 
        (adminShareFromProfit + adminOnlyIncome - nonShareableExpenses) : 
        (totalNetProfit);
      
      console.log('📄 PDF FINAL CALCULATIONS:');
      console.log('🔄 Sharing Enabled:', isSharingEnabled);
      console.log('💰 Net Shareable Profit:', netShareableProfit);
      console.log('💰 Franchisee Share from Profit (if enabled):', franchiseeShareFromProfit);
      console.log('💰 Admin Share from Profit (if enabled):', adminShareFromProfit);
      console.log('💰 Admin Only Income:', adminOnlyIncome);
      console.log('💰 Total Net Profit (All Transactions):', totalNetProfit);
      console.log('💰 Franchisee Final Amount (with sharing status):', franchiseeFinalAmount);
      console.log('💰 Admin Final Amount (with sharing status):', adminFinalAmount);

      const htmlContent = `
        <html>
          <head>
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 0; 
                font-size: 12px;
                line-height: 1.4;
              }
              .page-header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 3px solid #007bff;
                padding-bottom: 20px;
              }
              .page-header h1 { 
                color: #007bff; 
                margin: 0 0 10px 0; 
                font-size: 24px;
              }
              .page-header h2 { 
                color: #333; 
                margin: 0 0 15px 0; 
                font-size: 18px;
              }
              .page-header p { 
                margin: 5px 0; 
                color: #666;
                font-size: 14px;
              }
              .summary-cards { 
                display: flex; 
                justify-content: space-around; 
                margin: 30px 0; 
                gap: 20px;
              }
              .summary-card { 
                flex: 1;
                padding: 20px; 
                border-radius: 10px; 
                text-align: center; 
                color: white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
              }
              .income-card { background: linear-gradient(135deg, #4CAF50, #45a049); }
              .expense-card { background: linear-gradient(135deg, #f44336, #d32f2f); }
              .balance-card { background: linear-gradient(135deg, #2196F3, #1976D2); }
              .summary-card h4 { 
                margin: 0 0 10px 0; 
                font-size: 14px; 
                font-weight: normal;
              }
              .summary-card .amount { 
                margin: 0; 
                font-size: 20px; 
                font-weight: bold; 
              }
              
              .transactions-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 30px 0;
                font-size: 11px;
              }
              .transactions-table th, 
              .transactions-table td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left; 
                white-space: nowrap;
              }
              .transactions-table th { 
                background-color: #f8f9fa; 
                font-weight: bold;
                color: #333;
              }
              .income-row { background-color: #f8fff8; }
              .expense-row { background-color: #fff8f8; }
              .amount-income { color: #28a745; font-weight: bold; }
              .amount-expense { color: #dc3545; font-weight: bold; }
              
              .page-break { 
                page-break-before: always; 
              }
              
              .settlement-page {
                page-break-before: always;
                padding: 20px 0;
              }
              .settlement-header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 3px solid #007bff;
                padding-bottom: 20px;
              }
              .settlement-header h1 {
                color: #007bff;
                margin: 0 0 10px 0;
                font-size: 28px;
              }
              .settlement-header h2 {
                color: #333;
                margin: 0;
                font-size: 20px;
              }
              
              .settlement-section { 
                background-color: #f8f9fa; 
                padding: 25px; 
                border: 2px solid #007bff; 
                margin: 20px 0;
                border-radius: 10px;
              }
              .settlement-section h3 { 
                margin: 0 0 20px 0; 
                color: #007bff; 
                font-size: 18px;
                text-align: center;
              }
              .settlement-section h4 {
                color: #333;
                margin: 20px 0 10px 0;
                font-size: 16px;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
              }
              .settlement-row { 
                display: flex; 
                justify-content: space-between; 
                margin: 12px 0; 
                padding: 8px 0;
                border-bottom: 1px dotted #ccc;
              }
              .settlement-row:last-child {
                border-bottom: none;
              }
              .settlement-row strong {
                font-weight: bold;
              }
              .final-settlement {
                background: linear-gradient(135deg, #6f42c1, #5a32a3);
                color: white;
                padding: 25px;
                border-radius: 10px;
                margin-top: 30px;
              }
              .final-settlement h4 {
                color: white;
                text-align: center;
                margin: 0 0 20px 0;
                font-size: 18px;
              }
              .final-settlement .settlement-row {
                border-bottom: 1px dotted rgba(255,255,255,0.3);
              }
              .highlight-amount {
                font-size: 18px;
                font-weight: bold;
              }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 80px;
                color: rgba(0,123,255,0.05);
                z-index: -1;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="watermark">TNHAPPYKIDS</div>
            
            <!-- PAGE 1: HEADER AND SUMMARY -->
            <div class="page-header">
              <h1>🏫 TNHAPPYKIDS PLAYSCHOOL</h1>
              <h2>📊 INCOME EXPENSE REPORT</h2>
              <p><strong>Branch:</strong> ${branches.find(b => b.id === selectedBranch)?.name || 'All Branches'}</p>
              <p><strong>Period:</strong> ${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}</p>
              ${branchFranchiseeUser ? `<p><strong>Franchisee:</strong> ${branchFranchiseeUser.name} (${actualSharePercentage}% Share)</p>` : ''}
              <p><strong>Sharing Status:</strong> ${isSharingEnabled ? '✅ ENABLED' : '❌ DISABLED'}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</p>
            </div>
            
            <div class="summary-cards">
              <div class="summary-card income-card">
                <h4>💰 Total Income</h4>
                <div class="amount">₹${totalAllIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
              </div>
              <div class="summary-card expense-card">
                <h4>💸 Total Expense</h4>
                <div class="amount">₹${totalAllExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
              </div>
              <div class="summary-card balance-card">
                <h4>📈 Net Profit</h4>
                <div class="amount">₹${totalNetProfit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
              </div>
            </div>
            
            <!-- TRANSACTIONS TABLE -->
            <h3 style="color: #007bff; margin: 30px 0 20px 0; font-size: 18px; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
              📋 Complete Transaction History (${combinedHistory.length} entries)
            </h3>
            
            <table class="transactions-table">
              <thead>
                <tr>
                  <th style="width: 12%;">Date</th>
                  <th style="width: 30%;">Description</th>
                  <th style="width: 10%;">Type</th>
                  <th style="width: 12%;">Category</th>
                  <th style="width: 12%;">Received By</th>
                  <th style="width: 10%;">Sharing</th>
                  <th style="width: 14%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${combinedHistory.map((item, index) => `
                  <tr class="${item.type === 'income' ? 'income-row' : 'expense-row'}">
                    <td>${new Date(item.transaction_date || item.request_date || item.date).toLocaleDateString('en-GB')}</td>
                    <td>${item.description || 'N/A'}</td>
                    <td>
                      <span style="color: ${item.type === 'income' ? '#28a745' : '#dc3545'};">
                        ${item.type === 'income' ? '📈 Income' : '📉 Expense'}
                      </span>
                    </td>
                    <td>${item.category || 'general'}</td>
                    <td>${item.received_by || 'N/A'}</td>
                    <td style="text-align: center;">
                      ${item.share_enabled ? '✅ Yes' : '❌ No'}
                    </td>
                    <td class="${item.type === 'income' ? 'amount-income' : 'amount-expense'}">
                      ${item.type === 'income' ? '+' : '-'}₹${parseFloat(item.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <!-- SETTLEMENT PAGE -->
            <div class="settlement-page">
              <div class="settlement-header">
                <h1>💼 SETTLEMENT ANALYSIS</h1>
                <h2>Complete Financial Breakdown</h2>
              </div>
              
              <div class="settlement-section">
                <h3>📊 COMPLETE FINANCIAL SUMMARY</h3>
                
                <h4 style="color: #28a745;">📈 INCOME BREAKDOWN</h4>
                <div class="settlement-row">
                  <strong>Total All Income:</strong>
                  <span><strong>₹${totalAllIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></span>
                </div>
                <div class="settlement-row">
                  <span>• Shareable Income (Regular Fees):</span>
                  <span>₹${totalShareableIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="settlement-row">
                  <span>• Admission Fees (Admin Only):</span>
                  <span>₹${admissionFees.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="settlement-row">
                  <span>• Non-Shareable Income (Admin Only):</span>
                  <span>₹${nonShareableIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                
                <h4 style="color: #dc3545;">📉 EXPENSE BREAKDOWN</h4>
                <div class="settlement-row">
                  <strong>Total All Expenses:</strong>
                  <span><strong>₹${totalAllExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></span>
                </div>
                <div class="settlement-row">
                  <span>• Shareable Expenses:</span>
                  <span>₹${totalShareableExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="settlement-row">
                  <span>• Non-Shareable Expenses (Admin Only):</span>
                  <span>₹${nonShareableExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                
                <h4 style="color: #007bff;">💰 PROFIT SHARING CALCULATION</h4>
                ${!isSharingEnabled ? `
                <div style="background: #fff3cd; border: 2px solid #ffeaa7; padding: 15px; margin: 15px 0; border-radius: 8px; text-align: center;">
                  <strong style="color: #856404;">⚠️ IMPORTANT:</strong> Profit sharing is currently <strong>DISABLED</strong> for this branch.<br>
                  All profits will be allocated to Admin account.
                </div>
                ` : ''}
                <div class="settlement-row">
                  <strong>Net Shareable Profit:</strong>
                  <span><strong>₹${netShareableProfit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></span>
                </div>
                <div class="settlement-row">
                  <span>Calculation: Shareable Income - Shareable Expenses</span>
                  <span>₹${totalShareableIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})} - ₹${totalShareableExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="settlement-row">
                  <span>Franchisee Share (${actualSharePercentage}% of shareable profit):</span>
                  <span style="color: #28a745;"><strong>₹${isSharingEnabled ? franchiseeShareFromProfit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : '0.00'}</strong></span>
                </div>
                <div class="settlement-row">
                  <span>Admin Share from Profit (${100-actualSharePercentage}% of shareable profit):</span>
                  <span style="color: #007bff;"><strong>₹${isSharingEnabled ? adminShareFromProfit.toLocaleString('en-IN', {minimumFractionDigits: 2}) : netShareableProfit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></span>
                </div>
              </div>
              
              <div class="final-settlement">
                <h4>🎯 FINAL SETTLEMENT AMOUNTS</h4>
                <div class="settlement-row">
                  <span><strong>👤 Franchisee Final Amount:</strong></span>
                  <span class="highlight-amount" style="color: #90EE90;">₹${franchiseeFinalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="settlement-row">
                  <span><strong>🏢 Admin Final Amount:</strong></span>
                  <span class="highlight-amount" style="color: #87CEEB;">₹${adminFinalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div class="settlement-row" style="border-top: 2px solid rgba(255,255,255,0.5); padding-top: 15px; margin-top: 15px;">
                  <span><strong>✅ Total Verification:</strong></span>
                  <span class="highlight-amount">₹${totalNetProfit.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 14px; opacity: 0.9;">
                  <em>This settlement reflects all transactions from ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}</em>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await shareAsync(uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF report.');
      console.error('PDF generation error:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <ScrollView style={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
            {/* Main Summary Cards */}
            <View style={styles.summaryTabsContainer}>
              <SummaryCard icon="trending-up" title="Total Income" value={`₹${incomeExpenseSummary.total_income.toLocaleString('en-IN')}`} colors={['#4CAF50', '#2E7D32']} delay={100} />
              <SummaryCard icon="trending-down" title="Total Expense" value={`₹${incomeExpenseSummary.total_expense.toLocaleString('en-IN')}`} colors={['#FF5722', '#D84315']} delay={200} />
              <SummaryCard icon="analytics" title="Net Profit" value={`₹${incomeExpenseSummary.net_profit.toLocaleString('en-IN')}`} colors={['#8B5CF6', '#06B6D4']} delay={300} />
            </View>

            {/* Share Calculation Section - Show for Admin (always) or Franchisee (when enabled) */}
            {(loggedInUser?.role === 'Admin' || 
              ((incomeExpenseSummary.sharing_enabled || loggedInUser?.sharing_enabled) && loggedInUser?.role === 'Franchisee')) && (
              <Animatable.View animation="fadeInUp" delay={400} style={styles.franchiseeShareSection}>
                <View style={styles.shareSectionHeader}>
                  <MaterialIcons name="pie-chart" size={24} color="#8B5CF6" />
                  <Text style={styles.shareSectionTitle}>
                    {loggedInUser?.role === 'Admin' 
                      ? `Profit Share Distribution (${branchFranchiseeUser?.franchisee_share || incomeExpenseSummary.franchisee_share_percentage || 'No Franchisee'}%)`
                      : `Your Profit Share (${loggedInUser?.franchisee_share || incomeExpenseSummary.franchisee_share_percentage || '0'}%)`
                    }
                  </Text>
                </View>
                
                <View style={styles.shareCardsRow}>
                  <View style={styles.shareCardSmall}>
                    <LinearGradient colors={['#11998e', '#38ef7d']} style={styles.shareCardGradient}>
                      <MaterialIcons name="account-balance-wallet" size={24} color="white" />
                      <Text style={styles.shareCardLabel}>
                        {loggedInUser?.role === 'Admin' ? 'Franchisee Share' : 'Your Share'}
                      </Text>
                      <Text style={styles.shareCardValue}>
                        ₹{(() => {
                          const userSharePercentage = parseFloat(
                            (loggedInUser?.role === 'Admin' ? branchFranchiseeUser?.franchisee_share : loggedInUser?.franchisee_share) ||
                            incomeExpenseSummary.franchisee_share_percentage || 
                            0
                          );
                          const netProfit = incomeExpenseSummary.net_profit || 0;
                          const franchiseeShare = (netProfit * userSharePercentage) / 100;
                          return franchiseeShare.toLocaleString('en-IN');
                        })()}
                      </Text>
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.shareCardSmall}>
                    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.shareCardGradient}>
                      <MaterialIcons name="business" size={24} color="white" />
                      <Text style={styles.shareCardLabel}>Admin Share</Text>
                      <Text style={styles.shareCardValue}>
                        ₹{(() => {
                          const userSharePercentage = parseFloat(
                            (loggedInUser?.role === 'Admin' ? branchFranchiseeUser?.franchisee_share : loggedInUser?.franchisee_share) ||
                            incomeExpenseSummary.franchisee_share_percentage || 
                            0
                          );
                          const netProfit = incomeExpenseSummary.net_profit || 0;
                          const franchiseeShare = (netProfit * userSharePercentage) / 100;
                          const adminShare = netProfit - franchiseeShare;
                          return adminShare.toLocaleString('en-IN');
                        })()}
                      </Text>
                    </LinearGradient>
                  </View>
                </View>

                <View style={styles.shareInfoCard}>
                  <Text style={styles.shareInfoText}>
                    💡 Your share is calculated automatically based on net profit when adding income transactions.
                  </Text>
                </View>
              </Animatable.View>
            )}

            {/* Transaction Form */}
            <TransactionForm
              isIncome={isIncome}
              onIsIncomeChange={setIsIncome}
              description={description}
              onDescriptionChange={setDescription}
              amount={amount}
              onAmountChange={setAmount}
              date={date}
              onDateChange={setDate}
              onShowDatePicker={(show, selectedDate) => {
                setShowDatePicker(show);
                if (selectedDate) setDate(selectedDate);
              }}
              showDatePicker={showDatePicker}
              loggedInUser={loggedInUser}
              onSave={isEditMode ? handleUpdateTransaction : handleSaveTransaction}
              receivedBy={receivedBy}
              onReceivedByChange={setReceivedBy}
              shareEnabled={shareEnabled}
              onShareEnabledChange={setShareEnabled}
            />

            {/* Admin/Franchisee Share Settings - Read Only Display */}
            {(loggedInUser?.role === 'Admin' || loggedInUser?.role === 'Franchisee') && (
              <Animatable.View animation="fadeInUp" delay={600} style={styles.shareSettingsContainer}>
                <View style={styles.shareSettingsHeader}>
                  <MaterialIcons name="settings" size={20} color="#8B5CF6" />
                  <Text style={styles.shareSettingsTitle}>Share Settings</Text>
                </View>
                <View style={styles.shareSettingsContent}>
                  <View style={styles.shareSettingItem}>
                    <Text style={styles.shareSettingLabel}>Sharing Enabled:</Text>
                    <Text style={[styles.shareSettingValue, { 
                      color: (
                        (loggedInUser?.role === 'Admin' ? branchFranchiseeUser?.sharing_enabled : loggedInUser?.sharing_enabled) ||
                        incomeExpenseSummary.sharing_enabled
                      ) ? '#4CAF50' : '#FF5722' 
                    }]}>
                      {(
                        (loggedInUser?.role === 'Admin' ? branchFranchiseeUser?.sharing_enabled : loggedInUser?.sharing_enabled) ||
                        incomeExpenseSummary.sharing_enabled
                      ) ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <View style={styles.shareSettingItem}>
                    <Text style={styles.shareSettingLabel}>Franchisee Share:</Text>
                    <Text style={styles.shareSettingValue}>
                      {(loggedInUser?.role === 'Admin' ? branchFranchiseeUser?.franchisee_share : loggedInUser?.franchisee_share) || 
                       incomeExpenseSummary.franchisee_share_percentage || 
                       '0'}%
                    </Text>
                  </View>
                  {loggedInUser?.role === 'Admin' && (
                    <View style={styles.shareSettingItem}>
                      <Text style={styles.shareSettingLabel}>Data Source:</Text>
                      <Text style={[styles.shareSettingValue, { fontSize: 12, color: '#666' }]}>
                        {branchFranchiseeUser ? `${branchFranchiseeUser.name} (Franchisee)` : 'API Default'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.shareSettingsNote}>
                  💡 Share settings can be modified by admin in the user management section.
                </Text>
                {/* Console log share settings data */}
                {(() => {
                  console.log('🔧 SHARE SETTINGS DATA:');
                  console.log('📊 User Role:', loggedInUser?.role);
                  console.log('📊 Branch Franchisee User:', branchFranchiseeUser);
                  console.log('📊 Branch Franchisee Share:', branchFranchiseeUser?.franchisee_share);
                  console.log('📊 Branch Franchisee Sharing Enabled:', branchFranchiseeUser?.sharing_enabled);
                  console.log('📊 User Sharing Enabled:', loggedInUser?.sharing_enabled);
                  console.log('📊 API Sharing Enabled:', incomeExpenseSummary.sharing_enabled);
                  console.log('📊 Final Sharing Enabled:', (
                    (loggedInUser?.role === 'Admin' ? branchFranchiseeUser?.sharing_enabled : loggedInUser?.sharing_enabled) ||
                    incomeExpenseSummary.sharing_enabled
                  ));
                  console.log('📊 User Franchisee Share:', loggedInUser?.franchisee_share);
                  console.log('📊 API Franchisee Share:', incomeExpenseSummary.franchisee_share_percentage);
                  console.log('📊 Final Franchisee Share:', (
                    (loggedInUser?.role === 'Admin' ? branchFranchiseeUser?.franchisee_share : loggedInUser?.franchisee_share) || 
                    incomeExpenseSummary.franchisee_share_percentage || 
                    '0'
                  ));
                  console.log('📊 Income Expense Summary:', incomeExpenseSummary);
                  console.log('📊 Share Percentage State:', sharePercentage);
                  console.log('📊 Full Logged In User Object:', loggedInUser);
                  return null;
                })()}
              </Animatable.View>
            )}
          </ScrollView>
        );
      case 'History':
        return (
          <HistoryScreen
            historyData={combinedHistory}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            loading={loading}
            loggedInUser={loggedInUser}
            onUpdateRequestStatus={handleUpdateRequestStatus}
            onGeneratePdf={generatePdf}
            startDate={startDate}
            onStartDateChange={handleStartDateChange}
            endDate={endDate}
            onEndDateChange={handleEndDateChange}
            onShowStartDatePicker={setShowStartDatePicker}
            onShowEndDatePicker={setShowEndDatePicker}
            showStartDatePicker={showStartDatePicker}
            showEndDatePicker={showEndDatePicker}
          />
        );
      case 'Requests':
        return <RequestScreen requests={pendingTransactions} loading={loading} loggedInUser={loggedInUser} onUpdateRequestStatus={handleUpdateRequestStatus} />;
      default:
        return null;
    }
  };


  if (loadingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  if (loggedInUser?.role === 'Student') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <View style={styles.headerDecoration} />
          <Text style={styles.headerTitle}>Fee Details</Text>
        </LinearGradient>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading fee data...</Text>
          </View>
        ) : studentFeeData ? (
          <StudentFeeScreen feeData={studentFeeData} />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>No fee data available.</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const branchName = branches.find(b => b.id === selectedBranch)?.name;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Clean Header Design */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="account-balance-wallet" size={28} color={Colors.primary} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Income & Expense</Text>
              {branchName && <Text style={styles.headerSubtitle}>{branchName}</Text>}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loggedInUser?.role === 'Admin' && (
        <Animatable.View animation="fadeInDown" style={styles.branchSelectorContainer}>
          <View style={styles.selectorIcon}>
            <MaterialIcons name="business" size={20} color="#8B5CF6" />
          </View>
          <Picker
            selectedValue={selectedBranch}
            onValueChange={(itemValue) => setSelectedBranch(itemValue)}
            style={styles.branchPicker}
            dropdownIconColor="#8B5CF6"
          >
            {(branches && Array.isArray(branches)) ? branches.map(branch => (
              <Picker.Item key={branch.id} label={branch.name} value={branch.id} />
            )) : null}
          </Picker>
        </Animatable.View>
      )}

      {/* Enhanced Tab Design */}
      <View style={styles.tabContainer}>
        {[
          { name: 'Home', icon: 'home', label: 'Overview' },
          { name: 'History', icon: 'history', label: 'History' },
          { name: 'Requests', icon: 'request-quote', label: 'Requests' }
        ].map(tab => (
          <TouchableOpacity 
            key={tab.name} 
            style={[styles.tabItem, activeTab === tab.name && styles.activeTabItem]} 
            onPress={() => setActiveTab(tab.name)}
            activeOpacity={0.8}
          >
            <MaterialIcons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.name ? Colors.white : Colors.primary} 
            />
            <Text style={[styles.tabText, activeTab === tab.name && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}

      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditMode ? 'Edit' : 'Add'} Transaction</Text>
            <TransactionForm
              isIncome={isIncome}
              onIsIncomeChange={setIsIncome}
              description={description}
              onDescriptionChange={setDescription}
              amount={amount}
              onAmountChange={setAmount}
              date={date}
              onDateChange={setDate}
              onShowDatePicker={(show, newDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (newDate) setDate(newDate);
              }}
              showDatePicker={showDatePicker}
              loggedInUser={loggedInUser}
              onSave={isEditMode ? handleUpdateTransaction : handleSaveTransaction}
            />
            <TouchableOpacity onPress={() => { setIsModalVisible(false); resetForm(); }} style={[styles.modalButton, styles.cancelButton]}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  headerTextContainer: {
    marginLeft: 12
  },
  headerDecoration: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  lottieAnimation: {
    width: 120,
    height: 120,
    opacity: 0.3
  },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 25,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8
  },
  activeTabItem: {
    backgroundColor: Colors.primary
  },
  tabText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500'
  },
  activeTabText: {
    color: Colors.white,
    fontWeight: '600'
  },
  branchSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border
  },
  selectorIcon: {
    marginRight: 10,
  },
  branchPicker: { flex: 1, height: 50, color: Colors.text },
  tabContentContainer: { flex: 1 },
  summaryTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 8
  },
  summaryTab: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden'
  },
  summaryCardHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryTabText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center'
  },
  summaryTabValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 4,
    textAlign: 'center'
  },
  formContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginVertical: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 10
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text
  },
  disabledInput: { backgroundColor: '#E0E0E0', color: '#757575' },
  datePickerButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12
  },
  switchLabel: {
    fontSize: 16,
    color: Colors.text,
    marginHorizontal: 12,
    fontWeight: '500'
  },
  dateRangeContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  submitButton: { 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    elevation: 8, 
    shadowColor: '#8B5CF6', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12,
    marginTop: 10
  },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  sharePercentageContainer: { marginTop: 20, padding: 15, backgroundColor: '#FFF', borderRadius: 15, elevation: 2 },
  sharePercentageLabel: { fontSize: 16, fontWeight: '600', color: '#4F4F4F', marginBottom: 10 },
  sharePercentageInput: { fontSize: 16, padding: 10, backgroundColor: '#F5F5F5', borderRadius: 10 },
  pickerContainer: { 
    backgroundColor: '#F5F5F5', 
    borderRadius: 10, 
    marginBottom: 10, 
    paddingHorizontal: 10 
  },
  pickerLabel: { 
    fontSize: 16, 
    color: '#4F4F4F', 
    marginBottom: 5, 
    fontWeight: '600' 
  },
  picker: { 
    height: 50, 
    color: '#4F4F4F' 
  },
  historyItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    borderRadius: 20, 
    marginBottom: 16, 
    marginHorizontal: 4,
    elevation: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 10 
  },
  historyDetails: { flex: 1 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  historyDate: { fontSize: 12, color: '#FFF', opacity: 0.8, marginTop: 4 },
  historyRightContent: { alignItems: 'flex-end' },
  historyAmount: { fontSize: 18, fontWeight: 'bold' },
  historyActions: { flexDirection: 'row', marginTop: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyLottie: { width: 200, height: 200 },
  emptyText: { marginTop: 20, fontSize: 18, color: '#999' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { 
    width: '90%', 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 30, 
    elevation: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#2D3748', 
    marginBottom: 25, 
    textAlign: 'center',
    letterSpacing: 0.5
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: '#E0E0E0', marginRight: 10 },
  saveButton: { backgroundColor: '#5D9CEC' },
  modalButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  statusText: { fontSize: 14, fontWeight: 'bold', marginTop: 5 },
  adminActions: { flexDirection: 'row', marginTop: 8 },
  actionButton: { 
    padding: 10, 
    borderRadius: 20, 
    marginLeft: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  requestActionButton: {
    padding: 8,
    borderRadius: 15,
    marginLeft: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  halfButton: {
    flex: 1,
  },
  
  // Franchisee Share Section Styles
  franchiseeShareSection: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  shareSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  shareSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 12,
    flex: 1
  },
  shareCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16
  },
  shareCardSmall: {
    flex: 1,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  shareCardGradient: {
    borderRadius: 12,
    padding: 16,
    minHeight: 90,
    justifyContent: 'center',
    alignItems: 'center'
  },
  shareCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginVertical: 6,
  },
  shareCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  shareInfoCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary
  },
  shareInfoText: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Share Settings Styles
  shareSettingsContainer: {
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  shareSettingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  shareSettingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginLeft: 8,
  },
  shareSettingsContent: {
    gap: 12,
    marginBottom: 16,
  },
  shareSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  shareSettingLabel: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  shareSettingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  shareSettingsNote: {
    fontSize: 12,
    color: '#6C757D',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
