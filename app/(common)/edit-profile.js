import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import WhiteBackground from '../components/WhiteBackground';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { API_URL } from '../../config';

const EditProfileScreen = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      console.log('Raw userData from AsyncStorage:', userData);
      if (userData) {
        const user = JSON.parse(userData);
        console.log('Parsed user data:', user);
        setUser(user);
        setName(user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        
        // Set existing profile image if available
        if (user.profile_image && user.profile_image !== 'undefined' && user.profile_image !== null) {
          const imageUrl = user.profile_image.startsWith('http') 
            ? user.profile_image 
            : `${API_URL}${user.profile_image}`;
          console.log('Loading existing profile image:', imageUrl);
          setImage(imageUrl);
        } else if (user.avatar && user.avatar !== 'undefined' && user.avatar !== null) {
          const imageUrl = user.avatar.startsWith('http') 
            ? user.avatar 
            : `${API_URL}${user.avatar}`;
          console.log('Found avatar field, using:', imageUrl);
          setImage(imageUrl);
        } else {
          console.log('No valid profile image found, using default');
          setImage(null);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleChoosePhoto = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to select a photo.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        console.log('Selected image:', selectedImage.uri);
        setImage(selectedImage.uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadAvatar = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      console.log('Uploading avatar from URI:', imageUri);

            const response = await authFetch('/api/upload_avatar.php', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('Avatar upload result:', result);

      if (result.success) {
        // Immediately update the image state to show the new avatar
        console.log('Avatar upload successful, setting image to:', result.data.avatar_url);
        setImage(result.data.avatar_url);
        
        // Also update the user data in AsyncStorage immediately
        try {
          const currentUserData = await AsyncStorage.getItem('userData');
          if (currentUserData) {
            const userData = JSON.parse(currentUserData);
            userData.profile_image = result.data.avatar_url;
            await AsyncStorage.setItem('userData', JSON.stringify(userData));
            console.log('Updated AsyncStorage with new profile image:', result.data.avatar_url);
          }
        } catch (storageError) {
          console.error('Error updating AsyncStorage with avatar:', storageError);
        }
        
        return result.data.avatar_url;
      } else {
        throw new Error(result.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = null;
      
      // Upload avatar if image was selected
      if (image && image !== user.avatar) {
        try {
          avatarUrl = await uploadAvatar(image);
        } catch (uploadError) {
          Alert.alert('Error', 'Failed to upload avatar: ' + uploadError.message);
          setLoading(false);
          return;
        }
      }

      // Update profile data
      const profileData = {
        action: 'update',
        id: user.id,
        name: name.trim(),
        email: email.trim(),
      };

      if (avatarUrl) {
        profileData.profile_image = avatarUrl;
      }

      const response = await authFetch('/api/users/profile_crud.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const result = await response.json();
      console.log('Profile update result:', result);

      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        
        // Fetch fresh user data from the API to get the updated profile
        try {
          const freshUserResponse = await authFetch('/api/users/profile_crud.php');
          const freshUserResult = await freshUserResponse.json();
          
          if (freshUserResult.success && freshUserResult.data) {
            // Update AsyncStorage with fresh data from API
            await AsyncStorage.setItem('userData', JSON.stringify(freshUserResult.data));
            console.log('Updated user data in AsyncStorage:', freshUserResult.data);
            
            // Reload the component with fresh data
            await loadUserData();
          } else {
            // Fallback: Update local user data manually
            const updatedUser = { ...user, name: name.trim(), email: email.trim() };
            if (avatarUrl) {
              updatedUser.profile_image = avatarUrl;
            }
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
            await loadUserData();
          }
        } catch (fetchError) {
          console.error('Error fetching fresh user data:', fetchError);
          // Fallback: Update local user data manually
          const updatedUser = { ...user, name: name.trim(), email: email.trim() };
          if (avatarUrl) {
            updatedUser.profile_image = avatarUrl;
          }
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
          await loadUserData();
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <WhiteBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animatable.View animation="fadeInDown" duration={600} delay={100}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Profile</Text>
              <View style={styles.headerSpacer} />
            </View>
          </Animatable.View>

          {/* Profile Image Section */}
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImageWrapper}>
                <TouchableOpacity onPress={handleChoosePhoto} style={styles.imageContainer}>
                  {console.log('Rendering image with URI:', image)}
                  <Image 
                    source={image ? { uri: image } : require('../../assets/Avartar.png')} 
                    style={styles.profilePic}
                    onError={(error) => {
                      console.log('Edit profile image load error:', error);
                      console.log('Failed image URI:', image);
                    }}
                    onLoad={() => {
                      console.log('Edit profile image loaded successfully:', image);
                    }}
                  />
                  <View style={styles.cameraIconContainer}>
                    <LinearGradient
                      colors={[Colors.primary, Colors.secondary]}
                      style={styles.cameraIcon}
                    >
                      <MaterialIcons name="camera-alt" size={20} color="white" />
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
                <Text style={styles.profileImageHint}>Tap to change profile picture</Text>
              </View>
            </View>
          </Animatable.View>

          {/* Form Section */}
          <Animatable.View animation="fadeInUp" duration={800} delay={300}>
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Personal Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <MaterialIcons name="person" size={20} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <MaterialIcons name="email" size={20} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconContainer}>
                    <MaterialIcons name="phone" size={20} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter your phone number"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>
          </Animatable.View>

          {/* Save Button */}
          <Animatable.View animation="fadeInUp" duration={800} delay={400}>
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.disabledButton]} 
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? [Colors.textSecondary, Colors.textSecondary] : [Colors.primary, Colors.secondary]}
                style={styles.saveButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" style={styles.loadingIcon} />
                ) : (
                  <MaterialIcons name="save" size={24} color="white" style={styles.saveIcon} />
                )}
                <Text style={styles.saveButtonText}>
                  {loading ? 'Updating Profile...' : 'Save Changes'}
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
    backgroundColor: 'transparent',
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
    backgroundColor: Colors.background,
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
    color: Colors.text,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },

  // Profile Image Section
  profileImageContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  profileImageWrapper: {
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  cameraIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  profileImageHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Form Section
  formContainer: {
    backgroundColor: Colors.white,
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
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: Colors.background,
  },
  inputIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },

  // Save Button
  saveButton: {
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
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  saveIcon: {
    marginRight: -4,
  },
  loadingIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default EditProfileScreen;
