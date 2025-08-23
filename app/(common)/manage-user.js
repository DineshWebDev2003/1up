import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, Modal, Alert, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

// Mock Data
const initialUsers = [
  { id: '1', name: 'John Doe', branch: 'Main Campus', role: 'Student', studentId: 'S001', mobile: '123-456-7890', email: 'john.doe@example.com' },
  { id: '2', name: 'Jane Smith', branch: 'North Campus', role: 'Teacher', mobile: '234-567-8901', email: 'jane.smith@example.com' },
  { id: '3', name: 'Peter Jones', branch: 'Main Campus', role: 'Franchisee', mobile: '345-678-9012', email: 'peter.jones@example.com' },
  { id: '4', name: 'Mary Williams', branch: 'East Campus', role: 'Student', studentId: 'S002', mobile: '456-789-0123', email: 'mary.williams@example.com' },
  { id: '5', name: 'David Brown', branch: 'North Campus', role: 'Teacher', mobile: '567-890-1234', email: 'david.brown@example.com' },
];

const branches = ['All', 'Main Campus', 'North Campus', 'East Campus'];
const roles = ['All', 'Student', 'Teacher', 'Franchisee'];

export default function ManageUserScreen() {
  const [users, setUsers] = useState(initialUsers);
  const [filteredUsers, setFilteredUsers] = useState(initialUsers);
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    let result = users;
    if (selectedBranch !== 'All') {
      result = result.filter(user => user.branch === selectedBranch);
    }
    if (selectedRole !== 'All') {
      result = result.filter(user => user.role === selectedRole);
    }
    setFilteredUsers(result);
  }, [selectedBranch, selectedRole, users]);

  const openViewModal = (user) => {
    setSelectedUser(user);
    setIsViewModalVisible(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setIsEditModalVisible(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalVisible(true);
  };

  const handleDelete = () => {
    // In a real app, you'd verify the password against a secure source.
    // For this test, we'll just check if it's not empty.
    if (deletePassword) {
      setUsers(users.filter(user => user.id !== selectedUser.id));
      setIsDeleteModalVisible(false);
      setDeletePassword('');
      Alert.alert('Success', 'User has been deleted.');
    } else {
      Alert.alert('Error', 'Password is required to delete a user.');
    }
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <Image source={require('../../assets/Avartar.png')} style={styles.userAvatar} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.role === 'Student' && item.studentId && (
          <Text style={styles.userDetails}>ID: {item.studentId}</Text>
        )}
        <Text style={styles.userDetails}>{item.role}</Text>
        <Text style={styles.userDetails}>{item.branch}</Text>
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => openViewModal(item)}>
          <Ionicons name="eye-outline" size={22} color="#2E86DE" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
          <Ionicons name="create-outline" size={22} color="#FF9F43" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => openDeleteModal(item)}>
          <Ionicons name="trash-outline" size={22} color="#EA4C4C" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Manage Users</Text>

        <View style={styles.filtersContainer}>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedBranch} onValueChange={setSelectedBranch} style={styles.picker}>
              {branches.map(branch => <Picker.Item key={branch} label={branch} value={branch} />)}
            </Picker>
          </View>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedRole} onValueChange={setSelectedRole} style={styles.picker}>
              {roles.map(role => <Picker.Item key={role} label={role} value={role} />)}
            </Picker>
          </View>
        </View>

        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
        />

        {/* View User Modal */}
        {selectedUser && (
          <Modal visible={isViewModalVisible} transparent={true} animationType="fade">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Image source={require('../../assets/Avartar.png')} style={styles.modalAvatar} />
                <Text style={styles.modalTitle}>{selectedUser.name}</Text>
                <Text style={styles.modalText}>Branch: {selectedUser.branch}</Text>
                <Text style={styles.modalText}>Role: {selectedUser.role}</Text>
                <Text style={styles.modalText}>Mobile: {selectedUser.mobile}</Text>
                <Text style={styles.modalText}>Email: {selectedUser.email}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setIsViewModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Edit User Modal */}
        {selectedUser && (
          <Modal visible={isEditModalVisible} transparent={true} animationType="fade">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit User</Text>
                {/* Add editable fields here */}
                <Text>Editing functionality to be implemented.</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setIsEditModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Delete User Modal */}
        {selectedUser && (
          <Modal visible={isDeleteModalVisible} transparent={true} animationType="fade">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Delete User</Text>
                <Text style={styles.modalText}>Are you sure you want to delete {selectedUser.name}?</Text>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password to confirm"
                  secureTextEntry
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setIsDeleteModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f4f7fc' },
  container: { flex: 1, padding: 15 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  filtersContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  pickerContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 10, marginHorizontal: 5 },
  picker: { height: 50 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: '#000' },
  userInfo: { flex: 1, marginRight: 10 },
  userName: { fontSize: 18, fontWeight: 'bold' },
  userDetails: { fontSize: 14, color: '#666' },
  actionsContainer: { flexDirection: 'row' },
  actionButton: { padding: 5, marginLeft: 8 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, borderWidth: 2, borderColor: 'orange' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%', alignItems: 'center' },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalText: { fontSize: 16, marginBottom: 10, textAlign: 'center' },
  passwordInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginVertical: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  closeButton: { backgroundColor: '#2E86DE', padding: 10, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  closeButtonText: { color: '#fff', fontWeight: 'bold' },
  cancelButton: { backgroundColor: '#ccc', padding: 10, borderRadius: 5, flex: 1, marginRight: 5, alignItems: 'center' },
  cancelButtonText: { color: '#333', fontWeight: 'bold' },
  deleteButton: { backgroundColor: '#EA4C4C', padding: 10, borderRadius: 5, flex: 1, marginLeft: 5, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' },
});
