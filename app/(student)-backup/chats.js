import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ScrollView, Image, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/colors';
import GreenGradientBackground from '../components/GreenGradientBackground';
import authFetch from '../utils/api';
import { API_URL } from '../../config';

// Placeholder Data
const currentUserData = {
  profilePic: { uri: 'https://i.pravatar.cc/150?u=studentRiya' },
};

const stories = [
  {
    id: '1',
    name: 'Teacher Alice',
    profilePic: { uri: 'https://i.pravatar.cc/150?u=chat1' },
    items: [
      { id: 'story1_1', type: 'image', uri: 'https://i.pravatar.cc/1080?u=story_teacher1', timestamp: '2h ago' },
    ],
  },
  {
    id: '2',
    name: 'Admin Office',
    profilePic: { uri: 'https://i.pravatar.cc/150?u=chat3' },
    items: [
      { id: 'story2_1', type: 'image', uri: 'https://i.pravatar.cc/1080?u=story_admin1', timestamp: '4h ago' },
    ],
  },
];


import { useFocusEffect } from 'expo-router';

const StudentChatScreen = () => {
  const [currentUser, setCurrentUser] = React.useState(currentUserData);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/chat/get_student_chat_list.php');
      const result = await response.json();
      if (result.success) {
        const formattedData = result.data.map(user => ({
          id: user.id,
          name: user.display_name,
          profilePic: user.avatar ? { uri: `${API_URL}${user.avatar}` } : require('../../assets/Avartar.png'),
          role: user.role,
          time: '',
          lastMessage: 'Tap to start a conversation',
          isRead: true,
          phone: user.phone,
        }));
        setChats(formattedData);
      } else {
        Alert.alert('Error', 'Failed to load chats.');
      }
    } catch (error) {
      console.error('Error fetching student chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchChats();
    }, [])
  );

  const handlePickStory = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to select a story.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
        videoMaxDuration: 45, // 45 seconds limit
        allowsEditing: true,
      });

      console.log('ImagePicker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const contentType = asset.type === 'video' ? 'video' : 'image';
        
        // Check file size (limit to 10MB)
        if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
          return;
        }
        
        try {
          const sessionToken = await AsyncStorage.getItem('sessionToken');
          console.log('Session token available:', !!sessionToken);
          
          // Create FormData for file upload
          const formData = new FormData();
          formData.append('file', {
            uri: asset.uri,
            type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
            name: asset.fileName || `story_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
          });
          formData.append('title', 'My Story');
          formData.append('content', 'Story from mobile app');
          formData.append('content_type', contentType);
          
          console.log('FormData prepared:', {
            uri: asset.uri,
            type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
            name: asset.fileName || `story_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
            contentType
          });
          
          // Create upload with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const response = await fetch(`${API_URL}/api/stories/create_story.php`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
            body: formData,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          console.log('Upload response status:', response.status);
          console.log('Response headers:', response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          Alert.alert('Error', `Server error: ${response.status}`);
          return;
        }
        
        const result = await response.json();
        console.log('Server response:', result);
        
        if (result.success) {
          Alert.alert('Success', 'Story uploaded successfully! It will expire in 10 hours.');
          // Refresh stories list here if needed
        } else {
          Alert.alert('Error', result.message || 'Failed to upload story');
        }
      } catch (error) {
        console.error('Error uploading story:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        if (error.name === 'AbortError') {
          Alert.alert('Timeout Error', 'Upload took too long. Please try again with a smaller file.');
        } else if (error.message === 'Network request failed') {
          Alert.alert('Network Error', 'Please check your internet connection and server availability.');
        } else {
          Alert.alert('Error', `Failed to upload story: ${error.message}`);
        }
      }
    } else {
      console.log('ImagePicker was canceled or no assets selected');
    }
    } catch (error) {
      console.error('Error selecting story:', error);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  const handleDeleteStory = async (storyId) => {
    try {
      const response = await authFetch('/api/stories/story_crud.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: storyId }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Story deleted successfully');
        // Refresh stories list here if needed
      } else {
        Alert.alert('Error', result.message || 'Failed to delete story');
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      Alert.alert('Error', 'Failed to delete story');
    }
  };

  const handleChatPress = (chat) => {
    router.push({
      pathname: '/(common)/chat-detail',
      params: { chatId: chat.id, name: chat.name },
    });
  };

  return (
    <GreenGradientBackground>
      <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.storiesContainer}>
          <Text style={styles.updatesTitle}>Stories</Text>
          <FlatList
            data={[{ id: 'your-story', name: 'Your Story' }, ...stories]}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity 
                style={styles.storyItem}
                onPress={() => {
                  if (item.id === 'your-story') {
                    handlePickStory();
                  } else {
                    router.push({
                      pathname: '/(common)/story-viewer',
                      params: {
                        allStories: JSON.stringify(stories),
                        startIndex: index - 1
                      }
                    });
                  }
                }}
                onLongPress={() => {
                  if (item.id !== 'your-story' && item.user_id === currentUser.id) {
                    Alert.alert(
                      'Delete Story',
                      'Are you sure you want to delete this story?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteStory(item.id) }
                      ]
                    );
                  }
                }}
              >
                <View style={[styles.storyImageContainer, item.id === 'your-story' && styles.yourStoryContainer]}>
                  {item.id === 'your-story' ? (
                    <Ionicons name="add" size={24} color={Colors.primary} />
                  ) : (
                    <Image source={{ uri: item.profilePic?.uri || 'https://i.pravatar.cc/150?u=' + item.id }} style={styles.storyImage} />
                  )}
                </View>
                <Text style={styles.storyName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.updatesContainer}>
          <Text style={styles.updatesTitle}>Talks</Text>
          <StudentChatList chats={chats} onChatPress={handleChatPress} />
        </View>
      </ScrollView>
    </SafeAreaView>
   </GreenGradientBackground>
  );
};

