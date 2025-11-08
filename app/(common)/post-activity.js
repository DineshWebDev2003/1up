import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Platform, Alert, Image, FlatList, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Animatable from 'react-native-animatable';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
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
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
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
  const [showCropOptions, setShowCropOptions] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageSource, setCurrentImageSource] = useState(null);

  const fetchStudents = useCallback(async (currentBranchId) => {
    if (!currentBranchId) return;
    setIsLoadingStudents(true);
    try {
      let allStudents = [];
      
      // Fetch from students table (existing students)
      try {
        const response = await authFetch(`/api/students/get_students.php?branch_id=${currentBranchId}`);
        const result = await response.json();
        if (result.success && result.data) {
          // Transform students from students table to match our structure
          const transformedStudents = result.data.map(student => ({
            ...student,
            avatar: student.avatar, // Use avatar from users table (joined)
            student_id: student.student_id // Keep the actual student_id
          }));
          allStudents = [...allStudents, ...transformedStudents];
        }
      } catch (error) {
        console.log('Students table fetch failed, trying users table');
      }
      
      // Also fetch from users table (new students)
      try {
        const usersResponse = await authFetch(`/api/users/user_crud.php?role=Student&branch_id=${currentBranchId}`);
        const usersResult = await usersResponse.json();
        if (usersResult.success && usersResult.data) {
          const studentUsers = usersResult.data
            .filter(user => user.role === 'Student' && (user.status === 'active' || user.user_status === 'active' || user.approval_status === 'active'))
            .map(user => ({
              id: user.id,
              name: user.name || user.username,
              student_id: user.student_id, // Use actual student_id from database (TNHK25001, etc.)
              branch_name: user.branch_name,
              branch_id: user.branch_id,
              class: user.class_name, // Use class_name from classes table join
              section: user.section,
              email: user.email,
              parent_name: user.parent_name || user.father_name || user.mother_name,
              parent_phone: user.mobile || user.father_number || user.mother_number,
              avatar: user.avatar, // users table has avatar column
              source: 'users_table'
            }));
          allStudents = [...allStudents, ...studentUsers];
        }
      } catch (error) {
        console.log('Users table fetch failed');
      }
      
      // Remove duplicates based on email or student_id with priority handling
      const uniqueStudents = allStudents.filter((student, index, self) => {
        // Find first occurrence of this student based on multiple criteria
        // Check each criteria separately to avoid false matches
        const firstIndex = self.findIndex(s => {
          // Priority 1: Match by student_id (most reliable)
          if (s.student_id && student.student_id && s.student_id === student.student_id) {
            return true;
          }
          // Priority 2: Match by email (if student_id not available)
          if (!s.student_id && !student.student_id && s.email && student.email && s.email === student.email) {
            return true;
          }
          // Priority 3: Match by id (fallback)
          if (!s.student_id && !student.student_id && !s.email && !student.email && s.id && student.id && s.id === student.id) {
            return true;
          }
          return false;
        });
        return index === firstIndex;
      });
      
      console.log('Total students loaded for post activity:', uniqueStudents.length);
      setStudents(uniqueStudents);
      
    } catch (error) {
      console.error('Error fetching students:', error);
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
      setSelectedStudentIds([]);
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
      mediaTypes: ImagePicker.MediaTypeOptions?.All || 'all',
      allowsEditing: true,
      quality: 0.8,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return;
    }

    let selectedAsset = pickerResult.assets[0];

    // Determine the actual file type from the asset
    const actualMediaType = selectedAsset.type && selectedAsset.type.startsWith('video') ? 'video' : 'image';

    if (actualMediaType === 'image') {
      // Resize and compress image
      try {
      const manipResult = await manipulateAsync(
          selectedAsset.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
        selectedAsset = { 
          ...selectedAsset, 
          uri: manipResult.uri, 
          type: 'image', 
          width: selectedAsset.width, 
          height: selectedAsset.height 
        };
      } catch (error) {
        console.error('Image manipulation error:', error);
        // Use original if manipulation fails
        selectedAsset = { 
          ...selectedAsset, 
          type: 'image'
        };
      }
    } else {
      // It's a video
      selectedAsset = { 
        ...selectedAsset, 
        type: 'video'
      };
    }

    // Validate and fix URI format
    let finalUri = selectedAsset.uri;
    
    // For manipulated images, add timestamp to prevent caching issues
    if (finalUri && finalUri.includes('ImageManipulator')) {
      const timestamp = Date.now();
      finalUri = `${finalUri}?t=${timestamp}`;
    }
    
    // Ensure URI is properly formatted
    if (finalUri && !finalUri.startsWith('file://') && !finalUri.startsWith('http')) {
      finalUri = `file://${finalUri}`;
    }
    
    const finalMedia = {
      ...selectedAsset,
      uri: finalUri,
      originalUri: selectedAsset.uri, // Keep original for debugging
      timestamp: Date.now()
    };
    
    // For manipulated images, try to convert to base64 for better compatibility
    if (finalUri.includes('ImageManipulator')) {
      try {
        console.log('🔄 Converting manipulated image to base64...');
        const base64 = await FileSystem.readAsStringAsync(selectedAsset.uri, {
          encoding: 'base64',
        });
        finalMedia.base64Uri = `data:image/jpeg;base64,${base64}`;
        console.log('✅ Base64 conversion successful, length:', base64.length);
      } catch (error) {
        console.log('❌ Base64 conversion failed:', error);
      }
    }
    
    console.log('Media selected:', {
      type: finalMedia.type,
      uri: finalMedia.uri,
      originalUri: finalMedia.originalUri,
      width: finalMedia.width,
      height: finalMedia.height
    });

    setMedia(finalMedia);
    
    // Set initial image source - prefer base64 for manipulated images
    const initialSource = finalMedia.base64Uri ? 
      { uri: finalMedia.base64Uri } : 
      { uri: finalUri };
    
    setCurrentImageSource(initialSource);
    setImageError(false);
    setImageLoading(false);
    
    // If it's a video, show thumbnail picker option
    if (selectedAsset.type === 'video') {
      Alert.alert(
        'Video Thumbnail',
        'Would you like to select a custom thumbnail for this video?',
        [
          {
            text: 'No, use default',
            style: 'cancel',
          },
          {
            text: 'Yes, select thumbnail',
            onPress: () => setShowThumbnailPicker(true)
          },
        ]
      );
    }
  };

  const openCropper = () => {
    if (!media || media.type !== 'image') return;
    setShowCropOptions(true);
  };

  const cropToAspect = async (aspectW, aspectH) => {
    try {
      if (!media || media.type !== 'image') return;
      // Get current dimensions; fallback reasonable defaults
      const imgW = media.width || 800;
      const imgH = media.height || 600;
      const targetRatio = aspectW / aspectH;
      const currentRatio = imgW / imgH;

      let cropWidth = imgW;
      let cropHeight = imgH;
      if (currentRatio > targetRatio) {
        // too wide → limit width
        cropWidth = Math.floor(imgH * targetRatio);
        cropHeight = imgH;
      } else {
        // too tall → limit height
        cropWidth = imgW;
        cropHeight = Math.floor(imgW / targetRatio);
      }
      const originX = Math.floor((imgW - cropWidth) / 2);
      const originY = Math.floor((imgH - cropHeight) / 2);

      const result = await manipulateAsync(
        media.uri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      setMedia({ ...media, uri: result.uri, width: cropWidth, height: cropHeight });
    } catch (e) {
      console.error('Crop failed:', e);
      Alert.alert('Crop Failed', 'Unable to crop the image.');
    } finally {
      setShowCropOptions(false);
    }
  };

  const handleThumbnailSelection = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to select thumbnail!');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
      allowsEditing: true,
      // No aspect ratio constraint for free-size cropping
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCustomThumbnail(result.assets[0]);
    }
  };

  // Helper function to get avatar source
  const getAvatarSource = (item) => {
    if (!item) return require('../../assets/Avartar.png');
    
    // Check if avatar exists and format URL properly
    if (item.avatar && item.avatar.trim() !== '') {
      // If already a full URL, use it as is
      if (item.avatar.startsWith('http://') || item.avatar.startsWith('https://')) {
        return { uri: item.avatar };
      }
      // If relative path, prepend API URL
      return { uri: `${API_URL}${item.avatar}` };
    }
    
    // Default avatar if no avatar
    return require('../../assets/Avartar.png');
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handlePostActivity = async () => {
    if (!title || !selectedBranchId) {
      Alert.alert('Error', 'Please fill in the activity title and select a branch.');
      return;
    }

    if (selectedStudentIds.length === 0) {
      Alert.alert('Error', 'Please select at least one student for this activity.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');

    try {
      let mediaUrl = null;
      let thumbnailUrl = null;
      
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
        
        // Add custom thumbnail if video has one
        if (media.type === 'video' && customThumbnail) {
          formData.append('thumbnail', {
            uri: customThumbnail.uri,
            type: 'image/jpeg',
            name: 'thumbnail.jpg',
          });
          console.log('Adding custom thumbnail to upload');
        }
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 0.1, 0.8));
        }, 200);
        
        try {
          console.log('Uploading media to:', `/api/upload_media.php`);
          console.log('Media file info:', {
            uri: media.uri,
            type: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
            name: media.type === 'video' ? 'video.mp4' : 'image.jpg',
            hasThumbnail: media.type === 'video' && customThumbnail ? 'yes' : 'no'
          });
          
          const uploadResponse = await authFetch('/api/upload_media.php', {
            method: 'POST',
            body: formData,
          });
          
          clearInterval(progressInterval);
          setUploadProgress(0.9);
          
          const uploadResult = await uploadResponse.json();
          if (uploadResult.success) {
            mediaUrl = uploadResult.file_url;
            thumbnailUrl = uploadResult.thumbnail_url || null;
            console.log('Upload successful - Media URL:', mediaUrl, 'Thumbnail URL:', thumbnailUrl);
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

      // Create activity for each selected student
      console.log('Creating activities for students:', selectedStudentIds);
      const batchId = Date.now().toString(); // Create unique batch ID for grouping
      const activityPromises = selectedStudentIds.map(studentId => {
        const activityData = {
          title: title,
          description: title,
          activity_date: new Date().toISOString().split('T')[0],
          branch_id: parseInt(selectedBranchId),
          image_path: mediaUrl,
          thumbnail_path: thumbnailUrl, // Add thumbnail URL for videos
          student_id: studentId,
          batch_id: batchId // Add batch ID for grouping
        };
        
        console.log('Activity data for student', studentId, ':', activityData);

        return authFetch('/api/activities/create_activity.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(activityData),
        });
      });

      const responses = await Promise.all(activityPromises);
      const results = await Promise.all(responses.map(response => response.json()));

      // Check if all activities were created successfully
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful) {
        setUploadProgress(1);
        setUploadStatus('Activity Posted Successfully!');
        setTimeout(() => {
          setIsUploading(false);
          setTitle('');
          setMedia(null);
          setCustomThumbnail(null);
          setSelectedStudentIds([]);
          Alert.alert('Success', `Activity posted successfully for ${selectedStudentIds.length} student(s)!`);
        }, 1500);
      } else {
        const failedCount = results.filter(result => !result.success).length;
        throw new Error(`${failedCount} out of ${selectedStudentIds.length} activities failed to post.`);
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
      {/* Crop options modal */}
      <Modal transparent animationType="fade" visible={showCropOptions} onRequestClose={() => setShowCropOptions(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { width: 300 }]}>
            <Text style={styles.statusText}>Crop Image</Text>
            <View style={{ flexDirection: 'row', marginTop: 15 }}>
              <TouchableOpacity onPress={() => cropToAspect(1,1)} style={[styles.cropBtn, { backgroundColor: '#4A90E2' }]}>
                <Text style={styles.cropBtnText}>1:1</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => cropToAspect(4,3)} style={[styles.cropBtn, { backgroundColor: '#34D399' }]}>
                <Text style={styles.cropBtnText}>4:3</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => cropToAspect(16,9)} style={[styles.cropBtn, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.cropBtnText}>16:9</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowCropOptions(false)} style={[styles.cropBtn, { marginTop: 10, backgroundColor: '#EF4444', width: 120 }]}>
              <Text style={styles.cropBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
              {branches.map((branch, index) => (
                <Picker.Item key={`branch-${branch.id || index}-${branch.name || Math.random()}`} label={branch.name} value={branch.id.toString()} />
              ))}
            </Picker>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.card}>
          <Text style={styles.cardTitle}>Select Students ({selectedStudentIds.length} selected)</Text>
          {isLoadingStudents ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }}/>
          ) : students.length > 0 ? (
            <FlatList
              horizontal
              data={students}
              keyExtractor={(item, index) => `student-${item.id || index}-${item.email || Math.random()}`}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.studentContainer, selectedStudentIds.includes(item.student_id) && styles.selectedStudentContainer]}
                  onPress={() => toggleStudentSelection(item.student_id)}
                >
                  <Image 
                    source={getAvatarSource(item)} 
                    style={styles.studentPhoto}
                    defaultSource={require('../../assets/Avartar.png')}
                    onError={(e) => console.log('Avatar load error for student:', item.name, e)}
                  />
                  <Text style={styles.studentName} numberOfLines={2}>{item.name}</Text>
                  {selectedStudentIds.includes(item.student_id) && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                    </View>
                  )}
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
                  <TouchableOpacity activeOpacity={0.8} onPress={openCropper}>
                    <View style={styles.imageContainer}>
                      <Image 
                        key={`${media.uri}-${media.timestamp}`} 
                        source={currentImageSource || { uri: media.uri }}
                        style={styles.imagePreview} 
                        resizeMode="cover"
                        cache="reload"
                        onLoad={() => {
                          console.log('✅ Image loaded successfully:', currentImageSource?.uri || media.uri);
                          setImageLoading(false);
                          setImageError(false);
                        }}
                        onError={(error) => {
                          console.log('❌ Image load error:', error.nativeEvent?.error || error);
                          console.log('Current source:', currentImageSource?.uri || media.uri);
                          console.log('Original URI:', media.originalUri);
                          
                          // Try fallback URIs
                          const currentUri = currentImageSource?.uri || media.uri;
                          let fallbackUri = null;
                          
                          if (media.base64Uri && !currentUri.startsWith('data:image')) {
                            // Try base64 URI first for manipulated images
                            fallbackUri = media.base64Uri;
                          } else if (currentUri === media.uri && media.originalUri !== media.uri) {
                            // Try original URI with timestamp
                            fallbackUri = `${media.originalUri}?t=${Date.now()}`;
                          } else if (currentUri.includes('?t=')) {
                            // Try without timestamp
                            fallbackUri = currentUri.split('?t=')[0];
                          } else if (currentUri.startsWith('file://')) {
                            // Try without file:// prefix
                            fallbackUri = currentUri.replace('file://', '');
                          } else if (!currentUri.startsWith('file://')) {
                            // Try with file:// prefix
                            fallbackUri = `file://${currentUri}`;
                          }
                          
                          if (fallbackUri && fallbackUri !== currentUri) {
                            console.log('🔄 Trying fallback URI:', fallbackUri);
                            setCurrentImageSource({ uri: fallbackUri });
                            return;
                          }
                          
                          setImageLoading(false);
                          setImageError(true);
                        }}
                        onLoadStart={() => {
                          console.log('🔄 Image loading started:', currentImageSource?.uri || media.uri);
                          setImageLoading(true);
                          setImageError(false);
                        }}
                        onLoadEnd={() => {
                          console.log('🏁 Image loading ended:', currentImageSource?.uri || media.uri);
                          setImageLoading(false);
                        }}
                      />
                      
                      {/* Loading indicator */}
                      {imageLoading && (
                        <View style={styles.imageLoadingOverlay}>
                          <ActivityIndicator size="large" color={Colors.primary} />
                          <Text style={styles.loadingText}>Loading image...</Text>
                        </View>
                      )}
                      
                      {/* Error state */}
                      {imageError && (
                        <View style={styles.imageErrorOverlay}>
                          <Ionicons name="image-outline" size={50} color={Colors.gray} />
                          <Text style={styles.errorText}>Failed to load image</Text>
                          <Text style={styles.imageDebugText}>URI: {media.uri}</Text>
                        </View>
                      )}
                      
                      {/* Debug overlay - always show for debugging */}
                      <View style={styles.imageDebugOverlay}>
                        <Text style={styles.imageDebugText}>
                          {imageLoading ? 'Loading...' : 
                           imageError ? `Error: ${media.uri}` :
                           `Tap to crop • ${media.width}x${media.height}`}
                        </Text>
                        <Text style={styles.imageDebugText}>
                          Original: {media.originalUri}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
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
  selectedIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  imagePreviewContainer: { 
    marginBottom: 15, 
    alignItems: 'center', 
    width: '100%',
    position: 'relative',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreview: { 
    width: '100%', 
    height: 250, 
    borderRadius: 10,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageDebugOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  imageDebugText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  imageErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 10,
    color: Colors.gray,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
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
  cropBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  cropBtnText: {
    color: '#fff',
    fontWeight: '700'
  }
});

export default PostActivityScreen;
