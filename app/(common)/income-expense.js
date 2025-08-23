import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, FlatList, Alert, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

// Mock Data
const mockBranches = ['Main Branch', 'North Branch', 'South Branch'];

const mockHistoryData = [
  { id: '1', date: '2023-10-26', title: 'Student Fees', type: 'Income', amount: '₹5,000', addedBy: 'Franchisee', branch: 'Main Branch' },
  { id: '2', date: '2023-10-25', title: 'Office Supplies', type: 'Expense', amount: '₹1,200', addedBy: 'Administration', branch: 'North Branch' },
  { id: '3', date: '2023-10-24', title: 'New Admissions', type: 'Income', amount: '₹15,000', addedBy: 'Franchisee', branch: 'South Branch' },
  { id: '4', date: '2023-10-23', title: 'Electricity Bill', type: 'Expense', amount: '₹3,500', addedBy: 'Administration', branch: 'Main Branch' },
];

const mockRequestsData = [
  { id: '1', date: '2023-10-26', title: 'Purchase new chairs', amount: '₹8,000', requestedBy: 'Franchisee A', branch: 'North Branch', type: 'Expense' },
  { id: '2', date: '2023-10-25', title: 'Marketing Campaign', amount: '₹15,000', requestedBy: 'Franchisee B', branch: 'Main Branch', type: 'Expense' },
];

