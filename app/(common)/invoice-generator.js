import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, FlatList, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Picker } from '@react-native-picker/picker';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useWindowDimensions } from 'react-native';
import Colors from '../constants/colors';
import authFetch from '../utils/api';

export default function InvoiceGenerator() {
  const layout = useWindowDimensions();

  // shared
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home', title: 'Home' },
    { key: 'history', title: 'History' },
  ]);

  /******************** HOME TAB STATE ********************/
  const [branches, setBranches] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [paymentType, setPaymentType] = useState('admission'); // admission | monthly
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [payerName, setPayerName] = useState('');
  // remove any preceding duplicate payerPhone lines
  const [payerPhone, setPayerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingHome, setLoadingHome] = useState(true);

  /******************** HISTORY TAB STATE ********************/
  const [historyLoading, setHistoryLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [branchRes, studentRes] = await Promise.all([
        authFetch('/api/branches/get_branches.php'),
        authFetch('/api/students/get_students.php'),
      ]);
      const branchJson = await branchRes.json();
      const studentJson = await studentRes.json();
      setBranches(branchJson.success ? branchJson.data : []);
      setStudents(studentJson.success ? studentJson.data : []);
      setFilteredStudents(studentJson.success ? studentJson.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHome(false);
      loadHistory();
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await authFetch('/api/invoices/get_invoices.php');
      const json = await res.json();
      setInvoices(json.success ? json.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const onBranchChange = (branchId) => {
    const branch = branches.find(b => b.id == branchId);
    setSelectedBranch(branch);
    // filter students
    const filtered = students.filter(s => s.branch_id == branchId);
    setFilteredStudents(filtered);
    setSelectedStudent(null);
  };

  const validateAndSubmit = async () => {
    if (!selectedBranch) return Alert.alert('Validation', 'Please select a branch');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Validation', 'Enter valid amount');
    if (paymentType === 'admission' && !payerName.trim()) return Alert.alert('Validation', 'Enter payer name');
    if (paymentType === 'admission' && !payerPhone.trim()) return Alert.alert('Validation', 'Enter payer phone number');
    if (paymentType === 'monthly' && !selectedStudent) return Alert.alert('Validation', 'Select student');

    const payload = {
      branch_id: selectedBranch.id,
      payment_type: paymentType,
      amount: parseFloat(amount),
      payer_name: payerName.trim(),
      payer_phone: payerPhone.trim(),
      student_id: paymentType === 'monthly' ? selectedStudent?.id : null,
    };

    setLoadingSubmit(true);
    try {
      const res = await authFetch('/api/invoices/create_invoice.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert('Success', 'Invoice created successfully');
        // reset
        setPaymentType('admission');
        setSelectedStudent(null);
        setPayerName('');
        setPayerPhone('');
        setAmount('');
        loadHistory();
      } else {
        Alert.alert('Error', json.message || 'Failed');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Request failed');
    } finally {
      setLoadingSubmit(false);
    }
  };

  /* ----------------- Renderers -----------------*/
  const HomeRoute = () => (
    loadingHome ? (
      <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
    ) : (
      <ScrollView contentContainerStyle={styles.formContainer}>
        {/* Branch Picker */}
        <Text style={styles.label}>Branch</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedBranch?.id}
            onValueChange={onBranchChange}
          >
            <Picker.Item label="Select branch" value={null} />
            {branches.map(b => (
              <Picker.Item key={b.id} label={b.name} value={b.id} />
            ))}
          </Picker>
        </View>

        {/* Payment type */}
        <Text style={styles.label}>Payment Type</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={paymentType} onValueChange={setPaymentType}>
            <Picker.Item label="Admission" value="admission" />
            <Picker.Item label="Monthly" value="monthly" />
          </Picker>
        </View>

        {paymentType === 'monthly' && (
          <>
            <Text style={styles.label}>Student</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={selectedStudent?.id} onValueChange={(id)=>setSelectedStudent(filteredStudents.find(s=>s.id==id))}>
                <Picker.Item label="Select student" value={null} />
                {filteredStudents.map(s => (
                  <Picker.Item key={s.id} label={`${s.name} (${s.student_id})`} value={s.id} />
                ))}
              </Picker>
            </View>
          </>
        )}

        {/* Payer name */}
        {paymentType === 'admission' && (
          <>
            <Text style={styles.label}>Payer Name</Text>
            <TextInput style={styles.input} value={payerName} onChangeText={setPayerName} placeholder="Enter payer name" />
            <Text style={styles.label}>Payer Phone</Text>
            <TextInput style={styles.input} value={payerPhone} onChangeText={setPayerPhone} placeholder="Enter payer phone" keyboardType="phone-pad" />
          </>
        )}

        {/* Amount */}
        <Text style={styles.label}>Amount</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Enter amount" keyboardType="numeric" />

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={validateAndSubmit} disabled={loadingSubmit}>
          {loadingSubmit ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.submitText}>Create Invoice</Text>}
        </TouchableOpacity>
      </ScrollView>
    )
  );

  const HistoryRoute = () => (
    historyLoading ? (
      <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
    ) : (
      <FlatList
        data={invoices}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({item}) => (
          <LinearGradient colors={Colors.gradientMain} style={styles.invoiceCard}>
            <View style={{flex:1}}>
              <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
              <Text style={styles.invoiceDetails}>{item.student_name || item.payer_name}</Text>
              {item.payer_phone && <Text style={styles.invoiceDetails}>{item.payer_phone}</Text>}
              <Text style={styles.invoiceDetails}>₹ {item.amount}</Text>
            </View>
            <Text style={styles.invoiceDate}>{item.created_at?.split(' ')[0]}</Text>
          </LinearGradient>
        )}
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop:40}}>No invoices found.</Text>}
        refreshing={historyLoading}
        onRefresh={loadHistory}
      />
    )
  );

  const renderScene = SceneMap({ home: HomeRoute, history: HistoryRoute });

  return (
    <View style={{flex:1}}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: Colors.primary }}
            style={{ backgroundColor: Colors.white }}
            activeColor={Colors.primary}
            inactiveColor={Colors.text}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered:{flex:1, justifyContent:'center', alignItems:'center'},
  formContainer:{padding:15},
  label:{marginBottom:4, fontWeight:'600', color:Colors.text},
  pickerWrapper:{borderWidth:1, borderColor:'#ccc', borderRadius:8, marginBottom:15},
  input:{borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10, marginBottom:15},
  submitBtn:{backgroundColor:Colors.primary, padding:15, borderRadius:8, alignItems:'center', marginTop:10},
  submitText:{color:Colors.white, fontWeight:'bold'},
  invoiceCard:{flexDirection:'row', padding:15, borderRadius:12, marginBottom:12, alignItems:'center'},
  invoiceNumber:{fontSize:16, fontWeight:'700', color:Colors.white},
  invoiceDetails:{color:Colors.white, marginTop:2},
  invoiceDate:{color:Colors.white, fontSize:12},
});