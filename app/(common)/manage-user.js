import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, Modal, TextInput, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const roles = ['All', 'Student', 'Teacher', 'Franchisee'];

export default function ManageUserScreen() {
  const { branch: initialBranch, branch_id } = useLocalSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [branches, setBranches] = useState(['All']);
  const [selectedBranch, setSelectedBranch] = useState(initialBranch || 'All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [editData, setEditData] = useState({ 
    name: '', mobile: '', email: '', password: '', confirmPassword: '', 
    role: '', branch_id: '', father_name: '', father_number: '', mother_name: '', mother_number: '',
    guardian_name: '', guardian_number: '', blood_group: '', class_name: ''
  });
  const [showPassword, setShowPassword] = useState(false);

      const fetchUsers = async () => {
    try {
      const url = branch_id ? `/api/users/user_crud.php?branch_id=${branch_id}` : '/api/users/user_crud.php';
      const response = await authFetch(url);
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
        setFilteredUsers(result.data);
      } else {
        setUsers([]);
        setFilteredUsers([]);
        Alert.alert('Error', 'Failed to fetch users.');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      if (error.message !== 'Unauthorized') {
        Alert.alert('Error', 'Failed to fetch users.');
      }
    }
  };

    const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        const branchNames = result.data.map(b => b.name);
        setBranches(['All', ...branchNames]);
      } else {
        Alert.alert('Error', 'Failed to fetch branches.');
      }
    } catch (error) {
      console.error('Fetch branches error:', error);
      if (error.message !== 'Unauthorized') {
        Alert.alert('Error', 'Failed to fetch branches.');
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (sessionToken) {
        fetchUsers();
        if (!branch_id) {
          fetchBranches();
        }
      }
    };
    loadData();
  }, [branch_id]);

  useEffect(() => {
    let result = users;
    
    // Filter out Developer and Admin role users
    result = result.filter(user => user.role !== 'Developer' && user.role !== 'Admin');
    
    if (selectedBranch !== 'All' && !branch_id) {
      result = result.filter(user => user.branch_name === selectedBranch);
    }
    if (selectedRole !== 'All') {
      result = result.filter(user => user.role === selectedRole);
    }
    setFilteredUsers(result);
  }, [selectedBranch, selectedRole, users]);

  const openViewModal = (user) => { setSelectedUser(user); setIsViewModalVisible(true); };
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditData({ 
      name: user.name || '', 
      mobile: user.mobile || '', 
      email: user.email || '', 
      password: '', 
      confirmPassword: '',
      role: user.role || '',
      branch_id: user.branch_id || '',
      father_name: user.father_name || '',
      father_number: user.father_number || '',
      mother_name: user.mother_name || '',
      mother_number: user.mother_number || '',
      guardian_name: user.guardian_name || '',
      guardian_number: user.guardian_number || '',
      blood_group: user.blood_group || '',
      class_name: user.class_name || ''
    });
    setIsEditModalVisible(true);
  };
  const openDeleteModal = (user) => { setSelectedUser(user); setIsDeleteModalVisible(true); };

  const handleTrackCab = (studentId) => {
    if (studentId) {
      router.push({ pathname: '/(common)/track-cab', params: { student_id: studentId } });
    }
  };

    const handleUpdate = async () => {
    try {
      // Validate password if provided
      if (editData.password && editData.password !== editData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match.');
        return;
      }
      
      if (editData.password && editData.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long.');
        return;
      }

      const updateData = { 
        id: selectedUser.id, 
        name: editData.name,
        phone: editData.mobile,
        email: editData.email
      };

      // Only include password if it's provided
      if (editData.password && editData.password.trim() !== '') {
        updateData.password = editData.password;
      }

      const response = await authFetch('/api/users/user_crud.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', result.message || 'User updated successfully.');
        fetchUsers();
        setIsEditModalVisible(false);
        setEditData({ name: '', mobile: '', email: '', password: '', confirmPassword: '' });
      } else {
        Alert.alert('Error', result.message || 'Failed to update user.');
      }
    } catch (error) {
      console.error('Update user error:', error);
      Alert.alert('Error', 'Failed to update user.');
    }
  };

  const handleDelete = async () => {
    try {
      console.log('Attempting to delete user:', selectedUser.id, selectedUser.name);
      
      const response = await authFetch('/api/users/user_crud.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'delete',
          id: selectedUser.id 
        }),
      });
      
      console.log('Delete response status:', response.status);
      const result = await response.json();
      console.log('Delete response:', result);
      
      if (result.success) {
        // Immediately remove user from local state
        const updatedUsers = users.filter(user => user.id !== selectedUser.id);
        setUsers(updatedUsers);
        setFilteredUsers(updatedUsers);
        
        Alert.alert('Success', result.message || 'User deleted successfully.');
        setIsDeleteModalVisible(false);
        setSelectedUser(null);
        
        // Refresh after a short delay to ensure backend deletion is complete
        setTimeout(() => {
          fetchUsers();
        }, 1000);
      } else {
        console.error('Delete failed:', result.message);
        Alert.alert('Error', result.message || 'Failed to delete user.');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      Alert.alert('Error', 'Failed to delete user. Check console for details.');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Franchisee': return ['#5D9CEC', '#4A7ABC'];
      case 'Teacher': return ['#FF85A1', '#E06C87'];
      case 'Student': return ['#90C695', '#79A87D'];
      default: return ['#BDBDBD', '#9E9E9E'];
    }
  };

  const renderUserItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={800} delay={index * 100}>
      <TouchableOpacity onPress={() => openViewModal(item)}>
        <LinearGradient colors={getRoleColor(item.role)} style={styles.userCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Image source={item.avatar ? { uri: item.avatar } : require('../../assets/Avartar.png')} style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userDetails}> {item.role} at {item.branch_name || 'No Branch'}</Text>
            {item.role === 'Student' && item.student_id && (
              <Text style={styles.userDetails}>Student ID: {item.student_id}</Text>
            )}
          </View>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
              <Ionicons name="create-outline" size={22} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => openDeleteModal(item)}>
              <Ionicons name="trash-outline" size={22} color={Colors.white} />
            </TouchableOpacity>
            {item.role === 'Student' && (
              <TouchableOpacity style={styles.actionButton} onPress={() => handleTrackCab(item.student_id)}>
                <Ionicons name="bus-outline" size={22} color={Colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderModal = (visible, setVisible, title, children) => (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.modalContainer}>
        <Animatable.View animation="zoomIn" duration={500} style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
          <TouchableOpacity onPress={() => setVisible(false)}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <LottieView source={require('../../assets/avartar.json')} autoPlay loop style={styles.lottie} />
      </LinearGradient>

      <View style={styles.container}>
        <View style={styles.filtersContainer}>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedBranch} onValueChange={setSelectedBranch} style={styles.picker} enabled={!initialBranch && !branch_id} itemStyle={styles.pickerItem}>
              {branches.map(b => <Picker.Item key={b} label={b} value={b} />)}
            </Picker>
          </View>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedRole} onValueChange={setSelectedRole} style={styles.picker} itemStyle={styles.pickerItem}>
              {roles.map(r => <Picker.Item key={r} label={r} value={r} />)}
            </Picker>
          </View>
        </View>

        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={Colors.lightText} />
              <Text style={styles.emptyText}>No users found.</Text>
            </View>
          }
        />

        {selectedUser && renderModal(isViewModalVisible, setIsViewModalVisible, selectedUser.name, (
          <>
            <Image source={selectedUser.avatar ? { uri: `${API_URL}${selectedUser.avatar}` } : require('../../assets/Avartar.png')} style={styles.modalAvatar} />
            <Text style={styles.modalText}><Text style={styles.modalLabel}>Branch:</Text> {selectedUser.branch_name || 'No Branch'}</Text>
            <Text style={styles.modalText}><Text style={styles.modalLabel}>Role:</Text> {selectedUser.role}</Text>
            <Text style={styles.modalText}><Text style={styles.modalLabel}>Mobile:</Text> {selectedUser.mobile}</Text>
            <Text style={styles.modalText}><Text style={styles.modalLabel}>Email:</Text> {selectedUser.email}</Text>
            {selectedUser.role === 'Student' && selectedUser.student_id && <Text style={styles.modalText}><Text style={styles.modalLabel}>Student ID:</Text> {selectedUser.student_id}</Text>}
          </>
        ))}

        {selectedUser && renderModal(isEditModalVisible, setIsEditModalVisible, 'Edit User', (
          <>
            <TextInput style={styles.input} value={editData.name} onChangeText={(text) => setEditData({...editData, name: text})} placeholder="Name" />
            <TextInput style={styles.input} value={editData.mobile} onChangeText={(text) => setEditData({...editData, mobile: text})} placeholder="Mobile" keyboardType="phone-pad" />
            <TextInput style={styles.input} value={editData.email} onChangeText={(text) => setEditData({...editData, email: text})} placeholder="Email" keyboardType="email-address" />
            
            <Text style={styles.passwordSectionTitle}>Change Password (Optional)</Text>
            <View style={styles.passwordContainer}>
              <TextInput 
                style={styles.passwordInput} 
                value={editData.password} 
                onChangeText={(text) => setEditData({...editData, password: text})} 
                placeholder="New Password" 
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={Colors.lightText} />
              </TouchableOpacity>
            </View>
            
            {editData.password !== '' && (
              <TextInput 
                style={styles.input} 
                value={editData.confirmPassword} 
                onChangeText={(text) => setEditData({...editData, confirmPassword: text})} 
                placeholder="Confirm New Password" 
                secureTextEntry={!showPassword}
              />
            )}
            
            <TouchableOpacity onPress={handleUpdate}>
              <LinearGradient colors={Colors.gradientPrimary} style={styles.saveButton}>
                <Text style={styles.closeButtonText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ))}

        {selectedUser && (
          <Modal visible={isDeleteModalVisible} transparent={true} animationType="fade">
            <View style={styles.modalContainer}>
              <Animatable.View animation="zoomIn" duration={500} style={styles.modalContent}>
                <Text style={styles.modalTitle}>Delete User</Text>
                <Text style={styles.modalText}>Are you sure you want to delete {selectedUser.name}?</Text>
                                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setIsDeleteModalVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete}>
                    <LinearGradient colors={[Colors.danger, '#E05252']} style={styles.deleteButton}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animatable.View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.white },
  lottie: { width: 100, height: 100 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, marginVertical: 8, width: '100%', color: Colors.text, backgroundColor: '#F8F8F8' },
  container: { flex: 1, paddingHorizontal: 15, paddingTop: 20 },
  filtersContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginHorizontal: -5 },
  pickerContainer: { flex: 1, backgroundColor: Colors.card, borderRadius: 15, marginHorizontal: 5, elevation: 4, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  picker: { height: 50, color: Colors.text },
  pickerItem: { color: Colors.text },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 12, elevation: 5, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  userAvatar: { width: 55, height: 55, borderRadius: 27.5, marginRight: 15, borderWidth: 2, borderColor: Colors.white },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  userDetails: { fontSize: 14, color: Colors.white, opacity: 0.9 },
  actionsContainer: { flexDirection: 'row' },
  actionButton: { padding: 8 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 16, color: Colors.lightText },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.overlay },
  modalContent: { backgroundColor: Colors.card, padding: 25, borderRadius: 20, width: '90%', alignItems: 'center', elevation: 10, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  modalAvatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 15, borderWidth: 3, borderColor: Colors.primary },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: Colors.text },
  modalText: { fontSize: 16, marginBottom: 8, color: Colors.text, textAlign: 'center' },
  modalLabel: { fontWeight: 'bold' },
  passwordSectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginTop: 15, marginBottom: 5, alignSelf: 'flex-start' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 10, marginVertical: 8, backgroundColor: '#F8F8F8', width: '100%' },
  passwordInput: { flex: 1, padding: 12, color: Colors.text },
  eyeButton: { padding: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  closeButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', marginTop: 20 },
  saveButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', marginTop: 10 },
  closeButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  cancelButton: { backgroundColor: Colors.lightGray, paddingVertical: 12, borderRadius: 25, flex: 1, marginRight: 5, alignItems: 'center' },
  cancelButtonText: { color: Colors.text, fontWeight: 'bold' },
  deleteButton: { paddingVertical: 12, borderRadius: 25, flex: 1, marginLeft: 5, alignItems: 'center' },
  deleteButtonText: { color: Colors.white, fontWeight: 'bold' },
});
