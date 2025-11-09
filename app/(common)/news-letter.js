import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Image, Alert, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import { Picker } from '@react-native-picker/picker';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import { API_URL } from '../../config';

// Using app theme colors instead of hardcoded colors



const NewsLetterScreen = () => {
  const { branch } = useLocalSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userBranchId, setUserBranchId] = useState(null);
  const [userBranchName, setUserBranchName] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  // Function to get actual branch name based on branch ID
  const getActualBranchName = () => {
    if (userBranchId === 9) return 'Pollachi';
    // Add more mappings as needed
    return userBranchName || 'Your Branch';
  };

  const fetchBranches = async () => {
    try {
      const response = await authFetch('/api/branches/get_branches.php');
      const result = await response.json();
      if (result.success) {
        setBranches(result.data);
        // Set default branch for admin
        if (result.data.length > 0 && !selectedBranchId) {
          setSelectedBranchId(result.data[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      console.log('📰 Fetching newsletters...');
      const response = await authFetch('/api/news_crud.php', {
        method: 'GET'
      });
      
      const responseText = await response.text();
      console.log('📰 Raw API response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ JSON Parse Error:', jsonError);
        console.error('📄 Response text:', responseText);
        throw new Error('Server returned invalid response');
      }
      
      console.log('📰 Newsletter API response:', result);
      
      if (result.success) {
        const newsData = Array.isArray(result.data) ? result.data : [];
        const formattedPosts = newsData.map(post => ({
          ...post,
          date: post.letter_date || post.created_at?.split(' ')[0] || new Date().toISOString().split('T')[0],
          branch: post.branch_name || 'Main Branch',
          image_url: post.image_url || null
        }));
        console.log('📰 Formatted posts:', formattedPosts);
        setPosts(formattedPosts);
      } else {
        console.log('❌ Failed to fetch letters:', result.message);
        setPosts([]);
        if (result.error_code === 'AUTH_REQUIRED') {
          Alert.alert('Session Expired', 'Please log in again.');
        }
      }
    } catch (error) {
      console.log('❌ Network Error fetching letters:', error);
      setPosts([]);
      Alert.alert('Network Error', 'Unable to fetch newsletters. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userData');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setUserRole(user.role);
          setUserBranchId(user.branch_id);
          setUserBranchName(user.branch_name);
          console.log('👤 User loaded:', { 
            role: user.role, 
            branch_id: user.branch_id, 
            branch_name: user.branch_name 
          });
          
          // Fetch branches for admin users
          if (user.role === 'Admin') {
            await fetchBranches();
          }
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      } finally {
        setRoleLoading(false);
        fetchPosts();
      }
    };
    loadData();
  }, []);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const filteredPosts = posts
    .filter(post => {
      // Admin can see all posts, Franchisees only see their branch posts
      console.log('📰 Filtering post:', { 
        postId: post.id, 
        postBranchId: post.branch_id, 
        postBranchName: post.branch_name,
        userRole, 
        userBranchId,
        userBranchName
      });
      
      if (userRole === 'Admin') return true;
      if (userRole === 'Franchisee') {
        // Since userBranchName is undefined, we need to handle the mapping
        // For now, let's check if this is a Pollachi franchisee (branch_id: 9)
        let shouldShow = false;
        
        if (userBranchId === 9 && post.branch_name === 'Pollachi') {
          shouldShow = true;
        } else if (post.branch_id === userBranchId) {
          shouldShow = true;
        } else if (post.branch_name === userBranchName) {
          shouldShow = true;
        }
        
        console.log('📰 Franchisee filter result:', shouldShow, {
          'is_pollachi_user': userBranchId === 9,
          'is_pollachi_post': post.branch_name === 'Pollachi',
          'branch_id match': post.branch_id === userBranchId,
          'branch_name match': post.branch_name === userBranchName
        });
        return shouldShow;
      }
      return true; // Other roles see all (Students, Teachers)
    })
    .map(post => ({
      ...post,
      image: post.image_url && !post.image_url.startsWith('http') ? `${API_URL}${post.image_url}` : post.image_url,
      image_url: post.image_url && !post.image_url.startsWith('http') ? `${API_URL}${post.image_url}` : post.image_url
    }));

  console.log('📰 Final filtered posts count:', filteredPosts.length);
  console.log('📰 Final filtered posts:', filteredPosts);

  const renderPost = ({ item, index }) => {
    // Debug log for post data
    console.log(`📰 Rendering post ${index}:`, {
      id: item.id,
      title: item.title,
      branch_name: item.branch_name,
      branch_id: item.branch_id
    });
    
    return (
      <Animatable.View animation="fadeInUp" duration={800} delay={index * 100} style={styles.postContainer}>
        {(item.image || item.image_url) && (
          <Image 
            source={{ uri: item.image || item.image_url }} 
            style={styles.postImage}
            onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
          />
        )}
        <View style={styles.postContentContainer}>
          <View style={styles.postHeader}>
            <Text style={styles.postTitle}>{item.title}</Text>
            {!roleLoading && (userRole === 'Admin' || (userRole === 'Franchisee' && (item.branch_name === 'Pollachi' && userBranchId === 9))) && (
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => handleEditPost(item)} style={styles.editButton}>
                  <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  console.log('🗑️ Delete button pressed for item:', item.id, typeof item.id);
                  confirmDelete(item.id);
                }} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        <View style={styles.postMetaContainer}>
          <Text style={styles.postDate}>{item.date}</Text>
          <View style={styles.branchBadge}>
            <Ionicons name="business-outline" size={12} color={Colors.primary} />
            <Text style={styles.branchText}>{item.branch}</Text>
          </View>
        </View>
        <Text style={styles.postContent}>{item.content}</Text>
      </View>
    </Animatable.View>
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setNewPostImage(imageUri); // Just set the local URI for preview
    }
  };

  const handleAddPost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      Alert.alert('Missing Info', 'Please fill in both title and content.');
      return;
    }

    setPostSubmitting(true);
    let finalImageUrl = newPostImage; // Start with the current image (could be null, local URI, or server URL)

    try {
      // If newPostImage is a local file URI, upload it first
      if (newPostImage && (newPostImage.startsWith('file://') || newPostImage.startsWith('content://'))) {
        console.log('📸 Starting image upload...');
        
        const formData = new FormData();
        formData.append('image', {
          uri: newPostImage,
          name: `newsletter_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        formData.append('type', 'newsletter');

        // Try multiple upload endpoints
        const uploadEndpoints = [
          '/api/upload_image.php',
          '/api/uploads/upload_image.php',
          '/api/simple_upload_test.php'
        ];

        let uploadResult = null;
        let lastError = null;

        for (const endpoint of uploadEndpoints) {
          try {
            console.log(`📸 Trying upload endpoint: ${endpoint}`);
            
            const uploadResponse = await authFetch(endpoint, {
              method: 'POST',
              body: formData,
              headers: { 'Content-Type': 'multipart/form-data' },
            });

            const uploadResponseText = await uploadResponse.text();
            console.log(`📸 ${endpoint} response status:`, uploadResponse.status);
            console.log(`📸 ${endpoint} response:`, uploadResponseText.substring(0, 300));
            
            // Check if response is HTML (error page)
            if (uploadResponseText.trim().startsWith('<')) {
              console.warn(`⚠️ ${endpoint} returned HTML, trying next endpoint`);
              lastError = new Error(`${endpoint} returned HTML error page`);
              continue;
            }
            
            // Try to parse JSON
            try {
              uploadResult = JSON.parse(uploadResponseText);
              
              if (uploadResult.success) {
                finalImageUrl = uploadResult.url;
                console.log('✅ Image uploaded successfully via', endpoint, ':', finalImageUrl);
                break; // Success, exit loop
              } else {
                console.warn(`⚠️ ${endpoint} returned error:`, uploadResult.message);
                lastError = new Error(uploadResult.message || `${endpoint} upload failed`);
                continue;
              }
            } catch (jsonError) {
              console.warn(`⚠️ ${endpoint} JSON parse error:`, jsonError.message);
              lastError = new Error(`${endpoint} returned invalid JSON`);
              continue;
            }
          } catch (networkError) {
            console.warn(`⚠️ ${endpoint} network error:`, networkError.message);
            lastError = networkError;
            continue;
          }
        }

        // If no endpoint worked, throw the last error
        if (!uploadResult || !uploadResult.success) {
          throw lastError || new Error('All upload endpoints failed');
        }
      }

      // Now, create or update the letter with the final image URL
      const letterData = {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        letter_date: new Date().toISOString().split('T')[0],
        branch_id: userRole === 'Admin' ? parseInt(selectedBranchId) : userBranchId,
        image_url: finalImageUrl
      };

      if (editMode && editingPost) {
        letterData.id = editingPost.id;
      }

      console.log('📤 Sending letter data:', letterData);

      const response = await authFetch('/api/news_crud.php', {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letterData),
      });

      const responseText = await response.text();
      console.log('📡 Letter API response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Letter JSON Parse Error:', jsonError);
        throw new Error('Server returned invalid response');
      }
      
      if (result.success) {
        Alert.alert('Success', editMode ? 'Newsletter updated successfully!' : 'Newsletter created successfully!');
        resetModal();
        await fetchPosts();
      } else {
        throw new Error(result.message || `Failed to ${editMode ? 'update' : 'create'} newsletter.`);
      }
    } catch (error) {
      console.error(`Error ${editMode ? 'updating' : 'creating'} letter:`, error);
      Alert.alert('Error', error.message || 'An unknown error occurred.');
    } finally {
      setPostSubmitting(false);
    }
  };

  const deletePost = async (postId) => {
    try {
      console.log('🗑️ deletePost called with postId:', postId, typeof postId);
      
      // Ensure postId is a valid number
      const numericId = parseInt(postId);
      if (isNaN(numericId) || numericId <= 0) {
        throw new Error(`Invalid post ID: ${postId}`);
      }
      
      console.log('🗑️ Deleting post with numeric ID:', numericId);
      
      const response = await authFetch('/api/news_crud.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: numericId }),
      });
      
      const responseText = await response.text();
      console.log('📡 Delete response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Delete JSON Parse Error:', jsonError);
        throw new Error('Server returned invalid response');
      }
      
      if (result.success) {
        Alert.alert('Success', 'Newsletter deleted successfully!');
        fetchPosts(); // Refresh posts
      } else {
        Alert.alert('Error', result.message || 'Failed to delete newsletter.');
      }
    } catch (error) {
      console.error('Error deleting newsletter:', error);
      Alert.alert('Network Error', 'Unable to connect to the server.');
    }
  };

  const handleEditPost = (post) => {
    setEditMode(true);
    setEditingPost(post);
    setNewPostTitle(post.title);
    setNewPostContent(post.content);
    setNewPostImage(post.image_url);
    setModalVisible(true);
  };

  const resetModal = () => {
    setModalVisible(false);
    setEditMode(false);
    setEditingPost(null);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostImage(null);
    setImageUploading(false);
    setPostSubmitting(false);
  };

  const confirmDelete = (postId) => {
    console.log('🗑️ confirmDelete called with postId:', postId, typeof postId);
    
    if (!postId || postId === 0 || postId === '0') {
      Alert.alert('Error', 'Invalid post ID. Cannot delete this post.');
      return;
    }
    
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePost(postId) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <LottieView source={require('../../assets/lottie/newsletter.json')} autoPlay loop style={styles.lottieAnimation} />
        <Text style={styles.headerTitle}>News Letter</Text>
      </LinearGradient>


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading newsletters...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={64} color={Colors.lightText} />
              <Text style={styles.emptyText}>
                {userRole === 'Franchisee' 
                  ? `No newsletters available for ${getActualBranchName()} branch yet!` 
                  : 'No newsletters available yet!'
                }
              </Text>
              {(userRole === 'Admin' || userRole === 'Franchisee') && (
                <Text style={styles.emptySubText}>Tap the + button to create your first newsletter</Text>
              )}
            </View>
          }
        />
      )}

            {!roleLoading && (userRole === 'Admin' || userRole === 'Franchisee') && (
        <TouchableOpacity onPress={() => {
          setEditMode(false);
          setEditingPost(null);
          setNewPostTitle('');
          setNewPostContent('');
          setNewPostImage(null);
          setModalVisible(true);
        }}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.fab}>
              <Ionicons name="add" size={30} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <Animatable.View animation="slideInUp" duration={300} style={styles.modalView}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editMode ? 'Edit Newsletter' : 'Create Newsletter'}
                  {userRole === 'Franchisee' && (
                    <Text style={styles.modalSubtitle}> • {getActualBranchName()}</Text>
                  )}
                </Text>
                <TouchableOpacity onPress={resetModal} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.lightText} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Modern Image Picker with Preview */}
                <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
                  {newPostImage ? (
                    <>
                      <Image source={{ uri: newPostImage }} style={styles.previewImage} />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="camera-reverse-outline" size={32} color={Colors.white} />
                        <Text style={styles.imageOverlayText}>Change Image</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="image-outline" size={48} color={Colors.lightText} />
                      <Text style={styles.imagePickerPlaceholderText}>Tap to add an image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Modern Text Inputs */}
                <View style={styles.inputGroup}>
                  <Ionicons name="text-outline" size={22} color={Colors.lightText} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Post Title" 
                    value={newPostTitle} 
                    onChangeText={setNewPostTitle} 
                    placeholderTextColor={Colors.lightText}
                  />
                </View>

                {/* Branch Selection for Admin Users */}
                {userRole === 'Admin' && (
                  <View style={styles.inputGroup}>
                    <Ionicons name="business-outline" size={22} color={Colors.lightText} style={styles.inputIcon} />
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedBranchId}
                        style={styles.picker}
                        onValueChange={(itemValue) => setSelectedBranchId(itemValue)}
                      >
                        {branches.map((branch) => (
                          <Picker.Item 
                            key={branch.id} 
                            label={branch.name} 
                            value={branch.id.toString()} 
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}
                
                <View style={[styles.inputGroup, styles.contentInputGroup]}>
                  <Ionicons name="document-text-outline" size={22} color={Colors.lightText} style={styles.inputIcon} />
                  <TextInput 
                    style={[styles.input, styles.contentInput]} 
                    placeholder="What's on your mind?" 
                    value={newPostContent} 
                    onChangeText={setNewPostContent} 
                    multiline 
                    placeholderTextColor={Colors.lightText}
                  />
                </View>
              </ScrollView>
              
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity 
                  onPress={resetModal} 
                  style={[styles.modalButton, styles.cancelButton]}
                  disabled={postSubmitting}
                >
                  <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleAddPost}
                  disabled={postSubmitting || imageUploading}
                  style={[styles.modalButton, (postSubmitting || imageUploading) && styles.modalButtonDisabled]}
                >
                  <LinearGradient 
                    colors={postSubmitting || imageUploading ? [Colors.lightText, Colors.lightText] : Colors.gradientPrimary} 
                    style={styles.modalButtonGradient}
                  >
                    {postSubmitting ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Text style={styles.modalButtonText}>{editMode ? 'Update' : 'Post'}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animatable.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { height: 160, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.white, marginTop: 60 },
  lottieAnimation: { width: 150, height: 150, position: 'absolute', top: 0 },
  listContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 80 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  loadingText: { fontSize: 16, color: Colors.lightText, marginTop: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, color: Colors.text, textAlign: 'center', marginTop: 16, fontWeight: '600' },
  emptySubText: { fontSize: 14, color: Colors.lightText, textAlign: 'center', marginTop: 8 },
  postContainer: { backgroundColor: Colors.card, borderRadius: 16, marginBottom: 20, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, overflow: 'hidden' },
  postImage: { width: '100%', height: 220, resizeMode: 'cover' },
  postContentContainer: { padding: 20 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  postTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text, flex: 1, marginRight: 10, lineHeight: 26 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  editButton: { padding: 8, marginRight: 5, borderRadius: 8, backgroundColor: Colors.background },
  deleteButton: { padding: 8, borderRadius: 8, backgroundColor: Colors.background },
  postMetaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  postDate: { fontSize: 13, color: Colors.lightText, fontWeight: '500' },
  branchBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary + '20' },
  branchText: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginLeft: 4 },
  postContent: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  fab: { position: 'absolute', right: 25, bottom: 25, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 12, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalView: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  modalSubtitle: { fontSize: 16, fontWeight: '500', color: Colors.primary },
  closeButton: { padding: 8, borderRadius: 20, backgroundColor: Colors.background },
  modalContent: { paddingVertical: 24, paddingHorizontal: 24 },
  imagePickerContainer: { width: '100%', height: 200, borderRadius: 16, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', marginBottom: 24, overflow: 'hidden', borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  imageOverlayText: { color: Colors.white, fontWeight: 'bold', marginTop: 8 },
  imagePickerPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  imagePickerPlaceholderText: { color: Colors.lightText, marginTop: 12, fontSize: 16 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  inputIcon: { padding: 14 },
  input: { flex: 1, paddingVertical: 14, paddingRight: 14, fontSize: 16, color: Colors.text },
  pickerContainer: { flex: 1, paddingRight: 14 },
  picker: { flex: 1, color: Colors.text },
  contentInputGroup: { alignItems: 'flex-start' },
  contentInput: { height: 150, textAlignVertical: 'top' },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  modalButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalButtonDisabled: { opacity: 0.6 },
  modalButtonGradient: { paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  cancelButtonText: { color: Colors.text, fontWeight: '600', fontSize: 16 },
  modalButtonText: { color: Colors.white, fontWeight: '600', fontSize: 16 },
});

export default NewsLetterScreen;
