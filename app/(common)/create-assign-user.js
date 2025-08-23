  import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';
import LottieView from 'lottie-react-native';

const roles = [
  { label: 'Franchisee', value: 'franchisee' },
  { label: 'Student', value: 'student' },
  { label: 'Teacher', value: 'teacher' },
  { label: 'Tuition Teacher', value: 'tuition_teacher' },
  { label: 'Tuition Student', value: 'tuition_student' },
];

const studentClasses = [
  { label: 'Daycare', value: 'daycare' },
  { label: 'Toddler', value: 'toddler' },
  { label: 'Playschool', value: 'playschool' },
];

const branches = [
  { label: 'Main Campus', value: 'main_campus' },
  { label: 'North Branch', value: 'north_branch' },
];

export default function AssignUserScreen() {
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [franchiseeShare, setFranchiseeShare] = useState('');
  const [studentClass, setStudentClass] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  const renderRoleSpecificFields = () => {
    switch (selectedRole) {
      case 'franchisee':
        return (
          <InputField icon="pie-chart-outline" placeholder="Franchisee Share %" value={franchiseeShare} onChangeText={setFranchiseeShare} keyboardType="numeric" fieldKey="share" focusedField={focusedField} setFocusedField={setFocusedField} />
        );
      case 'student':
      case 'tuition_student':
        return (
          <DropdownField icon="school-outline" placeholder="Select Class" items={studentClasses} onValueChange={setStudentClass} value={studentClass} fieldKey="class" focusedField={focusedField} setFocusedField={setFocusedField} />
        );
      case 'teacher':
      case 'tuition_teacher':
        return null;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#764ba2', '#667eea']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps='handled'>
          <Text style={styles.title}>Assign New User</Text>
          <LottieView
            source={require('../../assets/search users.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />

          <View style={styles.dropdownWrapper}>
            <DropdownField icon="business-outline" placeholder="Select Branch" items={branches} onValueChange={setSelectedBranch} value={selectedBranch} fieldKey="branch" focusedField={focusedField} setFocusedField={setFocusedField} />
            <DropdownField icon="person-add-outline" placeholder="Select Role" items={roles} onValueChange={setSelectedRole} value={selectedRole} fieldKey="role" focusedField={focusedField} setFocusedField={setFocusedField} />
          </View>

          <View style={styles.formContainer}>
            <InputField icon="person-outline" placeholder="Name" value={name} onChangeText={setName} fieldKey="name" focusedField={focusedField} setFocusedField={setFocusedField} />
            <InputField icon="mail-outline" placeholder="Gmail ID" value={email} onChangeText={setEmail} keyboardType="email-address" fieldKey="email" focusedField={focusedField} setFocusedField={setFocusedField} />
            <InputField icon="call-outline" placeholder="Mobile Number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" fieldKey="mobile" focusedField={focusedField} setFocusedField={setFocusedField} />
            <InputField icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry fieldKey="password" focusedField={focusedField} setFocusedField={setFocusedField} />
            
            {selectedRole && (
              <>
                {renderRoleSpecificFields()}
                <TouchableOpacity style={styles.submitButton}>
                  <Text style={styles.submitButtonText}>Assign User</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const InputField = ({ icon, placeholder, value, onChangeText, keyboardType = 'default', secureTextEntry = false, fieldKey, focusedField, setFocusedField }) => (
  <View style={[styles.inputContainer, focusedField && focusedField !== fieldKey && styles.blurred, focusedField === fieldKey && styles.focused]}>
    <Ionicons name={icon} size={22} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="rgba(255, 255, 255, 0.7)"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      onFocus={() => setFocusedField(fieldKey)}
      onBlur={() => setFocusedField(null)}
    />
  </View>
);

const DropdownField = ({ icon, placeholder, items, onValueChange, value, fieldKey, focusedField, setFocusedField }) => (
  <View style={[styles.inputContainer, focusedField && focusedField !== fieldKey && styles.blurred, focusedField === fieldKey && styles.focused]}>
    <Ionicons name={icon} size={22} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
    <RNPickerSelect
      placeholder={{ label: placeholder, value: null }}
      items={items}
      onValueChange={onValueChange}
      style={pickerSelectStyles}
      value={value}
      useNativeAndroidPickerStyle={false}
      onOpen={() => setFocusedField(fieldKey)}
      onClose={() => setFocusedField(null)}
      Icon={() => { return null; }}
    />
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#667eea' },
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-condensed',
  },
  lottieAnimation: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 20,
  },
  dropdownWrapper: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: '#00f2fe',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  blurred: {
    opacity: 0.5,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#00f2fe',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#4a4a4a',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: 'white',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: 'white',
    paddingRight: 30, // to ensure the text is never behind the icon
    width: '100%',
  },
  viewContainer: {
    flex: 1,
  },
  iconContainer: {
    top: 12,
    right: 15,
  },
});
