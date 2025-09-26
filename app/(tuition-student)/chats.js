import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, Image, SafeAreaView, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GreenGradientBackground from '../components/GreenGradientBackground';
import authFetch from '../utils/api';
import Colors from '../constants/colors';

// Mock data for tuition student chats
const mockChats = [
  {
    id: '1',
    name: 'Math Teacher',
    profilePic: { uri: 'https://i.pravatar.cc/150?u=teacher1' },
    role: 'Teacher',
    time: '10:30 AM',
    lastMessage: 'Your algebra homework was excellent!',
    isRead: false,
    phone: '1234567890',
  },
  {
    id: '2',
    name: 'Physics Teacher',
    profilePic: { uri: 'https://i.pravatar.cc/150?u=teacher2' },
    role: 'Teacher',
    time: 'Yesterday',
    lastMessage: 'Don\'t forget about tomorrow\'s test.',
    isRead: true,
    phone: '0987654321',
  },
  {
    id: '3',
    name: 'Study Group',
    profilePic: { uri: 'https://i.pravatar.cc/150?u=group1' },
    role: 'Group',
    time: '2 days ago',
    lastMessage: 'Let\'s meet for group study session.',
    isRead: true,
    phone: '1122334455',
  },
];

const TuitionStudentChatsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState(mockChats);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        // Mock user data for tuition student
        setUser({ name: 'Aarav Sharma', role: 'Tuition Student', branch: 'Tuition Center' });
      } catch (error) {
        console.error('Failed to load user:', error);
        setUser({ name: 'Tuition Student', role: 'Student', branch: 'Tuition Center' });
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const filteredChats = (chats || []).filter(chat => 
    chat && chat.name && chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatPress = (chat) => {
    if (chat && chat.id) {
      router.push(`/(common)/chat-detail?id=${chat.id}&name=${chat.name}`);
    }
  };

  const renderChatItem = ({ item }) => {
    if (!item || !item.name) return null;

    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => handleChatPress(item)}>
        <Image source={item.profilePic} style={styles.profilePic} />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{item.name}</Text>
            <View style={styles.chatMeta}>
              <Text style={styles.chatTime}>{item.time}</Text>
              <View style={styles.tickContainer}>
                <Ionicons 
                  name="checkmark-done" 
                  size={16} 
                  color={item.isRead ? '#1976D2' : '#9E9E9E'} 
                />
              </View>
            </View>
          </View>
          <View style={styles.chatContent}>
            <Text style={styles.chatRole}>{item.role}</Text>
            <Text 
              style={[styles.lastMessage, !item.isRead && styles.unreadMessage]} 
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          </View>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <GreenGradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </GreenGradientBackground>
    );
  }

  return (
    <GreenGradientBackground>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
          <Text style={styles.headerSubtitle}>{user?.branch || 'Tuition Center'}</Text>
        </View>

        {/* Stories Container */}
        <View style={styles.storiesContainer}>
          <Text style={styles.storiesTitle}>Stories</Text>
          <View style={styles.storiesRow}>
            <View style={styles.storyItem}>
              <View style={styles.yourStoryContainer}>
                <Ionicons name="add" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.storyName}>Your Story</Text>
            </View>
            <View style={styles.storyItem}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?u=story1' }} style={styles.storyAvatar} />
              <Text style={styles.storyName}>Teacher</Text>
            </View>
            <View style={styles.storyItem}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?u=story2' }} style={styles.storyAvatar} />
              <Text style={styles.storyName}>Classmate</Text>
            </View>
            <View style={styles.storyItem}>
              <Image source={{ uri: 'https://i.pravatar.cc/150?u=story3' }} style={styles.storyAvatar} />
              <Text style={styles.storyName}>Study Group</Text>
            </View>
          </View>
        </View>

        {/* Chat List */}
        <FlatList
          data={filteredChats || []}
          renderItem={renderChatItem}
          keyExtractor={(item, index) => item?.id || `chat-${index}`}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="chat-outline" size={64} color={Colors.lightText} />
              <Text style={styles.emptyText}>No chats found</Text>
              <Text style={styles.emptySubtext}>Start a conversation with your teachers</Text>
            </View>
          }
        />
      </SafeAreaView>
    </GreenGradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginTop: 5,
  },
  storiesContainer: {
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  storiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  storyItem: {
    alignItems: 'center',
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: 5,
  },
  storyName: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
  yourStoryContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    marginBottom: 5,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 15,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTime: {
    fontSize: 12,
    color: Colors.lightText,
    marginRight: 5,
  },
  tickContainer: {
    marginLeft: 3,
  },
  chatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatRole: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.lightText,
    flex: 1,
    marginLeft: 10,
  },
  unreadMessage: {
    color: Colors.text,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.lightText,
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default TuitionStudentChatsScreen;
