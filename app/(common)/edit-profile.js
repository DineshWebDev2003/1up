import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
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

            const response = await fetch(`${API_URL}/api/upload_avatar.php`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${await AsyncStorage.getItem('sessionToken')}`,
        },
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
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={Colors.gradientMain} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.gray}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.gray}
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor={Colors.gray}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.disabledButton]} 
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Updating...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 34,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    alignSelf: 'center',
    marginVertical: 30,
    position: 'relative',
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'white',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: 'white',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
