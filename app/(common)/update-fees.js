import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function UpdateFeesScreen() {
  const { branch } = useLocalSearchParams();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [branches, setBranches] = useState(['All']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(branch || 'All');
  const [editingFee, setEditingFee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        if (sessionToken) {
          await fetchBranches();
          await fetchStudents();
        } else {
          Alert.alert('Authentication Required', 'Please login again');
        }
      } catch (error) {
        console.error('Authentication check error:', error);
        Alert.alert('Error', 'Authentication failed. Please login again.');
      }
    };
    loadData();
  }, []);

  // Refresh data when branch selection changes
  useEffect(() => {
    if (selectedBranch) {
      fetchStudents();
    }
  }, [selectedBranch]);

  useEffect(() => {
    let result = students;

    if (selectedBranch !== 'All') {
      result = result.filter(student => student.branch === selectedBranch);
    }

    if (searchQuery) {
      result = result.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredStudents(result);
  }, [searchQuery, selectedBranch, students]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/fees/fee_crud.php');
      const result = await response.json();
      
      if (result.success) {
        setStudents(result.data || []);
        console.log('Fetched students with fees:', result.data);
      } else {
        console.error('Failed to fetch students:', result.message);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      if (error.message !== 'Unauthorized') {
        Alert.alert('Error', 'Failed to load students. Please try again.');
      }
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        const branchNames = result.data.map(b => b.name);
        setBranches(['All', ...branchNames]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleUpdateFee = async () => {
    if (!editingFee || updating) return;

    const feeAmount = parseFloat(editingFee.amount);
    if (isNaN(feeAmount) || feeAmount < 0) {
      Alert.alert('Error', 'Please enter a valid fee amount');
      return;
    }

    setUpdating(true);
    try {
      const response = await authFetch('/api/fees/fee_crud.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: editingFee.id,
          fee_amount: feeAmount
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Update local state and refresh data
        setStudents(prevStudents =>
          prevStudents.map(student =>
            student.id === editingFee.id ? { ...student, fee: feeAmount } : student
          )
        );
        // Refresh the data from server to ensure consistency
        await fetchStudents();
        Alert.alert('Success', result.message || 'Fee updated successfully!');
        setEditingFee(null);
      } else {
        Alert.alert('Error', result.message || 'Failed to update fee');
      }
    } catch (error) {
      console.error('Error updating fee:', error);
      Alert.alert('Error', 'Failed to update fee. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

    const renderStudentCard = ({ item }) => {
    const isEditing = editingFee && editingFee.id === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <Image source={require('../../assets/Avartar.png')} style={styles.profilePic} />
          <View style={styles.studentInfoContainer}>
            <Text style={styles.studentName}>{item.name}</Text>
            <View style={styles.idRow}>
              <MaterialCommunityIcons name="card-account-details-outline" size={16} color={Colors.gray} />
              <Text style={styles.studentId}>{item.student_id}</Text>
            </View>
            <Text style={styles.branchText}>{item.branch}</Text>
          </View>
        </View>

        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Amount:</Text>
          {isEditing ? (
            <TextInput
              style={styles.feeInput}
              value={String(editingFee.amount)}
              onChangeText={(text) => setEditingFee({ ...editingFee, amount: text })}
              keyboardType="numeric"
              autoFocus
            />
          ) : (
            <TouchableOpacity onPress={() => setEditingFee({ id: item.id, amount: String(typeof item.fee === 'number' ? item.fee : (Number(item.fee) || 0)) })}>
              <Text style={styles.feeAmount}>INR {(
                typeof item.fee === 'number' ? item.fee : (Number(item.fee) || 0)
              ).toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing && (
          <TouchableOpacity 
            style={[styles.saveButton, updating && styles.saveButtonDisabled]} 
            onPress={handleUpdateFee}
            disabled={updating}
          >
            <Text style={styles.saveButtonText}>
              {updating ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Update Student Fees {branch ? `- ${branch}` : ''}</Text>

        <View style={styles.controlsContainer}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={22} color={Colors.gray} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by student name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedBranch}
              onValueChange={(itemValue) => setSelectedBranch(itemValue)}
              style={styles.picker}
              enabled={!branch && branches.length > 1}
            >
              {branches.map(branch => <Picker.Item key={branch} label={branch} value={branch} />)}
            </Picker>
          </View>
        </View>

        <FlatList
          data={filteredStudents}
          renderItem={renderStudentCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-school" size={60} color={Colors.lightText} />
              <Text style={styles.emptyText}>No students found.</Text>
              <Text style={styles.emptySubText}>Try adjusting your search or branch filter.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.text, marginBottom: 20, textAlign: 'center' },
  controlsContainer: { marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 10, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 45, fontSize: 16, color: Colors.text },
  pickerContainer: { backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center' },
  picker: { height: 50, color: Colors.text },
  listContainer: { paddingBottom: 100 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  profilePic: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  studentInfoContainer: { flex: 1 },
  studentName: { fontSize: 18, fontWeight: '600', color: Colors.text },
  idRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  studentId: { fontSize: 14, color: Colors.lightText, marginLeft: 5 },
  branchText: { fontSize: 15, color: Colors.lightText, marginTop: 2 },
  feeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  feeLabel: { fontSize: 16, color: Colors.lightText, marginRight: 10 },
  feeAmount: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, paddingVertical: 5 },
  feeInput: { borderBottomWidth: 2, borderColor: Colors.primary, fontSize: 18, fontWeight: 'bold', color: Colors.text, flex: 1, paddingVertical: 5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: Colors.text },
  saveButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, marginTop: 15, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: Colors.lightText, opacity: 0.6 },
  saveButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  emptyText: { textAlign: 'center', marginTop: 15, fontSize: 18, color: Colors.text, fontWeight: '600' },
  emptySubText: { textAlign: 'center', marginTop: 5, fontSize: 14, color: Colors.lightText },
});

