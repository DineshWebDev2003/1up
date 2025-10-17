import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GreenGradientBackground from '../components/GreenGradientBackground';
import { API_URL } from '../../config';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const TuitionTeacherChatsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);

          const response = await authFetch('/api/users/get_users.php');

          if (response.data && Array.isArray(response.data.users)) {
            const allUsers = response.data.users;
            const filteredChats = allUsers.filter(u => 
              u.id !== user.id && (
                u.role === 'Tuition Student' || 
                u.role === 'Admin' || 
                (u.role === 'Franchisee' && u.branch_id === user.branch_id)
              )
            );
            setChats(filteredChats);
          } else {
            setChats([]);
          }
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleChatPress = (chat) => {
    router.push({ pathname: '/(common)/chat-detail', params: { recipient: JSON.stringify(chat) } });
  };


  const renderChatItem = ({ item }) => {
    if (!item || !item.name) return null;

    const getTagColor = (role) => {
      switch (role) {
        case 'Tuition Student': return '#4CAF50';
        case 'Admin': return '#F44336';
        case 'Franchisee': return '#FF9800';
        default: return '#9E9E9E';
      }
    };

    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => handleChatPress(item)}>
        <Image 
          source={item.avatar ? { uri: `${API_URL}/uploads/avatars/${item.avatar}` } : require('../../assets/Avartar.png')} 
          style={styles.profilePic} 
        />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{item.name}</Text>
            {/* Placeholder for time and read status */}
          </View>
          <View style={styles.chatContent}>
            <View style={styles.tagContainer}>
              <View style={[styles.tag, { backgroundColor: getTagColor(item.role) }]}>
                <Text style={styles.tagText}>{item.role}</Text>
              </View>
            </View>
            <Text style={styles.lastMessage} numberOfLines={1}>
              Tap to start a conversation
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <GreenGradientBackground>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chats</Text>
            <Text style={styles.headerSubtitle}>Tuition Center</Text>
          </View>


          {/* Chat List */}
          <View style={styles.chatListContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
            ) : (
              <FlatList
                data={chats}
                renderItem={renderChatItem}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                ListEmptyComponent={<Text style={styles.loadingText}>No users found.</Text>}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </GreenGradientBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  storiesContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  storiesContent: {
    paddingHorizontal: 15,
  },
  yourStoryContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  yourStoryImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  storyImageContainer: {
    padding: 2,
    borderRadius: 32,
    backgroundColor: Colors.primary,
  },
  storyImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'white',
  },
  storyName: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 5,
    textAlign: 'center',
  },
  chatListContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
    position: 'relative',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 5,
  },
  tickContainer: {
    marginLeft: 5,
  },
  chatContent: {
    flexDirection: 'column',
  },
  tagContainer: {
    marginBottom: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  unreadDot: {
    position: 'absolute',
    right: 0,
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    transform: [{ translateY: -4 }],
  },
});

export default TuitionTeacherChatsScreen;
