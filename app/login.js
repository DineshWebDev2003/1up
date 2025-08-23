import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import RNPickerSelect from 'react-native-picker-select';

export default function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const animations = {
    logo: useRef(new Animated.Value(0)).current,
    title: useRef(new Animated.Value(0)).current,
    form: useRef(new Animated.Value(0)).current,
    button: useRef(new Animated.Value(0)).current,
  };

  useEffect(() => {
    const staggerAnims = Animated.stagger(200, [
      Animated.spring(animations.logo, { toValue: 1, useNativeDriver: true }),
      Animated.spring(animations.title, { toValue: 1, useNativeDriver: true }),
      Animated.spring(animations.form, { toValue: 1, useNativeDriver: true }),
      Animated.spring(animations.button, { toValue: 1, useNativeDriver: true }),
    ]);
    staggerAnims.start();
  }, []);

  const handleLogin = () => {
    if (!selectedRole) {
      return;
    }
    setLoading(true);
    // Simulate a network request
    setTimeout(() => {
      router.replace(selectedRole);
      setLoading(false);
    }, 500);
  };

  const createAnimationStyle = (animValue) => ({
    opacity: animValue,
    transform: [{
      translateY: animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [30, 0],
      }),
    }],
  });

  const roles = [
    { label: 'Admin', value: '/(admin)/home' },
    { label: 'Franchisee', value: '/(franchisee)/home' },
    { label: 'Student', value: '/(student)/home' },
    { label: 'Teacher', value: '/(teacher)/home' },
    { label: 'Tuition Teacher', value: '/(tuition-teacher)/home' },
    { label: 'Tuition Student', value: '/(tuition-student)/home' },
  ];

  return (
    <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <Animated.View style={createAnimationStyle(animations.logo)}>
            <Image source={require('../assets/Avartar.png')} style={styles.logo} />
          </Animated.View>

          <Animated.View style={createAnimationStyle(animations.title)}>
            <Text style={styles.title}>TN HAPPY KIDS</Text>
            <Text style={styles.subtitle}>Securely Access Your World</Text>
          </Animated.View>

          <Animated.View style={[styles.formContainer, createAnimationStyle(animations.form)]}>
            <View style={styles.inputContainer}>
              <Feather name="user" size={20} color="#fff" style={styles.inputIcon} />
              <RNPickerSelect
                onValueChange={(value) => setSelectedRole(value)}
                items={roles}
                style={pickerSelectStyles}
                placeholder={{ label: 'Select a role to login...', value: null }}
              />
            </View>
          </Animated.View>

          <Animated.View style={[styles.formContainer, createAnimationStyle(animations.button)]}>
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading || !selectedRole}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>SIGN IN</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  contentContainer: {
    width: '85%',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e0e0',
    marginBottom: 40,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
    padding: 12,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#e94560',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#fff',
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
  },
});
