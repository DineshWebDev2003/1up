import React, { useEffect, useState, useRef } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Modal, 
  TextInput, 
  ActivityIndicator, 
  ScrollView, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Linking
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Individual Student Card Component to prevent re-renders
const StudentCard = ({ student, minAmount, onAssign, onGenerateUPI, assignedFees = [] }) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const amountRef = useRef(null);
  const notesRef = useRef(null);

  // Get assigned fees for this student
  const studentFees = assignedFees.filter(fee => fee.student_id === student.id);

  const handleAssign = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < Number(minAmount)) {
      Alert.alert('Error', `Amount must be at least ${minAmount}`);
      return;
    }
    onAssign(student.id, amount, notes);
    setAmount('');
    setNotes('');
  };

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{student.name}</Text>
        <Text style={styles.cardSub}>ID: {student.student_id || student.id} • Branch: {student.branch_name || ''}</Text>
        
        {/* Show existing assigned fees */}
        {studentFees.length > 0 && (
          <View style={styles.assignedFeesContainer}>
            <Text style={styles.assignedFeesTitle}>Assigned Fees:</Text>
            {studentFees.map((fee, index) => (
              <View key={index} style={styles.assignedFeeItem}>
                <Text style={styles.assignedFeeText}>
                  {fee.fee_type || 'Fee'} - ₹{fee.pending_amount || fee.total_fees || fee.amount || '0'}
                </Text>
                <Text style={styles.assignedFeeStatus}>
                  Status: {fee.status || 'pending'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      <View style={styles.inlineInputs}>
        <TextInput
          ref={amountRef}
          style={[styles.input, { flex: 1 }]}
          placeholder={`Min ₹${minAmount}`}
          keyboardType="numeric"
          returnKeyType="next"
          value={amount}
          onChangeText={setAmount}
          onSubmitEditing={() => notesRef.current?.focus()}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleAssign}>
          <Text style={styles.primaryBtnText}>Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.upiBtn} onPress={() => onGenerateUPI(student)}>
          <Ionicons name="card" size={16} color={Colors.white} />
        </TouchableOpacity>
      </View>
      
      <TextInput
        ref={notesRef}
        style={[styles.input, { marginTop: 8 }]}
        placeholder="Notes (optional)"
        returnKeyType="done"
        value={notes}
        onChangeText={setNotes}
        onSubmitEditing={handleAssign}
      />
    </View>
  );
};

// Invoice Form Component
const InvoiceForm = ({ students, onCreateInvoice }) => {
  const [formData, setFormData] = useState({
    studentId: '',
    invoiceType: 'admission',
    admissionStudentName: '',
    amount: '',
    monthDate: new Date(),
    paymentMethod: 'cash',
    transactionId: '',
    payerName: '',
    payerPhone: '',
    payerEmail: '',
    notes: ''
  });
  
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const refs = {
    admissionName: useRef(null),
    amount: useRef(null),
    transactionId: useRef(null),
    payerName: useRef(null),
    payerPhone: useRef(null),
    payerEmail: useRef(null),
    notes: useRef(null)
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.studentId || !formData.amount || isNaN(Number(formData.amount))) {
      Alert.alert('Error', 'Select student and enter a valid amount');
      return;
    }
    if (formData.paymentMethod !== 'cash' && !formData.transactionId.trim()) {
      Alert.alert('Error', 'Transaction/Reference ID required for non-cash payments');
      return;
    }
    if (formData.invoiceType === 'admission' && !formData.admissionStudentName.trim()) {
      Alert.alert('Error', 'Enter student name for admission invoice');
      return;
    }
    if (!formData.payerName.trim()) {
      Alert.alert('Error', 'Enter who paid by');
      return;
    }
    if (!formData.payerPhone.trim()) {
      Alert.alert('Error', 'Enter payer mobile number');
      return;
    }
    
    onCreateInvoice(formData);
  };

  return (
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create Invoice</Text>
        
        {/* Student Selection */}
        <Text style={styles.label}>Student</Text>
        <View style={styles.pickerWrap}>
          <Picker 
            selectedValue={formData.studentId} 
            onValueChange={(value) => updateField('studentId', value)}
            style={styles.picker}
          >
            <Picker.Item label="Select Student" value="" />
            {students.map(s => (
              <Picker.Item key={s.id} label={`${s.name} (${s.student_id})`} value={String(s.id)} />
            ))}
          </Picker>
        </View>

        {/* Fee Type */}
        <Text style={styles.label}>Fee Type</Text>
        <View style={styles.row}>
          {['admission', 'monthly'].map(type => (
            <TouchableOpacity 
              key={type}
              style={[styles.chip, formData.invoiceType === type && styles.chipActive]} 
              onPress={() => updateField('invoiceType', type)}
            >
              <Text style={[styles.chipText, formData.invoiceType === type && styles.chipTextActive]}>
                {type === 'admission' ? 'Admission' : 'Monthly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Admission Student Name */}
        {formData.invoiceType === 'admission' && (
          <>
            <Text style={styles.label}>Student Name (manual)</Text>
            <TextInput
              ref={refs.admissionName}
              style={styles.input}
              value={formData.admissionStudentName}
              onChangeText={(value) => updateField('admissionStudentName', value)}
              placeholder="Enter student full name"
              returnKeyType="next"
              autoCapitalize="words"
              onSubmitEditing={() => refs.amount.current?.focus()}
            />
          </>
        )}

        {/* Amount */}
        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          ref={refs.amount}
          style={styles.input}
          keyboardType="numeric"
          returnKeyType="next"
          value={formData.amount}
          onChangeText={(value) => updateField('amount', value)}
          placeholder="Enter amount"
          onSubmitEditing={() => {
            if (formData.paymentMethod !== 'cash') {
              refs.transactionId.current?.focus();
            } else {
              refs.payerName.current?.focus();
            }
          }}
        />

        {/* Month Selection for Monthly Fee */}
        {formData.invoiceType === 'monthly' && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Month</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowMonthPicker(true)}>
              <Text style={styles.dateText}>{formData.monthDate.toLocaleDateString()}</Text>
              <Ionicons name="calendar" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Method */}
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.pickerWrap}>
          <Picker 
            selectedValue={formData.paymentMethod} 
            onValueChange={(value) => updateField('paymentMethod', value)}
            style={styles.picker}
          >
            <Picker.Item label="Cash" value="cash" />
            <Picker.Item label="Bank Transfer" value="bank_transfer" />
            <Picker.Item label="UPI" value="upi" />
            <Picker.Item label="Cheque" value="cheque" />
          </Picker>
        </View>

        {/* Transaction ID */}
        {formData.paymentMethod !== 'cash' && (
          <>
            <Text style={styles.label}>Transaction / Reference ID</Text>
            <TextInput
              ref={refs.transactionId}
              style={styles.input}
              value={formData.transactionId}
              onChangeText={(value) => updateField('transactionId', value)}
              placeholder="Enter reference id"
              returnKeyType="next"
              autoCapitalize="characters"
              onSubmitEditing={() => refs.payerName.current?.focus()}
            />
          </>
        )}

        {/* Payer Information */}
        <Text style={styles.label}>Who Paid By</Text>
        <TextInput
          ref={refs.payerName}
          style={styles.input}
          value={formData.payerName}
          onChangeText={(value) => updateField('payerName', value)}
          placeholder="Payer name"
          returnKeyType="next"
          autoCapitalize="words"
          onSubmitEditing={() => refs.payerPhone.current?.focus()}
        />
        
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          ref={refs.payerPhone}
          style={styles.input}
          value={formData.payerPhone}
          onChangeText={(value) => updateField('payerPhone', value)}
          placeholder="Mobile"
          keyboardType="phone-pad"
          returnKeyType="next"
          onSubmitEditing={() => refs.payerEmail.current?.focus()}
        />
        
        <Text style={styles.label}>Email (optional)</Text>
        <TextInput
          ref={refs.payerEmail}
          style={styles.input}
          value={formData.payerEmail}
          onChangeText={(value) => updateField('payerEmail', value)}
          placeholder="Email"
          keyboardType="email-address"
          returnKeyType="next"
          autoCapitalize="none"
          onSubmitEditing={() => refs.notes.current?.focus()}
        />

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          ref={refs.notes}
          style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
          multiline
          numberOfLines={4}
          value={formData.notes}
          onChangeText={(value) => updateField('notes', value)}
          placeholder="Optional notes"
          returnKeyType="done"
          autoCapitalize="sentences"
        />

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={handleSubmit}>
          <Text style={styles.primaryBtnText}>Create Invoice</Text>
        </TouchableOpacity>
      </View>

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <DateTimePicker
          value={formData.monthDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowMonthPicker(false);
            if (date) updateField('monthDate', date);
          }}
        />
      )}
    </ScrollView>
  );
};

