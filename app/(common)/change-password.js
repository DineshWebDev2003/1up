import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import WhiteBackground from '../components/WhiteBackground';
import { useColors } from '../hooks/useColors';
import authFetch from '../utils/api';

const ChangePasswordScreen = () => {
  const router = useRouter();
  const Colors = useColors();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch('/api/users/change_password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Password changed successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear form
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setErrors({});
                // Navigate back
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WhiteBackground>
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animatable.View animation="fadeInDown" duration={600} delay={100}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={[styles.backButton, { backgroundColor: Colors.surface }]}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: Colors.text }]}>Change Password</Text>
              <View style={styles.headerSpacer} />
            </View>
          </Animatable.View>

          {/* Form Section */}
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
            <View style={[styles.formContainer, { backgroundColor: Colors.surface }]}>
              <Text style={[styles.formTitle, { color: Colors.text }]}>Update Your Password</Text>
              <Text style={[styles.formSubtitle, { color: Colors.textSecondary }]}>
                Choose a strong password to keep your account secure
              </Text>
              
              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: Colors.text }]}>Current Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: Colors.inputBackground, borderColor: errors.currentPassword ? Colors.danger : Colors.inputBorder }]}>
                  <View style={[styles.inputIconContainer, { backgroundColor: Colors.background }]}>
                    <MaterialIcons name="lock" size={20} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: Colors.text }]}
                    value={currentPassword}
                    onChangeText={(text) => {
                      setCurrentPassword(text);
                      if (errors.currentPassword) {
                        setErrors(prev => ({ ...prev, currentPassword: null }));
                      }
                    }}
                    placeholder="Enter your current password"
                    placeholderTextColor={Colors.textSecondary}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <MaterialIcons 
                      name={showCurrentPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color={Colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                {errors.currentPassword && (
                  <Text style={[styles.errorText, { color: Colors.danger }]}>{errors.currentPassword}</Text>
                )}
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: Colors.text }]}>New Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: Colors.inputBackground, borderColor: errors.newPassword ? Colors.danger : Colors.inputBorder }]}>
                  <View style={[styles.inputIconContainer, { backgroundColor: Colors.background }]}>
                    <MaterialIcons name="lock-outline" size={20} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: Colors.text }]}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (errors.newPassword) {
                        setErrors(prev => ({ ...prev, newPassword: null }));
                      }
                    }}
                    placeholder="Enter your new password"
                    placeholderTextColor={Colors.textSecondary}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <MaterialIcons 
                      name={showNewPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color={Colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                {errors.newPassword && (
                  <Text style={[styles.errorText, { color: Colors.danger }]}>{errors.newPassword}</Text>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: Colors.text }]}>Confirm New Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: Colors.inputBackground, borderColor: errors.confirmPassword ? Colors.danger : Colors.inputBorder }]}>
                  <View style={[styles.inputIconContainer, { backgroundColor: Colors.background }]}>
                    <MaterialIcons name="lock-reset" size={20} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={[styles.input, { color: Colors.text }]}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: null }));
                      }
                    }}
                    placeholder="Confirm your new password"
                    placeholderTextColor={Colors.textSecondary}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <MaterialIcons 
                      name={showConfirmPassword ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color={Colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text style={[styles.errorText, { color: Colors.danger }]}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Password Requirements */}
              <View style={[styles.requirementsContainer, { backgroundColor: Colors.background }]}>
                <Text style={[styles.requirementsTitle, { color: Colors.text }]}>Password Requirements:</Text>
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name={newPassword.length >= 6 ? 'check-circle' : 'radio-button-unchecked'} 
                    size={16} 
                    color={newPassword.length >= 6 ? Colors.success : Colors.textSecondary} 
                  />
                  <Text style={[styles.requirementText, { color: Colors.textSecondary }]}>At least 6 characters</Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name={newPassword !== currentPassword && newPassword.length > 0 ? 'check-circle' : 'radio-button-unchecked'} 
                    size={16} 
                    color={newPassword !== currentPassword && newPassword.length > 0 ? Colors.success : Colors.textSecondary} 
                  />
                  <Text style={[styles.requirementText, { color: Colors.textSecondary }]}>Different from current password</Text>
                </View>
                <View style={styles.requirementItem}>
                  <MaterialIcons 
                    name={newPassword === confirmPassword && newPassword.length > 0 ? 'check-circle' : 'radio-button-unchecked'} 
                    size={16} 
                    color={newPassword === confirmPassword && newPassword.length > 0 ? Colors.success : Colors.textSecondary} 
                  />
                  <Text style={[styles.requirementText, { color: Colors.textSecondary }]}>Passwords match</Text>
                </View>
              </View>
            </View>
          </Animatable.View>

          {/* Change Password Button */}
          <Animatable.View animation="fadeInUp" duration={800} delay={300}>
            <TouchableOpacity 
              style={[styles.changeButton, loading && styles.disabledButton]} 
              onPress={handlePasswordChange}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? [Colors.textSecondary, Colors.textSecondary] : [Colors.primary, Colors.primaryDark]}
                style={styles.changeButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" style={styles.loadingIcon} />
                ) : (
                  <MaterialIcons name="security" size={24} color={Colors.textOnPrimary} style={styles.changeIcon} />
                )}
                <Text style={[styles.changeButtonText, { color: Colors.textOnPrimary }]}>
                  {loading ? 'Changing Password...' : 'Change Password'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>

          {/* Spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </WhiteBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },

  // Form Section
  formContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
  },
  inputIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },

  // Requirements Section
  requirementsContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 12,
    marginLeft: 8,
  },

  // Change Password Button
  changeButton: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  changeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  changeIcon: {
    marginRight: -4,
  },
  loadingIcon: {
    marginRight: 8,
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ChangePasswordScreen;
