import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Picker } from '@react-native-picker/picker';
import authFetch from '../utils/api';
import { useColors } from '../hooks/useColors';
import Header from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeMap, ensureArray, generateSafeKey } from '../utils/safeArrayUtils';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function MyInvoiceScreen() {
  const Colors = useColors();
  
  // Early safety check - prevent rendering if Colors is not available
  if (!Colors || typeof Colors !== 'object') {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ color: '#666', fontSize: 16, marginTop: 10 }}>Loading...</Text>
      </SafeAreaView>
    );
  }
  
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
  });
  
  const styles = getStyles();
  const [activeTab, setActiveTab] = useState('create'); // create or history
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
      <Header 
        title="💼 My Invoice 2.0"
        subtitle="Create & Manage Invoices"
        variant="gradient"
      />

      {/* Tab Container */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.activeTab]}
          onPress={() => setActiveTab('create')}
        >
          <Ionicons 
            name="add-circle" 
            size={20} 
            color={activeTab === 'create' ? Colors.textOnPrimary : Colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
            Create Invoice
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons 
            name="time" 
            size={20} 
            color={activeTab === 'history' ? Colors.textOnPrimary : Colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Invoice History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'create' ? (
          <CreateInvoiceTab Colors={Colors} userData={userData} />
        ) : (
          <InvoiceHistoryTab Colors={Colors} userData={userData} />
        )}
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// Create Invoice Tab Component
function CreateInvoiceTab({ Colors, userData }) {
  // Early safety check - prevent any rendering if Colors is not available
  if (!Colors || typeof Colors !== 'object') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Text style={{ color: '#666', fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  const [feeCategory, setFeeCategory] = useState('monthly');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [formData, setFormData] = useState({
    studentName: '',
    studentEmail: '',
    branch: '',
    amount: '',
    payerName: '',
    payerEmail: '',
    monthYear: '',
    description: '',
    paymentMethod: 'cash', // cash, online, card
    transactionId: '',
  });
  const [loading, setLoading] = useState(false);

  const getCreateStyles = () => StyleSheet.create({
    formContainer: {
      flex: 1,
    },
    categorySelector: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    categoryTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 15,
    },
    categoryButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    categoryButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    categoryButtonGradient: {
      paddingVertical: 15,
      paddingHorizontal: 20,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    categoryButtonText: {
      color: Colors.textOnPrimary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    inactiveCategoryButton: {
      backgroundColor: Colors.surfaceVariant,
    },
    inactiveCategoryText: {
      color: Colors.textSecondary,
    },
    formSection: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 15,
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
    textInput: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 10,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 16,
      color: Colors.text,
      backgroundColor: Colors.background,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 10,
      backgroundColor: Colors.background,
      overflow: 'hidden',
    },
    picker: {
      height: 50,
      color: Colors.text,
    },
    studentCard: {
      backgroundColor: Colors.surfaceVariant,
      borderRadius: 10,
      padding: 15,
      marginBottom: 10,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedStudentCard: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryContainer,
    },
    studentName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.text,
    },
    studentDetails: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginTop: 4,
    },
    studentCount: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginBottom: 15,
      fontWeight: '600',
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 30,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
      color: Colors.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 30,
    },
    emptyText: {
      marginTop: 15,
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: 'center',
    },
    branchFilterContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    branchFilterButton: {
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 8,
    },
    branchFilterGradient: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.outline,
      borderRadius: 20,
    },
    activeBranchFilter: {
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    branchFilterText: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginLeft: 6,
      fontWeight: '500',
    },
    activeBranchFilterText: {
      color: Colors.textOnPrimary,
      fontWeight: '600',
    },
    horizontalStudentScroll: {
      marginTop: 15,
      paddingVertical: 5,
    },
    horizontalStudentContainer: {
      paddingHorizontal: 5,
      paddingRight: 25,
    },
    horizontalStudentCard: {
      width: 110,
      minHeight: 160,
      backgroundColor: Colors.surface,
      borderRadius: 12,
      padding: 10,
      marginHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'flex-start',
      borderWidth: 1.5,
      borderColor: Colors.outline,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    selectedHorizontalStudentCard: {
      borderColor: Colors.primary,
      borderWidth: 2.5,
      backgroundColor: Colors.primaryContainer,
      elevation: 8,
      shadowColor: Colors.primary,
      shadowOpacity: 0.25,
      shadowRadius: 4,
      transform: [{ scale: 1.05 }],
    },
    studentAvatarContainer: {
      position: 'relative',
      marginBottom: 8,
      alignItems: 'center',
    },
    studentAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: Colors.outline,
      backgroundColor: Colors.surfaceVariant,
    },
    selectedIndicator: {
      position: 'absolute',
      bottom: -3,
      right: -3,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: Colors.surface,
      elevation: 2,
    },
    horizontalStudentName: {
      fontSize: 12,
      fontWeight: '600',
      color: Colors.text,
      textAlign: 'center',
      marginBottom: 3,
      lineHeight: 16,
      maxHeight: 32,
    },
    horizontalStudentId: {
      fontSize: 10,
      color: Colors.primary,
      textAlign: 'center',
      fontWeight: '600',
      marginBottom: 2,
      backgroundColor: Colors.primaryContainer,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      overflow: 'hidden',
    },
    horizontalStudentBranch: {
      fontSize: 9,
      color: Colors.textSecondary,
      textAlign: 'center',
      fontWeight: '500',
      marginTop: 2,
    },
    generateButton: {
      borderRadius: 15,
      overflow: 'hidden',
      marginTop: 20,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    generateButtonGradient: {
      paddingVertical: 18,
      paddingHorizontal: 30,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    generateButtonText: {
      color: Colors.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 10,
    },
    // Payment Method Styles
    paymentMethodContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    paymentMethodButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: Colors.surfaceVariant,
      borderWidth: 2,
      borderColor: Colors.outline,
    },
    paymentMethodActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    paymentMethodText: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: '600',
      color: Colors.textSecondary,
    },
    paymentMethodActiveText: {
      color: Colors.textOnPrimary,
    },
  });

  const createStyles = getCreateStyles();

  useEffect(() => {
    if (feeCategory === 'monthly') {
      loadStudents();
    }
  }, [feeCategory]);

  const loadStudents = async (branchId = '') => {
    try {
      setLoading(true);
      
      // Build URL with branch filter if selected
      let url = '/api/invoices/get_all_students.php';
      if (branchId) {
        url += `?branch_id=${branchId}`;
      }
      
      const response = await authFetch(url);
      const result = await response.json();
      
      if (result.success) {
        setStudents(result.data || []);
        
        // Store available branches for filter dropdown
        if (result.filters && result.filters.available_branches) {
          setAvailableBranches(result.filters.available_branches);
        }
        
        console.log('📊 Students loaded:', result.data?.length || 0);
        console.log('🏢 Available branches:', result.filters?.available_branches?.length || 0);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchFilter = (branchId) => {
    setSelectedBranchId(branchId);
    setSelectedStudent(null); // Clear selected student when changing branch
    loadStudents(branchId);
  };

  const handleStudentSelect = (student) => {
    console.log('🎯 Student selected:', student);
    console.log('🎯 Student ID:', student.id, 'Type:', typeof student.id);
    setSelectedStudent(student);
    setFormData({
      ...formData,
      studentName: student.name,
      studentEmail: student.email || '',
      branch: student.branch_name || '',
    });
  };

  const generateInvoice = async () => {
    // Validation
    if (!formData.studentName || !formData.amount || !formData.payerName || !formData.payerEmail) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (feeCategory === 'monthly' && !formData.monthYear) {
      Alert.alert('Error', 'Please select month and year for monthly fee');
      return;
    }

    // Validate transaction ID for non-cash payments
    if (formData.paymentMethod !== 'cash' && !formData.transactionId.trim()) {
      Alert.alert('Error', 'Transaction ID is required for online/card payments');
      return;
    }

    try {
      setLoading(true);
      
      const invoiceData = {
        fee_category: feeCategory,
        student_id: selectedStudent?.id || null,
        student_name: formData.studentName,
        student_email: formData.studentEmail,
        branch: formData.branch,
        amount: parseFloat(formData.amount),
        payer_name: formData.payerName,
        payer_email: formData.payerEmail,
        month_year: formData.monthYear,
        description: formData.description,
        payment_method: formData.paymentMethod,
        transaction_id: formData.transactionId,
        created_by: userData?.id,
        created_by_role: userData?.role || 'admin',
      };

      const response = await authFetch('/api/invoices/create_invoice.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();
      
      if (result.success) {
        const invoiceNumber = result.data?.invoice_number || result.invoice_number || result.data?.invoice_id || 'N/A';
        Alert.alert('Success', `Invoice ${invoiceNumber} created successfully!`);
        // Reset form
        setFormData({
          studentName: '',
          studentEmail: '',
          branch: '',
          amount: '',
          payerName: '',
          payerEmail: '',
          monthYear: '',
          description: '',
          paymentMethod: 'cash',
          transactionId: '',
        });
        setSelectedStudent(null);
      } else {
        Alert.alert('Error', result.message || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      Alert.alert('Error', 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={createStyles.formContainer} showsVerticalScrollIndicator={false}>
      {/* Fee Category Selection */}
      <Animatable.View animation="fadeInUp" duration={600} style={createStyles.categorySelector}>
        <Text style={createStyles.categoryTitle}>📋 Fee Category</Text>
        <View style={createStyles.categoryButtons}>
          <TouchableOpacity
            style={createStyles.categoryButton}
            onPress={() => setFeeCategory('monthly')}
          >
            {feeCategory === 'monthly' ? (
              <LinearGradient colors={Colors.gradientPrimary} style={createStyles.categoryButtonGradient}>
                <Ionicons name="calendar" size={20} color={Colors.textOnPrimary} />
                <Text style={createStyles.categoryButtonText}>Monthly Fee</Text>
              </LinearGradient>
            ) : (
              <View style={[createStyles.categoryButtonGradient, createStyles.inactiveCategoryButton]}>
                <Ionicons name="calendar" size={20} color={Colors.textSecondary} />
                <Text style={[createStyles.categoryButtonText, createStyles.inactiveCategoryText]}>Monthly Fee</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={createStyles.categoryButton}
            onPress={() => setFeeCategory('admission')}
          >
            {feeCategory === 'admission' ? (
              <LinearGradient colors={Colors.gradientSuccess} style={createStyles.categoryButtonGradient}>
                <Ionicons name="school" size={20} color={Colors.textOnPrimary} />
                <Text style={createStyles.categoryButtonText}>Admission Fee</Text>
              </LinearGradient>
            ) : (
              <View style={[createStyles.categoryButtonGradient, createStyles.inactiveCategoryButton]}>
                <Ionicons name="school" size={20} color={Colors.textSecondary} />
                <Text style={[createStyles.categoryButtonText, createStyles.inactiveCategoryText]}>Admission Fee</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animatable.View>

      {/* Branch Filter (for Monthly Fee) */}
      {feeCategory === 'monthly' && availableBranches.length > 0 && (
        <Animatable.View animation="fadeInUp" duration={600} delay={150} style={createStyles.formSection}>
          <Text style={createStyles.sectionTitle}>🏢 Filter by Branch</Text>
          <View style={createStyles.branchFilterContainer}>
            <TouchableOpacity
              style={[
                createStyles.branchFilterButton,
                !selectedBranchId && createStyles.activeBranchFilter
              ]}
              onPress={() => handleBranchFilter('')}
            >
              <LinearGradient
                colors={!selectedBranchId ? ['#667eea', '#764ba2'] : ['transparent', 'transparent']}
                style={createStyles.branchFilterGradient}
              >
                <Ionicons 
                  name="business" 
                  size={16} 
                  color={!selectedBranchId ? Colors.textOnPrimary : Colors.textSecondary} 
                />
                <Text style={[
                  createStyles.branchFilterText,
                  !selectedBranchId && createStyles.activeBranchFilterText
                ]}>
                  All Branches
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {safeMap(availableBranches, (branch, index) => (
              <TouchableOpacity
                key={branch.id}
                style={[
                  createStyles.branchFilterButton,
                  selectedBranchId === branch.id.toString() && createStyles.activeBranchFilter
                ]}
                onPress={() => handleBranchFilter(branch.id.toString())}
              >
                <LinearGradient
                  colors={selectedBranchId === branch.id.toString() ? ['#667eea', '#764ba2'] : ['transparent', 'transparent']}
                  style={createStyles.branchFilterGradient}
                >
                  <Ionicons 
                    name="location" 
                    size={16} 
                    color={selectedBranchId === branch.id.toString() ? Colors.textOnPrimary : Colors.textSecondary} 
                  />
                  <Text style={[
                    createStyles.branchFilterText,
                    selectedBranchId === branch.id.toString() && createStyles.activeBranchFilterText
                  ]}>
                    {branch.name}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>
      )}

      {/* Student Selection (for Monthly Fee) */}
      {feeCategory === 'monthly' && (
        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={createStyles.formSection}>
          <Text style={createStyles.sectionTitle}>👨‍🎓 Select Student</Text>
          {loading ? (
            <View style={createStyles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={createStyles.loadingText}>Loading students...</Text>
            </View>
          ) : students.length === 0 ? (
            <View style={createStyles.emptyContainer}>
              <Ionicons name="school" size={48} color={Colors.textSecondary} />
              <Text style={createStyles.emptyText}>
                {selectedBranchId ? 'No students found in selected branch' : 'No students available'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={createStyles.studentCount}>
                📊 {students.length} student{students.length !== 1 ? 's' : ''} found
                {selectedStudent && (
                  <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>
                    {' • Selected: ' + selectedStudent.name}
                  </Text>
                )}
              </Text>
              
              {/* Horizontal Scrollable Student Selection */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={createStyles.horizontalStudentScroll}
                contentContainerStyle={createStyles.horizontalStudentContainer}
                decelerationRate="fast"
                snapToInterval={122}
                snapToAlignment="start"
              >
                {safeMap(students, (student, index) => (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      createStyles.horizontalStudentCard,
                      (selectedStudent?.id == student.id) && createStyles.selectedHorizontalStudentCard
                    ]}
                    onPress={() => handleStudentSelect(student)}
                  >
                    <View style={createStyles.studentAvatarContainer}>
                      <Image
                        source={
                          student.avatar 
                            ? { uri: student.avatar }
                            : require('../../assets/Avartar.png')
                        }
                        style={createStyles.studentAvatar}
                        defaultSource={require('../../assets/Avartar.png')}
                      />
                      {(selectedStudent?.id == student.id) && (
                        <View style={createStyles.selectedIndicator}>
                          <Ionicons name="checkmark" size={16} color={Colors.textOnPrimary} />
                        </View>
                      )}
                    </View>
                    <Text style={createStyles.horizontalStudentName} numberOfLines={2}>
                      {student.name}
                    </Text>
                    <Text style={createStyles.horizontalStudentId} numberOfLines={1}>
                      {student.student_id}
                    </Text>
                    <Text style={createStyles.horizontalStudentBranch} numberOfLines={1}>
                      {student.branch_name || 'N/A'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </Animatable.View>
      )}

      {/* Student Details Form */}
      <Animatable.View animation="fadeInUp" duration={600} delay={300} style={createStyles.formSection}>
        <Text style={createStyles.sectionTitle}>
          {feeCategory === 'monthly' ? '📝 Student Details' : '👤 Student Information'}
        </Text>
        
        <View style={createStyles.inputGroup}>
          <Text style={createStyles.inputLabel}>Student Name *</Text>
          <TextInput
            style={createStyles.textInput}
            value={formData.studentName}
            onChangeText={(text) => setFormData({...formData, studentName: text})}
            placeholder="Enter student name"
            placeholderTextColor={Colors.textSecondary}
            editable={feeCategory === 'admission'}
          />
        </View>

        <View style={createStyles.inputGroup}>
          <Text style={createStyles.inputLabel}>Student Email</Text>
          <TextInput
            style={createStyles.textInput}
            value={formData.studentEmail}
            onChangeText={(text) => setFormData({...formData, studentEmail: text})}
            placeholder="Enter student email"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="email-address"
          />
        </View>

        <View style={createStyles.inputGroup}>
          <Text style={createStyles.inputLabel}>Branch</Text>
          {feeCategory === 'admission' ? (
            // For admission fees: Show as dropdown selector
            <View style={createStyles.pickerContainer}>
              <Picker
                selectedValue={formData.branch}
                onValueChange={(value) => setFormData({...formData, branch: value})}
                style={createStyles.picker}
              >
                <Picker.Item label="Select Branch" value="" />
                {availableBranches.map((branch) => (
                  <Picker.Item 
                    key={branch.id} 
                    label={branch.name} 
                    value={branch.name} 
                  />
                ))}
              </Picker>
            </View>
          ) : (
            // For monthly fees: Show as text input (auto-filled from student selection)
            <TextInput
              style={[createStyles.textInput, { backgroundColor: Colors.surface }]}
              value={formData.branch}
              onChangeText={(text) => setFormData({...formData, branch: text})}
              placeholder="Select student to auto-fill"
              placeholderTextColor={Colors.textSecondary}
              editable={false}
            />
          )}
        </View>

        {feeCategory === 'monthly' && (
          <View style={createStyles.inputGroup}>
            <Text style={createStyles.inputLabel}>Month & Year *</Text>
            <TextInput
              style={createStyles.textInput}
              value={formData.monthYear}
              onChangeText={(text) => setFormData({...formData, monthYear: text})}
              placeholder="e.g., November 2024"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
        )}
      </Animatable.View>

      {/* Payment Details */}
      <Animatable.View animation="fadeInUp" duration={600} delay={400} style={createStyles.formSection}>
        <Text style={createStyles.sectionTitle}>💰 Payment Details</Text>
        
        <View style={createStyles.inputGroup}>
          <Text style={createStyles.inputLabel}>Amount *</Text>
          <TextInput
            style={createStyles.textInput}
            value={formData.amount}
            onChangeText={(text) => setFormData({...formData, amount: text})}
            placeholder="Enter amount"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="numeric"
          />
        </View>

        <View style={createStyles.inputGroup}>
          <Text style={createStyles.inputLabel}>Payer Name *</Text>
          <TextInput
            style={createStyles.textInput}
            value={formData.payerName}
            onChangeText={(text) => setFormData({...formData, payerName: text})}
            placeholder="Enter payer name"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={createStyles.inputGroup}>
          <Text style={createStyles.inputLabel}>Payer Email *</Text>
          <TextInput
            style={createStyles.textInput}
            value={formData.payerEmail}
            onChangeText={(text) => setFormData({...formData, payerEmail: text})}
            placeholder="Enter payer email"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="email-address"
          />
        </View>

        {/* Payment Method */}
        <View style={createStyles.inputGroup}>
          <Text style={createStyles.inputLabel}>Payment Method *</Text>
          <View style={createStyles.paymentMethodContainer}>
            {['cash', 'online', 'card'].map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  createStyles.paymentMethodButton,
                  formData.paymentMethod === method && createStyles.paymentMethodActive
                ]}
                onPress={() => setFormData({...formData, paymentMethod: method, transactionId: method === 'cash' ? '' : formData.transactionId})}
              >
                <Ionicons 
                  name={method === 'cash' ? 'cash' : method === 'online' ? 'card' : 'card-outline'} 
                  size={20} 
                  color={formData.paymentMethod === method ? Colors.textOnPrimary : Colors.textSecondary} 
                />
                <Text style={[
                  createStyles.paymentMethodText,
                  formData.paymentMethod === method && createStyles.paymentMethodActiveText
                ]}>
                  {method === 'cash' ? '💰 Cash' : method === 'online' ? '🌐 Online' : '💳 Card'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transaction ID - Only show if not cash */}
        {formData.paymentMethod !== 'cash' && (
          <Animatable.View animation="fadeInDown" duration={300} style={createStyles.inputGroup}>
            <Text style={createStyles.inputLabel}>Transaction ID *</Text>
            <TextInput
              style={createStyles.textInput}
              value={formData.transactionId}
              onChangeText={(text) => setFormData({...formData, transactionId: text})}
              placeholder="Enter transaction ID"
              placeholderTextColor={Colors.textSecondary}
            />
          </Animatable.View>
        )}

        <View style={createStyles.inputGroup}>
          <Text style={createStyles.inputLabel}>Description</Text>
          <TextInput
            style={[createStyles.textInput, { height: 80, textAlignVertical: 'top' }]}
            value={formData.description}
            onChangeText={(text) => setFormData({...formData, description: text})}
            placeholder="Enter description (optional)"
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>
      </Animatable.View>

      {/* Generate Button */}
      <Animatable.View animation="fadeInUp" duration={600} delay={500}>
        <TouchableOpacity style={createStyles.generateButton} onPress={generateInvoice}>
          <LinearGradient colors={Colors.gradientPrimary} style={createStyles.generateButtonGradient}>
            <Ionicons name="document-text" size={24} color={Colors.textOnPrimary} />
            <Text style={createStyles.generateButtonText}>Generate Invoice</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animatable.View>
    </ScrollView>
  );
}

// Modern Invoice History Tab Component
function InvoiceHistoryTab({ Colors, userData }) {
  // Early safety check - prevent any rendering if Colors is not available
  if (!Colors || typeof Colors !== 'object') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <Text style={{ color: '#666', fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [statistics, setStatistics] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');

  const getHistoryStyles = () => StyleSheet.create({
    container: {
      flex: 1,
    },
    // Statistics Section
    statisticsContainer: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    statisticsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 15,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    statGradient: {
      padding: 15,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: Colors.textOnPrimary,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      color: Colors.textOnPrimary,
      marginTop: 4,
      textAlign: 'center',
    },
    // Search and Filter Section
    searchContainer: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 15,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.background,
      borderRadius: 10,
      paddingHorizontal: 15,
      paddingVertical: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: Colors.text,
      marginLeft: 10,
    },
    filterContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    filterButton: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    filterGradient: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterText: {
      fontSize: 14,
      color: Colors.textOnPrimary,
      marginLeft: 6,
      fontWeight: '600',
    },
    inactiveFilterButton: {
      backgroundColor: Colors.surfaceVariant,
    },
    inactiveFilterText: {
      color: Colors.textSecondary,
    },
    // Invoice Cards
    invoiceCard: {
      borderRadius: 15,
      marginBottom: 15,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    invoiceCardGradient: {
      padding: 20,
    },
    invoiceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    invoiceNumber: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.textOnPrimary,
    },
    statusBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: Colors.textOnPrimary,
    },
    invoiceContent: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: 15,
      marginBottom: 15,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    detailLabel: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 14,
      color: Colors.textOnPrimary,
      fontWeight: '600',
      flex: 1,
      textAlign: 'right',
    },
    amountRow: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 8,
      padding: 12,
      marginTop: 5,
    },
    amountText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: Colors.textOnPrimary,
      textAlign: 'center',
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    actionButtonContent: {
      paddingVertical: 12,
      paddingHorizontal: 15,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    actionButtonText: {
      color: Colors.textOnPrimary,
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 5,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
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
    // Date Picker Styles
    datePickerContainer: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 15,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    datePickerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 12,
    },
    dateInputsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    dateInputWrapper: {
      flex: 1,
    },
    dateLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: Colors.textSecondary,
      marginBottom: 6,
    },
    dateInput: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: Colors.text,
      backgroundColor: Colors.background,
    },
    dateButtonsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    dateButton: {
      flex: 1,
      borderRadius: 10,
      overflow: 'hidden',
    },
    dateButtonGradient: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    dateButtonText: {
      color: Colors.textOnPrimary,
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 6,
    },
    clearButton: {
      backgroundColor: Colors.surfaceVariant,
    },
    clearButtonText: {
      color: Colors.textSecondary,
    },
    // Branch Picker Styles
    pickerWrapper: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 10,
      backgroundColor: Colors.background,
      overflow: 'hidden',
    },
    branchPicker: {
      height: 50,
      color: Colors.text,
    },
    // Total Amount Display
    totalAmountCard: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      borderLeftWidth: 4,
      borderLeftColor: Colors.primary,
    },
    totalAmountLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: Colors.textSecondary,
      marginBottom: 8,
    },
    totalAmountValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: Colors.primary,
    },
  });

  const historyStyles = getHistoryStyles();

  useEffect(() => {
    fetchBranches();
    loadInvoices();
  }, []);
  
  useEffect(() => {
    // Reload invoices when filters change
    if (invoices.length > 0 || statusFilter !== 'all' || startDate || endDate || selectedBranch !== 'all') {
      loadInvoices(false);
    }
  }, [statusFilter, startDate, endDate, selectedBranch]);

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        const branchesData = Array.isArray(result.data) ? result.data : [];
        setBranches(branchesData);
        console.log('📍 Branches loaded:', branchesData.length);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const loadInvoices = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      // Build URL with filters
      let url = '/api/invoices/get_invoices.php?';
      const params = [];
      
      if (statusFilter !== 'all') {
        params.push(`status=${statusFilter}`);
      }
      
      if (startDate) {
        params.push(`start_date=${startDate}`);
      }
      
      if (endDate) {
        params.push(`end_date=${endDate}`);
      }
      
      if (selectedBranch !== 'all') {
        params.push(`branch_id=${selectedBranch}`);
      }
      
      url += params.join('&');
      
      console.log('📊 Loading invoices from API:', url);
      const response = await authFetch(url);
      const result = await response.json();
      
      console.log('📊 API Response:', result);
      
      if (result.success) {
        const invoiceData = Array.isArray(result.data) ? result.data : [];
        setInvoices(invoiceData);
        
        // Set statistics if available
        if (result.statistics) {
          setStatistics(result.statistics);
          setTotalAmount(result.statistics.total_amount || 0);
          console.log('📈 Statistics loaded:', result.statistics);
          console.log('💰 Total Amount:', result.statistics.formatted_total_amount);
        } else {
          setTotalAmount(result.total_amount || 0);
          console.log('💰 Total Amount:', result.total_amount);
        }
        
        console.log('✅ Invoices loaded successfully:', invoiceData.length);
      } else {
        setInvoices([]);
        setStatistics(null);
        console.log('❌ API Error:', result.message);
        if (result.message !== 'No invoices found - table not initialized') {
          Alert.alert('Error', result.message || 'Failed to load invoices');
        }
      }
    } catch (error) {
      console.error('❌ Error loading invoices:', error);
      setInvoices([]);
      setStatistics(null);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices(false);
  };

  const getStatusGradient = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return ['#10b981', '#059669'];
      case 'pending': return ['#f59e0b', '#d97706'];
      default: return ['#6366f1', '#4f46e5'];
    }
  };

  const getFilteredInvoices = () => {
    let filtered = invoices;
    
    // Filter out cancelled invoices - don't show them
    filtered = filtered.filter(invoice => invoice.status !== 'cancelled');
    
    // Apply search filter (client-side for quick filtering)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice => 
        (invoice.invoice_number || '').toLowerCase().includes(query) ||
        (invoice.student_name || '').toLowerCase().includes(query) ||
        (invoice.payer_name || '').toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };
  
  const applyDateFilter = () => {
    if (!startDate && !endDate) {
      Alert.alert('Info', 'Please select at least one date');
      return;
    }
    loadInvoices(true);
  };
  
  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleView = (invoice) => {
    const paymentInfo = invoice.payment_method === 'cash' 
      ? `💰 Cash Payment` 
      : `${invoice.payment_method === 'online' ? '🌐' : '💳'} ${invoice.payment_method.charAt(0).toUpperCase() + invoice.payment_method.slice(1)}${invoice.transaction_id ? `\nTransaction ID: ${invoice.transaction_id}` : ''}`;
    
    const details = `Invoice: ${invoice.invoice_number || `INV-${invoice.id}`}
Student: ${invoice.student_name}
${invoice.student_id ? `Student ID: ${invoice.student_id}\n` : ''}Amount: ₹${invoice.formatted_amount || invoice.amount}
Payment: ${paymentInfo}
Status: ${invoice.status?.toUpperCase()}
${invoice.month_year ? `Month: ${invoice.month_year}\n` : ''}Created: ${invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}`;

    Alert.alert('Invoice Details', details, [{ text: 'OK' }]);
  };

  const handleDelete = (invoice) => {
    // Check if already cancelled
    if (invoice.status === 'cancelled') {
      Alert.alert(
        'ℹ️ Already Cancelled',
        'This invoice is already cancelled.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Confirm cancellation
    const statusWarning = invoice.status === 'paid' 
      ? '\n\n⚠️ Warning: This invoice is marked as PAID. Cancelling it will affect your records.' 
      : '';
    
    Alert.alert(
      '❌ Cancel Invoice',
      `Are you sure you want to cancel invoice ${invoice.invoice_number || invoice.id}?\n\nAmount: ₹${parseFloat(invoice.amount || 0).toLocaleString('en-IN')}\nStatus: ${invoice.status || 'N/A'}${statusWarning}\n\nThe invoice will be marked as cancelled.`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            const invoiceId = invoice.id || invoice.invoice_id;
            deleteInvoice(invoiceId);
          }
        }
      ]
    );
  };


  const deleteInvoice = async (invoiceId) => {
    try {
      setLoading(true);
      const response = await authFetch('/api/invoices/delete_invoice.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Update total amount immediately
        const deletedAmount = result.deleted_amount || 0;
        setTotalAmount(prevTotal => prevTotal - deletedAmount);
        
        // Show success message with deleted amount
        Alert.alert(
          '✅ Deleted Successfully', 
          `Invoice deleted!\n\nDeleted Amount: ${result.formatted_deleted_amount || '₹0'}\n\nTotal amount has been reduced.`,
          [
            { text: 'OK', onPress: () => {
              // Refresh the invoice list to show updated data
              loadInvoices(false);
            }}
          ]
        );
      } else {
        Alert.alert('❌ Error', result.message || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      Alert.alert('Error', 'Failed to delete invoice');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (invoice) => {
    try {
      setLoading(true);
      
      const invoiceId = invoice.id || invoice.invoice_id || invoice.invoice_number;
      
      if (!invoiceId) {
        Alert.alert('Error', 'Invoice ID not found');
        return;
      }
      
      console.log('💰 Marking invoice as paid:', invoiceId);
      
      const response = await authFetch('/api/invoices/update_status.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
          status: 'paid'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          '✅ Payment Confirmed!', 
          `Invoice ${invoice.invoice_number || invoiceId} has been marked as PAID.\n\nYou can now download the PDF.`,
          [{ 
            text: 'OK', 
            onPress: () => {
              // Refresh the invoice list to show updated status
              loadInvoices(false);
            }
          }]
        );
      } else {
        Alert.alert('❌ Error', result.message || 'Failed to mark as paid');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      Alert.alert('❌ Error', 'Failed to mark invoice as paid');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (invoice) => {
    try {
      setLoading(true);
      
      // Check session token before making API call
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      
      if (!sessionToken) {
        Alert.alert(
          'Authentication Required',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => {
                AsyncStorage.multiRemove(['sessionToken', 'userData', 'userRole']);
                router.replace('/login');
              }
            }
          ]
        );
        return;
      }
      
      // Use the correct invoice identifier - try multiple fields
      const invoiceId = invoice.id || invoice.invoice_id || invoice.invoice_number;
      
      console.log('📄 Generating PDF for invoice:', invoiceId);
      
      if (!invoiceId) {
        Alert.alert('Error', 'Invoice ID not found');
        return;
      }
      
      const requestBody = { invoice_id: invoiceId };
      
      const response = await authFetch('/api/invoices/generate_pdf.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      
      if (result.success) {
        // Automatically open PDF and show simple success message
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
          ? `PDF generated successfully for invoice ${invoice.invoice_number || invoiceId}!`
          : `Invoice opened in browser - use "Print to PDF" to save as PDF.`;
          
        Alert.alert('✅ PDF Generated!', message);
      } else {
        Alert.alert('❌ Error', result.message || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Handle authentication errors specifically
      if (error.message && error.message.includes('Authentication required')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => {
                AsyncStorage.multiRemove(['sessionToken', 'userData', 'userRole']);
                router.replace('/login');
              }
            }
          ]
        );
      } else {
        Alert.alert('❌ Error', 'Failed to generate PDF. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = getFilteredInvoices();

  if (loading) {
    return (
      <View style={historyStyles.emptyContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={historyStyles.emptyText}>Loading invoices...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={historyStyles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Statistics Section */}
      {statistics && (
        <Animatable.View animation="fadeInUp" duration={600} style={historyStyles.statisticsContainer}>
          <Text style={historyStyles.statisticsTitle}>📊 Invoice Statistics</Text>
          <View style={historyStyles.statsGrid}>
            <View style={historyStyles.statCard}>
              <LinearGradient colors={['#6366f1', '#4f46e5']} style={historyStyles.statGradient}>
                <Ionicons name="document-text" size={24} color={Colors.textOnPrimary} />
                <Text style={historyStyles.statNumber}>{statistics.total_invoices || 0}</Text>
                <Text style={historyStyles.statLabel}>Total Invoices</Text>
              </LinearGradient>
            </View>
            
            <View style={historyStyles.statCard}>
              <LinearGradient colors={['#10b981', '#059669']} style={historyStyles.statGradient}>
                <Ionicons name="cash" size={24} color={Colors.textOnPrimary} />
                <Text style={historyStyles.statNumber}>{statistics.formatted_total_amount || '₹0'}</Text>
                <Text style={historyStyles.statLabel}>Total Amount</Text>
              </LinearGradient>
            </View>
            
            {statistics.status_counts?.paid > 0 && (
              <View style={historyStyles.statCard}>
                <LinearGradient colors={['#10b981', '#059669']} style={historyStyles.statGradient}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.textOnPrimary} />
                  <Text style={historyStyles.statNumber}>{statistics.status_counts.paid}</Text>
                  <Text style={historyStyles.statLabel}>Paid</Text>
                </LinearGradient>
              </View>
            )}
            
            {statistics.status_counts?.pending > 0 && (
              <View style={historyStyles.statCard}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={historyStyles.statGradient}>
                  <Ionicons name="time" size={24} color={Colors.textOnPrimary} />
                  <Text style={historyStyles.statNumber}>{statistics.status_counts.pending}</Text>
                  <Text style={historyStyles.statLabel}>Pending</Text>
                </LinearGradient>
              </View>
            )}
            
          </View>
        </Animatable.View>
      )}


      {/* Date Range Picker */}
      <Animatable.View animation="fadeInUp" duration={600} delay={125} style={historyStyles.datePickerContainer}>
        <Text style={historyStyles.datePickerTitle}>📅 Filter by Date Range</Text>
        <View style={historyStyles.dateInputsRow}>
          <View style={historyStyles.dateInputWrapper}>
            <Text style={historyStyles.dateLabel}>Start Date</Text>
            <TextInput
              style={historyStyles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textSecondary}
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={historyStyles.dateInputWrapper}>
            <Text style={historyStyles.dateLabel}>End Date</Text>
            <TextInput
              style={historyStyles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textSecondary}
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </View>
        <View style={historyStyles.dateButtonsRow}>
          <TouchableOpacity style={historyStyles.dateButton} onPress={applyDateFilter}>
            <LinearGradient colors={['#10b981', '#059669']} style={historyStyles.dateButtonGradient}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.textOnPrimary} />
              <Text style={historyStyles.dateButtonText}>Apply Filter</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={historyStyles.dateButton} 
            onPress={clearDateFilter}
          >
            <View style={[historyStyles.dateButtonGradient, historyStyles.clearButton]}>
              <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
              <Text style={[historyStyles.dateButtonText, historyStyles.clearButtonText]}>Clear</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animatable.View>

      {/* Branch Filter Section */}
      {branches.length > 0 && (
        <Animatable.View animation="fadeInUp" duration={600} delay={137} style={historyStyles.datePickerContainer}>
          <Text style={historyStyles.datePickerTitle}>🏢 Filter by Branch</Text>
          <View style={historyStyles.pickerWrapper}>
            <Picker
              selectedValue={selectedBranch}
              onValueChange={setSelectedBranch}
              style={historyStyles.branchPicker}
            >
              <Picker.Item label="All Branches" value="all" />
              {branches.map((branch) => (
                <Picker.Item 
                  key={branch.id} 
                  label={branch.name} 
                  value={branch.id.toString()} 
                />
              ))}
            </Picker>
          </View>
        </Animatable.View>
      )}

      {/* Search and Filter Section */}
      <Animatable.View animation="fadeInUp" duration={600} delay={150} style={historyStyles.searchContainer}>
        <View style={historyStyles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={historyStyles.searchInput}
            placeholder="Search invoices..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={historyStyles.filterContainer}>
          {['all', 'paid', 'pending'].map((status) => (
            <TouchableOpacity
              key={status}
              style={historyStyles.filterButton}
              onPress={() => setStatusFilter(status)}
            >
              {statusFilter === status ? (
                <LinearGradient colors={['#6366f1', '#4f46e5']} style={historyStyles.filterGradient}>
                  <Ionicons 
                    name={status === 'all' ? 'list' : status === 'paid' ? 'checkmark-circle' : 'time'} 
                    size={16} 
                    color={Colors.textOnPrimary} 
                  />
                  <Text style={historyStyles.filterText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                </LinearGradient>
              ) : (
                <View style={[historyStyles.filterGradient, historyStyles.inactiveFilterButton]}>
                  <Ionicons 
                    name={status === 'all' ? 'list' : status === 'paid' ? 'checkmark-circle' : 'time'} 
                    size={16} 
                    color={Colors.textSecondary} 
                  />
                  <Text style={[historyStyles.filterText, historyStyles.inactiveFilterText]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animatable.View>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <Animatable.View animation="fadeInUp" duration={600} delay={300} style={historyStyles.emptyContainer}>
          <Ionicons name="document-text-outline" size={80} color={Colors.textSecondary} />
          <Text style={historyStyles.emptyText}>
            {searchQuery || statusFilter !== 'all' ? 'No matching invoices' : 'No Invoices Found'}
          </Text>
          <Text style={historyStyles.emptySubtext}>
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first invoice using the\n"Create Invoice" tab'
            }
          </Text>
        </Animatable.View>
      ) : (
        safeMap(filteredInvoices, (invoice, index) => (
          <Animatable.View 
            key={generateSafeKey(invoice, index, 'invoice')} 
            animation="fadeInUp" 
            duration={600} 
            delay={300 + (index * 50)}
            style={historyStyles.invoiceCard}
          >
            <LinearGradient colors={getStatusGradient(invoice.status)} style={historyStyles.invoiceCardGradient}>
              {/* Invoice Header */}
              <View style={historyStyles.invoiceHeader}>
                <Text style={historyStyles.invoiceNumber}>{invoice.invoice_number || `INV-${invoice.id}` || 'N/A'}</Text>
                <View style={historyStyles.statusBadge}>
                  <Text style={historyStyles.statusText}>{(invoice.status || 'pending').toUpperCase()}</Text>
                </View>
              </View>

              {/* Invoice Content */}
              <View style={historyStyles.invoiceContent}>
                <View style={historyStyles.detailRow}>
                  <Text style={historyStyles.detailLabel}>Student:</Text>
                  <Text style={historyStyles.detailValue}>{invoice.student_name || 'N/A'}</Text>
                </View>
                <View style={historyStyles.detailRow}>
                  <Text style={historyStyles.detailLabel}>Category:</Text>
                  <Text style={historyStyles.detailValue}>{invoice.fee_category || 'N/A'}</Text>
                </View>
                <View style={historyStyles.detailRow}>
                  <Text style={historyStyles.detailLabel}>Branch:</Text>
                  <Text style={historyStyles.detailValue}>{invoice.branch || 'N/A'}</Text>
                </View>
                {invoice.month_year && (
                  <View style={historyStyles.detailRow}>
                    <Text style={historyStyles.detailLabel}>Month:</Text>
                    <Text style={historyStyles.detailValue}>{invoice.month_year}</Text>
                  </View>
                )}
                <View style={historyStyles.detailRow}>
                  <Text style={historyStyles.detailLabel}>Payer:</Text>
                  <Text style={historyStyles.detailValue}>{invoice.payer_name || 'N/A'}</Text>
                </View>
                <View style={historyStyles.detailRow}>
                  <Text style={historyStyles.detailLabel}>Created:</Text>
                  <Text style={historyStyles.detailValue}>
                    {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                
                {/* Amount Row */}
                <View style={historyStyles.amountRow}>
                  <Text style={historyStyles.amountText}>
                    ₹{parseFloat(invoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={historyStyles.actionButtons}>
                <TouchableOpacity 
                  style={historyStyles.actionButton} 
                  onPress={() => handleView(invoice)}
                >
                  <View style={historyStyles.actionButtonContent}>
                    <Ionicons name="eye" size={16} color={Colors.textOnPrimary} />
                    <Text style={historyStyles.actionButtonText}>View</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    historyStyles.actionButton,
                    invoice.status === 'pending' ? { backgroundColor: '#28a745' } : {}
                  ]} 
                  onPress={() => invoice.status === 'pending' ? markAsPaid(invoice) : downloadPDF(invoice)}
                >
                  <View style={historyStyles.actionButtonContent}>
                    <Ionicons 
                      name={invoice.status === 'pending' ? "checkmark-circle" : "download"} 
                      size={16} 
                      color={Colors.textOnPrimary} 
                    />
                    <Text style={historyStyles.actionButtonText}>
                      {invoice.status === 'pending' ? 'Mark Paid' : 'PDF'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={historyStyles.actionButton} 
                  onPress={() => handleDelete(invoice)}
                >
                  <View style={historyStyles.actionButtonContent}>
                    <Ionicons name="trash" size={16} color={Colors.textOnPrimary} />
                    <Text style={historyStyles.actionButtonText}>Delete</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animatable.View>
        ))
      )}
    </ScrollView>
  );
}
