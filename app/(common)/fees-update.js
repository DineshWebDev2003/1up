import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'expo-router';

export default function FeesUpdateScreen() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [isBranchModalVisible, setBranchModalVisible] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      try {
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        const userData = await AsyncStorage.getItem('userData');
        
        if (!sessionToken || !userData) {
          router.replace('/login');
          return;
        }
        
        const currentUser = JSON.parse(userData);
        setUser(currentUser);
        fetchStudentData(currentUser);
      } catch (error) {
        console.error('Authentication error:', error);
        router.replace('/login');
      }
    };
    initialize();
  }, []);

  const fetchStudentData = useCallback(async (currentUser) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let studentsUrl = '/api/users/get_users.php?role=Student';
      let branchesUrl = '/api/branches/get_branches.php';
      let feesUrl = '/api/fees/get_fees.php';

      if (currentUser.role === 'Franchisee') {
        studentsUrl += `&branch_id=${currentUser.branch_id}`;
        branchesUrl += `?id=${currentUser.branch_id}`;
        feesUrl += `?branch_id=${currentUser.branch_id}`;
      }

      const [usersResponse, branchesResponse, feesResponse] = await Promise.all([
        authFetch(studentsUrl),
        authFetch(branchesUrl),
        authFetch(feesUrl)
      ]);

      const usersResult = await usersResponse.json();
      const branchesResult = await branchesResponse.json();
      const feesResult = await feesResponse.json();

      if (usersResult.success && branchesResult.success && feesResult.success) {
        const branchesDataForMap = Array.isArray(branchesResult.data) ? branchesResult.data : [branchesResult.data].filter(Boolean);
        const branchesMap = branchesDataForMap.reduce((acc, branch) => {
          acc[branch.id] = branch.name;
          return acc;
        }, {});

        const feesMap = (feesResult.data && Array.isArray(feesResult.data)) ? feesResult.data.reduce((acc, fee) => {
          acc[fee.student_user_id] = fee;
          return acc;
        }, {}) : {};

        const combinedData = (usersResult.data && Array.isArray(usersResult.data)) ? usersResult.data.map(student => {
          const feeDetails = feesMap[student.id] || { total_fees: '0.00', amount_paid: '0.00' };
          const total = parseFloat(feeDetails.total_fees);
          const paid = parseFloat(feeDetails.amount_paid);
          const due = total - paid;
          
          let status = 'Not Set';
          if (total > 0) {
            if (due <= 0) status = 'Paid';
            else if (paid > 0) status = 'Partially Paid';
            else status = 'Pending';
          }

          return {
            ...student,
            branch_name: branchesMap[student.branch_id] || 'N/A',
            total_fees: feeDetails.total_fees,
            amount_paid: feeDetails.amount_paid,
            due_amount: due.toFixed(2),
            status: status
          };
        }) : [];

        setStudents(combinedData);
        const branchesData = Array.isArray(branchesResult.data) ? branchesResult.data : [branchesResult.data];
        if (currentUser.role === 'Franchisee') {
          setBranches(branchesData);
          if (branchesData.length > 0) {
            setSelectedBranch(branchesData[0].name);
          }
        } else {
          setBranches([{ id: 'All', name: 'All Branches' }, ...branchesData]);
        }
      } else {
        Alert.alert('Error', 'Failed to fetch all required data.');
      }
    } catch (error) {
      console.error('API Error:', error);
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', 'Could not connect to the server.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdate = async (student) => {
    try {
            const response = await authFetch('/api/fees.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: student.id,
          total_fees: student.total_fees,
          amount_paid: student.amount_paid,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Success', `Fee details for ${student.name} updated successfully!`);
        // Manually update the student in the local state to reflect the changes immediately
        setStudents(prevStudents => prevStudents.map(s => {
          if (s.id === student.id) {
            const total = parseFloat(student.total_fees) || 0;
            const paid = parseFloat(student.amount_paid) || 0;
            const due = total - paid;
            
            let newStatus = 'Not Set';
            if (total > 0) {
              if (due <= 0) newStatus = 'Paid';
              else if (paid > 0) newStatus = 'Partially Paid';
              else newStatus = 'Pending';
            }
            
            return { ...student, due_amount: due.toFixed(2), status: newStatus };
          }
          return s;
        }));

        setEditingStudentId(null); // Close edit mode
      } else {
        Alert.alert('Update Failed', result.message || 'Could not save changes.');
      }
    } catch (error) {
      console.error('Update fee error:', error);
      if (error.message !== 'Unauthorized') {
        Alert.alert('API Error', 'Failed to update fee details.');
      }
    }
  };

  const handleFeesChange = (studentId, field, value) => {
    setStudents(prevStudents => {
      if (!prevStudents || !Array.isArray(prevStudents)) return [];
      
      return prevStudents.map(s => {
        if (s.id === studentId) {
          const updatedStudent = { ...s, [field]: value };
          const total = parseFloat(updatedStudent.total_fees) || 0;
          const paid = parseFloat(updatedStudent.amount_paid) || 0;
          updatedStudent.due_amount = (total - paid).toFixed(2);
          return updatedStudent;
        }
        return s;
      });
    });
  };

  const filteredStudents = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    
    if (selectedBranch === 'All') {
      return students;
    }
    return students.filter(student => student.branch_name === selectedBranch);
  }, [students, selectedBranch]);

  const totals = useMemo(() => {
    if (!filteredStudents || !Array.isArray(filteredStudents)) {
      return { totalFees: 0, totalPaid: 0 };
    }
    
    return filteredStudents.reduce((acc, student) => {
      acc.totalFees += parseFloat(student.total_fees) || 0;
      acc.totalPaid += parseFloat(student.amount_paid) || 0;
      return acc;
    }, { totalFees: 0, totalPaid: 0 });
  }, [filteredStudents]);

  const handleSelectBranch = (branchName) => {
    setSelectedBranch(branchName);
    setBranchModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={[Colors.primary_light, Colors.background]} style={{flex: 1}}>
        <Animatable.View animation="fadeInDown" duration={800}>
          <LinearGradient colors={Colors.gradientMain} style={styles.header}>
            <LottieView
              source={require('../../assets/lottie/fees.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
            <Text style={styles.title}>Fees Update</Text>
            <Text style={styles.subtitle}>Manage Student Fee Details</Text>
          </LinearGradient>
        </Animatable.View>

        {user && user.role !== 'Franchisee' && (
          <View style={styles.filterContainer}>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setBranchModalVisible(true)}>
              <Text style={styles.dropdownButtonText}>{selectedBranch}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.totalsContainer}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Fees</Text>
            <Text style={styles.totalAmount}>₹{totals.totalFees.toFixed(2)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalAmount}>₹{totals.totalPaid.toFixed(2)}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Animatable.View animation="fadeInUp" duration={600}>
                <LinearGradient colors={['#ffffff', '#f0f4f8']} style={styles.studentCard}>
                <Image
                  source={item.profile_image ? { uri: `${API_URL}${item.profile_image}` } : require('../../assets/Avartar.png')}
                  style={styles.studentAvatar}
                />
                <View style={styles.studentDetailsContainer}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.branchName}>{item.branch_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>

                  {editingStudentId === item.id ? (
                    <View style={styles.editContainer}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Total Fee</Text>
                        <TextInput
                          style={styles.feeInput}
                          value={String(item.total_fees)}
                          onChangeText={(text) => handleFeesChange(item.id, 'total_fees', text)}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor={Colors.placeholder}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Amount Paid</Text>
                        <TextInput
                          style={styles.feeInput}
                          value={String(item.amount_paid)}
                          onChangeText={(text) => handleFeesChange(item.id, 'amount_paid', text)}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor={Colors.placeholder}
                        />
                      </View>
                      <TouchableOpacity style={styles.updateButton} onPress={() => handleUpdate(item)}>
                        <Text style={styles.updateButtonText}>Update</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.infoContainer}>
                      <View>
                        <Text style={styles.feeDetailText}>Assigned: ₹{item.total_fees}</Text>
                        <Text style={styles.feeDetailText}>Paid: ₹{item.amount_paid}</Text>
                      </View>
                      <TouchableOpacity style={styles.editButton} onPress={() => setEditingStudentId(item.id)}>
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                </LinearGradient>
              </Animatable.View>
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No students found.</Text>
              </View>
            )}
          />
        )}

        <Modal
          transparent={true}
          visible={isBranchModalVisible}
          onRequestClose={() => setBranchModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setBranchModalVisible(false)}>
            <View style={styles.modalContent}>
              <FlatList
                data={branches}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.branchOption} onPress={() => handleSelectBranch(item.name)}>
                    <Text style={styles.branchOptionText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

      </LinearGradient>
    </SafeAreaView>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'Paid': return Colors.success;
    case 'Partially Paid': return Colors.warning;
    case 'Pending': return Colors.danger;
    default: return Colors.gray;
  }
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.white, textAlign: 'center' },
  subtitle: { fontSize: 16, color: Colors.white, opacity: 0.9, textAlign: 'center', marginTop: 4 },
  lottieAnimation: { width: 150, height: 150, marginBottom: -20 },
  listContainer: { paddingBottom: 20 },
  studentCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    marginVertical: 10,
    marginHorizontal: 20,
    alignItems: 'flex-start',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  studentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  studentName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  branchName: { fontSize: 14, color: Colors.gray, marginTop: 4 },
  studentDetailsContainer: { flex: 1, marginLeft: 15 },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  statusText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  infoContainer: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeDetailText: { fontSize: 14, color: Colors.gray, marginBottom: 5 },
  editButton: {
    backgroundColor: Colors.light_gray,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  editButtonText: { color: Colors.primary, fontWeight: 'bold' },
  editContainer: {
    width: '100%',
    marginTop: 15,
  },
  inputGroup: { width: '100%', marginBottom: 8 },
  inputLabel: { fontSize: 12, color: Colors.gray, marginBottom: 4, marginLeft: 4 },
  feeInput: {
    backgroundColor: Colors.light_gray,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
    width: '100%',
  },
  updateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  updateButtonText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  emptyText: { fontSize: 16, color: Colors.gray },
  filterContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  dropdownButton: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light_gray,
    alignItems: 'center',
  },
  dropdownButtonText: { color: Colors.primary, fontWeight: 'bold' },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  totalBox: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '45%',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  totalLabel: { fontSize: 14, color: Colors.gray },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginTop: 5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  branchOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light_gray,
  },
  branchOptionText: { fontSize: 16, color: Colors.text },
});
