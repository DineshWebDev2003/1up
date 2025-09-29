import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, SafeAreaView, FlatList, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';
import GreenGradientBackground from '../components/GreenGradientBackground';

const ChatScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [schools, setSchools] = useState([]);
  const [stories, setStories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (!sessionToken) {
        console.warn('No session token found, skipping API calls');
        return;
      }

      // Load current user data and construct full avatar URL
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
          const user = JSON.parse(storedUserData);
          // Ensure the avatar URL is a full path
          if (user.avatar && !user.avatar.startsWith('http')) {
            user.avatar = `${API_URL}${user.avatar}`;
          }
          setCurrentUser(user);
      } else {
          console.warn('No user data found in storage for chat screen.');
          // You might want to redirect to login here if user data is essential
      }

      const fetchFranchiseeUsers = async () => {
        try {
          const response = await authFetch('/api/users/get_users.php?role=Franchisee');
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            // Get last messages for each user
            const franchiseeChats = await Promise.all(result.data.map(async (user) => {
              let lastMessage = 'No messages yet';
              let messageStatus = '';
              let isOnline = false;
              let lastSeen = 'Last seen recently';
              
              try {
                // Fetch last message and unread count
                const msgResponse = await authFetch(`/api/messages/get_messages.php?user_id=${user.id}&limit=1`);
                const msgResult = await msgResponse.json();
                if (msgResult.success && msgResult.data && msgResult.data.length > 0) {
                  const msg = msgResult.data[0];
                  lastMessage = msg.message.length > 30 ? msg.message.substring(0, 30) + '...' : msg.message;
                  
                  // Show ticks only for sent messages, time for received messages
                  if (msg.direction === 'sent') {
                    messageStatus = msg.is_read ? '✓✓' : '✓';
                  } else {
                    // For received messages, show time instead of ticks
                    const msgTime = new Date(msg.created_at);
                    const now = new Date();
                    const diffMinutes = (now - msgTime) / (1000 * 60);
                    
                    if (diffMinutes < 60) {
                      messageStatus = `${Math.floor(diffMinutes)}m`;
                    } else if (diffMinutes < 1440) {
                      messageStatus = `${Math.floor(diffMinutes / 60)}h`;
                    } else {
                      messageStatus = `${Math.floor(diffMinutes / 1440)}d`;
                    }
                  }
                  
                  // Set unread count for red indicator
                  user.unreadCount = msgResult.unread_count || 0;
                }
                
                // Check online status (if last_login is within 5 minutes)
                if (user.last_login) {
                  const lastLogin = new Date(user.last_login);
                  const now = new Date();
                  const diffMinutes = (now - lastLogin) / (1000 * 60);
                  isOnline = diffMinutes <= 5;
                  
                  if (!isOnline) {
                    const diffHours = Math.floor(diffMinutes / 60);
                    const diffDays = Math.floor(diffHours / 24);
                    
                    if (diffDays > 0) {
                      lastSeen = `Last seen ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                    } else if (diffHours > 0) {
                      lastSeen = `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                    } else {
                      lastSeen = `Last seen ${Math.floor(diffMinutes)} min ago`;
                    }
                  }
                }
              } catch (error) {
                console.log('Error fetching messages for user:', user.id);
              }
              
              return {
                id: user.id,
                name: user.name,
                profile_pic: user.profile_image ? `${API_URL}${user.profile_image}` : null,
                last_message: lastMessage,
                message_status: messageStatus,
                time: isOnline ? 'Online' : lastSeen,
                is_online: isOnline,
                role: user.role,
                phone: user.phone || null,
                unreadCount: user.unreadCount || 0,
              };
            }));
            
            setSchools(franchiseeChats);
          } else {
            console.error("Failed to fetch franchisee users:", result.message);
          }
        } catch (error) {
          console.error("Error fetching franchisee users:", error);
        }
      };

      const fetchStories = async () => {
        try {
          const response = await authFetch('/api/get_stories.php');
          const result = await response.json();
          if (result.success) {
            setStories(result.data);
          } else {
            console.error("Failed to fetch stories:", result.message);
          }
        } catch (error) {
          console.error("Error fetching stories:", error);
        }
      };

      fetchFranchiseeUsers();
      fetchStories();
    };

    loadData();
  }, []);

  const handlePickStory = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant media library permissions to select a story.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'All',
        quality: 1,
        videoMaxDuration: 60, // 60 seconds max for videos
        allowsEditing: true,
      });

      console.log('ImagePicker result:', result);

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

        try {
          const response = await authFetch('/api/stories/create_story.php', {
            method: 'POST',
            body: formData,
          });

          const responseJson = await response.json();

          if (responseJson.success) {
            Alert.alert('Success', 'Story uploaded successfully!');
            // Refresh stories
            const storiesResponse = await authFetch('/api/stories/get_stories.php');
            const storiesResult = await storiesResponse.json();
            if (storiesResult.success) {
              setStories(storiesResult.data);
            }
          } else {
            Alert.alert('Error', responseJson.message || 'Failed to upload story');
          }
        } catch (error) {
          console.error('Error uploading story:', error);
          Alert.alert('Error', 'Network error. Please try again.');
        }
      } else {
        console.log('ImagePicker was canceled or no assets selected');
      }
    } catch (error) {
      console.error('Error selecting story:', error);
      Alert.alert('Error', 'Failed to select media. Please try again.');
    }
  };

  const handleChatPress = (school) => {
    console.log('Admin Chat - Opening chat with:', school);
    router.push({
      pathname: '/(common)/chat-detail',
      params: { 
        chatId: school.id, 
        name: school.name,
        avatar: school.profile_pic || ''
      },
    });
  };

  const handleCallPress = (phone) => {
    if (phone && phone !== 'N/A') {
      const phoneUrl = `tel:${phone}`;
      Linking.openURL(phoneUrl).catch(err => {
        Alert.alert('Error', 'Unable to make phone call');
        console.error('Error opening phone dialer:', err);
      });
    } else {
      Alert.alert('No Phone Number', 'Phone number not available for this user');
    }
  };

  return (
    <GreenGradientBackground>
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Ionicons name="chatbubbles-outline" size={28} color={Colors.white} />
        <Text style={styles.headerTitle}>Chat with Franchisees</Text>
      </View>

      <ScrollView>
        <View style={styles.storiesContainer}>
          <Text style={styles.updatesTitle}>Stories</Text>
          <FlatList
            data={[{ id: 'your-story', name: 'Your Story' }, ...stories]}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <StoryItem 
                item={item} 
                index={index}
                onAddStory={handlePickStory} 
                router={router} 
                currentUser={currentUser} 
                stories={stories}
              />
            )}
          />
        </View>

        <View style={styles.updatesContainer}>
          <Text style={styles.updatesTitle}>Franchisee Chats</Text>
          <ChatList chats={schools} onChatPress={handleChatPress} onCallPress={handleCallPress} />
        </View>
      </ScrollView>
    </View>
    </GreenGradientBackground>
  );
};

