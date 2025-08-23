import React from 'react';
import { View, StyleSheet, FlatList, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

// Placeholder Data
const currentUserData = {
  profilePic: require('../../assets/Avartar.png'), // Using a local asset
};

const users = [
  { id: '1', name: 'John Doe', profilePic: require('../../assets/Avartar.png') },
  { id: '2', name: 'Jane Smith', profilePic: require('../../assets/Avartar.png') },
  { id: '3', name: 'Sam Wilson', profilePic: require('../../assets/Avartar.png') },
  { id: '4', name: 'Emily Brown', profilePic: require('../../assets/Avartar.png') },
  { id: '5', name: 'Chris Green', profilePic: require('../../assets/Avartar.png') },
];

const stories = [
  { id: '1', name: 'John Doe', profilePic: require('../../assets/Avartar.png'), hasStory: true },
  { id: '2', name: 'Jane Smith', profilePic: require('../../assets/Avartar.png'), hasStory: true },
  { id: '3', name: 'Sam Wilson', profilePic: require('../../assets/Avartar.png'), hasStory: false },
];

const chats = [
  {
    id: '1',
    name: 'Alice Johnson',
    profilePic: require('../../assets/Avartar.png'),
    branch: 'Main Campus',
    role: 'Teacher',
    time: '10:30 AM',
    lastMessage: 'Yes, I will be there for the meeting.',
    isRead: true,
  },
  {
    id: '2',
    name: 'Michael Brown',
    profilePic: require('../../assets/Avartar.png'),
    branch: 'North Campus',
    role: 'Parent',
    time: '9:45 AM',
    lastMessage: 'Can you please send the report?',
    isRead: false,
  },
  {
    id: '3',
    name: 'Principal Davis',
    profilePic: require('../../assets/Avartar.png'),
    branch: 'Administration',
    role: 'Principal',
    time: 'Yesterday',
    lastMessage: 'All staff meeting at 2 PM today.',
    isRead: true,
  },
];

const ChatScreen = () => {
  const [currentUser, setCurrentUser] = React.useState({
    ...currentUserData,
    hasStory: false,
    storyUri: null,
  });
  const router = useRouter();

  const handlePickStory = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });

    if (!result.canceled) {
      setCurrentUser(prev => ({ ...prev, hasStory: true, storyUri: result.assets[0].uri }));
    }
  };

  const handleChatPress = (chat) => {
    router.push({
      pathname: '/(common)/chat-detail',
      params: { chatId: chat.id, name: chat.name },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="chatbubbles-outline" size={24} color="white" />
        <Text style={styles.headerTitle}>Chat with Franchisee</Text>
      </View>

      <ScrollView>
        <View style={styles.storiesContainer}>
          <Text style={styles.updatesTitle}>Stories</Text>
          <FlatList
            data={[{ id: 'your-story', name: 'Your Story' }, ...stories]}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <StoryItem item={item} onAddStory={handlePickStory} router={router} currentUser={currentUser} />
            )}
          />
        </View>

        <View style={styles.updatesContainer}>
          <Text style={styles.updatesTitle}>Talks</Text>
          <ChatList chats={chats} onChatPress={handleChatPress} />
        </View>
      </ScrollView>
    </View>
  );
};

const StoryItem = ({ item, onAddStory, router, currentUser }) => {
  if (item.id === 'your-story') {
    return (
      <TouchableOpacity style={styles.storyItem} onPress={() => {
        if (currentUser.hasStory) {
          router.push({ pathname: '/(common)/story-viewer', params: { storyUri: currentUser.storyUri, user: 'Your Story', profilePic: 'https://i.pravatar.cc/150?u=currentuser' }});
        } else {
          onAddStory();
        }
      }}>
        <Image source={currentUser.profilePic} style={[styles.storyImage, currentUser.hasStory && styles.storyBorder]} />
        {!currentUser.hasStory && (
          <View style={styles.plusIconContainer}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </View>
        )}
        <Text style={styles.storyName}>{item.name}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.storyItem} onPress={() => router.push({ pathname: '/(common)/story-viewer', params: { storyUri: 'https://i.pravatar.cc/300?u=' + item.id, user: item.name, profilePic: 'https://i.pravatar.cc/150?u=' + item.id }})}>
      <Image 
        source={item.profilePic} 
        style={[styles.storyImage, item.hasStory && styles.storyBorder]} 
      />
      <Text style={styles.storyName}>{item.name}</Text>
    </TouchableOpacity>
  );
};

const ChatList = ({ chats, onChatPress }) => {
  return (
    <View style={styles.chatListContainer}>
      {chats.map(chat => (
        <TouchableOpacity key={chat.id} onPress={() => onChatPress(chat)} style={styles.chatItem}>
            <Image source={chat.profilePic} style={styles.chatImage}/>
            <View style={styles.chatContent}>
                <Text style={styles.chatName}>{chat.name}</Text>
                <Text style={styles.chatMessage}>{chat.lastMessage}</Text>
            </View>
            <Text style={styles.chatTime}>{chat.time}</Text>
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
    borderBottomColor: '#f0f0f0',
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
    borderColor: '#007AFF',
  },
  storyName: {
    marginTop: 5,
    fontSize: 12,
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
    color: '#333',
  },
  chatListContainer: {
    marginTop: 10,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  chatName: {
    fontWeight: 'bold',
  },
  chatMessage: {
    color: 'gray',
  },
  chatTime: {
    color: 'gray',
    fontSize: 12,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ChatScreen;