// Home Screen Component
const HomeScreen = ({ branches, selectedBranch, onSelectBranch }) => {
  const [transactionType, setTransactionType] = useState('income');
  const [shareWithFranchisee, setShareWithFranchisee] = useState(true);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [receivedBy, setReceivedBy] = useState('Franchisee');
  const [activeSummaryTab, setActiveSummaryTab] = useState('Income');

  return (
    <ScrollView style={styles.homeContainer}>
      <View style={styles.branchSelectorContainer}>
        <Ionicons name="git-branch-outline" size={22} color="#666" style={styles.inputIcon} />
        <TextInput style={styles.input} value={selectedBranch} editable={false} />
        <TouchableOpacity onPress={() => Alert.alert('Select Branch', 'Choose a branch', branches.map(branch => ({ text: branch, onPress: () => onSelectBranch(branch) })))}>
          <Ionicons name="chevron-down-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryTabsContainer}>
        <TouchableOpacity style={[styles.summaryTab, activeSummaryTab === 'Income' && styles.activeSummaryTab, {backgroundColor: activeSummaryTab === 'Income' ? '#28a745' : '#fff'}]} onPress={() => setActiveSummaryTab('Income')}>
          <Ionicons name="wallet-outline" size={24} color={activeSummaryTab === 'Income' ? '#fff' : '#28a745'} />
          <Text style={[styles.summaryTabText, activeSummaryTab === 'Income' && styles.activeSummaryTabText]}>Total Income</Text>
          <Text style={[styles.summaryTabValue, activeSummaryTab === 'Income' && styles.activeSummaryTabText]}>₹1,50,000</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.summaryTab, activeSummaryTab === 'Expense' && styles.activeSummaryTab, {backgroundColor: activeSummaryTab === 'Expense' ? '#dc3545' : '#fff'}]} onPress={() => setActiveSummaryTab('Expense')}>
          <Ionicons name="card-outline" size={24} color={activeSummaryTab === 'Expense' ? '#fff' : '#dc3545'} />
          <Text style={[styles.summaryTabText, activeSummaryTab === 'Expense' && styles.activeSummaryTabText]}>Total Expense</Text>
          <Text style={[styles.summaryTabValue, activeSummaryTab === 'Expense' && styles.activeSummaryTabText]}>₹45,000</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.summaryTab, activeSummaryTab === 'Net' && styles.activeSummaryTab, {backgroundColor: activeSummaryTab === 'Net' ? '#007bff' : '#fff'}]} onPress={() => setActiveSummaryTab('Net')}>
          <Ionicons name="analytics-outline" size={24} color={activeSummaryTab === 'Net' ? '#fff' : '#007bff'} />
          <Text style={[styles.summaryTabText, activeSummaryTab === 'Net' && styles.activeSummaryTabText]}>Net Amount</Text>
          <Text style={[styles.summaryTabValue, activeSummaryTab === 'Net' && styles.activeSummaryTabText]}>₹1,05,000</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.transactionContainer}>
        <Text style={styles.transactionTitle}>Add Transaction</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="document-text-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="cash-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        </View>
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={[styles.transactionButton, transactionType === 'income' && styles.incomeActive]} onPress={() => setTransactionType('income')}>
            <Ionicons name="add-circle-outline" size={20} color={transactionType === 'income' ? '#fff' : '#28a745'} />
            <Text style={[styles.buttonText, transactionType === 'income' && styles.activeButtonText]}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.transactionButton, transactionType === 'expense' && styles.expenseActive]} onPress={() => setTransactionType('expense')}>
            <Ionicons name="remove-circle-outline" size={20} color={transactionType === 'expense' ? '#fff' : '#dc3545'} />
            <Text style={[styles.buttonText, transactionType === 'expense' && styles.activeButtonText]}>Expense</Text>
          </TouchableOpacity>
        </View>
        {transactionType === 'income' && (
          <View style={styles.receivedByContainer}>
            <Text style={styles.receivedByTitle}>Received By:</Text>
            <View style={styles.receivedByOptions}>
              <TouchableOpacity onPress={() => setReceivedBy('Franchisee')} style={[styles.radioOption, receivedBy === 'Franchisee' && styles.radioSelected]}><Text style={[styles.receivedByText, receivedBy === 'Franchisee' && styles.radioSelectedText]}>Franchisee</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setReceivedBy('Administration')} style={[styles.radioOption, receivedBy === 'Administration' && styles.radioSelected]}><Text style={[styles.receivedByText, receivedBy === 'Administration' && styles.radioSelectedText]}>Administration</Text></TouchableOpacity>
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.checkboxContainer} onPress={() => setShareWithFranchisee(!shareWithFranchisee)}>
          <Ionicons name={shareWithFranchisee ? 'checkbox' : 'square-outline'} size={24} color="#007bff" />
          <Text style={styles.checkboxLabel}>Share with Franchisee</Text>
        </TouchableOpacity>
        {shareWithFranchisee && <View style={styles.franchiseeShareContainer}><Text>Franchisee Share: 85%</Text></View>}
        <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput style={[styles.input, { backgroundColor: '#f0f0f0' }]} value="Added by: Administration" editable={false} />
        </View>
        <TouchableOpacity style={styles.submitButton}>
            <Ionicons name="add-circle" size={22} color="#fff" />
            <Text style={styles.submitButtonText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// History Screen Component
const HistoryScreen = ({ selectedBranch }) => {
  const [startDate, setStartDate] = useState(new Date('2023-10-01'));
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerFor, setDatePickerFor] = useState('start');
    
  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || (datePickerFor === 'start' ? startDate : endDate);
    setShowDatePicker(Platform.OS === 'ios');
    if (datePickerFor === 'start') {
      setStartDate(currentDate);
    } else {
      setEndDate(currentDate);
    }
  };

  const showDatepicker = (pickerFor) => {
    setShowDatePicker(true);
    setDatePickerFor(pickerFor);
  };

  const filteredHistory = mockHistoryData.filter(item => {
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return item.branch === selectedBranch && itemDate >= start && itemDate <= end;
  });

  const calculateSettlement = () => {
    let franchiseeIncome = 0;
    let adminIncome = 0;

    filteredHistory.forEach(item => {
      const amount = parseFloat(item.amount.replace('₹', '').replace(',', ''));
      if (item.addedBy === 'Franchisee' && item.type === 'Income') {
        franchiseeIncome += amount;
      } else if (item.addedBy === 'Administration' && item.type === 'Income') {
        adminIncome += amount;
      }
    });

    const share = 0.50;
    const franchiseeShare = adminIncome * share;
    const adminShare = franchiseeIncome * share;

    if (franchiseeShare > adminShare) {
      return `Administrator owes Franchisee ₹${(franchiseeShare - adminShare).toFixed(2)}`;
    } else if (adminShare > franchiseeShare) {
      return `Franchisee owes Administrator ₹${(adminShare - franchiseeShare).toFixed(2)}`;
    } else {
      return 'No settlement required.';
    }
  };

      const createPdf = async () => {
    const html = `
      <html>
        <body>
          <h1>History Report for ${selectedBranch}</h1>
          <h2>From ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}</h2>
          <table border="1" style="width:100%; border-collapse: collapse;">
            <tr>
              <th style="padding: 8px;">Date</th>
              <th style="padding: 8px;">Title</th>
              <th style="padding: 8px;">Type</th>
              <th style="padding: 8px;">Amount</th>
              <th style="padding: 8px;">Added By</th>
            </tr>
            ${filteredHistory.map(item => `
              <tr>
                <td style="padding: 8px;">${item.date}</td>
                <td style="padding: 8px;">${item.title}</td>
                <td style="padding: 8px;">${item.type}</td>
                <td style="padding: 8px;">${item.amount}</td>
                <td style="padding: 8px;">${item.addedBy}</td>
              </tr>
            `).join('')}
          </table>
          <h2>${calculateSettlement()}</h2>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await WebBrowser.openBrowserAsync(uri);
  };


  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={[styles.historyIconContainer, item.type === 'Income' ? styles.incomeBg : styles.expenseBg]}>
        <Ionicons name={item.type === 'Income' ? 'arrow-up' : 'arrow-down'} size={24} color="#fff" />
      </View>
      <View style={styles.historyDetails}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyDate}>{item.date} - Added by {item.addedBy}</Text>
      </View>
      <Text style={[styles.historyAmount, item.type === 'Income' ? styles.incomeText : styles.expenseText]}>
        {item.type === 'Income' ? '+' : '-'} {item.amount}
      </Text>
    </View>
  );

  return (
    <View style={styles.historyContainer}>
      <View style={styles.filterContainer}>
        <TouchableOpacity onPress={() => showDatepicker('start')} style={styles.dateFilterButton}>
          <Text style={styles.dateFilterText}>Start: {startDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => showDatepicker('end')} style={styles.dateFilterButton}>
          <Text style={styles.dateFilterText}>End: {endDate.toLocaleDateString()}</Text>
        </TouchableOpacity>
                <TouchableOpacity style={styles.downloadButton} onPress={createPdf}><Ionicons name="download-outline" size={24} color="#fff" /></TouchableOpacity>
      </View>
      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={datePickerFor === 'start' ? startDate : endDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
                  <FlatList data={filteredHistory} renderItem={renderHistoryItem} keyExtractor={item => item.id} />
      <View style={styles.settlementContainer}>
        <Text style={styles.settlementText}>{calculateSettlement()}</Text>
      </View>
    </View>
  );
};

// Request Screen Component
const RequestScreen = ({ selectedBranch }) => {
  const [requests, setRequests] = useState(mockRequestsData.filter(item => item.branch === selectedBranch));

  const handleRequest = (id, accepted) => {
    setRequests(prevRequests => prevRequests.filter(req => req.id !== id));
    const message = accepted ? 'Request accepted and added to history.' : 'Request declined.';
    Alert.alert('Success', message);
  };

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestInfo}>
        <Text style={styles.requestTitle}>{item.title}</Text>
        <Text style={[styles.requestType, item.type === 'Income' ? styles.incomeText : styles.expenseText]}>{item.type}</Text>
        <Text style={styles.requestAmount}>{item.amount}</Text>
        <Text style={styles.requestDate}>Requested by {item.requestedBy} on {item.date}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={() => handleRequest(item.id, true)}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={() => handleRequest(item.id, false)}>
            <Ionicons name="close-circle-outline" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList data={requests} renderItem={renderRequestItem} keyExtractor={item => item.id} style={styles.requestContainer} />
  );
};

// Main Exported Component
export default function IncomeExpenseScreen() {
  const [activeTab, setActiveTab] = useState('Home');
  const [selectedBranch, setSelectedBranch] = useState(mockBranches[0]);

  const renderContent = () => {
    switch (activeTab) {
      case 'Home': return <HomeScreen branches={mockBranches} selectedBranch={selectedBranch} onSelectBranch={setSelectedBranch} />;
      case 'History': return <HistoryScreen selectedBranch={selectedBranch} />;
      case 'Request': return <RequestScreen selectedBranch={selectedBranch} />;
      default: return <HomeScreen branches={mockBranches} selectedBranch={selectedBranch} onSelectBranch={setSelectedBranch} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Income & Expense</Text>
        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'Home' && styles.activeTab]} onPress={() => setActiveTab('Home')}><Text style={[styles.tabText, activeTab === 'Home' && styles.activeTabText]}>Home</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'History' && styles.activeTab]} onPress={() => setActiveTab('History')}><Text style={[styles.tabText, activeTab === 'History' && styles.activeTabText]}>History</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'Request' && styles.activeTab]} onPress={() => setActiveTab('Request')}><Text style={[styles.tabText, activeTab === 'Request' && styles.activeTabText]}>Request</Text></TouchableOpacity>
        </View>
        <View style={styles.contentContainer}>{renderContent()}</View>
      </View>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f7fc' },
  container: { flex: 1, padding: 15 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: 10, paddingVertical: 5, marginBottom: 20, elevation: 2 },
  tabItem: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  activeTab: { backgroundColor: '#007bff' },
  tabText: { fontSize: 16, fontWeight: '600', color: '#333' },
  activeTabText: { color: '#fff' },
  contentContainer: { flex: 1 },
  homeContainer: { flex: 1 },
  summaryTabsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  summaryTab: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', backgroundColor: '#fff', elevation: 2, marginHorizontal: 5 },
  activeSummaryTab: { backgroundColor: '#007bff' },
  summaryTabText: { fontSize: 14, color: '#666', marginTop: 5 },
  summaryTabValue: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 2 },
  activeSummaryTabText: { color: '#fff' },
  branchSelectorContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#000', borderRadius: 8, marginBottom: 20, paddingHorizontal: 10, backgroundColor: '#fff' },
  transactionContainer: { backgroundColor: '#fff', borderRadius: 10, padding: 15, elevation: 2 },
  transactionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  inputIcon: { padding: 10 },
  input: { flex: 1, padding: 10, borderLeftWidth: 1, borderColor: '#ddd' },
  buttonGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  transactionButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'center' },
  incomeActive: { backgroundColor: '#28a745', borderColor: '#28a745' },
  expenseActive: { backgroundColor: '#dc3545', borderColor: '#dc3545' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 },
  activeButtonText: { color: '#fff' },
  receivedByContainer: { marginBottom: 15 },
  receivedByTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  receivedByOptions: { flexDirection: 'row', justifyContent: 'space-around' },
  radioOption: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  radioSelected: { backgroundColor: '#007bff' },
  receivedByText: { fontSize: 14, color: '#555' },
  radioSelectedText: { color: '#fff' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  checkboxLabel: { marginLeft: 10, fontSize: 16 },
  franchiseeShareContainer: { padding: 10, backgroundColor: '#e9ecef', borderRadius: 8, marginBottom: 15, alignItems: 'center' },
    submitButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    historyContainer: { flex: 1 },
  filterContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 15, elevation: 2 },
  dateFilterButton: { padding: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 5 },
  dateFilterText: { color: '#333' },
  downloadButton: { backgroundColor: '#007bff', padding: 8, borderRadius: 20 },
  settlementContainer: { padding: 15, backgroundColor: '#f0f0f0', borderTopWidth: 1, borderColor: '#ddd' },
  settlementText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
  historyIconContainer: { padding: 10, borderRadius: 25, marginRight: 15 },
  incomeBg: { backgroundColor: '#28a745' },
  expenseBg: { backgroundColor: '#dc3545' },
  historyDetails: { flex: 1 },
  historyTitle: { fontSize: 16, fontWeight: 'bold' },
  historyDate: { fontSize: 12, color: '#666' },
  historyAmount: { fontSize: 16, fontWeight: 'bold' },
  incomeText: { color: '#28a745' },
  expenseText: { color: '#dc3545' },
  requestContainer: { flex: 1 },
  requestItem: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 10, elevation: 2 },
  requestInfo: { marginBottom: 10 },
  requestTitle: { fontSize: 16, fontWeight: 'bold' },
  requestAmount: { fontSize: 18, fontWeight: 'bold', color: '#333', marginVertical: 5 },
  requestType: { fontSize: 14, fontWeight: '600', marginBottom: 5 },
  requestDate: { fontSize: 12, color: '#666' },
  requestActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  acceptButton: { backgroundColor: '#28a745', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5, marginRight: 10, flexDirection: 'row', alignItems: 'center' },
  declineButton: { backgroundColor: '#dc3545', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 5, flexDirection: 'row', alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
});
