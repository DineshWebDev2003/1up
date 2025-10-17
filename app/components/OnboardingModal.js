import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, Clipboard, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Colors from '../constants/colors';
import authFetch from '../utils/api';

const ProgressBar = ({ step }) => (
  <View style={styles.progressContainer}>
    {[1, 2, 3, 4].map((s) => (
      <React.Fragment key={s}>
        <View style={[styles.progressStep, step >= s && styles.progressStepActive]}>
          <Text style={[styles.progressText, step >= s && styles.progressTextActive]}>{s}</Text>
        </View>
        {s < 4 && <View style={[styles.progressConnector, step > s && styles.progressConnectorActive]} />}
      </React.Fragment>
    ))}
  </View>
);

const OnboardingModal = ({ isVisible, onClose, studentData, onProfileUpdate }) => {
  if (!studentData) return null;

  const [step, setStep] = useState(1);
  const [fatherName, setFatherName] = useState(studentData.father_name || '');
  const [fatherNumber, setFatherNumber] = useState(studentData.father_number || '');
  const [motherName, setMotherName] = useState(studentData.mother_name || '');
  const [motherNumber, setMotherNumber] = useState(studentData.mother_number || '');
  const [guardianName, setGuardianName] = useState(studentData.guardian_name || '');
  const [guardianNumber, setGuardianNumber] = useState(studentData.guardian_number || '');
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

    const appendPhoto = (key, photo) => {
      if (photo) {
        formData.append(key, {
          uri: photo.uri,
          name: photo.fileName || `${key}.jpg`,
          type: photo.type || 'image/jpeg',
        });
      }
    };

      if (stepToSave === 1) {
        if (fatherName) formData.append('father_name', fatherName);
        if (fatherNumber) { formData.append('father_number', fatherNumber); formData.append('father_phone', fatherNumber); }
        if (motherName) formData.append('mother_name', motherName);
        if (motherNumber) { formData.append('mother_number', motherNumber); formData.append('mother_phone', motherNumber); }
    appendPhoto('father_photo', fatherPhoto);
    appendPhoto('mother_photo', motherPhoto);
      } else if (stepToSave === 2) {
        if (guardianName) formData.append('guardian_name', guardianName);
        if (guardianNumber) { formData.append('guardian_number', guardianNumber); formData.append('guardian_phone', guardianNumber); }
    appendPhoto('guardian_photo', guardianPhoto);
      } else if (stepToSave === 3) {
        if (bloodGroup) formData.append('blood_group', bloodGroup);
        appendPhoto('photo', studentPhoto);
      }

      const response = await authFetch('/api/update_student_profile.php', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Saved successfully.');
        onProfileUpdate();
      } else {
        Alert.alert('Error', result.message || 'Failed to save.');
      }
    } catch (error) {
      console.error('Error saving step:', error);
      Alert.alert('Error', 'An unexpected error occurred while saving.');
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

  const renderPhotoInput = (label, photo, onPick) => (
    <View style={styles.row}>
      <TouchableOpacity onPress={onPick} style={styles.imagePicker}>
        {photo ? <Image source={{ uri: photo.uri }} style={styles.profileImage} /> : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="camera" size={30} color={Colors.gray} />
            <Text style={styles.imagePickerText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.photoLabel}>{label}</Text>
    </View>
  );

  const renderTextInput = (label, value, setter, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={setter} placeholder={`Enter ${label.toLowerCase()}`} placeholderTextColor={Colors.gray} keyboardType={keyboardType} />
    </View>
  );

  const renderStepOne = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Parent's Information</Text>
      {renderPhotoInput("Father's Photo", fatherPhoto, () => pickImage(setFatherPhoto))}
      {renderTextInput("Father's Name", fatherName, setFatherName)}
      {renderTextInput("Father's Number", fatherNumber, setFatherNumber, 'phone-pad')}
      <View style={styles.separator} />
      {renderPhotoInput("Mother's Photo", motherPhoto, () => pickImage(setMotherPhoto))}
      {renderTextInput("Mother's Name", motherName, setMotherName)}
      {renderTextInput("Mother's Number", motherNumber, setMotherNumber, 'phone-pad')}
      <TouchableOpacity style={[styles.navButton, styles.nextButton, { marginTop: 10 }]} onPress={() => saveStep(1)}>
        <Text style={styles.navButtonText}>Save This Step</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStepTwo = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Guardian's Information</Text>
      {renderPhotoInput("Guardian's Photo", guardianPhoto, () => pickImage(setGuardianPhoto))}
      {renderTextInput("Guardian's Name", guardianName, setGuardianName)}
      {renderTextInput("Guardian's Number", guardianNumber, setGuardianNumber, 'phone-pad')}
      <TouchableOpacity style={[styles.navButton, styles.nextButton, { marginTop: 10 }]} onPress={() => saveStep(2)}>
        <Text style={styles.navButtonText}>Save This Step</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStepThree = () => (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Student's Information</Text>
        {renderPhotoInput("Student's Photo", studentPhoto, () => pickImage(setStudentPhoto))}
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
      <View style={{ paddingHorizontal: 15 }}>
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
    <Modal visible={isVisible} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-circle" size={30} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <ProgressBar step={step} />
        <ScrollView showsVerticalScrollIndicator={false}>
          {step === 1 && renderStepOne()}
          {step === 2 && renderStepTwo()}
          {step === 3 && renderStepThree()}
          {step === 4 && renderStepFour()}
        </ScrollView>
        <View style={styles.navigationButtons}>
          {step > 1 && (
            <TouchableOpacity style={[styles.navButton, styles.backButton]} onPress={() => setStep(step - 1)}>
              <Text style={[styles.navButtonText, { color: Colors.primary }]}>Back</Text>
            </TouchableOpacity>
          )}
          {step < 4 ? (
            <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={() => setStep(step + 1)}>
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={handleSave}>
              <Text style={styles.navButtonText}>Save & Finish</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: Colors.primary, padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.white },
  closeButton: { padding: 5 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: Colors.white },
  progressStep: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.lightGray, justifyContent: 'center', alignItems: 'center' },
  progressStepActive: { backgroundColor: Colors.primary },
  progressText: { color: Colors.darkGray },
  progressTextActive: { color: Colors.white },
  progressConnector: { flex: 1, height: 2, backgroundColor: Colors.lightGray },
  progressConnectorActive: { backgroundColor: Colors.primary },
  card: { backgroundColor: Colors.white, borderRadius: 12, marginHorizontal: 15, marginTop: 15, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: Colors.lightGray, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  imagePicker: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.light_gray, justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed' },
  profileImage: { width: '100%', height: '100%', borderRadius: 40 },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  imagePickerText: { fontSize: 12, color: Colors.gray, marginTop: 5 },
  photoLabel: { fontSize: 16, fontWeight: '500', color: Colors.darkGray },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.darkGray, marginBottom: 5 },
  input: { backgroundColor: Colors.light_gray, borderRadius: 8, padding: 12, fontSize: 16, color: Colors.black },
  pickerContainer: { borderRadius: 8, borderWidth: 1, borderColor: Colors.lightGray, backgroundColor: Colors.light_gray, overflow: 'hidden' },
  picker: { width: '100%', height: 50 },
  separator: { height: 1, backgroundColor: Colors.lightGray, marginVertical: 15 },
  navigationButtons: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  navButton: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  backButton: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.primary, marginRight: 10 },
  nextButton: { backgroundColor: Colors.primary },
  navButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.white },
  
  // Location styles
  locationDescription: { fontSize: 14, color: Colors.darkGray, marginBottom: 20, lineHeight: 20 },
  locationButtonsContainer: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  locationButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  gpsButton: { backgroundColor: Colors.primary },
  pasteButton: { backgroundColor: '#FF9800' },
  locationButtonText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  coordinatesContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  coordinateInput: { flex: 1 },
  helpContainer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8, marginTop: 10, gap: 8 },
  helpText: { flex: 1, fontSize: 12, color: Colors.darkGray, lineHeight: 16 },
});

export default OnboardingModal;
