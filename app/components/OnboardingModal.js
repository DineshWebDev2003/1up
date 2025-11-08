import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Clipboard, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';
import { formatPhotoSource } from '../utils/imageUtils';

const ProgressBar = ({ step }) => {
  const steps = [
    { number: 1, title: 'Parents', icon: 'people' },
    { number: 2, title: 'Guardian', icon: 'shield-checkmark' },
    { number: 3, title: 'Student', icon: 'school' },
    { number: 4, title: 'Location', icon: 'location' }
  ];

  return (
    <View style={styles.progressContainer}>
      {steps.map((s, index) => (
        <React.Fragment key={s.number}>
          <View style={styles.progressStepContainer}>
            <View style={[styles.progressStep, step >= s.number && styles.progressStepActive]}>
              {step >= s.number ? (
                <MaterialIcons name="check" size={16} color="white" />
              ) : (
                <Ionicons name={s.icon} size={16} color={Colors.textSecondary} />
              )}
            </View>
            <Text style={[styles.progressLabel, step >= s.number && styles.progressLabelActive]}>
              {s.title}
            </Text>
          </View>
          {index < steps.length - 1 && (
            <View style={[styles.progressConnector, step > s.number && styles.progressConnectorActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

const OnboardingModal = ({ isVisible, onClose, studentData, onProfileUpdate }) => {
  console.log('🚀 ONBOARDING MODAL RENDER - isVisible:', isVisible);
  console.log('📊 studentData passed to modal:', studentData ? 'EXISTS' : 'NULL');
  
  if (!studentData) {
    console.log('❌ No studentData provided to OnboardingModal');
    return null;
  }

  const [step, setStep] = useState(1);
  const [fatherName, setFatherName] = useState(studentData.father_name || '');
  const [fatherNumber, setFatherNumber] = useState(studentData.father_number || studentData.father_phone || '');
  const [motherName, setMotherName] = useState(studentData.mother_name || '');
  const [motherNumber, setMotherNumber] = useState(studentData.mother_number || studentData.mother_phone || '');
  const [guardianName, setGuardianName] = useState(studentData.guardian_name || '');
  const [guardianNumber, setGuardianNumber] = useState(studentData.guardian_number || studentData.guardian_phone || '');
  const [bloodGroup, setBloodGroup] = useState(studentData.blood_group || '');
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [fatherPhoto, setFatherPhoto] = useState(null);
  const [motherPhoto, setMotherPhoto] = useState(null);
  const [guardianPhoto, setGuardianPhoto] = useState(studentData.guardian_photo || null);
  
  // Location states
  const [homeAddress, setHomeAddress] = useState(studentData.home_address || '');
  const [latitude, setLatitude] = useState(studentData.home_latitude || '');
  const [longitude, setLongitude] = useState(studentData.home_longitude || '');
  const [pickupNotes, setPickupNotes] = useState(studentData.pickup_location_notes || '');
  const [locationLoading, setLocationLoading] = useState(false);

  // Update state when studentData changes
  React.useEffect(() => {
    console.log('🔥 ONBOARDING MODAL - useEffect triggered');
    console.log('📋 Full studentData received:', JSON.stringify(studentData, null, 2));
    
    setFatherName(studentData.father_name || '');
    setFatherNumber(studentData.father_number || studentData.father_phone || '');
    setMotherName(studentData.mother_name || '');
    setMotherNumber(studentData.mother_number || studentData.mother_phone || '');
    setGuardianName(studentData.guardian_name || '');
    setGuardianNumber(studentData.guardian_number || studentData.guardian_phone || '');
    setBloodGroup(studentData.blood_group || '');
    setHomeAddress(studentData.home_address || '');
    setLatitude(studentData.home_latitude || '');
    setLongitude(studentData.home_longitude || '');
    setPickupNotes(studentData.pickup_location_notes || '');
    
    // Initialize photos from saved data (URLs)
    console.log('=== ONBOARDING PHOTO DEBUG ===');
    console.log('🔍 Raw studentData.father_photo:', studentData.father_photo, typeof studentData.father_photo);
    console.log('🔍 Raw studentData.mother_photo:', studentData.mother_photo, typeof studentData.mother_photo);
    console.log('🔍 Raw studentData.guardian_photo:', studentData.guardian_photo, typeof studentData.guardian_photo);
    console.log('🔍 Raw studentData.photo:', studentData.photo, typeof studentData.photo);
    
    const fatherPhotoUrl = formatPhotoSource(studentData.father_photo);
    if (fatherPhotoUrl) {
      console.log('✅ Father photo URL:', fatherPhotoUrl.uri);
      setFatherPhoto(fatherPhotoUrl);
    } else {
      console.log('❌ No father photo URL generated');
    }
    
    const motherPhotoUrl = formatPhotoSource(studentData.mother_photo);
    if (motherPhotoUrl) {
      console.log('✅ Mother photo URL:', motherPhotoUrl.uri);
      setMotherPhoto(motherPhotoUrl);
    } else {
      console.log('❌ No mother photo URL generated');
    }
    
    const guardianPhotoUrl = formatPhotoSource(studentData.guardian_photo);
    if (guardianPhotoUrl) {
      console.log('✅ Guardian photo URL:', guardianPhotoUrl.uri);
      setGuardianPhoto(guardianPhotoUrl);
    } else {
      console.log('❌ No guardian photo URL generated');
    }
    
    const studentPhotoUrl = formatPhotoSource(studentData.photo);
    if (studentPhotoUrl) {
      console.log('✅ Student photo URL:', studentPhotoUrl.uri);
      setStudentPhoto(studentPhotoUrl);
    } else {
      console.log('❌ No student photo URL generated');
    }
  }, [studentData]);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const pickImage = async (setter) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setter(result.assets[0]);
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to get your current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());

      // Get address from coordinates
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const fullAddress = `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim();
        setHomeAddress(fullAddress);
      }

      Alert.alert('Success', 'Current location captured successfully!');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location. Please try again or enter coordinates manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      
      // Try to parse coordinates from clipboard (format: lat,lng or lat lng)
      const coordRegex = /(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/;
      const match = clipboardContent.match(coordRegex);
      
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          setLatitude(lat.toString());
          setLongitude(lng.toString());
          Alert.alert('Success', 'Coordinates pasted successfully!');
        } else {
          Alert.alert('Invalid Coordinates', 'The coordinates in clipboard are not valid.');
        }
      } else {
        // If not coordinates, treat as address
        setHomeAddress(clipboardContent);
        Alert.alert('Success', 'Address pasted successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to paste from clipboard.');
    }
  };

  const saveLocationData = async () => {
    if (!latitude || !longitude) {
      Alert.alert('Missing Location', 'Please provide your home location coordinates.');
      return false;
    }

    try {
      const locationData = {
        // New keys
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        home_address: homeAddress.trim(),
        pickup_location_notes: pickupNotes.trim(),
        // Legacy/DB keys for compatibility
        pickup_latitude: parseFloat(latitude),
        pickup_longitude: parseFloat(longitude),
        address: homeAddress.trim(),
      };

      const response = await authFetch('/api/students/update_home_location.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(locationData),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Home location saved successfully!');
        return true;
      } else {
        Alert.alert('Error', result.message || 'Failed to save location.');
        return false;
      }
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Network Error', 'Failed to save location. Please check your internet connection and try again.');
      return false;
    }
  };

  // Save only fields for the current step (partial save)
  const saveStep = async (stepToSave) => {
    try {
      if (stepToSave === 4) {
        // Save location only
        await saveLocationData();
        return;
    }

    const formData = new FormData();
    formData.append('id', studentData.id);
      if (studentData.student_id) {
        formData.append('student_id', studentData.student_id);
      }

    const convertImageToBase64 = async (imageUri) => {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error converting image to base64:', error);
        return null;
      }
    };

    const appendPhoto = async (key, photo) => {
      // Only append if photo is a file pick result (has uri and is a local file)
      if (photo && typeof photo === 'object' && photo.uri && photo.uri.startsWith('file://')) {
        try {
          // Convert image to base64 for more reliable upload
          const base64Data = await convertImageToBase64(photo.uri);
          if (base64Data) {
            const photoData = {
              base64: base64Data,
              name: photo.fileName || photo.name || `${key}_${Date.now()}.jpg`,
              type: photo.type || photo.mimeType || 'image/jpeg',
            };
            formData.append(key, JSON.stringify(photoData));
            console.log(`Appending base64 photo for ${key}`);
          } else {
            console.log(`Failed to convert ${key} to base64, skipping`);
            formData.append(`${key}_skipped`, 'true');
          }
        } catch (error) {
          console.error(`Error processing photo for ${key}:`, error);
          formData.append(`${key}_skipped`, 'true');
        }
      } else if (photo === null) {
        // Explicitly indicate that photo was skipped
        formData.append(`${key}_skipped`, 'true');
        console.log(`Photo skipped for ${key}`);
      }
    };

      if (stepToSave === 1) {
        if (fatherName) formData.append('father_name', fatherName);
        if (fatherNumber) { formData.append('father_number', fatherNumber); formData.append('father_phone', fatherNumber); }
        if (motherName) formData.append('mother_name', motherName);
        if (motherNumber) { formData.append('mother_number', motherNumber); formData.append('mother_phone', motherNumber); }
        await appendPhoto('father_photo', fatherPhoto);
        await appendPhoto('mother_photo', motherPhoto);
      } else if (stepToSave === 2) {
        if (guardianName) formData.append('guardian_name', guardianName);
        if (guardianNumber) { formData.append('guardian_number', guardianNumber); formData.append('guardian_phone', guardianNumber); }
        await appendPhoto('guardian_photo', guardianPhoto);
      } else if (stepToSave === 3) {
        if (bloodGroup) formData.append('blood_group', bloodGroup);
        await appendPhoto('photo', studentPhoto);
      }

      console.log('Sending FormData to server...');
      const response = await authFetch('/api/update_student_profile.php', { 
        method: 'POST', 
        body: formData
      });
      const result = await response.json();
      console.log('Server response:', result);
      
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully! All images have been saved.');
        // Call onProfileUpdate to refresh data
        onProfileUpdate();
      } else {
        Alert.alert('Error', result.message || 'Failed to save profile.');
      }
    } catch (error) {
      console.error('Error saving step:', error);
      
      // Try to save without images as fallback
      try {
        console.log('Attempting fallback save without images...');
        const fallbackData = new FormData();
        fallbackData.append('id', studentData.id);
        if (studentData.student_id) {
          fallbackData.append('student_id', studentData.student_id);
        }
        
        // Add only text data based on step
        if (stepToSave === 1) {
          if (fatherName) fallbackData.append('father_name', fatherName);
          if (fatherNumber) { 
            fallbackData.append('father_number', fatherNumber); 
            fallbackData.append('father_phone', fatherNumber); 
          }
          if (motherName) fallbackData.append('mother_name', motherName);
          if (motherNumber) { 
            fallbackData.append('mother_number', motherNumber); 
            fallbackData.append('mother_phone', motherNumber); 
          }
        } else if (stepToSave === 2) {
          if (guardianName) fallbackData.append('guardian_name', guardianName);
          if (guardianNumber) { 
            fallbackData.append('guardian_number', guardianNumber); 
            fallbackData.append('guardian_phone', guardianNumber); 
          }
        } else if (stepToSave === 3) {
          if (bloodGroup) fallbackData.append('blood_group', bloodGroup);
        }
        
        const fallbackResponse = await authFetch('/api/update_student_profile.php', { 
          method: 'POST', 
          body: fallbackData
        });
        const fallbackResult = await fallbackResponse.json();
        
        if (fallbackResult.success) {
          Alert.alert('Partial Success', 'Profile information saved successfully, but images could not be uploaded due to network issues. You can try uploading images later.');
          onProfileUpdate();
        } else {
          Alert.alert('Error', 'Failed to save profile information. Please check your network connection and try again.');
        }
      } catch (fallbackError) {
        console.error('Fallback save also failed:', fallbackError);
        Alert.alert('Error', 'Unable to save profile information. Please check your network connection and try again.');
      }
    }
  };

  const handleSave = async () => {
    // Try to save location if coordinates provided; otherwise skip silently
    const hasCoords = latitude && longitude;
    if (hasCoords) {
      try { await saveLocationData(); } catch (e) {}
    }
    // Save remaining fields in one go as a convenience
    await saveStep(1);
    await saveStep(2);
    await saveStep(3);
  };

  const renderPhotoInput = (label, photo, onPick, onSkip) => {
    console.log(`🖼️ Rendering ${label}:`, photo);
    if (photo && photo.uri) {
      console.log(`✅ ${label} has URI:`, photo.uri);
    } else {
      console.log(`❌ ${label} has no valid URI:`, photo);
    }
    
    return (
      <View style={styles.row}>
        <TouchableOpacity onPress={onPick} style={styles.imagePicker}>
          {photo ? <Image source={{ uri: photo.uri }} style={styles.profileImage} /> : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={30} color={Colors.gray} />
              <Text style={styles.imagePickerText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.photoLabelContainer}>
          <Text style={styles.photoLabel}>{label}</Text>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderTextInput = (label, value, setter, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={setter} placeholder={`Enter ${label.toLowerCase()}`} placeholderTextColor={Colors.gray} keyboardType={keyboardType} />
    </View>
  );

  const renderStepOne = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Parent's Information</Text>
      {renderPhotoInput("Father's Photo", fatherPhoto, () => pickImage(setFatherPhoto), () => setFatherPhoto(null))}
      {renderTextInput("Father's Name", fatherName, setFatherName)}
      {renderTextInput("Father's Number", fatherNumber, setFatherNumber, 'phone-pad')}
      <View style={styles.separator} />
      {renderPhotoInput("Mother's Photo", motherPhoto, () => pickImage(setMotherPhoto), () => setMotherPhoto(null))}
      {renderTextInput("Mother's Name", motherName, setMotherName)}
      {renderTextInput("Mother's Number", motherNumber, setMotherNumber, 'phone-pad')}
      <View style={styles.stepButtonsContainer}>
        <TouchableOpacity style={[styles.navButton, styles.skipAllButton]} onPress={() => { setFatherPhoto(null); setMotherPhoto(null); saveStep(1); }}>
          <Text style={styles.skipAllButtonText}>Skip All Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={() => saveStep(1)}>
          <Text style={styles.navButtonText}>Save This Step</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStepTwo = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Guardian's Information</Text>
      {renderPhotoInput("Guardian's Photo", guardianPhoto, () => pickImage(setGuardianPhoto), () => setGuardianPhoto(null))}
      {renderTextInput("Guardian's Name", guardianName, setGuardianName)}
      {renderTextInput("Guardian's Number", guardianNumber, setGuardianNumber, 'phone-pad')}
      <View style={styles.stepButtonsContainer}>
        <TouchableOpacity style={[styles.navButton, styles.skipAllButton]} onPress={() => { setGuardianPhoto(null); saveStep(2); }}>
          <Text style={styles.skipAllButtonText}>Skip Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={() => saveStep(2)}>
          <Text style={styles.navButtonText}>Save This Step</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStepThree = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Student's Information</Text>
        {renderPhotoInput("Student's Photo", studentPhoto, () => pickImage(setStudentPhoto), () => setStudentPhoto(null))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Medical Information</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Blood Group</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={bloodGroup} onValueChange={setBloodGroup} style={styles.picker}>
              <Picker.Item label="Select Blood Group" value="" />
              {bloodGroups.map(group => <Picker.Item key={group} label={group} value={group} />)}
            </Picker>
          </View>
        </View>
      </View>
      <View style={[styles.stepButtonsContainer, { paddingHorizontal: 15 }]}>
        <TouchableOpacity style={[styles.navButton, styles.skipAllButton]} onPress={() => { setStudentPhoto(null); saveStep(3); }}>
          <Text style={styles.skipAllButtonText}>Skip Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={() => saveStep(3)}>
          <Text style={styles.navButtonText}>Save This Step</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderStepFour = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📍 Home Location</Text>
      <Text style={styles.locationDescription}>
        Please provide your home location for cab tracking and pickup services.
      </Text>
      
      {/* Location Action Buttons */}
      <View style={styles.locationButtonsContainer}>
        <TouchableOpacity 
          style={[styles.locationButton, styles.gpsButton]} 
          onPress={getCurrentLocation}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="location" size={20} color={Colors.white} />
          )}
          <Text style={styles.locationButtonText}>
            {locationLoading ? 'Getting Location...' : 'Use GPS'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.locationButton, styles.pasteButton]} 
          onPress={pasteFromClipboard}
        >
          <Ionicons name="clipboard" size={20} color={Colors.white} />
          <Text style={styles.locationButtonText}>Paste</Text>
        </TouchableOpacity>
      </View>

      {/* Address Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Home Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={homeAddress}
          onChangeText={setHomeAddress}
          placeholder="Enter your full home address"
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Coordinates Input */}
      <View style={styles.coordinatesContainer}>
        <View style={styles.coordinateInput}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput
            style={styles.input}
            value={latitude}
            onChangeText={setLatitude}
            placeholder="e.g., 11.0168"
            placeholderTextColor={Colors.gray}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.coordinateInput}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput
            style={styles.input}
            value={longitude}
            onChangeText={setLongitude}
            placeholder="e.g., 76.9558"
            placeholderTextColor={Colors.gray}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Pickup Notes */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Pickup Instructions (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={pickupNotes}
          onChangeText={setPickupNotes}
          placeholder="e.g., Near the blue gate, 2nd floor apartment"
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Save location only */}
      <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={() => saveStep(4)}>
        <Text style={styles.navButtonText}>Save Location Only</Text>
      </TouchableOpacity>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Ionicons name="information-circle" size={16} color={Colors.primary} />
        <Text style={styles.helpText}>
          You can copy coordinates from Google Maps and paste them here, or use GPS to get your current location.
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={isVisible} animationType="slide" statusBarTranslucent>
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialIcons name="person-add" size={24} color="white" />
              </View>
              <View>
                <Text style={styles.title}>Complete Profile</Text>
                <Text style={styles.subtitle}>Step {step} of 4</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        <ProgressBar step={step} />
        
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animatable.View 
            key={step} 
            animation="fadeInRight" 
            duration={400}
            style={styles.stepContainer}
          >
            {step === 1 && renderStepOne()}
            {step === 2 && renderStepTwo()}
            {step === 3 && renderStepThree()}
            {step === 4 && renderStepFour()}
          </Animatable.View>
        </ScrollView>
        
        <View style={styles.navigationButtons}>
          {step > 1 && (
            <TouchableOpacity 
              style={[styles.navButton, styles.backButton]} 
              onPress={() => setStep(step - 1)}
            >
              <MaterialIcons name="arrow-back" size={20} color={Colors.primary} />
              <Text style={[styles.navButtonText, { color: Colors.primary }]}>Back</Text>
            </TouchableOpacity>
          )}
          {step < 4 ? (
            <TouchableOpacity 
              style={[styles.navButton, styles.nextButton]} 
              onPress={() => setStep(step + 1)}
            >
              <Text style={styles.navButtonText}>Next</Text>
              <MaterialIcons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.navButton, styles.finishButton]} 
              onPress={handleSave}
            >
              <MaterialIcons name="check" size={20} color="white" />
              <Text style={styles.navButtonText}>Finish</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  header: { 
    paddingTop: 50, 
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  closeButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressStepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  progressStep: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: Colors.lightGray, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  progressStepActive: { 
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  progressConnector: { 
    height: 2, 
    backgroundColor: Colors.lightGray,
    marginHorizontal: 8,
    flex: 0.5,
    marginBottom: 20,
  },
  progressConnectorActive: { 
    backgroundColor: Colors.primary 
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  stepContainer: {
    flex: 1,
  },
  card: { 
    backgroundColor: Colors.white, 
    borderRadius: 16, 
    marginHorizontal: 20, 
    marginTop: 20, 
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
  },
  imagePicker: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: Colors.background, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    borderWidth: 3,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 45 
  },
  imagePlaceholder: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  imagePickerText: { 
    fontSize: 11, 
    color: Colors.textSecondary, 
    marginTop: 6,
    fontWeight: '600',
  },
  photoLabelContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  photoLabel: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: Colors.text 
  },
  skipButton: { 
    backgroundColor: Colors.lightGray, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  skipButtonText: { 
    fontSize: 12, 
    color: Colors.textSecondary, 
    fontWeight: '600' 
  },
  inputContainer: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: Colors.text, 
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: { 
    backgroundColor: Colors.white, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerContainer: { 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: Colors.lightGray, 
    backgroundColor: Colors.white, 
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: { 
    width: '100%', 
    height: 54 
  },
  separator: { 
    height: 2, 
    backgroundColor: Colors.lightGray, 
    marginVertical: 24,
    borderRadius: 1,
  },
  navigationButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  navButton: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: { 
    backgroundColor: Colors.white, 
    borderWidth: 2, 
    borderColor: Colors.primary, 
    marginRight: 12 
  },
  nextButton: { 
    backgroundColor: Colors.primary 
  },
  finishButton: {
    backgroundColor: '#10B981',
  },
  navButtonText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: Colors.white,
    marginHorizontal: 8,
  },
  stepButtonsContainer: { 
    flexDirection: 'row', 
    marginTop: 20, 
    gap: 12 
  },
  skipAllButton: { 
    backgroundColor: Colors.background, 
    borderWidth: 2, 
    borderColor: Colors.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skipAllButtonText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: Colors.textSecondary 
  },
  
  // Location styles
  locationDescription: { 
    fontSize: 15, 
    color: Colors.textSecondary, 
    marginBottom: 24, 
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
  },
  locationButtonsContainer: { 
    flexDirection: 'row', 
    marginBottom: 24, 
    gap: 12 
  },
  locationButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 16, 
    borderRadius: 12, 
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsButton: { 
    backgroundColor: Colors.primary 
  },
  pasteButton: { 
    backgroundColor: '#FF9800' 
  },
  locationButtonText: { 
    color: Colors.white, 
    fontWeight: '700', 
    fontSize: 15 
  },
  textArea: { 
    minHeight: 100, 
    textAlignVertical: 'top' 
  },
  coordinatesContainer: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 20 
  },
  coordinateInput: { 
    flex: 1 
  },
  helpContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: '#F0F9FF', 
    padding: 16, 
    borderRadius: 12, 
    marginTop: 16, 
    gap: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  helpText: { 
    flex: 1, 
    fontSize: 13, 
    color: Colors.textSecondary, 
    lineHeight: 18,
    fontWeight: '500',
  },
});

export default OnboardingModal;
