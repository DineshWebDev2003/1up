import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, Platform, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';
import Colors from '../constants/colors';

// Mock Data
const teachers = [
  { id: '1', name: 'Mrs. Davis' },
  { id: '2', name: 'Mr. Smith' },
  { id: '3', name: 'Ms. Jones' },
];

const initialLeaveRequests = [
  { id: '1', date: '2023-08-15', reason: 'Family function.', status: 'Approved' },
  { id: '2', date: '2023-08-01', reason: 'Not feeling well.', status: 'Approved' },
  { id: '3', date: '2023-09-01', reason: 'Personal emergency.', status: 'Pending' },
];

const statusColors = {
  Approved: ['#90C695', '#5D9CEC'], // Green to Blue
  Pending: ['#FFD700', '#FF85A1'], // Yellow to Pink
};

const LeaveRequestScreen = () => {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(teachers[0].id);
  const [leaveRequests, setLeaveRequests] = useState(initialLeaveRequests);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for your leave.');
      return;
    }
    const newRequest = {
      id: `lr_${Date.now()}`,
      date: date.toISOString().split('T')[0],
      reason,
      status: 'Pending',
    };
    setLeaveRequests([newRequest, ...leaveRequests]);
    setReason('');
    Alert.alert('Success', 'Your leave request has been submitted.');
  };

  const renderLeaveRequest = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
      <LinearGradient colors={statusColors[item.status]} style={styles.requestItem}>
        <View style={styles.requestItemHeader}>
            <Ionicons name="calendar-outline" size={22} color={Colors.white} />
            <Text style={styles.requestDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.requestReason}>{item.reason}</Text>
        <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInDown">
          <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.header}>
            <LottieView source={require('../../assets/Calendar Animation.json')} autoPlay loop style={styles.lottie} />
            <Text style={styles.headerTitle}>Leave Request</Text>
          </LinearGradient>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={200} style={styles.formContainer}>
            <Text style={styles.title}>Submit a New Request</Text>

            <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar" size={24} color={Colors.primary} />
                <Text style={styles.inputText}>{`Leave Date: ${date.toLocaleDateString()}`}</Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    testID="dateTimePicker"
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}

            <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={24} color={Colors.primary} />
                <Picker
                    selectedValue={selectedTeacher}
                    style={styles.picker}
                    onValueChange={(itemValue) => setSelectedTeacher(itemValue)} >
                    {teachers.map(t => <Picker.Item key={t.id} label={t.name} value={t.id} />)}
                </Picker>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="create-outline" size={24} color={Colors.primary} style={{marginTop: 15}} />
              <TextInput
                  style={[styles.inputText, styles.reasonInput]}
                  placeholder="Reason for leave..."
                  placeholderTextColor={Colors.lightText}
                  value={reason}
                  onChangeText={setReason}
                  multiline
              />
            </View>

            <TouchableOpacity onPress={handleSubmit}>
              <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.submitButton}>
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                  <Ionicons name="send-outline" size={22} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={400} style={styles.historyContainer}>
            <Text style={styles.title}>Request History</Text>
            <FlatList
                data={leaveRequests}
                renderItem={renderLeaveRequest}
                keyExtractor={item => item.id}
                scrollEnabled={false}
            />
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.background },
    container: { flex: 1 },
    header: {
      alignItems: 'center',
      paddingTop: 40,
      paddingBottom: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: Colors.white, marginTop: 10 },
    lottie: { width: 150, height: 150 },
    formContainer: { padding: 20, backgroundColor: Colors.white, margin: 15, borderRadius: 20, elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 20 },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.lightGray,
      borderRadius: 15,
      paddingHorizontal: 15,
      marginBottom: 15,
      minHeight: 55,
    },
    inputText: { flex: 1, marginLeft: 10, fontSize: 16, color: Colors.text },
    picker: { flex: 1, height: 55 },
    reasonInput: { height: 120, textAlignVertical: 'top', paddingTop: 15 },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 15,
      marginTop: 10,
    },
    submitButtonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold', marginRight: 10 },
    historyContainer: { padding: 20, marginHorizontal: 15, borderRadius: 20, marginBottom: 20 },
    requestItem: {
      padding: 20,
      borderRadius: 15,
      marginBottom: 15,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
    },
    requestItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    requestDate: { fontSize: 18, fontWeight: 'bold', marginLeft: 10, color: Colors.white },
    requestReason: { fontSize: 16, color: Colors.white, marginBottom: 15, paddingLeft: 32, opacity: 0.9 },
    statusBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)' },
    statusText: { fontSize: 14, fontWeight: 'bold', color: Colors.white },
});

export default LeaveRequestScreen;

