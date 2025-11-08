import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, Image, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

export default function ProfileEditScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authFetch('/api/users/profile_crud.php');
      const result = await response.json();
      if (result.success) {
        setProfile(result.data);
        setFormData({
          name: result.data.name || '',
          email: result.data.email || '',
          phone: result.data.phone || ''
        });
        if (result.data.profile_picture) {
          setProfileImage(`${API_URL}${result.data.profile_picture}`);
        }
      } else {
        Alert.alert('Error', 'Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch('/api/users/profile_crud.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully');
        fetchProfile();
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password || !passwordData.new_password) {
      Alert.alert('Error', 'Current password and new password are required');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch('/api/users/profile_crud.php?action=change_password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Password changed successfully');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setShowPasswordModal(false);
      } else {
        Alert.alert('Error', result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload profile picture');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadProfilePicture(result.assets[0]);
    }
  };

  const uploadProfilePicture = async (imageAsset) => {
    console.log('=== STARTING PROFILE PICTURE UPLOAD ===');
    console.log('Image Asset:', JSON.stringify(imageAsset, null, 2));
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageAsset.uri,
        type: imageAsset.mimeType || 'image/jpeg',
        name: imageAsset.fileName || 'avatar.jpg',
      });

      console.log('FormData created with:');
      console.log('- URI:', imageAsset.uri);
      console.log('- Type:', imageAsset.mimeType || 'image/jpeg');
      console.log('- Name:', imageAsset.fileName || 'avatar.jpg');
      console.log('- File Size:', imageAsset.fileSize);

      const apiUrl = '/api/users/profile_crud.php?action=upload_avatar';
      console.log('Making API call to:', apiUrl);

      const response = await authFetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('Response received:');
      console.log('- Status:', response.status);
      console.log('- OK:', response.ok);
      console.log('- Headers:', response.headers);

      const result = await response.json();
      console.log('Response JSON:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('✅ Upload successful!');
        Alert.alert('Success', 'Profile picture updated successfully');
        setProfileImage(`${API_URL}${result.data.profile_picture}`);
        fetchProfile();
      } else {
        console.log('❌ Upload failed:', result.message);
        Alert.alert('Upload Error', `Failed to upload profile picture:\n\n${result.message}\n\nCheck console for details.`);
      }
    } catch (error) {
      console.error('❌ Upload error occurred:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      Alert.alert('Upload Error', `Failed to upload profile picture:\n\n${error.message}\n\nCheck console for full error details.`);
    } finally {
      setSaving(false);
      console.log('=== PROFILE PICTURE UPLOAD COMPLETED ===');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={Colors.gradientMain} style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </LinearGradient>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInUp" duration={600} style={styles.profileSection}>
          <TouchableOpacity onPress={handleImagePicker} style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <LinearGradient colors={Colors.gradientPrimary} style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={60} color={Colors.white} />
              </LinearGradient>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={20} color={Colors.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileRole}>{profile.role}</Text>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter your phone number"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity onPress={handleUpdateProfile} disabled={saving}>
            <LinearGradient colors={Colors.gradientPrimary} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowPasswordModal(true)} style={styles.passwordButton}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
            <Text style={styles.passwordButtonText}>Change Password</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>

      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View animation="slideInUp" style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <TextInput
              style={styles.modalInput}
              value={passwordData.current_password}
              onChangeText={(text) => setPasswordData({ ...passwordData, current_password: text })}
              placeholder="Current Password"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
            />

            <TextInput
              style={styles.modalInput}
              value={passwordData.new_password}
              onChangeText={(text) => setPasswordData({ ...passwordData, new_password: text })}
              placeholder="New Password"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
            />

            <TextInput
              style={styles.modalInput}
              value={passwordData.confirm_password}
              onChangeText={(text) => setPasswordData({ ...passwordData, confirm_password: text })}
              placeholder="Confirm New Password"
              placeholderTextColor={Colors.textSecondary}
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={saving}
                style={[styles.modalButton, styles.confirmButton]}
              >
                <LinearGradient colors={Colors.gradientPrimary} style={styles.confirmButtonGradient}>
                  <Text style={styles.confirmButtonText}>
                    {saving ? 'Changing...' : 'Change Password'}
                  </Text>
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
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 50, 
    paddingBottom: 20, 
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: Colors.white, fontWeight: '600' },
  container: { flex: 1, paddingHorizontal: 20 },
  profileSection: { alignItems: 'center', paddingVertical: 30 },
  profileImageContainer: { position: 'relative', marginBottom: 15 },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 4, 
    borderColor: Colors.white 
  },
  profileImagePlaceholder: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 4, 
    borderColor: Colors.white 
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white
  },
  profileName: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 5 },
  profileRole: { fontSize: 16, color: Colors.textSecondary },
  formSection: { paddingBottom: 30 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.card
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20
  },
  saveButtonText: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: Colors.card
  },
  passwordButtonText: { fontSize: 16, fontWeight: '600', color: Colors.primary, marginLeft: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '90%',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center'
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, marginBottom: 20 },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginBottom: 15
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  modalButton: { flex: 1, marginHorizontal: 5 },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.lightGray,
    alignItems: 'center'
  },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  confirmButton: { borderRadius: 12, overflow: 'hidden' },
  confirmButtonGradient: { paddingVertical: 12, alignItems: 'center' },
  confirmButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.white }
});
