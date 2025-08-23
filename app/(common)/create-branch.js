import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const branchColors = [
  ['#ff9a9e', '#fad0c4'],
  ['#a1c4fd', '#c2e9fb'],
  ['#84fab0', '#8fd3f4'],
  ['#fbc2eb', '#a6c1ee'],
  ['#ffecd2', '#fcb69f'],
];

export default function AvailableBranchesScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [branches, setBranches] = useState([
    { id: '1', name: 'Main Campus', address: '123 Sunshine Ave', location: 'link1' },
    { id: '2', name: 'North Branch', address: '456 Playful Rd', location: 'link2' },
  ]);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleAddBranch = () => {
    if (branchName && branchAddress && branchLocation) {
      const newBranch = { id: Date.now().toString(), name: branchName, address: branchAddress, location: branchLocation };
      setBranches([...branches, newBranch]);
      setBranchName('');
      setBranchAddress('');
      setBranchLocation('');
      setModalVisible(false);
    }
  };

  const renderBranchItem = ({ item, index }) => (
    <LinearGradient colors={branchColors[index % branchColors.length]} style={styles.branchItem}>
      <View style={styles.branchInfo}>
        <Text style={styles.branchName}>{item.name}</Text>
        <Text style={styles.branchDetails}>{item.address}</Text>
        <Text style={styles.branchDetails}>{item.location}</Text>
      </View>
      <View style={styles.branchActions}>
        <TouchableOpacity onPress={() => { /* Handle Edit */ }}>
          <Ionicons name="pencil" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { /* Handle Delete */ }}>
          <Ionicons name="trash" size={24} color="#fff" style={{ marginLeft: 15 }} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Available Branches</Text>

      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <LinearGradient
          colors={['#a1c4fd', '#c2e9fb']}
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>Create New Branch</Text>
        </LinearGradient>
      </TouchableOpacity>

      <FlatList
        data={branches}
        keyExtractor={(item) => item.id}
        renderItem={renderBranchItem}
        ListEmptyComponent={<Text style={styles.emptyListText}>No branches available.</Text>}
      />

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalContainer}>
          <LinearGradient colors={['#fbc2eb', '#a6c1ee']} style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#fff' }]}>Create New Branch</Text>

            <View style={[styles.inputContainer, focusedInput === 'name' && styles.inputContainerFocused]}>
              <Ionicons name="business-outline" size={24} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Branch Name"
                placeholderTextColor="#888"
                value={branchName}
                onChangeText={setBranchName}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={[styles.inputContainer, focusedInput === 'address' && styles.inputContainerFocused]}>
              <Ionicons name="location-outline" size={24} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Branch Address"
                placeholderTextColor="#888"
                value={branchAddress}
                onChangeText={setBranchAddress}
                onFocus={() => setFocusedInput('address')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={[styles.inputContainer, focusedInput === 'location' && styles.inputContainerFocused]}>
              <Ionicons name="map-outline" size={24} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Branch Location (Map Link)"
                placeholderTextColor="#888"
                value={branchLocation}
                onChangeText={setBranchLocation}
                onFocus={() => setFocusedInput('location')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleAddBranch}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffaf0', paddingHorizontal: 10, paddingTop: 20 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff6347',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-condensed',
  },
  createButton: {
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 10,
  },
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  branchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 15, marginBottom: 10, width: '100%' },
  branchInfo: { flex: 1 },
  branchName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  branchDetails: { fontSize: 14, color: '#fff', marginTop: 5, opacity: 0.9 },
  branchActions: { flexDirection: 'row' },
  emptyListText: { textAlign: 'center', color: '#aaa', marginTop: 20, fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    width: '100%',
  },
  inputContainerFocused: {
    borderColor: '#ff6347',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 16, color: '#555' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  button: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  saveButton: { backgroundColor: 'rgba(50, 205, 50, 0.8)' },
  cancelButton: { backgroundColor: 'rgba(255, 99, 71, 0.8)' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
