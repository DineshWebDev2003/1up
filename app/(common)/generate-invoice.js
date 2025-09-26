import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GenerateInvoiceScreen = () => {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeCategory, setFeeCategory] = useState('admission');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const insets = useSafeAreaInsets();

  const [feeAmounts, setFeeAmounts] = useState({});

  useEffect(() => {
    const initializeData = async () => {
      await fetchCurrentUser();
      await fetchBranches();
      await fetchStudents();
      await fetchFeeStructure();
    };
    initializeData();
  }, []);

  useEffect(() => {
    // Filter students based on selected branch
    if (selectedBranch) {
      const filtered = students.filter(student => student.branch_id === selectedBranch.id);
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
    // Reset selected student when branch changes
    setSelectedStudent(null);
  }, [selectedBranch, students]);

  useEffect(() => {
    // Auto-fill amount based on fee category
    setAmount(feeAmounts[feeCategory] || '');
  }, [feeCategory]);

  const fetchCurrentUser = async () => {
    try {
      const response = await authFetch('/api/users/get_users.php?currentUser=true');
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        const user = result.data[0];
        setCurrentUser(user);
        
        // Auto-select branch for franchisee users
        if (user.role === 'Franchisee' && user.branch_id) {
          const branchName = user.branch_name || user.branch || `Branch ${user.branch_id}`;
          setSelectedBranch({ id: user.branch_id, name: branchName });
          console.log('Auto-selected branch for franchisee:', { id: user.branch_id, name: branchName });
        }
        
        console.log('Current user data:', user);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      console.log('Fetching branches...');
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      console.log('Branches API response:', result);
      
      if (result.success && Array.isArray(result.data)) {
        setBranches(result.data);
        console.log('Branches loaded successfully:', result.data.length, 'branches');
      } else {
        console.log('No branches data or API failed:', result);
        setBranches([]);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      setBranches([]);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await authFetch('/api/students/get_students.php');
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setStudents(result.data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      setStudents([]);
    }
  };

  const fetchFeeStructure = async () => {
    try {
      const response = await authFetch('/api/fees/get_fee_structure.php');
      const result = await response.json();
      if (result.success) {
        setFeeAmounts(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch fee structure:', error);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a student');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'Online' && !transactionId.trim()) {
      Alert.alert('Error', 'Transaction ID is required for online payments');
      return;
    }

    setLoading(true);

    try {
      // Create invoice record in payment history
      const invoiceData = {
        student_id: parseInt(selectedStudent.id),
        student_name: selectedStudent.name,
        fee_type: feeCategory,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        transaction_id: transactionId.trim() || null,
        status: 'paid',
        payment_date: new Date().toISOString().split('T')[0],
        branch_id: parseInt(selectedBranch?.id || currentUser?.branch_id || selectedStudent.branch_id)
      };

      console.log('Sending invoice data:', invoiceData);
      
      const response = await authFetch('/api/payments/create_payment.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      console.log('Payment API response status:', response.status);
      
      // Check if response is actually JSON
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error. Response was:', responseText);
        Alert.alert('Error', 'Server returned invalid response. Please check the payment API.');
        return;
      }

      if (result.success) {
        Alert.alert(
          'Success', 
          'Invoice generated and payment recorded successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form but keep branch selection for admin
                if (currentUser?.role !== 'Franchisee') {
                  setSelectedBranch(null);
                }
                setSelectedStudent(null);
                setFeeCategory('admission');
                setAmount(feeAmounts.admission);
                setPaymentMethod('Cash');
                setTransactionId('');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      if (error.message.includes('JSON Parse error')) {
        Alert.alert('Error', 'Server response error. Please contact admin to check the payment API.');
      } else {
        Alert.alert('Error', 'Failed to generate invoice. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const StudentItem = ({ student, onSelect }) => (
    <TouchableOpacity
      style={styles.studentItem}
      onPress={() => onSelect(student)}
      activeOpacity={0.7}
    >
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentDetails}>
          ID: {student.student_id} • Branch: {student.branch_name || 'N/A'}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  const BranchItem = ({ branch, onSelect }) => (
    <TouchableOpacity
      style={styles.studentItem}
      onPress={() => onSelect(branch)}
      activeOpacity={0.7}
    >
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{branch.name}</Text>
        <Text style={styles.studentDetails}>
          Location: {branch.location || 'N/A'}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={Colors.gradientMain} style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <Animatable.View animation="fadeIn" duration={800} style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Generate Invoice</Text>
            <Text style={styles.headerSubtitle}>Create student fee invoices</Text>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Branch Selection - Show for all users */}
            <Animatable.View animation="fadeInUp" delay={200} style={styles.formSection}>
              <Text style={styles.sectionTitle}>Branch Selection</Text>
              <TouchableOpacity
                style={styles.studentSelector}
                onPress={() => {
                  console.log('Branch selector pressed, branches available:', branches.length);
                  setBranchModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.selectorContent}>
                  <MaterialIcons name="business" size={24} color={Colors.primary} />
                  <View style={styles.selectorText}>
                    <Text style={styles.selectorLabel}>Selected Branch</Text>
                    <Text style={styles.selectorValue}>
                      {selectedBranch ? selectedBranch.name : 'Tap to select branch'}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={20} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <Text style={styles.debugText}>Branches loaded: {branches.length}</Text>
            </Animatable.View>

            {/* Student Selection */}
            <Animatable.View animation="fadeInUp" delay={300} style={styles.formSection}>
              <Text style={styles.sectionTitle}>Student Selection</Text>
              <TouchableOpacity
                style={styles.studentSelector}
                onPress={() => setStudentModalVisible(true)}
                activeOpacity={0.8}
                disabled={currentUser?.role === 'Admin' && !selectedBranch}
              >
                <View style={[styles.selectorContent, currentUser?.role === 'Admin' && !selectedBranch && styles.disabledSelector]}>
                  <MaterialIcons name="person" size={24} color={Colors.primary} />
                  <View style={styles.selectorText}>
                    <Text style={styles.selectorLabel}>Selected Student</Text>
                    <Text style={styles.selectorValue}>
                      {selectedStudent ? selectedStudent.name : 'Tap to select student'}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={20} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </Animatable.View>

            {/* Fee Category */}
            <Animatable.View animation="fadeInUp" delay={400} style={styles.formSection}>
              <Text style={styles.sectionTitle}>Fee Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={feeCategory}
                  onValueChange={setFeeCategory}
                  style={styles.picker}
                >
                  <Picker.Item label="Admission Fee" value="admission" />
                  <Picker.Item label="Monthly Fee" value="monthly" />
                </Picker>
              </View>
            </Animatable.View>

            {/* Amount */}
            <Animatable.View animation="fadeInUp" delay={500} style={styles.formSection}>
              <Text style={styles.sectionTitle}>Amount (₹)</Text>
              <TextInput
                style={styles.textInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                placeholderTextColor={Colors.textSecondary}
              />
            </Animatable.View>

            {/* Payment Method */}
            <Animatable.View animation="fadeInUp" delay={600} style={styles.formSection}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={paymentMethod}
                  onValueChange={setPaymentMethod}
                  style={styles.picker}
                >
                  <Picker.Item label="Cash" value="Cash" />
                  <Picker.Item label="Online Transfer" value="Online" />
                  <Picker.Item label="Cheque" value="Cheque" />
                  <Picker.Item label="Card" value="Card" />
                </Picker>
              </View>
            </Animatable.View>

            {/* Transaction ID (for online payments) */}
            {paymentMethod === 'Online' && (
              <Animatable.View animation="fadeInUp" delay={700} style={styles.formSection}>
                <Text style={styles.sectionTitle}>Transaction ID</Text>
                <TextInput
                  style={styles.textInput}
                  value={transactionId}
                  onChangeText={setTransactionId}
                  placeholder="Enter transaction ID"
                  placeholderTextColor={Colors.textSecondary}
                />
              </Animatable.View>
            )}

            {/* Generate Button */}
            <Animatable.View animation="fadeInUp" delay={800} style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.generateButton, loading && styles.buttonDisabled]}
                onPress={handleGenerateInvoice}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? ['#ccc', '#999'] : Colors.gradientPrimary}
                  style={styles.buttonGradient}
                >
                  <MaterialIcons 
                    name={loading ? "hourglass-empty" : "receipt"} 
                    size={24} 
                    color="white" 
                  />
                  <Text style={styles.buttonText}>
                    {loading ? 'Generating...' : 'Generate Invoice'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>
          </ScrollView>
        </Animatable.View>

        {/* Student Selection Modal */}
        <Modal
          visible={studentModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setStudentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Student</Text>
                <TouchableOpacity
                  onPress={() => setStudentModalVisible(false)}
                  style={styles.closeButton}
                >
                  <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={filteredStudents}
                renderItem={({ item }) => (
                  <StudentItem
                    student={item}
                    onSelect={(student) => {
                      setSelectedStudent(student);
                      setStudentModalVisible(false);
                    }}
                  />
                )}
                keyExtractor={(item) => item.id.toString()}
                style={styles.studentList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>

        {/* Branch Selection Modal */}
        <Modal
          visible={branchModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setBranchModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Branch</Text>
                <TouchableOpacity
                  onPress={() => setBranchModalVisible(false)}
                  style={styles.closeButton}
                >
                  <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalListContainer}>
                <Text style={styles.modalSubtitle}>Available Branches ({branches.length})</Text>
                {branches.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="business" size={48} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>No branches available</Text>
                    <Text style={styles.emptySubText}>Please contact admin to add branches</Text>
                  </View>
                ) : (
                  <FlatList
                    data={branches}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.branchListItem}
                        onPress={() => {
                          console.log('Branch selected:', item);
                          setSelectedBranch(item);
                          setBranchModalVisible(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.branchItemContent}>
                          <MaterialIcons name="business" size={24} color={Colors.primary} />
                          <View style={styles.branchItemText}>
                            <Text style={styles.branchItemName}>{item.name}</Text>
                            <Text style={styles.branchItemLocation}>
                              {item.location || 'Location not specified'}
                            </Text>
                          </View>
                          <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.branchFlatList}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: 12,
  },
  studentSelector: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorText: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  disabledSelector: {
    opacity: 0.5,
  },
  pickerContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  picker: {
    height: 50,
    color: Colors.text,
  },
  textInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContainer: {
    marginTop: 20,
  },
  generateButton: {
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  studentList: {
    flex: 1,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Branch Modal Styles
  emptyText: { marginTop: 16, fontSize: 18, color: '#666', fontWeight: '600' },
  emptySubText: { marginTop: 8, fontSize: 14, color: '#666', textAlign: 'center' },
  debugText: { fontSize: 12, color: '#666', marginTop: 5, textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  modalListContainer: { flex: 1, paddingTop: 10, paddingHorizontal: 20 },
  modalSubtitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 15, paddingHorizontal: 5 },
  branchListItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  branchItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  branchItemText: {
    flex: 1,
    marginLeft: 12,
  },
  branchItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  branchItemLocation: {
    fontSize: 14,
    color: '#666',
  },
  branchFlatList: {
    flex: 1,
  },
});

export default GenerateInvoiceScreen;