const StoryItem = ({ item, index, onAddStory, router, currentUser, stories }) => {
  if (!currentUser) return null; // Don't render story items if current user is not loaded

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
              profilePic: currentUser.avatar ? `${API_URL}${currentUser.avatar}` : null
            }
          });
        } else {
          onAddStory();
        }
      }}>
        <Image source={currentUser.avatar ? { uri: currentUser.avatar } : require('../../assets/Avartar.png')} style={[styles.storyImage, hasStory && styles.storyBorder]} />
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
        source={
          item.id === 'your-story' 
            ? (currentUser.profile_image 
                ? { uri: currentUser.profile_image.startsWith('http') ? currentUser.profile_image : `${API_URL}${currentUser.profile_image}` }
                : require('../../assets/Avartar.png'))
            : (item.profile_image 
                ? { uri: item.profile_image.startsWith('http') ? item.profile_image : `${API_URL}${item.profile_image}` }
                : require('../../assets/Avartar.png'))
        } 
        style={[styles.storyImage, hasStory && styles.storyBorder]} 
      />
      <Text style={styles.storyName}>{item.name}</Text>
    </TouchableOpacity>
  );
};

const ChatList = ({ chats, onChatPress, onCallPress }) => {
  return (
    <View style={styles.chatListContainer}>
      {chats.map(chat => (
        <TouchableOpacity key={chat.id} onPress={() => onChatPress(chat)} style={styles.chatItem}>
            <View style={styles.profileContainer}>
              <Image source={chat.profile_pic ? { uri: chat.profile_pic } : require('../../assets/Avartar.png')} style={styles.chatImage}/>
              {chat.is_online && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.chatContent}>
                <View style={styles.chatTextContainer}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <View style={styles.messageContainer}>
                    <Text style={styles.lastMessage}>{chat.last_message}</Text>
                    {chat.message_status && <Text style={styles.messageStatus}>{chat.message_status}</Text>}
                  </View>
                </View>
                <View style={styles.rightSection}>
                  <Text style={styles.chatTime}>{chat.time}</Text>
                  <View style={styles.rightActions}>
                    {chat.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                      </View>
                    )}
                    {chat.phone && (
                      <TouchableOpacity 
                        style={styles.callButton} 
                        onPress={() => onCallPress(chat.phone)}
                      >
                        <Ionicons name="call" size={18} color={Colors.white} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
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
    borderColor: 'white',
  },
  storyName: {
    marginTop: 5,
    fontSize: 12,
    color: Colors.white,
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
  profileContainer: {
    position: 'relative',
  },
  chatImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: 'white',
  },
  chatContent: {
    flex: 1,
    marginLeft: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTextContainer: {
    flex: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  chatName: {
    fontWeight: 'bold',
    color: Colors.white,
    fontSize: 16,
  },
  lastMessage: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    flex: 1,
  },
  messageStatus: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 5,
  },
  callButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderRadius: 15,
    padding: 6,
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBottom: 100,
  },
  header: {
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ChatScreen;
