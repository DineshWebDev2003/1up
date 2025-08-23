import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Mock Data
const initialStudents = [
  { id: '1', name: 'John Doe', studentId: 'S001', branch: 'Main Campus', fee: 5000 },
  { id: '2', name: 'Jane Smith', studentId: 'S002', branch: 'North Campus', fee: 5500 },
  { id: '3', name: 'Peter Jones', studentId: 'S003', branch: 'Main Campus', fee: 5000 },
  { id: '4', name: 'Mary Williams', studentId: 'S004', branch: 'East Campus', fee: 4500 },
  { id: '5', name: 'David Brown', studentId: 'S005', branch: 'North Campus', fee: 5500 },
  { id: '6', name: 'Linda Davis', studentId: 'S006', branch: 'Main Campus', fee: 5000 },
];

const branches = ['All', 'Main Campus', 'North Campus', 'East Campus'];

export default function UpdateFeesScreen() {
  const [students, setStudents] = useState(initialStudents);
  const [filteredStudents, setFilteredStudents] = useState(initialStudents);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [editingFee, setEditingFee] = useState(null); // { id, amount }

  useEffect(() => {
    let result = students;

    if (selectedBranch !== 'All') {
      result = result.filter(student => student.branch === selectedBranch);
    }

    if (searchQuery) {
      result = result.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredStudents(result);
  }, [searchQuery, selectedBranch, students]);

  const handleUpdateFee = () => {
    if (!editingFee) return;

    setStudents(prevStudents =>
      prevStudents.map(student =>
        student.id === editingFee.id ? { ...student, fee: parseFloat(editingFee.amount) || 0 } : student
      )
    );

    Alert.alert('Success', 'Fee updated successfully!');
    setEditingFee(null);
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
              <MaterialCommunityIcons name="card-account-details-outline" size={16} color="#888" />
              <Text style={styles.studentId}>{item.studentId}</Text>
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
            <TouchableOpacity onPress={() => setEditingFee({ id: item.id, amount: item.fee })}>
              <Text style={styles.feeAmount}>₹ {item.fee.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isEditing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleUpdateFee}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Update Student Fees</Text>

        <View style={styles.controlsContainer}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={22} color="#888" style={styles.searchIcon} />
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
            >
              {branches.map(branch => <Picker.Item key={branch} label={branch} value={branch} />)}
            </Picker>
          </View>
        </View>

        <FlatList
          data={filteredStudents}
          renderItem={renderStudentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f7fc' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  controlsContainer: { marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, marginBottom: 10, elevation: 2 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 45, fontSize: 16 },
  pickerContainer: { backgroundColor: '#fff', borderRadius: 10, elevation: 2, justifyContent: 'center' },
  picker: { height: 50 },
  listContainer: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  profilePic: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  studentInfoContainer: { flex: 1 },
  studentName: { fontSize: 18, fontWeight: '600', color: '#444' },
  idRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  studentId: { fontSize: 14, color: '#888', marginLeft: 5 },
  branchText: { fontSize: 15, color: '#666', marginTop: 2 },
  feeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  feeLabel: { fontSize: 16, color: '#555', marginRight: 10 },
  feeAmount: { fontSize: 18, fontWeight: 'bold', color: '#007bff', paddingVertical: 5 },
  feeInput: { borderBottomWidth: 1, borderColor: '#007bff', fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1, paddingVertical: 5 },
  saveButton: { backgroundColor: '#28a745', borderRadius: 8, paddingVertical: 10, marginTop: 15, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16, color: '#888' },
});

