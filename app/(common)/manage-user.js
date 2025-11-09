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
import { API_URL } from '../../config';

// Available roles for filtering (never include Admin/Developer)
const roles = ['All', 'Student', 'Teacher', 'Franchisee'];

export default function ManageUserScreen() {
  const { branch: initialBranch, branch_id } = useLocalSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [branches, setBranches] = useState(['All']);
  // Always default to "All" branches for admin users
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [editData, setEditData] = useState({ 
    name: '', mobile: '', email: '', password: '', confirmPassword: '', 
    role: '', branch_id: '', father_name: '', father_number: '', mother_name: '', mother_number: '',
    guardian_name: '', guardian_number: '', blood_group: '', class_name: '', student_id: '',
    franchisee_share: '', sharing_enabled: true, status: 'active'
  });
  const [studentData, setStudentData] = useState({});
  const [showPassword, setShowPassword] = useState(false);

      const fetchUsers = async () => {
    try {
      console.log('🚀 Fetching users for currentUser:', currentUser?.role);
      
      // For Admin users, get ALL users from ALL branches (ignore branch_id parameter)
      // For other users, they get users from their branch or specified branch
      let url;
      if (currentUser?.role === 'Admin') {
        // Admin should ALWAYS get ALL users from ALL branches (both active and inactive)
        url = '/api/users/user_crud.php';
        console.log('👤 Admin fetching ALL users from ALL branches (both active and inactive, ignoring branch_id:', branch_id, ')');
      } else if (branch_id) {
        // Non-admin with specific branch requested (from navigation params)
        url = `/api/users/user_crud.php?branch_id=${branch_id}`;
        console.log('🏭 Non-admin fetching users for specific branch:', branch_id);
      } else {
        // Other roles get default behavior (their branch only)
        url = '/api/users/user_crud.php';
        console.log('👤 Non-admin fetching users with default permissions for role:', currentUser?.role);
      }
      
      console.log('🔗 API URL:', url);
      
      const response = await authFetch(url);
      const result = await response.json();
      
      console.log('📊 API Response success:', result.success);
      console.log('📊 Total users from API:', result.data?.length || 0);
      
      // If admin and still only getting few users, try alternative approaches
      if (currentUser?.role === 'Admin' && result.success && result.data && result.data.length <= 3) {
        console.log('⚠️ Admin only getting', result.data.length, 'users. Trying alternative approaches...');
        console.log('👤 Admin user details:', { 
          id: currentUser.id, 
          role: currentUser.role, 
          branch_id: currentUser.branch_id,
          name: currentUser.name 
        });
        
        // Try different API approaches to get all users
        const alternatives = [
          '/api/users/user_crud.php?get_all=1',
          '/api/users/user_crud.php?admin_view=1', 
          '/api/users/user_crud.php?all_branches=true',
          '/api/users/user_crud.php?role=all'
        ];
        
        for (const altUrl of alternatives) {
          try {
            console.log('🔄 Trying alternative URL:', altUrl);
            const altResponse = await authFetch(altUrl);
            const altResult = await altResponse.json();
            
            if (altResult.success && altResult.data && altResult.data.length > result.data.length) {
              console.log('✅ Alternative approach worked! Got', altResult.data.length, 'users');
              result = altResult;
              break;
            }
          } catch (e) {
            console.log('❌ Alternative failed:', altUrl, e.message);
          }
        }
        
        // If still not getting enough users, log the issue
        if (result.data.length <= 3) {
          console.log('❌ Still only getting', result.data.length, 'users after trying alternatives');
          console.log('This suggests either:');
          console.log('1. Only', result.data.length, 'users exist in database');
          console.log('2. Backend API needs modification to support admin getting all users');
          console.log('3. Database has users but they have different status or are deleted');
        }
      }
      
      if (result.success) {
        // Log all users from API
        console.log('👥 All users from API:', result.data.map(u => ({ 
          name: u.name, 
          role: u.role, 
          status: u.status,
          branch_name: u.branch_name 
        })));
        
        // Filter active users (only users with status 'active')
        const activeUsers = result.data.filter(user => user.status === 'active');
        console.log('✅ Active users count:', activeUsers.length);
        console.log('✅ Active users:', activeUsers.map(u => ({ name: u.name, role: u.role })));
        
        // Extract unique branch names from users (in case branches API doesn't have all branches)
        const userBranches = [...new Set(activeUsers.map(u => u.branch_name).filter(Boolean))];
        console.log('🏭 Branches found in user data:', userBranches);
        
        // Update branches list if we found branches in user data that aren't in the branches list
        setBranches(prevBranches => {
          const currentBranches = prevBranches.filter(b => b !== 'All');
          const allBranches = [...new Set([...currentBranches, ...userBranches])];
          const finalBranches = ['All', ...allBranches.sort()];
          console.log('🏭 Final branches list:', finalBranches);
          return finalBranches;
        });
        
        setUsers(activeUsers);
        setFilteredUsers(activeUsers);
        
        // Filter pending users (only users with status 'inactive', only for admin)
        if (currentUser?.role === 'Admin') {
          const pending = result.data.filter(user => user.status === 'inactive');
          console.log('⏳ Pending users count:', pending.length);
          console.log('⏳ Pending users details:', pending.map(u => ({ 
            id: u.id, 
            name: u.name, 
            role: u.role, 
            status: u.status,
            branch_name: u.branch_name 
          })));
          setPendingUsers(pending);
        }
      } else {
        console.error('❌ API Error:', result.message);
        setUsers([]);
        setFilteredUsers([]);
        setPendingUsers([]);
        Alert.alert('Error', 'Failed to fetch users.');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      if (error.message !== 'Unauthorized') {
        Alert.alert('Error', 'Failed to fetch users.');
      }
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      console.log('🔄 Approving user with ID:', userId);
      console.log('📤 Sending approval request:', { user_id: userId, action: 'approve' });
      
      const response = await authFetch('/api/users/user_crud.php', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'approve' }),
      });
      
      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response data:', result);
      if (result.success) {
        Alert.alert('Success', 'User approved successfully');
        fetchUsers(); // Refresh the lists
      } else {
        // Show more detailed error message
        const errorMsg = result.message || 'Failed to approve user';
        const statusMsg = result.current_status ? `\nCurrent status: ${result.current_status}` : '';
        Alert.alert('Error', errorMsg + statusMsg);
        // Refresh the list to get updated status
        fetchUsers();
      }
    } catch (error) {
      console.error('Approve user error:', error);
      Alert.alert('Error', 'Failed to approve user. Please try again.');
      // Refresh the list to get updated status
      fetchUsers();
    }
  };

  const handleDeclineUser = async (userId) => {
    try {
      console.log('🔄 Declining user with ID:', userId);
      console.log('📤 Sending decline request:', { user_id: userId, action: 'decline' });
      
      const response = await authFetch('/api/users/user_crud.php', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'decline' }),
      });
      
      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response data:', result);
      if (result.success) {
        Alert.alert('Success', 'User request declined');
        fetchUsers(); // Refresh the lists
      } else {
        // Show more detailed error message
        const errorMsg = result.message || 'Failed to decline user';
        const statusMsg = result.current_status ? `\nCurrent status: ${result.current_status}` : '';
        Alert.alert('Error', errorMsg + statusMsg);
        // Refresh the list to get updated status
        fetchUsers();
      }
    } catch (error) {
      console.error('Decline user error:', error);
      Alert.alert('Error', 'Failed to decline user. Please try again.');
      // Refresh the list to get updated status
      fetchUsers();
    }
  };

    const fetchBranches = async () => {
    try {
      console.log('🏭 Fetching branches for user role:', currentUser?.role);
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        const branchNames = result.data.map(b => b.name);
        console.log('🏭 Available branches:', branchNames);
        setBranches(['All', ...branchNames]);
      } else {
        console.error('❌ Failed to fetch branches:', result.message);
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
      console.log('🔄 Loading user data...');
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const userData = await AsyncStorage.getItem('userData');
      
      console.log('🔑 Session token exists:', !!sessionToken);
      console.log('👤 User data exists:', !!userData);
      
      if (sessionToken && userData) {
        const user = JSON.parse(userData);
        console.log('👤 Current user loaded:', { name: user.name, role: user.role, id: user.id });
        setCurrentUser(user);
        
        // For admin users, always default to "All" branches
        if (user.role === 'Admin') {
          console.log('👑 Admin user - setting default branch to "All"');
          setSelectedBranch('All');
        } else if (initialBranch) {
          // For non-admin users, use initialBranch if provided
          console.log('👤 Non-admin user - using initialBranch:', initialBranch);
          setSelectedBranch(initialBranch);
        }
        
        // Fetch users after setting current user
        console.log('🚀 Calling fetchUsers after user load...');
        
        // Always fetch branches for admin, or if no specific branch_id for others
        if (user.role === 'Admin' || !branch_id) {
          console.log('🏭 Fetching branches for role:', user.role, '(admin always gets all branches)');
          fetchBranches();
        }
      } else {
        console.log('❌ No session token or user data found');
      }
    };
    loadData();
  }, [branch_id]);

  // Refetch when currentUser is set
  useEffect(() => {
    if (currentUser) {
      console.log('👤 CurrentUser changed, fetching users...', currentUser.role);
      fetchUsers();
      
      // Always ensure branches are fetched for admin users (ignore branch_id)
      if (currentUser.role === 'Admin') {
        console.log('🏭 Admin user detected, ensuring branches are fetched (ignoring branch_id)');
        fetchBranches();
      }
    }
  }, [currentUser, branch_id]);

  useEffect(() => {
    const filterUsers = async () => {
      let result = users;
      
      console.log('🔍 Starting user filtering...');
      console.log('📊 Total users from API:', users.length);
      console.log('🏭 Selected branch:', selectedBranch);
      console.log('👥 Selected role:', selectedRole);
      console.log('🏭 Branch ID param:', branch_id);
      
      // Always filter out Developer and Admin role users (never show them)
      result = result.filter(user => user.role !== 'Developer' && user.role !== 'Admin');
      console.log('📋 Users after admin/dev filter:', result.length);
      
      // Apply branch filter (only if branch is selected and not admin viewing specific branch)
      // For admin: always allow branch filtering regardless of branch_id parameter
      // For others: only filter if no branch_id parameter
      if (selectedBranch !== 'All' && (currentUser?.role === 'Admin' || !branch_id)) {
        console.log('🏭 Applying branch filter for:', selectedBranch);
        const beforeBranchFilter = result.length;
        result = result.filter(user => {
          const matches = user.branch_name === selectedBranch;
          if (!matches) {
            console.log('🙅 Filtering out user:', user.name, 'from branch:', user.branch_name);
          }
          return matches;
        });
        console.log('🏭 Users after branch filter:', result.length, '(filtered out:', beforeBranchFilter - result.length, ')');
      }
      
      // Apply role filter
      if (selectedRole !== 'All') {
        console.log('👥 Applying role filter for:', selectedRole);
        const beforeRoleFilter = result.length;
        result = result.filter(user => user.role === selectedRole);
        console.log('👥 Users after role filter:', result.length, '(filtered out:', beforeRoleFilter - result.length, ')');
      }
      
      console.log('✅ Final filtered users:', result.length);
      console.log('🔍 Final users:', result.map(u => ({ name: u.name, role: u.role, branch: u.branch_name })));
      
      // Fetch student data for users with Student role
      const studentUsers = result.filter(user => user.role === 'Student');
      if (studentUsers.length > 0) {
        await fetchStudentData(studentUsers);
      }
      
      setFilteredUsers(result);
    };

    filterUsers();
  }, [selectedBranch, selectedRole, users, currentUser, branch_id]);

  const openViewModal = (user) => { setSelectedUser(user); setIsViewModalVisible(true); };
  const fetchStudentData = async (studentUsers) => {
    try {
      const studentDataMap = {};
      
      // Fetch student data from students table using user_id parameter
      for (const user of studentUsers) {
        try {
          // Use user_id parameter since we have the user table ID
          const response = await authFetch(`/api/students/get_student_info.php?user_id=${user.id}`);
          const result = await response.json();
          
          if (result.success && result.data) {
            studentDataMap[user.id] = result.data;
            console.log(`📚 Student data fetched for user ${user.id}:`, result.data);
          } else {
            // Student not found in students table - this is normal for new students
            console.log(`ℹ️ Student record not found for user ${user.id}, creating default data`);
            studentDataMap[user.id] = {
              student_id: `STU${user.id.toString().padStart(4, '0')}`,
              class_name: '',
              blood_group: '',
              father_name: '',
              father_number: '',
              mother_name: '',
              mother_number: '',
              guardian_name: '',
              guardian_number: '',
              fees: ''
            };
          }
        } catch (error) {
          // Only log as error if it's not a "Student not found" case
          if (error.message && error.message.includes('Student not found')) {
            console.log(`ℹ️ Student record not found for user ${user.id} (expected for new students)`);
          } else {
            console.error(`❌ Error fetching student data for user ${user.id}:`, error);
          }
          
          // Always create fallback data
          studentDataMap[user.id] = {
            student_id: `STU${user.id.toString().padStart(4, '0')}`,
            class_name: '',
            blood_group: '',
            father_name: '',
            father_number: '',
            mother_name: '',
            mother_number: '',
            guardian_name: '',
            guardian_number: '',
            fees: ''
          };
        }
      }
      
      setStudentData(studentDataMap);
    } catch (error) {
      console.error('Error processing student data:', error);
    }
  };

  const openEditModal = (user) => {
    // Merge user data with student data for complete user object
    const studentInfo = studentData[user.id] || {};
    const completeUserData = {
      ...user,
      ...studentInfo,
      franchisee_share: user.franchisee_share || '75',
      sharing_enabled: user.sharing_enabled !== undefined ? user.sharing_enabled : true,
      status: user.status || 'active'
    };
    
    // Navigate to edit screen with user data
    router.push({
      pathname: '/(common)/edit-user',
      params: {
        user_data: JSON.stringify(completeUserData)
      }
    });
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
        phone: editData.mobile, // Use 'phone' for API, get from 'mobile' field
        email: editData.email,
        role: editData.role,
        branch_id: editData.branch_id,
        father_name: editData.father_name,
        father_number: editData.father_number,
        mother_name: editData.mother_name,
        mother_number: editData.mother_number,
        guardian_name: editData.guardian_name,
        guardian_number: editData.guardian_number,
        blood_group: editData.blood_group,
        class_name: editData.class_name,
        student_id: editData.student_id,
        status: editData.status,
        avatar: editData.avatar // Add avatar field for profile image
      };

      // Add franchisee share fields for admin users
      if (currentUser?.role === 'Admin') {
        updateData.franchisee_share = parseFloat(editData.franchisee_share) || 75;
        updateData.sharing_enabled = editData.sharing_enabled ? 1 : 0;
      }
      
      // Handle student-specific data separately
      if (editData.role === 'Student' && currentUser?.role === 'Admin') {
        // Update or create student table data
        const studentUpdateData = {
          user_id: selectedUser.id,
          student_id: editData.student_id,
          father_name: editData.father_name,
          father_number: editData.father_number,
          mother_name: editData.mother_name,
          mother_number: editData.mother_number,
          guardian_name: editData.guardian_name,
          guardian_number: editData.guardian_number,
          blood_group: editData.blood_group,
          class_name: editData.class_name
        };
        
        // Try to update student table, create if doesn't exist
        try {
          // First try to update existing record
          let studentResponse = await authFetch('/api/students/update_student.php', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(studentUpdateData),
          });
          let studentResult = await studentResponse.json();
          
          // If student not found, try to create new record
          if (!studentResult.success && studentResult.message && studentResult.message.includes('not found')) {
            console.log('Student record not found, creating new record...');
            studentResponse = await authFetch('/api/students/create_student.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(studentUpdateData),
            });
            studentResult = await studentResponse.json();
          }
          
          console.log('Student data operation result:', studentResult);
        } catch (error) {
          console.error('Error handling student data:', error);
        }
      }

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
      case 'Admin': return ['#FF6B35', '#E55A2B'];
      case 'Developer': return ['#6C5CE7', '#5A4FCF'];
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

  const renderPendingUserItem = ({ item, index }) => {
    // Check if user is actually pending approval
    const isPending = item.status === 'inactive';
    
    console.log('🔍 Rendering pending user:', { 
      id: item.id, 
      name: item.name, 
      status: item.status, 
      isPending 
    });
    
    return (
      <Animatable.View animation="fadeInUp" duration={800} delay={index * 100}>
        <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.userCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Image source={item.avatar ? { uri: item.avatar } : require('../../assets/Avartar.png')} style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userDetails}>{item.role} at {item.branch_name || 'No Branch'}</Text>
            <Text style={styles.userDetails}>Created by: {item.created_by || 'Unknown'}</Text>
            <View style={styles.pendingBadge}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.white} />
              <Text style={styles.pendingText}>
                {isPending ? 'WAITING FOR APPROVAL' : `STATUS: ${item.status?.toUpperCase()}`}
              </Text>
            </View>
          </View>
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton, !isPending && styles.disabledButton]} 
              onPress={() => handleApproveUser(item.id)}
              disabled={!isPending}
            >
              <MaterialCommunityIcons name="check" size={22} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.declineButton, !isPending && styles.disabledButton]} 
              onPress={() => handleDeclineUser(item.id)}
              disabled={!isPending}
            >
              <MaterialCommunityIcons name="close" size={22} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animatable.View>
    );
  };

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
        {/* Tab Navigation - Only show for Admin */}
        {currentUser?.role === 'Admin' && (
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'active' && styles.activeTab]}
              onPress={() => setActiveTab('active')}
            >
              <MaterialCommunityIcons 
                name="account-check" 
                size={20} 
                color={activeTab === 'active' ? Colors.white : Colors.primary} 
              />
              <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
                Active Users
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => setActiveTab('pending')}
            >
              <MaterialCommunityIcons 
                name="clock-outline" 
                size={20} 
                color={activeTab === 'pending' ? Colors.white : Colors.primary} 
              />
              <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                Pending ({pendingUsers.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filters - Only show for active tab */}
        {activeTab === 'active' && (
          <View style={styles.filtersContainer}>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={selectedBranch} onValueChange={setSelectedBranch} style={styles.picker} enabled={currentUser?.role === 'Admin' || (!initialBranch && !branch_id)} itemStyle={styles.pickerItem}>
                {branches.map(b => <Picker.Item key={b} label={b} value={b} />)}
              </Picker>
            </View>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={selectedRole} onValueChange={setSelectedRole} style={styles.picker} itemStyle={styles.pickerItem}>
                {roles.map(r => <Picker.Item key={r} label={r} value={r} />)}
              </Picker>
            </View>
          </View>
        )}

        {/* User Lists */}
        <FlatList
          data={activeTab === 'active' ? filteredUsers : pendingUsers}
          renderItem={activeTab === 'active' ? renderUserItem : renderPendingUserItem}
          keyExtractor={(item, index) => (item && item.id ? `user-${item.id}` : `user-index-${index}`)}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={Colors.lightText} />
              <Text style={styles.emptyText}>
                {activeTab === 'active' ? 'No active users found.' : 'No pending requests.'}
              </Text>
            </View>
          }
        />

        {selectedUser && renderModal(isViewModalVisible, setIsViewModalVisible, selectedUser.name, (
          <>
            <Image source={selectedUser.avatar ? { uri: `${API_URL}${selectedUser.avatar}` } : require('../../assets/Avartar.png')} style={styles.modalAvatar} />
            <Text style={styles.modalText}><Text style={styles.modalLabel}>Branch:</Text> {selectedUser.branch_name || 'No Branch'}</Text>
            <Text style={styles.modalText}><Text style={styles.modalLabel}>Role:</Text> {selectedUser.role}</Text>
            <Text style={styles.modalText}><Text style={styles.modalLabel}>Mobile:</Text> {selectedUser.number || selectedUser.mobile}</Text>
            <Text style={styles.modalText}><Text style={styles.modalLabel}>Email:</Text> {selectedUser.email}</Text>
            {selectedUser.role === 'Student' && studentData[selectedUser.id]?.student_id && <Text style={styles.modalText}><Text style={styles.modalLabel}>Student ID:</Text> {studentData[selectedUser.id].student_id}</Text>}
            {selectedUser.role === 'Student' && studentData[selectedUser.id]?.class_name && <Text style={styles.modalText}><Text style={styles.modalLabel}>Class:</Text> {studentData[selectedUser.id].class_name}</Text>}
            {selectedUser.role === 'Student' && studentData[selectedUser.id]?.blood_group && <Text style={styles.modalText}><Text style={styles.modalLabel}>Blood Group:</Text> {studentData[selectedUser.id].blood_group}</Text>}
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
  disabledButton: { opacity: 0.5 },
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
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 15,
    backgroundColor: Colors.card,
    borderRadius: 25,
    padding: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  activeTabText: {
    color: Colors.white,
  },
  // Pending user styles
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  pendingText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  approveButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  declineButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  // New styles for enhanced edit modal
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 15,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  switchLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: Colors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
});
