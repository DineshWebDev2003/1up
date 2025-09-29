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
import { useRouter } from 'expo-router';

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
      
      {isIncome && (
        <TouchableOpacity onPress={() => {/* Generate Invoice */}} style={styles.halfButton}>
          <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.submitButton}>
            <MaterialIcons name="receipt" size={24} color="#FFF" />
            <Text style={styles.submitButtonText}>Generate Invoice</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  </Animatable.View>
);

const HomeScreen = ({ totalIncome, totalExpense, netBalance, sharePercentage, onSharePercentageChange, isAdmin, isFranchisee, transactionProps, homeStartDate, homeEndDate, setShowHomeStartDatePicker, setShowHomeEndDatePicker, showHomeStartDatePicker, showHomeEndDatePicker, setHomeStartDate, setHomeEndDate }) => (
  <ScrollView style={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
    <View style={styles.dateRangeContainer}>
      <TouchableOpacity onPress={() => setShowHomeStartDatePicker(true)} style={styles.datePickerButton}>
        <Text>Start: {homeStartDate.toLocaleDateDateString('en-GB')}</Text>
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
          editable={isAdmin}
        />
      </Animatable.View>
    )}
  </ScrollView>
);

const RequestScreen = ({ requests, loading, loggedInUser, onUpdateRequestStatus }) => {
  const renderRequestItem = ({ item, index }) => {
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
            {loggedInUser.role === 'Admin' && item.status === 'pending' && (
              <View style={styles.adminActions}>
                <TouchableOpacity onPress={() => onUpdateRequestStatus(item.id, 'approved')} style={[styles.requestActionButton, {backgroundColor: '#4CAF50'}]}>
                  <MaterialIcons name="check-circle" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onUpdateRequestStatus(item.id, 'rejected')} style={[styles.requestActionButton, {backgroundColor: '#F44336'}]}>
                  <MaterialIcons name="cancel" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
    <FlatList
      data={requests}
      renderItem={renderRequestItem}
      keyExtractor={item => item.id.toString()}
      style={styles.tabContentContainer}
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>No fund requests found.</Text>
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
              {loggedInUser.role === 'Admin' && item.status === 'pending' && (
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

    return (
      <Animatable.View animation="fadeInUp" delay={index * 100}>
        <LinearGradient colors={item.type === 'income' ? ['#4CAF50', '#2E7D32'] : ['#FF5722', '#D84315']} style={styles.historyItem}>
          <View style={styles.historyDetails}>
            <Text style={styles.historyTitle}>{item.description}</Text>
            <Text style={styles.historyDate}>{new Date(item.transaction_date || item.date).toLocaleDateString('en-GB')} - by {item.user_name}</Text>
          </View>
          <View style={styles.historyRightContent}>
            <Text style={[styles.historyAmount, { color: '#FFF' }]}>
              {item.type === 'income' ? '+' : '-'}₹{item.amount}
            </Text>
            <View style={styles.historyActions}>
              <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}>
                <MaterialIcons name="edit" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(item)} style={styles.actionButton}>
                <MaterialIcons name="delete" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
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
  const [isRequestModalVisible, setIsRequestModalVisible] = useState(false);
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
  const [requestAmount, setRequestAmount] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [receivedBy, setReceivedBy] = useState('admin');
  const [shareEnabled, setShareEnabled] = useState(false);

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

  const combinedHistory = useMemo(() => {
    const formattedTransactions = (transactions && Array.isArray(transactions)) ? transactions.map(t => ({ ...t, dataType: 'transaction', sortDate: new Date(t.date) })) : [];
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
      fetchTransactions(selectedBranch);
      fetchRequests(selectedBranch);
    }
  }, [selectedBranch]);

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

  const fetchTransactions = async (branchId) => {
    if (!branchId) return;
    try {
      const response = await authFetch(`/api/income_expense/get_income_expense.php?branch_id=${branchId}`);
      const result = await response.json();
      setTransactions(result.success ? result.data : []);
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
    setRequestAmount('');
    setRequestDescription('');
    setIsIncome(true);
    setReceivedBy('admin');
    setShareEnabled(false);
    setIsEditMode(false);
    setCurrentTransaction(null);
    setReceivedBy('admin');
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
      const response = await authFetch('/api/income_expense/update_request.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', `Request has been ${status}.`);
        fetchRequests(selectedBranch);
        fetchTransactions(selectedBranch); // Refresh transactions as one might have been added
      } else {
        Alert.alert('Error', result.message || 'Failed to update request.');
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', error.message);
      }
    }
  };

  const generatePdf = async () => {
    try {
      // Calculate settlement details - only include transactions with sharing enabled
      const totalShareableIncome = combinedHistory
        .filter(item => item.type === 'income' && item.category !== 'admission_fee' && item.share_enabled)
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      const admissionFees = combinedHistory
        .filter(item => item.type === 'income' && item.category === 'admission_fee')
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      const totalExpenses = combinedHistory
        .filter(item => item.type === 'expense' && item.share_enabled)
        .reduce((sum, item) => sum + parseFloat(item.amount), 0);
      
      const franchiseeShare = (totalShareableIncome * sharePercentage) / 100;
      const adminShare = totalShareableIncome - franchiseeShare + admissionFees;
      
      // Expense sharing calculation (50% split example)
      const franchiseeExpenseShare = (totalExpenses * sharePercentage) / 100;
      const adminExpenseShare = totalExpenses - franchiseeExpenseShare;

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
              .header { text-align: center; margin-bottom: 20px; }
              .summary { margin-bottom: 15px; }
              .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table th, .table td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 12px; }
              .table th { background-color: #f2f2f2; }
              .income { color: green; }
              .expense { color: red; }
              .settlement { background-color: #f8f9fa; padding: 15px; border: 2px solid #007bff; margin-top: 20px; }
              .settlement h3 { margin-top: 0; color: #007bff; }
              .settlement-row { display: flex; justify-content: space-between; margin: 8px 0; }
              .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #f8f9fa; padding: 15px; border-top: 2px solid #007bff; }
              .watermark { position: absolute; top: 20px; right: 20px; opacity: 0.1; }
              .logo-watermark { width: 100px; height: 100px; }
              .summary { display: flex; justify-content: space-around; margin: 20px 0; }
              .summary-box { padding: 15px; border-radius: 10px; text-align: center; min-width: 150px; }
              .income-box { background: linear-gradient(135deg, #4CAF50, #45a049); color: white; }
              .expense-box { background: linear-gradient(135deg, #f44336, #d32f2f); color: white; }
              .balance-box { background: linear-gradient(135deg, #2196F3, #1976D2); color: white; }
              .summary-box h4 { margin: 0 0 10px 0; font-size: 14px; }
              .summary-box p { margin: 0; font-size: 18px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="watermark">
              </div>
              <h1>TNHAPPYKIDS PLAYSCHOOL</h1>
              <h2>INCOME EXPENSE REPORT</h2>
              <p>Branch: ${branches.find(b => b.id === selectedBranch)?.name || 'All Branches'}</p>
              <p>Period: ${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}</p>
            </div>
            
            <div class="summary">
              <div class="summary-box income-box">
                <h4>Total Income</h4>
                <p>INR ${totalIncome.toFixed(2)}</p>
              </div>
              <div class="summary-box expense-box">
                <h4>Total Expense</h4>
                <p>INR ${totalExpense.toFixed(2)}</p>
              </div>
              <div class="summary-box balance-box">
                <h4>Net Balance</h4>
                <p>INR ${netBalance.toFixed(2)}</p>
              </div>
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Received By</th>
                  <th>Share Enabled</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${combinedHistory.map(item => `
                  <tr>
                    <td>${new Date(item.transaction_date || item.request_date).toLocaleDateString('en-GB')}</td>
                    <td>${item.description}</td>
                    <td class="${item.type}">${item.type === 'income' ? 'Income' : 'Expense'}</td>
                    <td>${item.category || 'general'}</td>
                    <td>${item.received_by || 'N/A'}</td>
                    <td>${item.share_enabled ? 'Yes' : 'No'}</td>
                    <td>INR ${parseFloat(item.amount).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="footer">
              <div class="settlement">
                <h3>Settlement Summary</h3>
                <div class="settlement-row">
                  <strong>Total Shareable Income:</strong>
                  <span>INR ${totalShareableIncome.toFixed(2)}</span>
                </div>
                <div class="settlement-row">
                  <strong>Admission Fees (Admin Only):</strong>
                  <span>INR ${admissionFees.toFixed(2)}</span>
                </div>
                <div class="settlement-row">
                  <strong>Franchisee Share (${sharePercentage}%):</strong>
                  <span>INR ${franchiseeShare.toFixed(2)}</span>
                </div>
                <div class="settlement-row">
                  <strong>Admin Share:</strong>
                  <span>INR ${adminShare.toFixed(2)}</span>
                </div>
                <div class="settlement-row">
                  <strong>Total Expenses:</strong>
                  <span>INR ${totalExpenses.toFixed(2)}</span>
                </div>
                <div class="settlement-row">
                  <strong>Expense Split - Admin Share (${100-sharePercentage}%):</strong>
                  <span>INR ${adminExpenseShare.toFixed(2)}</span>
                </div>
                <div class="settlement-row">
                  <strong>Expense Split - Franchisee Share (${sharePercentage}%):</strong>
                  <span>INR ${franchiseeExpenseShare.toFixed(2)}</span>
                </div>
                <hr>
                <div class="settlement-row">
                  <strong>Franchisee Net Amount:</strong>
                  <span><strong>INR ${(franchiseeShare - franchiseeExpenseShare).toFixed(2)}</strong></span>
                </div>
                <div class="settlement-row">
                  <strong>Admin Net Amount:</strong>
                  <span><strong>INR ${(adminShare - adminExpenseShare).toFixed(2)}</strong></span>
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

  const handleSaveRequest = async () => {
    if (!requestAmount || !requestDescription) {
      Alert.alert('Validation Error', 'Please enter both amount and description.');
      return;
    }
    try {
      const response = await authFetch('/api/requests.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: selectedBranch,
          user_id: loggedInUser.id,
          amount: requestAmount,
          description: requestDescription,
        }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Your request has been submitted.');
        setIsRequestModalVisible(false);
        setRequestAmount('');
        setRequestDescription('');
        fetchRequests();
      } else {
        Alert.alert('Error', result.message || 'Failed to submit request.');
      }
    } catch (error) {
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', error.message);
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <ScrollView style={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryTabsContainer}>
              <SummaryCard icon="trending-up" title="Total Income" value={`₹${totalIncome.toFixed(2)}`} colors={['#4CAF50', '#2E7D32']} delay={100} />
              <SummaryCard icon="trending-down" title="Total Expense" value={`₹${totalExpense.toFixed(2)}`} colors={['#FF5722', '#D84315']} delay={200} />
              <SummaryCard icon="analytics" title="Net Balance" value={`₹${netBalance.toFixed(2)}`} colors={['#8B5CF6', '#06B6D4']} delay={300} />
            </View>
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
            {(loggedInUser?.role === 'Admin' || loggedInUser?.role === 'Franchisee') && (
              <Animatable.View animation="fadeInUp" delay={600} style={styles.sharePercentageContainer}>
                <Text style={styles.sharePercentageLabel}>Franchisee Share (%):</Text>
                <TextInput
                  style={styles.sharePercentageInput}
                  value={String(sharePercentage)}
                  onChangeText={setSharePercentage}
                  keyboardType="numeric"
                  editable={loggedInUser?.role === 'Admin'}
                />
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
        return <RequestScreen requests={requests} loading={loading} loggedInUser={loggedInUser} onUpdateRequestStatus={handleUpdateRequestStatus} />;
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
        <LinearGradient colors={['#8B5CF6', '#06B6D4']} style={styles.header}>
        <View style={styles.headerDecoration} />
          <Text style={styles.headerTitle}>Fee Details</Text>
        </LinearGradient>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
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
      <LinearGradient colors={['#8B5CF6', '#06B6D4']} style={styles.header}>
        <View style={styles.headerDecoration} />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Income & Expense</Text>
          {branchName && <Text style={styles.headerSubtitle}>{branchName}</Text>}
        </View>
      </LinearGradient>

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

      <View style={styles.tabBar}>
        {[
          { name: 'Home', icon: 'home' },
          { name: 'History', icon: 'history' },
          { name: 'Requests', icon: 'request-quote' }
        ].map(tab => (
          <TouchableOpacity key={tab.name} style={styles.tabItem} onPress={() => setActiveTab(tab.name)}>
            <MaterialIcons 
              name={tab.icon} 
              size={24} 
              color={activeTab === tab.name ? '#8B5CF6' : '#888'} 
            />
            <Text style={[styles.tabText, activeTab === tab.name && styles.activeTabText]}>{tab.name}</Text>
            {activeTab === tab.name && <Animatable.View animation="bounceIn" style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}

      {loggedInUser?.role === 'Franchisee' && (
        <TouchableOpacity style={styles.requestButton} onPress={() => setIsRequestModalVisible(true)}>
          <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.requestButtonGradient}>
            <MaterialIcons name="request-quote" size={24} color="#FFF" />
            <Text style={styles.requestButtonText}>Request Funds</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

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

      <Modal visible={isRequestModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Funds</Text>
            <TextInput style={styles.input} placeholder="Amount" value={requestAmount} onChangeText={setRequestAmount} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Description" value={requestDescription} onChangeText={setRequestDescription} />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity onPress={() => setIsRequestModalVisible(false)} style={[styles.modalButton, styles.cancelButton]}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveRequest} style={[styles.modalButton, styles.saveButton]}>
                <Text style={styles.modalButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 40,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
    position: 'relative',
    overflow: 'hidden'
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center'
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#FFF',
    marginTop: 4,
    textAlign: 'center'
  },
  lottieAnimation: {
    width: 120,
    height: 120,
    opacity: 0.3
  },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  tabBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    backgroundColor: '#FFF', 
    borderRadius: 30, 
    paddingVertical: 12, 
    marginHorizontal: 16,
    marginBottom: 20, 
    elevation: 12, 
    shadowColor: '#8B5CF6', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 12 
  },
  tabItem: { alignItems: 'center', paddingVertical: 12, flex: 1 },
  tabText: { fontSize: 12, color: '#888', marginTop: 4 },
  activeTabText: { color: '#8B5CF6', fontWeight: '600' },
  activeTabIndicator: { height: 4, width: '60%', backgroundColor: '#8B5CF6', borderRadius: 2, marginTop: 6 },
  branchSelectorContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 25, 
    paddingHorizontal: 15, 
    marginHorizontal: 16,
    marginBottom: 20, 
    elevation: 8, 
    shadowColor: '#8B5CF6', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 8 
  },
  selectorIcon: {
    marginRight: 10,
  },
  branchPicker: { flex: 1, height: 50, color: '#4F4F4F' },
  tabContentContainer: { flex: 1 },
  summaryTabsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 4 },
  summaryTab: { 
    flex: 1, 
    paddingVertical: 24, 
    paddingHorizontal: 12, 
    borderRadius: 20, 
    alignItems: 'center', 
    marginHorizontal: 4,
    elevation: 12, 
    shadowColor: '#8B5CF6', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 15,
    position: 'relative',
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
  summaryTabText: { fontSize: 14, color: '#FFF', marginTop: 6, fontWeight: '600', textAlign: 'center' },
  summaryTabValue: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginTop: 4, textAlign: 'center' },
  formContainer: { 
    backgroundColor: '#FFF', 
    borderRadius: 24, 
    padding: 24, 
    marginVertical: 20, 
    marginHorizontal: 16,
    elevation: 12, 
    shadowColor: '#8B5CF6', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 12 
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#4F4F4F', marginLeft: 10, textAlign: 'center' },
  input: { 
    backgroundColor: '#F8F9FA', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#495057'
  },
  disabledInput: { backgroundColor: '#E0E0E0', color: '#757575' },
  datePickerButton: { 
    backgroundColor: '#F8F9FA', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center', 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF'
  },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  switchLabel: { fontSize: 16, color: '#4F4F4F', marginHorizontal: 10 },
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
  requestButton: { 
    marginTop: 15, 
    marginHorizontal: 16,
    borderRadius: 20, 
    elevation: 8,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10
  },
  requestButtonGradient: {
    padding: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center'
  },
  requestButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
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
});
