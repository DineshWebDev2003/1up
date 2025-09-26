import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, 
  TouchableOpacity, Alert, Platform, Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import authFetch from '../utils/api';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';

const roles = ['Student', 'Teacher', 'Franchisee', 'Tuition Student', 'Tuition Teacher', 'Captain'];

export default function AssignNewUserScreen() {
  const { branch, branch_id } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [role, setRole] = useState(roles[0]);
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [numberPlate, setNumberPlate] = useState('');
  const [schoolShare, setSchoolShare] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(branch_id || '');
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchBranches();
      fetchClasses();
    }
  }, [isFocused]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/branches/get_branches.php');
      const data = await response.json();
      if (data.success) {
        setBranches(data.data || []);
        // If no branch is pre-selected and there are branches, select the first one
        if (!selectedBranch && data.data && data.data.length > 0) {
          setSelectedBranch(data.data[0].id.toString());
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch branches.');
      }
    } catch (error) {
      console.error('Fetch branches error:', error);
      Alert.alert('Error', 'Failed to fetch branches.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await authFetch('/api/classes/get_classes.php');
      const data = await response.json();
      if (data.success) {
        setClasses(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedClass(data.data[0].id.toString());
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch classes.');
      }
    } catch (error) {
      console.error('Fetch classes error:', error);
      Alert.alert('Error', 'Failed to fetch classes.');
    }
  };

  const handleAssignUser = async () => {
    if (!name || !mobile || !email || !password || !selectedBranch) {
      Alert.alert('Error', 'Please fill all the required fields including branch selection.');
      return;
    }

    const userData = {
      name,
      branch_id: selectedBranch,
      role,
      mobile,
      email,
      password,
      school_share: schoolShare,
      number_plate: role === 'Captain' ? numberPlate : undefined,
    };

        try {
      const response = await authFetch('/api/users/user_crud.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (result.success) {
        let successMessage = `User ${name} has been assigned successfully.`;
        if (result.student_id) {
          successMessage += `\nStudent ID: ${result.student_id}`;
        }
        Alert.alert('Success', successMessage);
        // Clear form
        setName('');
        setRole(roles[0]);
        setMobile('');
        setEmail('');
        setPassword('');
        setSchoolShare('');
        setSelectedClass(classes[0]);
        // Reset branch selection if not pre-filled
        if (!branch_id && branches.length > 0) {
          setSelectedBranch(branches[0].id.toString());
        }
      } else {
        // Show user-friendly popup for specific errors
        if (result.message && result.message.includes('already exists')) {
          Alert.alert(
            'User Already Exists', 
            'A user with this email or username already exists. Please try with different credentials.',
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert('User Creation Failed', result.message || 'An error occurred while creating the user.');
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      if (error.message !== 'Unauthorized') {
        // Check if it's a specific API error with details
        if (error.message && error.message.includes('HTTP')) {
          // Extract the error message from HTTP error
          const errorMatch = error.message.match(/HTTP \d+: (.+)/);
          if (errorMatch) {
            try {
              const errorData = JSON.parse(errorMatch[1]);
              Alert.alert('User Creation Failed', errorData.message || 'An error occurred while creating the user.');
            } catch (parseError) {
              Alert.alert('User Creation Failed', 'Username or email already exists. Please try with different credentials.');
            }
          } else {
            Alert.alert('User Creation Failed', 'Username or email already exists. Please try with different credentials.');
          }
        } else {
          Alert.alert('Connection Error', 'Could not connect to the server. Please check your internet connection.');
        }
      }
    }
  };

  const renderPicker = (label, selectedValue, onValueChange, items) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={selectedValue} onValueChange={onValueChange} style={styles.picker}>
          {items.map(item => <Picker.Item key={item} label={item} value={item} />)}
        </Picker>
        <Ionicons name="chevron-down" size={20} color={Colors.gray} style={styles.pickerIcon} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInDown" duration={800}>
          <LinearGradient colors={Colors.gradientMain} style={styles.header}>
            <LottieView
              source={require('../../assets/lottie/activity.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
            <Text style={styles.title}>Assign New User</Text>
          </LinearGradient>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Personal Information</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={22} style={styles.inputIcon} />
                <TextInput placeholder="Full Name" style={styles.input} value={name} onChangeText={setName} placeholderTextColor={Colors.gray} />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={22} style={styles.inputIcon} />
                <TextInput placeholder="Mobile Number" style={styles.input} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholderTextColor={Colors.gray} />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={22} style={styles.inputIcon} />
                <TextInput placeholder="Email Address" style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.gray} />
              </View>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={22} style={styles.inputIcon} />
                <TextInput placeholder="Password" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={Colors.gray} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role & Permissions</Text>
              
              {/* Branch Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Branch</Text>
                {branch ? (
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business-outline" size={22} style={styles.inputIcon} />
                    <Text style={styles.staticInput}>{branch}</Text>
                  </View>
                ) : (
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedBranch}
                      onValueChange={(itemValue) => setSelectedBranch(itemValue)}
                      style={styles.picker}
                      enabled={!loading && branches.length > 0}
                    >
                      <Picker.Item label="Select Branch" value="" />
                      {branches.map(branchItem => (
                        <Picker.Item 
                          key={branchItem.id} 
                          label={branchItem.name} 
                          value={branchItem.id.toString()} 
                        />
                      ))}
                    </Picker>
                    <Ionicons name="chevron-down" size={20} color={Colors.gray} style={styles.pickerIcon} />
                  </View>
                )}
              </View>
              
              {renderPicker("Role", role, setRole, roles)}

              {role === 'Captain' && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="car-sport-outline" size={22} style={styles.inputIcon} />
                  <TextInput placeholder="Number Plate" style={styles.input} value={numberPlate} onChangeText={setNumberPlate} placeholderTextColor={Colors.gray} />
                </View>
              )}

              {role === 'School' && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="pie-chart-outline" size={22} style={styles.inputIcon} />
                  <TextInput placeholder="School Share (%)" style={styles.input} value={schoolShare} onChangeText={setSchoolShare} keyboardType="numeric" placeholderTextColor={Colors.gray} />
                </View>
              )}

              {role === 'Student' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Class</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedClass}
                      onValueChange={(itemValue) => setSelectedClass(itemValue)}
                      style={styles.picker}
                      enabled={!loading && classes.length > 0}
                    >
                      <Picker.Item label="Select Class" value="" />
                      {classes.map(classItem => (
                        <Picker.Item 
                          key={classItem.id} 
                          label={classItem.name} 
                          value={classItem.id.toString()} 
                        />
                      ))}
                    </Picker>
                    <Ionicons name="chevron-down" size={20} color={Colors.gray} style={styles.pickerIcon} />
                  </View>
                </View>
              )}
            </View>


          <TouchableOpacity style={styles.assignButton} onPress={handleAssignUser}>
            <Text style={styles.assignButtonText}>Assign User</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  title: { fontSize: 34, fontWeight: 'bold', color: Colors.lightText, textAlign: 'center' },
  lottieAnimation: { width: 150, height: 150, marginBottom: -15 },
  formContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: -20,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 18, fontWeight: '600', color: Colors.text, marginBottom: 15 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    height: 55,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: { color: Colors.primary, marginRight: 12 },
  staticInput: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 15 },
  input: { flex: 1, fontSize: 16, color: Colors.text, placeholderTextColor: Colors.text },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    height: 55,
    paddingLeft: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  picker: { flex: 1, color: Colors.text },
  pickerIcon: { position: 'absolute', right: 15, color: Colors.text },
  assignButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 8 },
    }),
  },
  assignButtonText: { color: Colors.lightText, fontSize: 18, fontWeight: 'bold' },
});
