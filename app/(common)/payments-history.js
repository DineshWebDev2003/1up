import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Image, Modal, TouchableOpacity, Platform, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Invoice from './invoice'; // Import the Invoice component
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

// Mock Data for payment history
const paymentHistory = [
  { id: '1', studentId: 'S001', studentName: 'John Doe', branch: 'Main Campus', paymentMethod: 'Card', amount: 500, date: '2023-08-01', status: 'Paid' },
  { id: '2', studentId: 'S002', studentName: 'Mary Williams', branch: 'North Campus', paymentMethod: 'Cash', amount: 450, date: '2023-08-02', status: 'Paid' },
  { id: '3', studentId: 'S001', studentName: 'John Doe', branch: 'Main Campus', paymentMethod: 'Card', amount: 500, date: '2023-09-01', status: 'Paid' },
  { id: '4', studentId: 'S003', studentName: 'Alex Johnson', branch: 'East Campus', paymentMethod: 'Online', amount: 500, date: '2023-09-01', status: 'Pending' },
  { id: '5', studentId: 'S002', studentName: 'Mary Williams', branch: 'North Campus', paymentMethod: 'Cash', amount: 450, date: '2023-09-02', status: 'Paid' },
];

const branches = ['All', 'Main Campus', 'North Campus', 'East Campus'];
const paymentMethods = ['All', 'Card', 'Cash', 'Online'];

const branchData = {
  'Main Campus': {
    address: '123 Main St, Cityville, State 12345',
    contact: '+1 111-222-3333',
  },
  'North Campus': {
    address: '456 North Ave, Townsville, State 54321',
    contact: '+1 444-555-6666',
  },
  'East Campus': {
    address: '789 East Blvd, Villagetown, State 67890',
    contact: '+1 777-888-9999',
  },
  'Chithode': { // Adding Chithode as in the example
    address: 'No.1, Vinayaka Residency, 37/2, Kumilamparappu Pirivu, Nadupalayam, Chithode, Erode, Tamil Nadu 638102',
    contact: '+91 97877 51430',
  },
};

export default function PaymentsHistoryScreen() {
  const [filteredPayments, setFilteredPayments] = useState(paymentHistory);
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedMethod, setSelectedMethod] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const invoiceRef = useRef();

  const openInvoice = (transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
  };

  const handleDownload = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Permission to access media library is required to download the invoice.');
      return;
    }

    try {
      const uri = await invoiceRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'Invoice saved to gallery!');
    } catch (error) {
      console.error('Failed to save invoice:', error);
      Alert.alert('Error', 'Failed to save invoice. Please try again.');
    }
  };

  const closeInvoice = () => {
    setModalVisible(false);
  };

  useEffect(() => {
    let payments = paymentHistory;
    if (selectedBranch !== 'All') {
      payments = payments.filter(p => p.branch === selectedBranch);
    }
    if (selectedMethod !== 'All') {
      payments = payments.filter(p => p.paymentMethod === selectedMethod);
    }
    setFilteredPayments(payments);
  }, [selectedBranch, selectedMethod]);

  const renderPaymentItem = ({ item }) => (
    <TouchableOpacity onPress={() => openInvoice(item)}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={require('../../assets/Avartar.png')} style={styles.avatar} />
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.studentName} ({item.studentId})</Text>
            <Text style={styles.detailText}>{item.branch}</Text>
          </View>
          <Text style={[styles.status, item.status === 'Paid' ? styles.paid : styles.pending]}>
            {item.status}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.detailText}>Amount: ${item.amount}</Text>
          <Text style={styles.detailText}>Date: {item.date}</Text>
          <Text style={styles.detailText}>Method: {item.paymentMethod}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Payments History</Text>
        <View style={styles.filtersContainer}>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedBranch} onValueChange={(itemValue) => setSelectedBranch(itemValue)} style={styles.picker}>
              {branches.map(b => <Picker.Item key={b} label={b} value={b} />)}
            </Picker>
          </View>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedMethod} onValueChange={(itemValue) => setSelectedMethod(itemValue)} style={styles.picker}>
              {paymentMethods.map(m => <Picker.Item key={m} label={m} value={m} />)}
            </Picker>
          </View>
        </View>
        <FlatList
          data={filteredPayments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No payment history found.</Text>}
        />

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <ViewShot ref={invoiceRef} options={{ format: 'png', quality: 1 }}>
                <Invoice transaction={selectedTransaction} branchDetails={branchData[selectedTransaction?.branch]} />
              </ViewShot>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                  <Ionicons name="download-outline" size={24} color="#fff" />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={closeInvoice}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fc',
  },
  container: {
    flex: 1,
    padding: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  picker: {
    height: 50,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#000',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: 'orange',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
    overflow: 'hidden',
    marginLeft: 'auto',
  },
  paid: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  pending: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  cardBody: {},
  detailText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  downloadButton: {
    backgroundColor: '#5DBF79',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 5,
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: '#C73E63',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

