import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';

const roles = [
  { label: 'Franchisee', value: 'Franchisee' },
  { label: 'Student', value: 'Student' },
  { label: 'Teacher', value: 'Teacher' },
  { label: 'Tuition Teacher', value: 'Tuition Teacher' },
  { label: 'Tuition Student', value: 'Tuition Student' },
];

const studentClasses = [
  { label: 'Playschool', value: 'playschool' },
  { label: 'Daycare', value: 'daycare' },
  { label: 'Toddler Care', value: 'toddler care' },
];

const branches = [
  { label: 'Main Campus', value: 'Main Campus' },
  { label: 'North Campus', value: 'North Campus' },
  { label: 'East Campus', value: 'East Campus' },
];

export default function AssignUserScreen() {
  const { branch } = useLocalSearchParams();
  const [selectedBranch, setSelectedBranch] = useState(branch || null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [franchiseeShare, setFranchiseeShare] = useState('');
  const [studentClass, setStudentClass] = useState(null);

  const handleAssignUser = () => {
    if (!selectedBranch || !selectedRole || !name || !email || !mobile || !password) {
      Alert.alert('Incomplete Form', 'Please fill all the required fields.');
      return;
    }
    // Handle user assignment logic here
    Alert.alert('Success', 'User has been assigned successfully!');
  };

  const renderRoleSpecificFields = () => {
    if (!selectedRole) return null;
    return (
      <Animatable.View animation="fadeInUp">
        {selectedRole === 'franchisee' && <InputField icon="pie-chart-outline" placeholder="Franchisee Share %" value={franchiseeShare} onChangeText={setFranchiseeShare} keyboardType="numeric" />}
        {(selectedRole === 'student' || selectedRole === 'tuition_student') && <DropdownField icon="school-outline" placeholder="Select Class" items={studentClasses} onValueChange={setStudentClass} value={studentClass} />}
      </Animatable.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#5D9CEC', '#90C695']} style={styles.header}>
        <LottieView source={require('../../assets/search users.json')} autoPlay loop style={styles.lottieAnimation} />
        <Animatable.Text animation="fadeInDown" style={styles.title}>Assign New User</Animatable.Text>
        {branch && <Animatable.Text animation="fadeInDown" delay={200} style={styles.subtitle}>{branch}</Animatable.Text>}
      </LinearGradient>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps='handled'>
        <Animatable.View animation="fadeInUp" delay={300} style={styles.formContainer}>
          <DropdownField icon="business-outline" placeholder="Select Branch" items={branches} onValueChange={setSelectedBranch} value={selectedBranch} disabled={!!branch} />
          <DropdownField icon="person-add-outline" placeholder="Select Role" items={branch ? roles.filter(r => r.value !== 'franchisee') : roles} onValueChange={setSelectedRole} value={selectedRole} />
          <InputField icon="person-outline" placeholder="Name" value={name} onChangeText={setName} />
          <InputField icon="mail-outline" placeholder="Gmail ID" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <InputField icon="call-outline" placeholder="Mobile Number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
          <InputField icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          {renderRoleSpecificFields()}
          <TouchableOpacity onPress={handleAssignUser}>
            <LinearGradient colors={['#FFD700', '#FF85A1']} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Assign User</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InputField = ({ icon, placeholder, value, onChangeText, keyboardType = 'default', secureTextEntry = false }) => (
  <View style={styles.inputContainer}>
    <Ionicons name={icon} size={22} color={'#999'} style={styles.inputIcon} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={'#999'}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
    />
  </View>
);

const DropdownField = ({ icon, placeholder, items, onValueChange, value, disabled = false }) => (
  <View style={styles.inputContainer}>
    <Ionicons name={icon} size={22} color={'#999'} style={styles.inputIcon} />
    <RNPickerSelect
      placeholder={{ label: placeholder, value: null }}
      items={items}
      onValueChange={onValueChange}
      style={pickerSelectStyles}
      value={value}
      useNativeAndroidPickerStyle={false}
      disabled={disabled}
      Icon={() => <Ionicons name="chevron-down" size={24} color={'#999'} />}
    />
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: Platform.OS === 'android' ? 50 : 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 5 },
  subtitle: { fontSize: 18, color: '#FFF', textAlign: 'center', marginTop: 4 },
  lottieAnimation: { width: 120, height: 120, position: 'absolute', top: -10, right: 0, opacity: 0.3 },
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 20 },
  formContainer: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 15, marginBottom: 15, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, color: '#4F4F4F', fontSize: 16 },
  submitButton: { borderRadius: 15, padding: 15, alignItems: 'center', marginTop: 10, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  submitButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize: 16, paddingVertical: 15, paddingHorizontal: 10, color: '#4F4F4F', paddingRight: 30 },
  inputAndroid: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 12, color: '#4F4F4F', paddingRight: 30 },
  viewContainer: { flex: 1 },
  iconContainer: { top: 12, right: 15 },
});
