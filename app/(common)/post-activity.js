import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Platform, Alert, Image, FlatList, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Animatable from 'react-native-animatable';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Progress from 'react-native-progress';
import axios from 'axios';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { useLocalSearchParams } from 'expo-router';

const PostActivityScreen = () => {
  const { branch, branch_id } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [media, setMedia] = useState(null);
  const [customThumbnail, setCustomThumbnail] = useState(null);
  const [showThumbnailPicker, setShowThumbnailPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(branch_id || '');
  const [selectedBranchName, setSelectedBranchName] = useState(branch || '');
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const fetchStudents = useCallback(async (currentBranchId) => {
    if (!currentBranchId) return;
    setIsLoadingStudents(true);
    try {
      const response = await authFetch(`/api/users/get_users.php?role=Student&branch_id=${currentBranchId}`);
      const result = await response.json();
      setStudents(result.success ? result.data : []);
    } catch (error) {
      Alert.alert('Error', 'An error occurred while fetching students.');
      setStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);


  const fetchBranches = useCallback(async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        setBranches(result.data || []);
        // If no branch is pre-selected and there are branches, select the first one
        if (!selectedBranchId && result.data && result.data.length > 0) {
          setSelectedBranchId(result.data[0].id.toString());
          setSelectedBranchName(result.data[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchStudents(selectedBranchId);
      setSelectedStudentId(null);
    }
  }, [selectedBranchId, fetchStudents]);

  const handleChooseMedia = async (mediaType) => {
    // Request permissions first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return;
    }

    let selectedAsset = pickerResult.assets[0];

    if (mediaType === 'image' && pickerResult.assets && pickerResult.assets.length > 0) {
      const manipResult = await manipulateAsync(
        pickerResult.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      selectedAsset = { ...pickerResult.assets[0], uri: manipResult.uri, type: 'image' };
    } else if (pickerResult.assets && pickerResult.assets.length > 0) {
      selectedAsset = { ...pickerResult.assets[0], type: mediaType };
    }

    setMedia(selectedAsset);
    
    // If it's a video, show thumbnail picker option
    if (selectedAsset.type === 'video') {
      setShowThumbnailPicker(true);
    }
  };

  const handleThumbnailSelection = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to select thumbnail!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCustomThumbnail(result.assets[0]);
    }
  };

  const handlePostActivity = async () => {
    if (!title || !selectedBranchId) {
      Alert.alert('Error', 'Please fill in the activity title and select a branch.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');

    try {
      let mediaUrl = null;
      
      // Handle media upload if present
      if (media) {
        setUploadStatus('Uploading media...');
        setUploadProgress(0.2);
        
        const formData = new FormData();
        formData.append('file', {
          uri: media.uri,
          type: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
          name: media.type === 'video' ? 'video.mp4' : 'image.jpg',
        });
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 0.1, 0.8));
        }, 200);
        
        try {
          const sessionToken = await AsyncStorage.getItem('sessionToken');
          console.log('Uploading media to:', `${API_URL}/api/upload_media.php`);
          console.log('Media file info:', {
            uri: media.uri,
            type: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
            name: media.type === 'video' ? 'video.mp4' : 'image.jpg'
          });
          
          const uploadResponse = await fetch(`${API_URL}/api/upload_media.php`, {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
          });
          
          clearInterval(progressInterval);
          setUploadProgress(0.9);
          
          const uploadResult = await uploadResponse.json();
          if (uploadResult.success) {
            mediaUrl = uploadResult.file_url;
          }
        } catch (uploadError) {
          clearInterval(progressInterval);
          console.error('Media upload error:', uploadError);
          // Continue without media if upload fails
          console.log('Continuing activity creation without media');
          setUploadStatus('Media upload failed, creating activity without media...');
        }
      }

      setUploadStatus('Creating activity...');
      setUploadProgress(0.95);

      const activityData = {
        title: title,
        description: title,
        activity_date: new Date().toISOString().split('T')[0],
        branch_id: parseInt(selectedBranchId),
        image_path: mediaUrl,
        student_id: selectedStudentId
      };

      const response = await authFetch('/api/activities/create_activity.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      const result = await response.json();

      if (result.success) {
        setUploadProgress(1);
        setUploadStatus('Activity Posted Successfully!');
        setTimeout(() => {
          setIsUploading(false);
          setTitle('');
          setMedia(null);
          setSelectedStudentId(null);
          Alert.alert('Success', 'Activity posted successfully!');
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to post activity.');
      }
    } catch (error) {
      console.error('Post Activity Error:', error);
      setUploadStatus('Failed to post activity!');
      setTimeout(() => {
        setIsUploading(false);
        Alert.alert('Error', 'Failed to post activity. Please try again.');
      }, 2000);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        transparent={true}
        animationType="slide"
        visible={isUploading}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.statusText}>{uploadStatus}</Text>
            <Progress.Bar progress={uploadProgress} width={200} color={Colors.primary} style={{ marginTop: 10 }} />
            {uploadStatus === 'Upload Successful!' && <LottieView source={require('../../assets/lottie/loading.json')} autoPlay loop={false} style={styles.lottieSuccess} />}
          </View>
        </View>
      </Modal>
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <LottieView source={require('../../assets/lottie/activity.json')} autoPlay loop style={styles.lottie} />
        <Text style={styles.headerTitle}>Post New Activity</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.container}>
        <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.card}>
          <Text style={styles.cardTitle}>Select Branch</Text>
          <View style={styles.pickerContainer}>
            <Ionicons name="business-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
            <Picker
              selectedValue={selectedBranchId}
              style={styles.picker}
              onValueChange={(itemValue, itemIndex) => {
                setSelectedBranchId(itemValue);
                const selectedBranch = branches.find(b => b.id.toString() === itemValue);
                setSelectedBranchName(selectedBranch ? selectedBranch.name : '');
              }}
            >
              {branches.map((branch) => (
                <Picker.Item key={branch.id} label={branch.name} value={branch.id.toString()} />
              ))}
            </Picker>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.card}>
          <Text style={styles.cardTitle}>Select Student</Text>
          {isLoadingStudents ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }}/>
          ) : students.length > 0 ? (
            <FlatList
              horizontal
              data={students}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.studentContainer, selectedStudentId === item.id && styles.selectedStudentContainer]}
                  onPress={() => setSelectedStudentId(item.id)}
                >
                  <Image 
                    source={require('../../assets/Avartar.png')} 
                    style={styles.studentPhoto}
                  />
                  <Text style={styles.studentName} numberOfLines={2}>{item.name}</Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 10 }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <LottieView source={require('../../assets/lottie/empty.json')} autoPlay loop style={styles.lottieEmpty} />
              <Text style={styles.emptyText}>No students found in this branch.</Text>
            </View>
          )}
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={500} style={styles.card}>
          <Text style={styles.cardTitle}>Activity Details</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="create-outline" size={20} color={Colors.gray} style={styles.inputIcon} />
            <TextInput placeholder="Activity Title" style={styles.input} value={title} onChangeText={setTitle} />
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={600} style={styles.card}>
          <Text style={styles.cardTitle}>Attach Media</Text>
          {media && (
            <View style={styles.imagePreviewContainer}>
                {media.type === 'video' ? (
                  <View style={styles.videoPreview}>
                    <Ionicons name="videocam" size={50} color={Colors.primary} />
                    <Text style={styles.videoText}>Video Selected</Text>
                    <Text style={styles.videoName}>{media.fileName || 'video.mp4'}</Text>
                    {customThumbnail && (
                      <View style={styles.thumbnailPreview}>
                        <Text style={styles.thumbnailText}>Custom Thumbnail:</Text>
                        <Image source={{ uri: customThumbnail.uri }} style={styles.thumbnailImage} />
                      </View>
                    )}
                    <TouchableOpacity 
                      style={styles.thumbnailButton} 
                      onPress={handleThumbnailSelection}
                    >
                      <Ionicons name="image-outline" size={20} color={Colors.white} />
                      <Text style={styles.thumbnailButtonText}>
                        {customThumbnail ? 'Change Thumbnail' : 'Add Thumbnail'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Image source={{ uri: media.uri }} style={styles.imagePreview} />
                )}
                <TouchableOpacity style={styles.removeMediaButton} onPress={() => setMedia(null)}>
                    <Ionicons name="close-circle" size={30} color={Colors.danger} />
                </TouchableOpacity>
            </View>
          )}
          <View style={styles.mediaButtonsContainer}>
            <TouchableOpacity 
              style={[styles.mediaButton, styles.photoButton]} 
              onPress={() => handleChooseMedia('image')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#8B5CF6', '#06B6D4']}
                style={styles.mediaButtonGradient}
              >
                <Ionicons name="camera-outline" size={24} color={Colors.white} />
                <Text style={[styles.mediaButtonText, { color: Colors.white }]}>Add Photo</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.mediaButton, styles.videoButton]} 
              onPress={() => handleChooseMedia('video')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#F59E0B', '#EF4444']}
                style={styles.mediaButtonGradient}
              >
                <Ionicons name="videocam-outline" size={24} color={Colors.white} />
                <Text style={[styles.mediaButtonText, { color: Colors.white }]}>Add Video</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        <Animatable.View animation="zoomIn" duration={600} delay={800}>
          <TouchableOpacity onPress={handlePostActivity} style={styles.postButton}>
            <Text style={styles.postButtonText}>Post Activity</Text>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.lightGray },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  lottie: { width: 100, height: 100 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: Colors.white, marginTop: -5 },
  container: { padding: 15 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    ...Platform.select({ ios: { shadowRadius: 5, shadowOpacity: 0.1 }, android: { elevation: 3 } }),
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginBottom: 15 },
  pickerContainer: {
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
    marginBottom: 10,
    justifyContent: 'center',
  },
  picker: { height: 50, width: '100%' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  inputIcon: { marginRight: 10 },
  staticInput: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 15 },
  pickerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.lightGray, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  picker: { flex: 1, height: 50 },
  studentContainer: {
    alignItems: 'center',
    marginRight: 15,
    width: 80,
  },
  selectedStudentContainer: {
    backgroundColor: Colors.primary_light,
    borderRadius: 10,
    padding: 5,
  },
  studentPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  studentName: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
    color: Colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  lottieEmpty: {
    width: 100,
    height: 100,
  },
  emptyText: {
    marginTop: 10,
    color: Colors.gray,
    fontSize: 16,
  },
  imagePreviewContainer: { marginBottom: 15, alignItems: 'center' },
  imagePreview: { width: '100%', height: 200, borderRadius: 10 },
  removeMediaButton: { position: 'absolute', top: -10, right: -10, backgroundColor: Colors.white, borderRadius: 15 },
  videoPreview: { 
    width: 200, 
    height: 150, 
    backgroundColor: Colors.lightGray, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed'
  },
  videoText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: Colors.primary, 
    marginTop: 10 
  },
  videoName: { 
    fontSize: 12, 
    color: Colors.gray, 
    marginTop: 5 
  },
  mediaButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  mediaButton: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mediaButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
  },
  mediaButtonText: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginTop: 8,
  },
  thumbnailPreview: {
    marginTop: 10,
    alignItems: 'center',
  },
  thumbnailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  thumbnailImage: {
    width: 80,
    height: 45,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  thumbnailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  thumbnailButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
    textAlign: 'center'
  },
  postButton: {
    backgroundColor: Colors.primary,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    ...Platform.select({ ios: { shadowRadius: 5, shadowOpacity: 0.2 }, android: { elevation: 5 } }),
  },
  postButtonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  lottieSuccess: {
    width: 100,
    height: 100,
    marginTop: 10,
  },
});

export default PostActivityScreen;
