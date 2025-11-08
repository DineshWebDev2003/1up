import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, Platform, SafeAreaView, FlatList } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';

export default function AvailableBranchesScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCameraUrl, setBranchCameraUrl] = useState('');
  const [branches, setBranches] = useState([]);
  const [editingBranch, setEditingBranch] = useState(null);

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const data = await response.json();
      if (data.success) {
        setBranches(data.data || []);
      } else {
        setBranches([]);
        Alert.alert('Error', data.message || 'Failed to fetch branches.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch branches.');
      console.error('Fetch branches error:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const loadBranches = async () => {
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        if (sessionToken) {
          fetchBranches();
        }
      };
      loadBranches();
    }, [])
  );

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchLocation(branch.location);
    setBranchAddress(branch.address);
    setBranchCameraUrl(branch.camera_url || '');
    setModalVisible(true);
  };

  const handleDeleteBranch = async (branchId) => {
    Alert.alert(
      "Delete Branch",
      "Are you sure you want to delete this branch?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "OK",
          onPress: async () => {
            try {
              const response = await authFetch('/api/branches/delete_branch.php', {
                method: 'DELETE',
                body: JSON.stringify({ id: branchId }),
              });
              const result = await response.json();
              if (result.success) {
                Alert.alert('Success', result.message);
                fetchBranches(); // Refresh the list
              } else {
                // Enhanced error handling for user reassignment
                if (result.users && result.user_count > 0) {
                  const userList = result.users.map(user => `• ${user.name} (${user.role})`).join('\n');
                  Alert.alert(
                    'Cannot Delete Branch',
                    `This branch has ${result.user_count} active users:\n\n${userList}\n\nPlease reassign these users to other branches first using the User Management screen.`,
                    [{ text: "OK" }]
                  );
                } else {
                  Alert.alert('Error', result.message || 'Failed to delete branch.');
                }
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete branch.');
              console.error('Delete branch error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSaveBranch = async () => {
    console.log('handleSaveBranch triggered. Editing Branch:', editingBranch);
    
    // Check authentication before proceeding
    const sessionToken = await AsyncStorage.getItem('sessionToken');
    console.log('Session token found:', sessionToken ? 'Yes' : 'No');
    if (!sessionToken) {
      Alert.alert('Authentication Error', 'Please log in to perform this action.');
      return;
    }

    if (!branchName.trim() || !branchLocation.trim()) {
      Alert.alert('Validation Error', 'Branch Name and Location are required.');
      return;
    }

    const url = editingBranch ? '/api/branches/update_branch.php' : '/api/branches/create_branch.php';
    const body = editingBranch
      ? { id: editingBranch.id, name: branchName, address: branchAddress, location: branchLocation, camera_url: branchCameraUrl }
      : { name: branchName, address: branchAddress, location: branchLocation, camera_url: branchCameraUrl };

    try {
      const response = await authFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', result.message, [
          {
            text: 'OK',
            onPress: () => {
              // Show notification badge/symbol
              console.log('Branch operation completed successfully');
            }
          }
        ]);
        fetchBranches();
        closeModal();
      } else {
        Alert.alert('Error', result.message || 'An unknown error occurred.');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to ${editingBranch ? 'update' : 'create'} branch.`);
      console.error('Save branch error:', error);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setBranchName('');
    setBranchLocation('');
    setBranchAddress('');
    setBranchCameraUrl('');
    setEditingBranch(null);
  };

  const renderBranchItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
      <LinearGradient colors={Colors.gradientPrimary} style={styles.branchCard}>
        <View style={styles.branchInfo}>
          <Text style={styles.branchName}>{item.name}</Text>
          <Text style={styles.branchDetails}><Ionicons name="location-sharp" size={14} color={'#FFF'} /> {item.address}</Text>
          <Text style={styles.branchDetails}><Ionicons name="map-sharp" size={14} color={'#FFF'} /> {item.location}</Text>
          <Text style={styles.branchDetails}><Ionicons name="camera-outline" size={14} color={'#FFF'} /> {item.camera_url || 'Not set'}</Text>
        </View>
        <View style={styles.branchActions}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
            <Ionicons name="pencil" size={22} color={'#FFF'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteBranch(item.id)} style={styles.actionButton}>
            <Ionicons name="trash" size={22} color={'#FFF'} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <LottieView source={require('../../assets/Calendar Animation.json')} autoPlay loop style={styles.lottieAnimation} />
        <Animatable.Text animation="fadeInDown" style={styles.title}>Branch Management</Animatable.Text>
      </LinearGradient>

      <FlatList
        data={branches}
        keyExtractor={(item) => item.id}
        renderItem={renderBranchItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyListText}>No branches found. Add one!</Text></View>}
      />

      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.fab}>
        <LinearGradient colors={['#5D9CEC', '#90C695']} style={styles.fabGradient}>
          <Ionicons name="add" size={30} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <Animatable.View animation="fadeInUpBig" style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={22} color={'#888'} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Branch Name" placeholderTextColor={'#888'} value={branchName} onChangeText={setBranchName} />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={22} color={'#888'} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Branch Address" placeholderTextColor={'#888'} value={branchAddress} onChangeText={setBranchAddress} />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="map-outline" size={22} color={'#888'} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Branch Location (Map Link)" placeholderTextColor={'#888'} value={branchLocation} onChangeText={setBranchLocation} />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="videocam-outline" size={22} color={'#888'} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Camera URL" placeholderTextColor={'#888'} value={branchCameraUrl} onChangeText={setBranchCameraUrl} />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.button} onPress={closeModal}>
                <LinearGradient colors={['#F5F5F5', '#E0E0E0']} style={styles.buttonGradient}>
                  <Text style={[styles.buttonText, { color: '#4F4F4F' }]}>Cancel</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={handleSaveBranch}>
                <LinearGradient colors={['#5D9CEC', '#90C695']} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>{editingBranch ? 'Update' : 'Create'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: Platform.OS === 'android' ? 50 : 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center', justifyContent: 'center' },
  lottieAnimation: { width: 120, height: 120, position: 'absolute', top: 0, right: 0, opacity: 0.3 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 5 },
  listContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 80 },
  branchCard: { borderRadius: 20, padding: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  branchInfo: { flex: 1 },
  branchName: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  branchDetails: { fontSize: 14, color: '#FFF', marginTop: 4, flexDirection: 'row', alignItems: 'center' },
  branchActions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { marginLeft: 15, padding: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyListText: { textAlign: 'center', color: '#999', fontSize: 16 },
  fab: { position: 'absolute', bottom: 30, right: 30, borderRadius: 30, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 25, width: '90%', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, color: '#4F4F4F' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 15, paddingHorizontal: 15, marginBottom: 15, width: '100%' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 16, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  button: { flex: 1, marginHorizontal: 5 },
  buttonGradient: { padding: 15, borderRadius: 15, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
