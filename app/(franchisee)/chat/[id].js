import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
// import { GiftedChat } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';

// Mock Data - In a real app, you'd fetch this based on the ID
const mockUsers = {
  '1': { id: '1', name: 'Admin', avatar: 'https://i.pravatar.cc/150?u=admin' },
  '2': { id: '2', name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=john' },
  '3': { id: '3', name: 'Jane Smith', avatar: 'https://i.pravatar.cc/150?u=jane' },
};

const ChatScreen = () => {
  const { id } = useLocalSearchParams();
  const user = mockUsers[id] || { name: 'Unknown User', avatar: '' };

  const [messages, setMessages] = useState([
    { _id: 1, text: 'Hello developer', createdAt: new Date(), user: { _id: 2, name: user.name, avatar: user.avatar } },
  ]);

  const onSend = useCallback((newMessages = []) => {
    setMessages(previousMessages => [ ...newMessages, ...previousMessages]);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
              <Text style={styles.headerName}>{user.name}</Text>
            </View>
          ),
          headerBackTitleVisible: false,
        }}
      />
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Chat UI has been temporarily disabled.</Text>
        <Text>A replacement for Gifted Chat is needed.</Text>
      </View>
      {/* The original GiftedChat component was here. */}
      {Platform.OS === 'android' && <KeyboardAvoidingView behavior="padding" />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  headerName: { fontSize: 18, fontWeight: 'bold' },
  inputToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
