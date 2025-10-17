import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Invoice from '../(common)/invoice';
import Colors from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';


const branchData = {
    'Main Campus': {
      address: '123 Main St, Cityville, State 12345',
      contact: '+1 111-222-3333',
    },
  };

const WalletScreen = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWalletData = useCallback(async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (!storedUser) {
          throw new Error('User not found');
        }
        const user = JSON.parse(storedUser);

        const response = await authFetch(`/api/get_wallet.php?student_id=${user.id}`);
        const data = await response.json();

        if (data.success) {
          const walletData = {
            ...data.data,
            walletBalance: parseFloat(data.data.walletBalance),
            dueAmount: parseFloat(data.data.dueAmount),
          };
          setWallet(walletData);
        } else {
          Alert.alert('Error', data.message || 'Failed to fetch wallet data.');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching wallet data.');
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);
  const [modalVisible, setModalVisible] = useState(false);
  const [paidTransaction, setPaidTransaction] = useState(null);
  const [paying, setPaying] = useState(false);
  const invoiceRef = useRef();

  const handlePayFee = async () => {
    if (wallet.walletBalance < wallet.dueAmount) {
      Alert.alert("Insufficient Balance", "Please add money to your wallet to pay the fee.");
      return;
    }

    setPaying(true);
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      if (!storedUser) throw new Error('User not found');
      const user = JSON.parse(storedUser);

      const response = await authFetch('/api/pay_fee.php', {
        method: 'POST',
        body: JSON.stringify({ student_id: user.id, amount: wallet.dueAmount }),
      });

      const result = await response.json();

      if (result.success) {
        setPaidTransaction(result.data.transaction);
        setModalVisible(true);
        fetchWalletData(); // Refresh wallet data
      } else {
        Alert.alert('Payment Failed', result.message || 'An error occurred during payment.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while processing your payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadInvoice = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required.');
        return;
    }

    try {
        const uri = await invoiceRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('Success', 'Invoice saved to your gallery!');
    } catch (error) {
        console.error('Failed to save invoice:', error);
        Alert.alert('Error', 'Failed to save the invoice.');
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
        <View style={styles.transactionIconContainer}>
            <Ionicons 
                name={item.type === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                size={30} 
                color={item.type === 'credit' ? Colors.accent : Colors.danger} 
            />
        </View>
        <View style={styles.transactionDetails}>
            <Text style={styles.transactionDescription}>{item.description}</Text>
            <Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color: item.type === 'credit' ? Colors.accent : Colors.danger }]}>
            {item.type === 'credit' ? '+' : '-'}INR {item.amount.toFixed(2)}
        </Text>
    </View>
  );

    if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!wallet) {
    return <View style={styles.centered}><Text>No wallet data found.</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.headerCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>INR {wallet.walletBalance.toFixed(2)}</Text>
            <TouchableOpacity style={styles.addMoneyButton}>
                <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
                <Text style={styles.addMoneyButtonText}>Add Money</Text>
            </TouchableOpacity>
        </View>

        {wallet.dueAmount > 0 && (
            <View style={styles.dueCard}>
                <View>
                    <Text style={styles.dueLabel}>Due Amount</Text>
                    <Text style={styles.dueAmount}>INR {wallet.dueAmount.toFixed(2)}</Text>
                    <Text style={styles.dueDate}>Due by {new Date(wallet.dueDate).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity style={styles.payButton} onPress={handlePayFee} disabled={paying}>
                    <Text style={styles.payButtonText}>{paying ? 'Processing...' : 'Pay Now'}</Text>
                </TouchableOpacity>
            </View>
        )}

        <View style={styles.transactionsContainer}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <FlatList
                data={wallet.transactions}
                renderItem={renderTransaction}
                keyExtractor={item => item.id}
                scrollEnabled={false} // Disable FlatList scrolling, use ScrollView instead
                ListEmptyComponent={<Text style={styles.noTransactionsText}>No recent transactions.</Text>}
            />
        </View>

        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <ViewShot ref={invoiceRef} options={{ format: 'png', quality: 1 }}>
                        <Invoice transaction={paidTransaction} branchDetails={branchData[paidTransaction?.branch]} />
                    </ViewShot>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadInvoice}>
                            <Ionicons name="download-outline" size={24} color={Colors.white} />
                            <Text style={styles.downloadButtonText}>Download</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerCard: { backgroundColor: Colors.primary, padding: 25, borderRadius: 20, margin: 15, alignItems: 'center', elevation: 10, shadowColor: Colors.black, shadowOpacity: 0.2, shadowRadius: 10 },
    balanceLabel: { color: Colors.white, fontSize: 16, opacity: 0.8 },
    balanceAmount: { color: Colors.white, fontSize: 40, fontWeight: 'bold', marginVertical: 10 },
    addMoneyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white_20, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
    addMoneyButtonText: { color: Colors.white, marginLeft: 8, fontWeight: '600' },
    dueCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: 15, padding: 20, borderRadius: 15, elevation: 5, marginTop: 5 },
    dueLabel: { fontSize: 14, color: Colors.textSecondary },
    dueAmount: { fontSize: 22, fontWeight: 'bold', color: Colors.danger, marginVertical: 4 },
    dueDate: { fontSize: 12, color: Colors.gray },
    payButton: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10 },
    payButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
    transactionsContainer: { marginHorizontal: 15, marginTop: 25 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 15 },
    transactionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, padding: 15, borderRadius: 10, marginBottom: 10 },
    transactionIconContainer: { marginRight: 15 },
    transactionDetails: { flex: 1 },
    transactionDescription: { fontSize: 16, fontWeight: '500', color: Colors.textPrimary },
    transactionDate: { fontSize: 12, color: Colors.gray, marginTop: 4 },
    transactionAmount: { fontSize: 16, fontWeight: 'bold' },
    noTransactionsText: { textAlign: 'center', color: Colors.gray, marginTop: 20 },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.black_60 },
    modalContent: { width: '90%', backgroundColor: Colors.white, borderRadius: 10, padding: 10 },
    modalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    downloadButton: { backgroundColor: Colors.accent, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, marginRight: 5 },
    downloadButtonText: { color: Colors.white, fontWeight: 'bold', marginLeft: 10 },
    closeButton: { backgroundColor: Colors.danger, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', flex: 1, marginLeft: 5 },
    closeButtonText: { color: Colors.white, fontWeight: 'bold' },
});

export default WalletScreen;
