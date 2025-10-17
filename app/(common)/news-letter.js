import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Image, Alert, StatusBar, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import { API_URL } from '../../config';

const COLORS = {
  primary: '#8B5CF6',
  secondary: '#06B6D4',
  accent: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  text: '#1F2937',
  lightText: '#6B7280',
  background: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
  gradientMain: ['#8B5CF6', '#06B6D4'],
  gradientPrimary: ['#8B5CF6', '#A855F7'],
  gradientSecondary: ['#06B6D4', '#0891B2'],
};



const NewsLetterScreen = () => {
  const { branch } = useLocalSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const response = await authFetch('/api/letters/create_letter.php');
      const result = await response.json();
      if (result.success) {
        const formattedPosts = result.data.map(post => ({
          ...post,
          date: post.letter_date || post.created_at?.split(' ')[0] || new Date().toISOString().split('T')[0],
          branch: post.branch_name || 'Main Branch',
          image_url: post.image_url || null
        }));
        setPosts(formattedPosts);
      } else {
        console.log('Failed to fetch letters:', result.message);
        setPosts([]);
      }
    } catch (error) {
      console.log('Network Error fetching letters:', error);
      setPosts([]);
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

  const filteredPosts = posts.map(post => ({
    ...post,
    image: post.image_url && !post.image_url.startsWith('http') ? `${API_URL}${post.image_url}` : post.image_url,
    image_url: post.image_url && !post.image_url.startsWith('http') ? `${API_URL}${post.image_url}` : post.image_url
  }));

  const renderPost = ({ item, index }) => (
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
          {!roleLoading && userRole === 'Admin' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={() => handleEditPost(item)} style={styles.editButton}>
                <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={styles.postDate}>{item.date} • {item.branch}</Text>
        <Text style={styles.postContent}>{item.content}</Text>
      </View>
    </Animatable.View>
  );

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
        const formData = new FormData();
        formData.append('image', {
          uri: newPostImage,
          name: `newsletter_${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        formData.append('type', 'newsletter');

        const uploadResponse = await authFetch('/api/uploads/upload_image.php', {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) {
          finalImageUrl = uploadResult.url; // Update to the server URL
        } else {
          throw new Error(uploadResult.message || 'Failed to upload image');
        }
      }

      // Now, create or update the letter with the final image URL
      const letterData = {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        letter_date: new Date().toISOString().split('T')[0],
        branch_id: 1, // This might need to be dynamic based on user
        image_url: finalImageUrl
      };

      const method = editMode ? 'PUT' : 'POST';
      if (editMode && editingPost) {
        letterData.id = editingPost.id;
      }

      const response = await authFetch('/api/letters/create_letter.php', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letterData),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', editMode ? 'Letter updated successfully!' : 'Letter created successfully!');
        resetModal();
        await fetchPosts();
      } else {
        throw new Error(result.message || `Failed to ${editMode ? 'update' : 'create'} letter.`);
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
      const response = await authFetch('/api/letters/create_letter.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: postId }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Letter deleted successfully!');
        fetchPosts(); // Refresh posts
      } else {
        Alert.alert('Error', result.message || 'Failed to delete letter.');
      }
    } catch (error) {
      console.error('Error deleting letter:', error);
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
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePost(postId) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={COLORS.gradientMain} style={styles.header}>
        <LottieView source={require('../../assets/lottie/newsletter.json')} autoPlay loop style={styles.lottieAnimation} />
        <Text style={styles.headerTitle}>News Letter</Text>
      </LinearGradient>


      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={!loading && <View style={styles.emptyContainer}><Text style={styles.emptyText}>No news available yet!</Text></View>}
      />

            {!roleLoading && userRole === 'Admin' && (
        <TouchableOpacity onPress={() => {
          setEditMode(false);
          setEditingPost(null);
          setNewPostTitle('');
          setNewPostContent('');
          setNewPostImage(null);
          setModalVisible(true);
        }}>
          <LinearGradient colors={COLORS.gradientPrimary} style={styles.fab}>
              <Ionicons name="add" size={30} color={COLORS.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <Animatable.View animation="slideInUp" duration={300} style={styles.modalView}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editMode ? 'Edit News Post' : 'Create News Post'}</Text>
                <TouchableOpacity onPress={resetModal} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={COLORS.lightText} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Modern Image Picker with Preview */}
                <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
                  {newPostImage ? (
                    <>
                      <Image source={{ uri: newPostImage }} style={styles.previewImage} />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="camera-reverse-outline" size={32} color={COLORS.white} />
                        <Text style={styles.imageOverlayText}>Change Image</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="image-outline" size={48} color={COLORS.lightText} />
                      <Text style={styles.imagePickerPlaceholderText}>Tap to add an image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Modern Text Inputs */}
                <View style={styles.inputGroup}>
                  <Ionicons name="text-outline" size={22} color={COLORS.lightText} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Post Title" 
                    value={newPostTitle} 
                    onChangeText={setNewPostTitle} 
                    placeholderTextColor={COLORS.lightText}
                  />
                </View>
                
                <View style={[styles.inputGroup, styles.contentInputGroup]}>
                  <Ionicons name="document-text-outline" size={22} color={COLORS.lightText} style={styles.inputIcon} />
                  <TextInput 
                    style={[styles.input, styles.contentInput]} 
                    placeholder="What's on your mind?" 
                    value={newPostContent} 
                    onChangeText={setNewPostContent} 
                    multiline 
                    placeholderTextColor={COLORS.lightText}
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
                    colors={postSubmitting || imageUploading ? [COLORS.lightText, COLORS.lightText] : COLORS.gradientPrimary} 
                    style={styles.modalButtonGradient}
                  >
                    {postSubmitting ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { height: 160, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.white, marginTop: 60 },
  lottieAnimation: { width: 150, height: 150, position: 'absolute', top: 0 },
  listContainer: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 80 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: COLORS.lightText },
  postContainer: { backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 20, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, overflow: 'hidden' },
  postImage: { width: '100%', height: 220, resizeMode: 'cover' },
  postContentContainer: { padding: 20 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  postTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, flex: 1, marginRight: 10, lineHeight: 26 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  editButton: { padding: 8, marginRight: 5, borderRadius: 8, backgroundColor: COLORS.background },
  deleteButton: { padding: 8, borderRadius: 8, backgroundColor: COLORS.background },
  postDate: { fontSize: 13, color: COLORS.lightText, marginVertical: 8, fontWeight: '500' },
  postContent: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  fab: { position: 'absolute', right: 25, bottom: 25, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 12, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalView: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  closeButton: { padding: 8, borderRadius: 20, backgroundColor: COLORS.background },
  modalContent: { paddingVertical: 24, paddingHorizontal: 24 },
  imagePickerContainer: { width: '100%', height: 200, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginBottom: 24, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  imageOverlayText: { color: COLORS.white, fontWeight: 'bold', marginTop: 8 },
  imagePickerPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  imagePickerPlaceholderText: { color: COLORS.lightText, marginTop: 12, fontSize: 16 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  inputIcon: { padding: 14 },
  input: { flex: 1, paddingVertical: 14, paddingRight: 14, fontSize: 16, color: COLORS.text },
  contentInputGroup: { alignItems: 'flex-start' },
  contentInput: { height: 150, textAlignVertical: 'top' },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  modalButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalButtonDisabled: { opacity: 0.6 },
  modalButtonGradient: { paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { color: COLORS.text, fontWeight: '600', fontSize: 16 },
  modalButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
});

export default NewsLetterScreen;
