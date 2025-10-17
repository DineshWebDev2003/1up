import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView, Modal, Linking, Alert, Dimensions, ScrollView } from 'react-native';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModernBackground from '../components/ModernBackground';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';

const { width } = Dimensions.get('window');

const TeacherChatsScreen = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForCall, setSelectedUserForCall] = useState(null);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const [currentUser, setCurrentUser] = useState(null);
  const [stories, setStories] = useState([]);
  const router = useRouter();

  const fetchChatList = async () => {
    try {
      setLoading(true);

      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        setCurrentUser(JSON.parse(storedUserData));
      }

      const [chatResponse, storiesResponse] = await Promise.all([
        authFetch('/api/chat/get_teacher_chat_list.php'),
        authFetch('/api/stories/get_stories.php'),
      ]);

      const chatResult = await chatResponse.json();
      if (chatResult.success) {
        const formattedData = chatResult.data
          .map(user => ({
            ...user,
            id: user.user_id || user.id, // normalize id
            display_name: user.display_name || user.name,
            lastMessage: 'Tap to start a conversation',
            timestamp: ''
          }))
          .filter(user => !currentUser || user.id !== currentUser.id); // hide self
        setConversations(formattedData);
      } else {
        Alert.alert('Error', 'Could not fetch chat list.');
      }

      const storiesResult = await storiesResponse.json();
      if (storiesResult.success) {
        setStories(storiesResult.data);
      }

    } catch (error) {
      console.error('Fetch chat list error:', error);
      Alert.alert('Error', 'An error occurred while fetching chats.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(React.useCallback(() => { fetchChatList(); }, []));

  const handleCallPress = (user) => {
    // Show any available contact numbers; disable entries without numbers
    setSelectedUserForCall(user);
    setCallModalVisible(true);
  };

  const handlePhoneCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(err => Alert.alert('Error', 'Could not make the phone call.'));
  };

  const handlePickStory = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to select a story.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
        videoMaxDuration: 60,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('title', 'New Story');
        formData.append('content', 'Story content');
        formData.append('content_type', asset.type === 'video' ? 'video' : 'image');
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || `story_${Date.now()}`,
          type: asset.type || (asset.uri.includes('.mp4') ? 'video/mp4' : 'image/jpeg'),
        });

        const response = await authFetch('/api/stories/create_story.php', {
          method: 'POST',
          body: formData,
        });

        const responseJson = await response.json();

        if (responseJson.success) {
          Alert.alert('Success', 'Story uploaded successfully!');
          fetchChatList(); // Refresh stories
        } else {
          Alert.alert('Error', responseJson.message || 'Failed to upload story');
        }
      }
    } catch (error) {
      console.error('Error selecting story:', error);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  const renderConversationItem = ({ item }) => {
    const defaultAvatar = require('../../assets/Avartar.png');
    const hasAvatar = item.avatar && item.avatar.trim() !== '';
    const avatarUrl = hasAvatar ? { uri: `${API_URL}${item.avatar}` } : defaultAvatar;

    return (
      <Animatable.View animation="fadeInUp" duration={600} delay={100} style={styles.chatItemWrapper}>
        <Link href={`/(common)/chat-detail?userId=${encodeURIComponent(item.user_id || item.id)}&name=${encodeURIComponent(item.display_name || item.name)}&avatar=${encodeURIComponent(item.avatar || '')}`} asChild>
          <TouchableOpacity style={styles.chatItem}>
            <View style={styles.chatAvatarContainer}>
              <Image 
                source={avatarUrl} 
                style={styles.chatAvatar}
                onError={() => {
                  // Fallback to default avatar on error
                  console.log('Avatar load error for user:', item.display_name);
                }}
              />
            </View>
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{item.display_name}</Text>
                <LinearGradient
                  colors={item.role === 'Student' ? ['#FF6B6B', '#FF8E53'] : item.role === 'Admin' ? ['#4ECDC4', '#44A08D'] : ['#A8E6CF', '#88D8A3']}
                  style={styles.roleTag}
                >
                  <Text style={styles.roleTagText}>{item.role}</Text>
                </LinearGradient>
              </View>
              <Text style={styles.chatLastMessage} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            <View style={styles.chatRightContainer}>
              <Text style={styles.chatTimestamp}>{item.timestamp}</Text>
              <TouchableOpacity style={styles.callButton} onPress={() => handleCallPress(item)}>
                <LinearGradient colors={['#34C759', '#30D158']} style={styles.callButtonGradient}>
                  <Ionicons name="call" size={18} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Link>
      </Animatable.View>
    );
  };

  const ListHeader = () => (
    <View style={styles.storiesContainer}>
      <Text style={styles.updatesTitle}>Stories</Text>
      <FlatList
        data={[{ id: 'your-story', name: 'Your Story' }, ...stories]}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <StoryItem 
            item={item} 
            currentUser={currentUser}
            onAddStory={handlePickStory} 
            router={router} 
            stories={stories}
          />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesListContainer}
      />
    </View>
  );

  const StoryItem = ({ item, currentUser, onAddStory, router, stories }) => {
    if (!currentUser) return null;
    const hasStory = item.id === 'your-story' ? (currentUser.stories && currentUser.stories.length > 0) : (item.items && item.items.length > 0);
    const hasAvatar = item.id === 'your-story' 
      ? (currentUser.avatar && currentUser.avatar.trim() !== '')
      : (item.avatar && item.avatar.trim() !== '');

    const handlePress = () => {
      if (item.id === 'your-story') {
        if (hasStory) {
          router.push({ pathname: '/(common)/story-viewer', params: { stories: JSON.stringify(currentUser.stories), user: 'Your Story', profilePic: currentUser.avatar ? `${API_URL}${currentUser.avatar}` : null } });
        } else {
          onAddStory();
        }
      } else if (hasStory) {
        const allStories = [currentUser, ...stories].filter(s => s.stories || (s.items && s.items.length > 0));
        const userIndex = stories.findIndex(s => s.id === item.id) + 1;
        router.push({ pathname: '/(common)/story-viewer', params: { allStories: JSON.stringify(allStories), startIndex: userIndex } });
      }
    };

    return (
      <TouchableOpacity style={styles.storyItem} onPress={handlePress}>
        <View style={[styles.storyImageContainer, hasStory && styles.storyBorder]}>
          {item.id === 'your-story' && !hasStory ? (
            <Ionicons name="add" size={24} color={Colors.primary} />
          ) : hasStory && hasAvatar ? (
            <Image 
              source={item.id === 'your-story' 
                ? { uri: `${API_URL}${currentUser.avatar}` }
                : { uri: `${API_URL}${item.avatar}` }
              } 
              style={styles.storyImage} 
            />
          ) : hasStory && !hasAvatar ? (
            <View style={styles.emptyStoryContainer}>
              <Text style={styles.initialsText}>
                {(item.id === 'your-story' ? currentUser.name : item.name)?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyStoryContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.lightGray} />
            </View>
          )}
        </View>
        <Text style={styles.storyName} numberOfLines={1}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <LinearGradient colors={Colors.gradientMain} style={styles.container}>
        <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Conversations</Text>
            <Text style={styles.headerSubtitle}>Stay connected with students and staff</Text>
          </View>
          {loading ? (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text style={{color: 'white'}}>Loading Chats...</Text></View>
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderConversationItem}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={ListHeader}
              contentContainerStyle={styles.listContent}
            />
          )}
        </SafeAreaView>
      </LinearGradient>
      {selectedUserForCall && (
        <Modal animationType="slide" transparent={true} visible={callModalVisible} onRequestClose={() => setCallModalVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setCallModalVisible(false)} activeOpacity={1}>
            <TouchableOpacity style={styles.modalContent} activeOpacity={1}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Call {selectedUserForCall.display_name}</Text>
              </View>
              <View style={styles.contactsList}>
                {selectedUserForCall.contacts && Object.keys(selectedUserForCall.contacts).length > 0 ? (
                  Object.entries(selectedUserForCall.contacts).map(([type, info]) => (
                    <TouchableOpacity 
                      key={type} 
                      style={[styles.contactButton, !info.number && styles.disabledContactButton]}
                      onPress={() => info.number && handlePhoneCall(info.number)}
                      disabled={!info.number}
                    >
                      <Ionicons name="call" size={20} color={info.number ? Colors.primary : Colors.lightGray} />
                      <View>
                        <Text style={styles.contactText}>{info.name || type}</Text>
                        <Text style={styles.contactNumber}>{info.number ? `${type}: ${info.number}` : `${type}: Not available`}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity 
                    style={[styles.contactButton, !selectedUserForCall.phone && styles.disabledContactButton]}
                    onPress={() => selectedUserForCall.phone && handlePhoneCall(selectedUserForCall.phone)}
                    disabled={!selectedUserForCall.phone}
                  >
                    <Ionicons name="call" size={20} color={selectedUserForCall.phone ? Colors.primary : Colors.lightGray} />
                    <Text style={styles.contactText}>Call {selectedUserForCall.display_name}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setCallModalVisible(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28, fontWeight: 'bold', color: Colors.white, marginBottom: 6, textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
  listContent: { paddingTop: 10, paddingHorizontal: 20 },
  storiesContainer: {
    marginBottom: 20,
  },
  updatesTitle: {
    fontSize: 18, fontWeight: 'bold', color: Colors.white, marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
  storiesListContainer: { paddingRight: 20 },
  storyItem: { alignItems: 'center', marginRight: 15, width: 70 },
  storyImageContainer: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: Colors.white,
  },
  storyBorder: {
    borderColor: Colors.secondary,
  },
  storyImage: {
    width: 54, height: 54, borderRadius: 27,
  },
  emptyStoryContainer: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: '#f0f0f0',
    justifyContent: 'center', alignItems: 'center',
  },
  initialsText: {
    fontSize: 18, fontWeight: 'bold', color: Colors.primary,
  },
  yourStoryContainer: { borderColor: Colors.lightGray, borderStyle: 'dashed' },
  storyName: {
    fontSize: 12, color: Colors.white, textAlign: 'center', fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
  chatItemWrapper: { marginBottom: 12 },
  chatItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  chatAvatarContainer: { position: 'relative', marginRight: 15 },
  chatAvatar: { width: 55, height: 55, borderRadius: 27.5, borderWidth: 3, borderColor: 'white' },
  chatContent: { flex: 1 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  chatName: { fontSize: 17, fontWeight: 'bold', color: '#2D3748', marginRight: 10 },
  roleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  roleTagText: { fontSize: 11, fontWeight: 'bold', color: 'white' },
  chatLastMessage: { fontSize: 14, color: '#718096', lineHeight: 20 },
  chatRightContainer: { alignItems: 'flex-end' },
  chatTimestamp: { fontSize: 12, color: '#A0AEC0', marginBottom: 8, fontWeight: '500' },
  callButton: { marginTop: 4 },
  callButtonGradient: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#34C759', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: {
    width: '90%', backgroundColor: 'white', borderRadius: 25, padding: 25, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  modalHeader: { alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3748', textAlign: 'center' },
  contactsList: { width: '100%', marginBottom: 15 },
  contactButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  disabledContactButton: { opacity: 0.5 },
  contactText: { fontSize: 16, color: Colors.darkText, marginLeft: 10 },
  contactNumber: { fontSize: 14, color: Colors.textSecondary, marginLeft: 10, textTransform: 'capitalize' },
  closeButton: { marginTop: 15, backgroundColor: Colors.lightGray, borderRadius: 15, paddingVertical: 14, paddingHorizontal: 40 },
  closeButtonText: { color: Colors.darkText, fontSize: 16, fontWeight: 'bold' },
});

export default TeacherChatsScreen;
