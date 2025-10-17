import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EnhancedInvoiceGenerator() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [guardianType, setGuardianType] = useState('father');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Invoice items
  const [invoiceItems, setInvoiceItems] = useState([
    {
      id: 1,
      type: 'tuition_fee',
      description: 'Monthly Tuition Fee',
      quantity: 1,
      unitPrice: '0'
    }
  ]);

  const feeTypes = [
    { value: 'tuition_fee', label: 'Tuition Fee' },
    { value: 'admission_fee', label: 'Admission Fee' },
    { value: 'exam_fee', label: 'Exam Fee' },
    { value: 'transport_fee', label: 'Transport Fee' },
    { value: 'library_fee', label: 'Library Fee' },
    { value: 'lab_fee', label: 'Lab Fee' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    loadCurrentUser();
    fetchStudents();
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

  const fetchStudents = async () => {
    try {
      const response = await authFetch('/api/users/get_users.php?role=Student,Tuition Student');
      const result = await response.json();
      
      if (result.success) {
        setStudents(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to fetch students');
    }
  };

  const handleStudentSelect = (studentId) => {
    const student = students.find(s => s.id == studentId);
    setSelectedStudent(student);
    
    if (student) {
      // Auto-populate guardian information if available
      if (student.father_name) {
        setGuardianType('father');
        setGuardianName(student.father_name);
        setGuardianPhone(student.father_phone || '');
        setGuardianEmail(student.father_email || '');
      } else if (student.mother_name) {
        setGuardianType('mother');
        setGuardianName(student.mother_name);
        setGuardianPhone(student.mother_phone || '');
        setGuardianEmail(student.mother_email || '');
      } else {
        setGuardianName(student.guardian_name || '');
        setGuardianPhone(student.guardian_phone || '');
        setGuardianEmail(student.guardian_email || '');
      }
    }
  };

  const handleGuardianTypeChange = (type) => {
    setGuardianType(type);
    
    if (selectedStudent) {
      switch (type) {
        case 'father':
          setGuardianName(selectedStudent.father_name || '');
          setGuardianPhone(selectedStudent.father_phone || '');
          setGuardianEmail(selectedStudent.father_email || '');
          break;
        case 'mother':
          setGuardianName(selectedStudent.mother_name || '');
          setGuardianPhone(selectedStudent.mother_phone || '');
          setGuardianEmail(selectedStudent.mother_email || '');
          break;
        case 'guardian':
          setGuardianName(selectedStudent.guardian_name || '');
          setGuardianPhone(selectedStudent.guardian_phone || '');
          setGuardianEmail(selectedStudent.guardian_email || '');
          break;
      }
    }
  };

  const addInvoiceItem = () => {
    const newItem = {
      id: Date.now(),
      type: 'tuition_fee',
      description: '',
      quantity: 1,
      unitPrice: '0'
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const updateInvoiceItem = (id, field, value) => {
    setInvoiceItems(items =>
      items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeInvoiceItem = (id) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(items => items.filter(item => item.id !== id));
    }
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((total, item) => {
      return total + (parseFloat(item.quantity) * parseFloat(item.unitPrice || 0));
    }, 0);
  };

  const generateInvoice = async () => {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a student');
      return;
    }

    if (!guardianName.trim()) {
      Alert.alert('Error', 'Please enter guardian name');
      return;
    }

    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      Alert.alert('Error', 'Invoice total must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        student_id: selectedStudent.id,
        guardian_type: guardianType,
        guardian_name: guardianName.trim(),
        guardian_phone: guardianPhone.trim(),
        guardian_email: guardianEmail.trim(),
        total_amount: totalAmount,
        due_date: dueDate.toISOString().split('T')[0],
        notes: notes.trim(),
        items: invoiceItems.map(item => ({
          type: item.type,
          description: item.description,
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.unitPrice)
        }))
      };

      const response = await authFetch('/api/invoices/generate_invoice.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          'Success',
          `Invoice ${result.invoice_number} generated successfully!`,
          [
            {
              text: 'View Invoice',
              onPress: () => router.push(`/(common)/invoice-detail?id=${result.invoice_id}`)
            },
            {
              text: 'Generate Another',
              onPress: resetForm
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      Alert.alert('Error', 'Failed to generate invoice');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setGuardianType('father');
    setGuardianName('');
    setGuardianPhone('');
    setGuardianEmail('');
    setDueDate(new Date());
    setNotes('');
    setInvoiceItems([
      {
        id: 1,
        type: 'tuition_fee',
        description: 'Monthly Tuition Fee',
        quantity: 1,
        unitPrice: '0'
      }
    ]);
  };

  const renderInvoiceItem = (item, index) => (
    <Animatable.View 
      key={item.id} 
      animation="fadeInUp" 
      delay={index * 100}
      style={styles.invoiceItem}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>Item {index + 1}</Text>
        {invoiceItems.length > 1 && (
          <TouchableOpacity 
            onPress={() => removeInvoiceItem(item.id)}
            style={styles.removeButton}
          >
            <MaterialCommunityIcons name="close" size={20} color={Colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Fee Type</Text>
        <Picker
          selectedValue={item.type}
          onValueChange={(value) => updateInvoiceItem(item.id, 'type', value)}
          style={styles.picker}
        >
          {feeTypes.map(type => (
            <Picker.Item key={type.value} label={type.label} value={type.value} />
          ))}
        </Picker>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          value={item.description}
          onChangeText={(value) => updateInvoiceItem(item.id, 'description', value)}
          placeholder="Enter description"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={item.quantity.toString()}
            onChangeText={(value) => updateInvoiceItem(item.id, 'quantity', value)}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>

        <View style={styles.halfInput}>
          <Text style={styles.label}>Unit Price (₹)</Text>
          <TextInput
            style={styles.input}
            value={item.unitPrice}
            onChangeText={(value) => updateInvoiceItem(item.id, 'unitPrice', value)}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>
      </View>

      <View style={styles.itemTotal}>
        <Text style={styles.itemTotalText}>
          Total: ₹{(parseFloat(item.quantity) * parseFloat(item.unitPrice || 0)).toFixed(2)}
        </Text>
      </View>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generate Invoice</Text>
        <TouchableOpacity onPress={resetForm} style={styles.resetButton}>
          <MaterialCommunityIcons name="refresh" size={24} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Student Selection */}
        <Animatable.View animation="fadeInDown" style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Select Student *</Text>
            <Picker
              selectedValue={selectedStudent?.id || ''}
              onValueChange={handleStudentSelect}
              style={styles.picker}
            >
              <Picker.Item label="Choose a student..." value="" />
              {students.map(student => (
                <Picker.Item 
                  key={student.id} 
                  label={`${student.name} (${student.student_id || student.id})`} 
                  value={student.id} 
                />
              ))}
            </Picker>
          </View>

          {selectedStudent && (
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{selectedStudent.name}</Text>
              <Text style={styles.studentDetails}>
                ID: {selectedStudent.student_id || selectedStudent.id} | 
                Class: {selectedStudent.class || 'N/A'} | 
                Branch: {selectedStudent.branch_name || 'N/A'}
              </Text>
            </View>
          )}
        </Animatable.View>

        {/* Guardian Information */}
        {selectedStudent && (
          <Animatable.View animation="fadeInUp" delay={200} style={styles.section}>
            <Text style={styles.sectionTitle}>Guardian Information</Text>
            
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Guardian Type *</Text>
              <Picker
                selectedValue={guardianType}
                onValueChange={handleGuardianTypeChange}
                style={styles.picker}
              >
                <Picker.Item label="Father" value="father" />
                <Picker.Item label="Mother" value="mother" />
                <Picker.Item label="Guardian" value="guardian" />
              </Picker>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Guardian Name *</Text>
              <TextInput
                style={styles.input}
                value={guardianName}
                onChangeText={setGuardianName}
                placeholder="Enter guardian name"
              />
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={guardianEmail}
                  onChangeText={setGuardianEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                />
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Invoice Items */}
        {selectedStudent && (
          <Animatable.View animation="fadeInUp" delay={400} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Invoice Items</Text>
              <TouchableOpacity onPress={addInvoiceItem} style={styles.addButton}>
                <MaterialCommunityIcons name="plus" size={20} color={Colors.white} />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {invoiceItems.map((item, index) => renderInvoiceItem(item, index))}

            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>
                Total Amount: ₹{calculateTotal().toFixed(2)}
              </Text>
            </View>
          </Animatable.View>
        )}

        {/* Additional Information */}
        {selectedStudent && (
          <Animatable.View animation="fadeInUp" delay={600} style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Due Date *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.dateText}>{dueDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes or instructions..."
                multiline
                numberOfLines={3}
              />
            </View>
          </Animatable.View>
        )}

        {/* Generate Button */}
        {selectedStudent && (
          <Animatable.View animation="fadeInUp" delay={800} style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.generateButton, { opacity: loading ? 0.7 : 1 }]}
              onPress={generateInvoice}
              disabled={loading}
            >
              <LinearGradient colors={Colors.gradientPrimary} style={styles.generateButtonGradient}>
                {loading ? (
                  <MaterialCommunityIcons name="loading" size={24} color={Colors.white} />
                ) : (
                  <MaterialCommunityIcons name="file-document" size={24} color={Colors.white} />
                )}
                <Text style={styles.generateButtonText}>
                  {loading ? 'Generating...' : 'Generate Invoice'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        )}
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={dueDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) setDueDate(selectedDate);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  resetButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  picker: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: Colors.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  studentInfo: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  studentDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.white,
  },
  dateText: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  invoiceItem: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  removeButton: {
    padding: 4,
  },
  itemTotal: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  itemTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  totalContainer: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  buttonContainer: {
    paddingVertical: 20,
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginLeft: 8,
  },
});
