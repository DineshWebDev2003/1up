import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StatusView from '../(common)/StatusView'; // Import the new StatusView component

// Mock Data
const mockUsers = {
  '1': { id: '1', name: 'Admin', avatar: 'https://i.pravatar.cc/150?u=admin' },
  '2': { id: '2', name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=john' },
  '3': { id: '3', name: 'Jane Smith', avatar: 'https://i.pravatar.cc/150?u=jane' },
};

const mockStatuses = [
  { userId: '2', imageUrl: 'https://picsum.photos/seed/status1/400/800' },
  { userId: '3', imageUrl: 'https://picsum.photos/seed/status2/400/800' },
];

const mockConversations = [
  { id: 'conv1', userId: '1', lastMessage: 'See you tomorrow!', timestamp: '10:45 AM' },
  { id: 'conv2', userId: '2', lastMessage: 'Thanks for the update.', timestamp: '9:30 AM' },
  { id: 'conv3', userId: '3', lastMessage: 'Can we reschedule?', timestamp: 'Yesterday' },
];

const FranchiseeChatsScreen = () => {
  const [selectedStatus, setSelectedStatus] = useState(null);

  const handleStatusPress = (status) => {
    setSelectedStatus(status);
  };

  const renderStatusItem = ({ item }) => {
    const user = mockUsers[item.userId];
    return (
      <TouchableOpacity style={styles.statusItem} onPress={() => handleStatusPress(item)}>
        <Image source={{ uri: user.avatar }} style={styles.statusAvatar} />
        <Text style={styles.statusName} numberOfLines={1}>{user.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderConversationItem = ({ item }) => {
    const user = mockUsers[item.userId];
    return (
      <Link href={`/(franchisee)/chat/${user.id}`} asChild>
        <TouchableOpacity style={styles.chatItem}>
          <Image source={{ uri: user.avatar }} style={styles.chatAvatar} />
          <View style={styles.chatTextContainer}>
            <Text style={styles.chatName}>{user.name}</Text>
            <Text style={styles.chatLastMessage}>{item.lastMessage}</Text>
          </View>
          <Text style={styles.chatTimestamp}>{item.timestamp}</Text>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.header}>Conversations</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.sectionTitle}>Status</Text>
          <FlatList
            data={mockStatuses}
            renderItem={renderStatusItem}
            keyExtractor={(item) => item.userId}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <FlatList
          data={mockConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
        />
      </View>
      {selectedStatus && (
        <StatusView
          user={mockUsers[selectedStatus.userId]}
          status={selectedStatus}
          visible={!!selectedStatus}
          onClose={() => setSelectedStatus(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 15, paddingTop: 20 },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  statusContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 10 },
  statusItem: { alignItems: 'center', marginRight: 20 },
  statusAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#007bff' },
  statusName: { marginTop: 5, fontSize: 12, color: '#333', maxWidth: 60 },
  chatList: { flex: 1 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  chatTextContainer: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: 'bold' },
  chatLastMessage: { fontSize: 14, color: '#666', marginTop: 2 },
  chatTimestamp: { fontSize: 12, color: '#999' },
});

export default FranchiseeChatsScreen;

