import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, 
  Alert, TextInput, StatusBar, Image, Platform 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

export default function EditUserScreen() {
  const { user_data } = useLocalSearchParams();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Parse user data from params
  const userData = user_data ? JSON.parse(user_data) : {};
  
  // Debug logging for initial data
  console.log('📋 Initial user data loaded:', userData);
  console.log('📱 Phone field:', userData.phone);
  console.log('🎓 Student data:', {
    student_id: userData.student_id,
    student_class: userData.student_class,
    fees: userData.fees
  });
  console.log('💰 Franchisee share data:', {
    franchisee_share: userData.franchisee_share,
    sharing_enabled: userData.sharing_enabled
  });
  console.log('💵 Student fees:', userData.fees);
  
  const [editData, setEditData] = useState({
    name: userData.name || '',
    mobile: userData.phone || '', // Use 'phone' field from users table
    email: userData.email || '',
    password: '',
    confirmPassword: '',
    role: userData.role || '',
    branch_id: userData.branch_id || '',
    student_id: userData.student_id || `STU${userData.id?.toString().padStart(4, '0')}` || '', // student_id from students table
    fees: userData.fees || '', // Monthly fees for students
    franchisee_share: userData.franchisee_share || '75',
    sharing_enabled: userData.sharing_enabled == 1 || userData.sharing_enabled === true,
    status: userData.status || 'active'
  });

  useEffect(() => {
    const loadData = async () => {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      const userDataStorage = await AsyncStorage.getItem('userData');
      
      if (userDataStorage) {
        const user = JSON.parse(userDataStorage);
        setCurrentUser(user);
      }
      
      // Fetch branches
      fetchBranches();
      
      // Fetch fresh student data if this is a student user
      if (userData.role === 'Student' || userData.role === 'Tuition Student') {
        fetchStudentData();
        fetchBranches();
      }
    };
    loadData();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        setBranches(result.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchStudentData = async () => {
    try {
      console.log('📚 Fetching fresh student data for user ID:', userData.id);
      const response = await authFetch(`/api/students/get_student_info.php?user_id=${userData.id}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Fresh student data loaded:', result.data);
        console.log('💵 Fees from API:', result.data.fees);
        
        // Update editData with fresh data including fees
        setEditData(prev => ({
          ...prev,
          fees: result.data.fees || '',
          student_id: result.data.student_id || prev.student_id,
          class_name: result.data.class || prev.class_name,
          blood_group: result.data.blood_group || prev.blood_group,
          father_name: result.data.father_name || prev.father_name,
          father_number: result.data.father_phone || prev.father_number,
          mother_name: result.data.mother_name || prev.mother_name,
          mother_number: result.data.mother_phone || prev.mother_number,
          guardian_name: result.data.guardian_name || prev.guardian_name,
          guardian_number: result.data.guardian_phone || prev.guardian_number
        }));
      } else {
        console.log('ℹ️ No student data found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error fetching student data:', error);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to change profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage({ uri: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
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
        id: userData.id, 
        name: editData.name,
        phone: editData.mobile,
        email: editData.email,
        role: editData.role,
        branch_id: editData.branch_id,
        status: editData.status
      };

      // Add student fees for student users
      if (editData.role === 'Student' || editData.role === 'Tuition Student') {
        updateData.fees = editData.fees ? parseFloat(editData.fees) : 0;
      }

      // Add franchisee share fields for admin users
      if (currentUser?.role === 'Admin') {
        updateData.franchisee_share = parseFloat(editData.franchisee_share) || 75;
        updateData.sharing_enabled = editData.sharing_enabled ? 1 : 0;
        console.log('🔧 Admin updating franchisee share:', {
          franchisee_share: updateData.franchisee_share,
          sharing_enabled: updateData.sharing_enabled,
          original_share: editData.franchisee_share,
          original_enabled: editData.sharing_enabled
        });
      }

      // Only include password if it's provided
      if (editData.password && editData.password.trim() !== '') {
        updateData.password = editData.password;
      }

      console.log('📤 Sending update data:', updateData);
      console.log('👤 Current user role:', currentUser?.role);
      console.log('🎯 Target user role:', editData.role);

      const response = await authFetch('/api/users/user_crud.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      const result = await response.json();
      console.log('📥 Server response:', result);
      
      if (result.success) {
        Alert.alert('Success', result.message || 'User updated successfully.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        console.error('❌ Update failed:', result);
        Alert.alert('Error', result.message || 'Failed to update user.');
      }
    } catch (error) {
      console.error('💥 Update user error:', error);
      Alert.alert('Error', 'Failed to update user: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header */}
      <LinearGradient colors={Colors.gradientPrimary} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit User</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <Animatable.View animation="fadeInDown" duration={800} style={styles.profileSection}>
          <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
            <Image 
              source={profileImage || require('../../assets/Avartar.png')} 
              style={styles.profileImage} 
            />
            <View style={styles.cameraIcon}>
              <MaterialCommunityIcons name="camera" size={20} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileText}>Tap to change profile picture</Text>
        </Animatable.View>

        {/* Basic Information */}
        <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="account" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              value={editData.name} 
              onChangeText={(text) => setEditData({...editData, name: text})} 
              placeholder="Full Name" 
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="phone" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              value={editData.mobile} 
              onChangeText={(text) => setEditData({...editData, mobile: text})} 
              placeholder="Mobile Number" 
              keyboardType="phone-pad"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              value={editData.email} 
              onChangeText={(text) => setEditData({...editData, email: text})} 
              placeholder="Email Address" 
              keyboardType="email-address"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
        </Animatable.View>

        {/* Role and Branch - Admin only */}
        {currentUser?.role === 'Admin' && (
          <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.section}>
            <Text style={styles.sectionTitle}>Role & Branch</Text>
            
            <View style={styles.pickerContainer}>
              <MaterialCommunityIcons name="account-group" size={20} color={Colors.primary} style={styles.inputIcon} />
              <Picker
                selectedValue={editData.role}
                onValueChange={(value) => setEditData({...editData, role: value})}
                style={styles.picker}
              >
                <Picker.Item label="Select Role" value="" />
                <Picker.Item label="Student" value="Student" />
                <Picker.Item label="Teacher" value="Teacher" />
                <Picker.Item label="Franchisee" value="Franchisee" />
                <Picker.Item label="Admin" value="Admin" />
              </Picker>
            </View>
            
            <View style={styles.pickerContainer}>
              <MaterialCommunityIcons name="office-building" size={20} color={Colors.primary} style={styles.inputIcon} />
              <Picker
                selectedValue={editData.branch_id}
                onValueChange={(value) => setEditData({...editData, branch_id: value})}
                style={styles.picker}
              >
                <Picker.Item label="Select Branch" value="" />
                {branches.map((branch) => (
                  <Picker.Item key={branch.id} label={branch.name} value={branch.id} />
                ))}
              </Picker>
            </View>
            
            <View style={styles.pickerContainer}>
              <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} style={styles.inputIcon} />
              <Picker
                selectedValue={editData.status}
                onValueChange={(value) => setEditData({...editData, status: value})}
                style={styles.picker}
              >
                <Picker.Item label="Active" value="active" />
                <Picker.Item label="Inactive" value="inactive" />
              </Picker>
            </View>
          </Animatable.View>
        )}

        {/* Student Fees - For Student users (visible to all) */}
        {(editData.role === 'Student' || editData.role === 'Tuition Student') && (
          <Animatable.View animation="fadeInUp" duration={800} delay={500} style={styles.section}>
            <Text style={styles.sectionTitle}>Student Fees</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="cash" size={20} color={Colors.primary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={editData.fees?.toString() || ''} 
                onChangeText={(text) => setEditData({...editData, fees: text})} 
                placeholder="Monthly Fees (₹)" 
                keyboardType="numeric"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </Animatable.View>
        )}


        {/* Franchisee Share Settings - Admin only for Franchisee users */}
        {currentUser?.role === 'Admin' && editData.role === 'Franchisee' && (
          <Animatable.View animation="fadeInUp" duration={800} delay={800} style={styles.section}>
            <Text style={styles.sectionTitle}>Franchisee Share Settings</Text>
            
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="percent" size={20} color={Colors.primary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={editData.franchisee_share} 
                onChangeText={(text) => setEditData({...editData, franchisee_share: text})} 
                placeholder="Franchisee Share (%)" 
                keyboardType="numeric"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Enable Profit Sharing</Text>
              <TouchableOpacity 
                style={[styles.switch, editData.sharing_enabled && styles.switchActive]}
                onPress={() => setEditData({...editData, sharing_enabled: !editData.sharing_enabled})}
              >
                <View style={[styles.switchThumb, editData.sharing_enabled && styles.switchThumbActive]} />
              </TouchableOpacity>
            </View>
          </Animatable.View>
        )}

        {/* Password Section */}
        <Animatable.View animation="fadeInUp" duration={800} delay={1000} style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password (Optional)</Text>
          
          <View style={styles.passwordContainer}>
            <MaterialCommunityIcons name="lock" size={20} color={Colors.primary} style={styles.inputIcon} />
            <TextInput 
              style={styles.passwordInput} 
              value={editData.password} 
              onChangeText={(text) => setEditData({...editData, password: text})} 
              placeholder="New Password" 
              secureTextEntry={!showPassword}
              placeholderTextColor={Colors.textSecondary}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          {editData.password !== '' && (
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-check" size={20} color={Colors.primary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                value={editData.confirmPassword} 
                onChangeText={(text) => setEditData({...editData, confirmPassword: text})} 
                placeholder="Confirm New Password" 
                secureTextEntry={!showPassword}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          )}
        </Animatable.View>

        {/* Save Button */}
        <Animatable.View animation="fadeInUp" duration={800} delay={1200} style={styles.buttonContainer}>
          <TouchableOpacity onPress={handleUpdate} style={styles.saveButtonContainer}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.saveButton}>
              <MaterialCommunityIcons name="content-save" size={24} color={Colors.white} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  profileText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 15,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  picker: {
    flex: 1,
    height: 50,
    color: Colors.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  buttonContainer: {
    paddingBottom: 30,
  },
  saveButtonContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