const StoryItem = ({ item, index, onAddStory, router, currentUser, stories }) => {
  const hasStory = item.id === 'your-story' ? currentUser.stories && currentUser.stories.length > 0 : item.items && item.items.length > 0;

  if (item.id === 'your-story') {
    return (
      <TouchableOpacity style={styles.storyItem} onPress={() => {
        if (hasStory) {
          router.push({ 
            pathname: '/(common)/story-viewer', 
            params: { 
              stories: JSON.stringify(currentUser.stories), 
              user: 'Your Story', 
              profilePic: currentUser.profilePic.uri 
            }
          });
        } else {
          onAddStory();
        }
      }}>
        <Image source={currentUser.profilePic} style={[styles.storyImage, hasStory && styles.storyBorder]} />
        {!hasStory && (
          <View style={styles.plusIconContainer}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </View>
        )}
        <Text style={styles.storyName}>{item.name}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.storyItem} onPress={() => {
        if (hasStory) {
          const allStories = [currentUser, ...stories].filter(s => s.stories || (s.items && s.items.length > 0));
          const userIndex = item.id === 'your-story' ? 0 : stories.findIndex(s => s.id === item.id) + 1;

          router.push({ 
            pathname: '/(common)/story-viewer', 
            params: { 
              allStories: JSON.stringify(allStories),
              startIndex: userIndex
            }
          });
        }
      }}>

      <Image 
        source={item.profilePic} 
        style={[styles.storyImage, hasStory && styles.storyBorder]} 
      />
      <Text style={styles.storyName}>{item.name}</Text>
    </TouchableOpacity>
  );
};

const StudentChatList = ({ chats, onChatPress }) => {
    const handleCallPress = (phone) => {
        if (phone) {
          Linking.openURL(`tel:${phone}`);
        }
      };

  return (
    <View style={styles.chatListContainer}>
      {chats.map(chat => (
        <TouchableOpacity key={chat.id} onPress={() => onChatPress(chat)} style={styles.chatItem}>
            <Image source={chat.profilePic} style={styles.chatImage}/>
            <View style={styles.chatContent}>
                <View style={styles.chatNameContainer}>
                    <Text style={styles.chatName}>{chat.name}</Text>
                    {chat.role === 'Teacher' && <Text style={styles.teacherTag}>Teacher</Text>}
                </View>
                <Text style={styles.chatMessage}>{chat.lastMessage}</Text>
            </View>
            <View style={styles.chatRightContainer}>
                <Text style={styles.chatTime}>{chat.time}</Text>
                <TouchableOpacity onPress={() => handleCallPress(chat.phone)} style={styles.callButton}>
                    <Ionicons name="call-outline" size={22} color={Colors.white} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  updatesContainer: {
    paddingHorizontal: 15,
    marginTop: 10,
  },
  storiesContainer: {
    paddingHorizontal: 15,
    marginTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  storyImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  storyBorder: {
    borderWidth: 3,
    borderColor: Colors.white,
  },
  storyName: {
    marginTop: 5,
    fontSize: 12,
    color: Colors.lightText,
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 20,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  updatesTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.white,
  },
  chatListContainer: {
    marginTop: 10,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  chatImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatContent: {
    flex: 1,
    marginLeft: 10,
  },
  chatNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatName: {
    fontWeight: 'bold',
    color: Colors.white,
  },
  teacherTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    overflow: 'hidden',
  },
  chatMessage: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  chatRightContainer: {
    alignItems: 'center',
  },
  chatTime: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginBottom: 5,
  },
  callButton: {
    padding: 5,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default StudentChatScreen;