// Main Component
export default function PaymentManagementScreen() {
  const [tab, setTab] = useState('assign');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [user, setUser] = useState(null);
  
  // UPI State
  const [upiModalVisible, setUpiModalVisible] = useState(false);
  const [selectedStudentForUPI, setSelectedStudentForUPI] = useState(null);
  const [upiAmount, setUpiAmount] = useState('');
  const [upiDescription, setUpiDescription] = useState('');

  // Assign Tab State
  const [branchFilter, setBranchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [minAmount, setMinAmount] = useState('100');
  const [assignDueDate, setAssignDueDate] = useState(new Date());
  const [showDuePicker, setShowDuePicker] = useState(false);

  // History State
  const [history, setHistory] = useState([]);
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [showHistoryMonthPicker, setShowHistoryMonthPicker] = useState(false);
  
  // Assigned Fees State
  const [assignedFees, setAssignedFees] = useState([]);

  // Refs for search inputs
  const searchRef = useRef(null);
  const minAmountRef = useRef(null);

  useEffect(() => {
    console.log('🔄 Payment Management Screen Loading...');
    loadInitialData();
  }, []);

  useEffect(() => {
    // Load assigned fees when tab changes to assign
    if (tab === 'assign') {
      loadAssignedFees();
    }
  }, [tab]);

  const loadInitialData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUser(JSON.parse(userData));
      }
      await Promise.all([loadBranches(), loadStudents()]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await authFetch('/api/branches/get_branches.php');
      const json = await res.json();
      if (json.success) setBranches(json.data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading students for payment management...');
      const res = await authFetch('/api/students/get_students.php');
      const json = await res.json();
      console.log('📦 Students API Response:', json);
      if (json.success) {
        console.log('✅ Students loaded:', json.data?.length || 0, 'students');
        setStudents(json.data || []);
      } else {
        console.log('❌ Failed to load students:', json.message);
      }
    } catch (error) {
      console.error('❌ Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedFees = async () => {
    try {
      console.log('🔄 Loading assigned fees...');
      const res = await authFetch('/api/fees/fee_management.php?action=list');
      console.log('📡 Assigned fees response status:', res.status);
      const json = await res.json();
      console.log('📦 Assigned Fees API Response:', json);
      if (json.success) {
        console.log('✅ Assigned fees loaded:', json.data?.length || 0, 'fees');
        setAssignedFees(json.data || []);
      } else {
        console.log('❌ Failed to load assigned fees:', json.message);
      }
    } catch (error) {
      console.error('❌ Error loading assigned fees:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const ym = `${historyMonth.getFullYear()}-${String(historyMonth.getMonth() + 1).padStart(2, '0')}`;
      console.log('🔄 Loading payment history for month:', ym);
      const res = await authFetch(`/api/fees/fee_management.php?action=invoice_history&month=${ym}`);
      console.log('📡 History response status:', res.status);
      const json = await res.json();
      console.log('📦 History API Response:', json);
      if (json.success) {
        console.log('✅ History loaded:', json.data?.length || 0, 'records');
        setHistory(json.data || []);
      } else {
        console.log('❌ Failed to load history:', json.message);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleAssignFee = async (studentId, amount, notes) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('action', 'assign');
      fd.append('student_id', String(studentId));
      fd.append('amount', String(amount));
      fd.append('due_date', assignDueDate.toISOString().split('T')[0]);
      if (notes) fd.append('notes', notes);
      
      const res = await authFetch('/api/fees/fee_management.php', { method: 'POST', body: fd });
      const json = await res.json();
      
      if (json.success) {
        Alert.alert('Success', 'Fee assigned successfully');
      } else {
        Alert.alert('Error', json.message || 'Failed to assign fee');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to assign fee');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (formData) => {
    setLoading(true);
    try {
      const invNum = `INV-${Date.now().toString().slice(-8)}`;
      const payload = {
        action: 'create_invoice',
        student_id: formData.studentId,
        invoice_number: invNum,
        fee_type: formData.invoiceType,
        amount: Number(formData.amount),
        month_date: formData.invoiceType === 'monthly' ? formData.monthDate.toISOString().split('T')[0] : null,
        payment_method: formData.paymentMethod,
        transaction_id: formData.paymentMethod === 'cash' ? null : formData.transactionId,
        notes: formData.notes || null,
        admission_student_name: formData.invoiceType === 'admission' ? formData.admissionStudentName : null,
        payer_name: formData.payerName,
        payer_phone: formData.payerPhone,
        payer_email: formData.payerEmail || null,
      };

      const res = await authFetch('/api/fees/fee_management.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      
      if (json.success) {
        Alert.alert('Success', 'Invoice created successfully');
      } else {
        Alert.alert('Error', json.message || 'Failed to create invoice');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const generateUPIUrl = (amount, description, studentName) => {
    // UPI URL format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=DESCRIPTION
    const upiId = 'school@paytm'; // Replace with your actual UPI ID
    const merchantName = 'TN Happy Kids School';
    const currency = 'INR';
    const transactionNote = `${description} - ${studentName}`;
    
    return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=${currency}&tn=${encodeURIComponent(transactionNote)}`;
  };

  const handleGenerateUPI = (student) => {
    setSelectedStudentForUPI(student);
    setUpiAmount('');
    setUpiDescription(`Fee payment for ${student.name}`);
    setUpiModalVisible(true);
  };

  const handleUPIPayment = async () => {
    if (!upiAmount || isNaN(Number(upiAmount)) || Number(upiAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const upiUrl = generateUPIUrl(upiAmount, upiDescription, selectedStudentForUPI.name);
    console.log('🔗 Generated UPI URL:', upiUrl);
    
    Alert.alert(
      'UPI Payment Link Generated',
      `Amount: ₹${upiAmount}\nStudent: ${selectedStudentForUPI.name}\n\nChoose an action:`,
      [
        { 
          text: 'Copy Link', 
          onPress: async () => {
            try {
              await Clipboard.setStringAsync(upiUrl);
              Alert.alert('Success', 'UPI link copied to clipboard!');
            } catch (error) {
              console.error('Failed to copy to clipboard:', error);
              Alert.alert('Error', 'Failed to copy link');
            }
          }
        },
        { 
          text: 'Open UPI App', 
          onPress: () => {
            Linking.openURL(upiUrl).catch(err => {
              console.error('Failed to open UPI app:', err);
              Alert.alert('Error', 'No UPI app found. Please install a UPI app like PhonePe, GPay, or Paytm.');
            });
          }
        },
        { text: 'Close', style: 'cancel' }
      ]
    );
    
    setUpiModalVisible(false);
  };

  // Filter students based on branch and search
  const filteredStudents = students
    .filter(s => branchFilter === 'all' || String(s.branch_id) === String(branchFilter))
    .filter(s => !search.trim() || 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      String(s.student_id || '').toLowerCase().includes(search.toLowerCase())
    );

  console.log('📊 Payment Management State:', {
    tab,
    studentsCount: students.length,
    filteredStudentsCount: filteredStudents.length,
    loading,
    branchFilter,
    search,
    minAmount
  });

  const Header = () => (
    <LinearGradient colors={Colors.gradientMain} style={styles.header}>
      <Text style={styles.headerTitle}>Payment Management</Text>
      <Text style={styles.headerSubtitle}>Assign fees and generate invoices</Text>
    </LinearGradient>
  );

  const TabBar = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tab, tab === 'assign' && styles.activeTab]} 
        onPress={() => setTab('assign')}
      >
        <Ionicons name="cash" size={18} color={tab === 'assign' ? Colors.white : Colors.textSecondary} />
        <Text style={[styles.tabText, tab === 'assign' && styles.activeTabText]}>Assign</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, tab === 'invoice' && styles.activeTab]} 
        onPress={() => setTab('invoice')}
      >
        <Ionicons name="receipt" size={18} color={tab === 'invoice' ? Colors.white : Colors.textSecondary} />
        <Text style={[styles.tabText, tab === 'invoice' && styles.activeTabText]}>Invoice</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, tab === 'history' && styles.activeTab]} 
        onPress={() => { setTab('history'); loadHistory(); }}
      >
        <Ionicons name="time" size={18} color={tab === 'history' ? Colors.white : Colors.textSecondary} />
        <Text style={[styles.tabText, tab === 'history' && styles.activeTabText]}>History</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, tab === 'upi' && styles.activeTab]} 
        onPress={() => setTab('upi')}
      >
        <Ionicons name="card" size={18} color={tab === 'upi' ? Colors.white : Colors.textSecondary} />
        <Text style={[styles.tabText, tab === 'upi' && styles.activeTabText]}>UPI</Text>
      </TouchableOpacity>
    </View>
  );

  const AssignTab = () => (
    <View style={{ flex: 1 }}>
      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={styles.filterCol}>
          <Text style={styles.label}>Branch</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={branchFilter} onValueChange={setBranchFilter} style={styles.picker}>
              <Picker.Item label="All" value="all" />
              {branches.map(b => (
                <Picker.Item key={b.id} label={b.name} value={String(b.id)} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.filterCol}>
          <Text style={styles.label}>Search</Text>
          <TextInput
            ref={searchRef}
            style={styles.input}
            placeholder="Name or ID"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
        <View style={styles.filterColSmall}>
          <Text style={styles.label}>Min ₹</Text>
          <TextInput
            ref={minAmountRef}
            style={styles.input}
            value={minAmount}
            onChangeText={setMinAmount}
            keyboardType="numeric"
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Due Date */}
      <View style={styles.dueRow}>
        <Text style={styles.label}>Due Date</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDuePicker(true)}>
          <Text style={styles.dateText}>{assignDueDate.toLocaleDateString()}</Text>
          <Ionicons name="calendar" color={Colors.primary} size={18} />
        </TouchableOpacity>
      </View>

      {/* Students List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <StudentCard
              student={item}
              minAmount={minAmount}
              onAssign={handleAssignFee}
              onGenerateUPI={handleGenerateUPI}
              assignedFees={assignedFees}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>No students found</Text>
            </View>
          }
        />
      )}

      {/* Due Date Picker */}
      {showDuePicker && (
        <DateTimePicker
          value={assignDueDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDuePicker(false);
            if (date) setAssignDueDate(date);
          }}
        />
      )}
    </View>
  );

  const HistoryTab = () => (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.label}>Filter by Month</Text>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowHistoryMonthPicker(true)}>
          <Text style={styles.dateText}>{historyMonth.toLocaleDateString()}</Text>
          <Ionicons name="calendar" size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={history}
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.invoice_number} • ₹{Number(item.amount || 0).toFixed(2)}</Text>
            <Text style={styles.cardSub}>Student: {item.student_name || item.admission_student_name || '-'}</Text>
            <Text style={styles.cardSub}>Type: {item.fee_type} • {item.payment_method}</Text>
            {item.transaction_id && (
              <Text style={styles.cardSub}>Ref: {item.transaction_id}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.muted}>No invoices found</Text>
          </View>
        }
      />
      
      {showHistoryMonthPicker && (
        <DateTimePicker
          value={historyMonth}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowHistoryMonthPicker(false);
            if (date) {
              setHistoryMonth(date);
              loadHistory();
            }
          }}
        />
      )}
    </View>
  );

  const UPITab = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.upiHeader}>
        <Text style={styles.upiHeaderTitle}>UPI Payment Management</Text>
        <Text style={styles.upiHeaderSubtitle}>Generate UPI payment links for students</Text>
      </View>
      
      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={styles.filterCol}>
          <Text style={styles.label}>Branch</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={branchFilter} onValueChange={setBranchFilter} style={styles.picker}>
              <Picker.Item label="All" value="all" />
              {branches.map(b => (
                <Picker.Item key={b.id} label={b.name} value={String(b.id)} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.filterCol}>
          <Text style={styles.label}>Search</Text>
          <TextInput
            style={styles.input}
            placeholder="Name or ID"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Students List for UPI */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSub}>ID: {item.student_id || item.id} • Branch: {item.branch_name || ''}</Text>
              </View>
              <TouchableOpacity style={styles.upiGenerateBtn} onPress={() => handleGenerateUPI(item)}>
                <Ionicons name="card" size={16} color={Colors.white} />
                <Text style={styles.upiGenerateBtnText}>Generate UPI</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.muted}>No students found</Text>
            </View>
          }
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Header />
        <TabBar />
        {tab === 'assign' && <AssignTab />}
        {tab === 'invoice' && <InvoiceForm students={students} onCreateInvoice={handleCreateInvoice} />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'upi' && <UPITab />}
      </KeyboardAvoidingView>

      {/* UPI Modal */}
      <Modal
        visible={upiModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUpiModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate UPI Payment</Text>
              <TouchableOpacity onPress={() => setUpiModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {selectedStudentForUPI && (
              <View style={styles.modalContent}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{selectedStudentForUPI.name}</Text>
                  <Text style={styles.studentId}>ID: {selectedStudentForUPI.student_id || selectedStudentForUPI.id}</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Amount (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    value={upiAmount}
                    onChangeText={setUpiAmount}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Payment description"
                    value={upiDescription}
                    onChangeText={setUpiDescription}
                    multiline
                    numberOfLines={2}
                  />
                </View>
                
                <TouchableOpacity style={styles.generateUpiBtn} onPress={handleUPIPayment}>
                  <Ionicons name="card" size={20} color={Colors.white} />
                  <Text style={styles.generateUpiBtnText}>Generate UPI Link</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: Colors.white, opacity: 0.9 },
  tabContainer: { flexDirection: 'row', backgroundColor: Colors.white, marginHorizontal: 20, marginTop: 20, borderRadius: 15, padding: 5, elevation: 3 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  activeTabText: { color: Colors.white },
  filtersRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  filterCol: { flex: 1 },
  filterColSmall: { width: 90 },
  label: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  pickerWrap: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, backgroundColor: Colors.white },
  picker: { height: 44 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  dueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 8 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 10 },
  dateText: { color: Colors.text },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  inlineInputs: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 },
  primaryBtn: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  muted: { color: Colors.textSecondary },
  
  // UPI Styles
  upiBtn: { 
    backgroundColor: Colors.success || '#28a745', 
    paddingVertical: 10, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    minWidth: 40
  },
  upiHeader: { 
    padding: 20, 
    backgroundColor: Colors.white, 
    marginHorizontal: 20, 
    marginTop: 20, 
    borderRadius: 15, 
    elevation: 2 
  },
  upiHeaderTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: Colors.text, 
    marginBottom: 4 
  },
  upiHeaderSubtitle: { 
    fontSize: 14, 
    color: Colors.textSecondary 
  },
  upiGenerateBtn: { 
    backgroundColor: Colors.success || '#28a745', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  upiGenerateBtnText: { 
    color: Colors.white, 
    fontWeight: '600', 
    fontSize: 14 
  },
  
  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContainer: { 
    backgroundColor: Colors.white, 
    borderRadius: 20, 
    margin: 20, 
    maxHeight: '80%', 
    width: '90%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: Colors.text 
  },
  modalContent: { 
    padding: 20 
  },
  studentInfo: { 
    backgroundColor: Colors.background, 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20 
  },
  studentName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: Colors.text 
  },
  studentId: { 
    fontSize: 14, 
    color: Colors.textSecondary, 
    marginTop: 4 
  },
  inputGroup: { 
    marginBottom: 15 
  },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: Colors.text, 
    marginBottom: 8 
  },
  generateUpiBtn: { 
    backgroundColor: Colors.success || '#28a745', 
    paddingVertical: 15, 
    borderRadius: 10, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, 
    marginTop: 10 
  },
  generateUpiBtnText: { 
    color: Colors.white, 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});
