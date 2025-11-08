import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function UnifiedChatDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef(null);
  
  // Chat partner information
  const [partnerId, setPartnerId] = useState(params.partnerId || params.userId || null);
  const [partnerName, setPartnerName] = useState(params.partnerName || params.name || 'Unknown');
  const [partnerAvatar, setPartnerAvatar] = useState(params.partnerAvatar || '');
  const [partnerRole, setPartnerRole] = useState(params.partnerRole || '');
  
  // Current user information
  const [currentUser, setCurrentUser] = useState(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // UI state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    // Only log on first load
    if (partnerName === 'Unknown') {
      console.log('Loading chat with:', params);
    }
    
    // Update state if params change
    if (params.partnerId || params.userId) {
      setPartnerId(params.partnerId || params.userId);
    }
    if (params.partnerName || params.name) {
      setPartnerName(params.partnerName || params.name || 'Unknown');
    }
    if (params.partnerAvatar) {
      setPartnerAvatar(params.partnerAvatar || '');
    }
    if (params.partnerRole) {
      setPartnerRole(params.partnerRole || '');
    }
    
    loadCurrentUser();
    loadPartnerDetails();
    loadMessages();
    
    // Set up real-time updates (polling every 10 seconds instead of 3)
    const interval = setInterval(() => {
      if (partnerId) {
        loadMessages();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [partnerId]);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadPartnerDetails = async () => {
    // Only load if we have a partner ID and name is still Unknown
    if (partnerId && partnerName === 'Unknown') {
      try {
        const response = await authFetch('/api/chat/unified_chat.php?action=users');
        const result = await response.json();
        
        if (result.success && result.data && Array.isArray(result.data)) {
          const partner = result.data.find(user => {
            const userId = user.id ? user.id.toString() : '';
            const searchId = partnerId.toString();
            return userId === searchId;
          });
          
          if (partner) {
            setPartnerName(partner.name || 'Unknown');
            setPartnerAvatar(partner.avatar || '');
            setPartnerRole(partner.role || '');
          }
        }
      } catch (error) {
        console.error('Error loading partner details:', error);
      }
    }
  };

  const loadMessages = useCallback(async () => {
    if (!partnerId) return;
    
    try {
      const response = await authFetch(`/api/chat/unified_chat.php?action=messages&partner_id=${partnerId}&limit=50`);
      const result = await response.json();
      
      if (result.success) {
        setMessages(result.data || []);
        
        // Scroll to bottom if new messages
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [partnerId]);

  const sendMessage = async (messageData = null) => {
    const messageToSend = messageData || {
      receiver_id: partnerId,
      message: newMessage.trim(),
      message_type: 'text'
    };

    if (!messageToSend.message && !messageToSend.file_url) {
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('action', 'send_message');
      formData.append('receiver_id', messageToSend.receiver_id);
      formData.append('message', messageToSend.message || '');
      formData.append('message_type', messageToSend.message_type || 'text');
      
      if (messageToSend.file_url) {
        formData.append('file_url', messageToSend.file_url);
        formData.append('file_name', messageToSend.file_name || '');
        formData.append('file_size', messageToSend.file_size || 0);
      }

      const response = await authFetch('/api/chat/unified_chat.php', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setNewMessage('');
        loadMessages(); // Reload messages to get the latest
      } else {
        Alert.alert('Error', result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Upload image first (you'll need to implement this)
        const imageUrl = await uploadImage(asset);
        
        if (imageUrl) {
          await sendMessage({
            receiver_id: partnerId,
            message: '',
            message_type: 'image',
            file_url: imageUrl,
            file_name: asset.fileName || 'image.jpg',
            file_size: asset.fileSize || 0
          });
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (asset) => {
    // Implement image upload logic here
    // For now, return a placeholder
    return asset.uri;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.is_my_message;
    const showAvatar = !isMyMessage && (index === 0 || messages[index - 1]?.sender_id !== item.sender_id);
    const showDate = index === 0 || formatDate(messages[index - 1]?.created_at) !== formatDate(item.created_at);

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        
        <Animatable.View 
          animation="fadeInUp" 
          duration={300} 
          delay={index * 50}
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
          ]}
        >
          {showAvatar && !isMyMessage && (
            <Image 
              source={
                item.sender_avatar && item.sender_avatar.trim() !== '' 
                  ? { uri: item.sender_avatar.startsWith('http') ? item.sender_avatar : `https://your-domain.com${item.sender_avatar}` }
                  : require('../../assets/Avartar.png')
              } 
              style={styles.messageAvatar} 
            />
          )}
          
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            !showAvatar && !isMyMessage && styles.messageWithoutAvatar
          ]}>
            {item.message_type === 'image' && item.file_url && (
              <TouchableOpacity onPress={() => {/* Open image viewer */}}>
                <Image source={{ uri: item.file_url }} style={styles.messageImage} />
              </TouchableOpacity>
            )}
            
            {item.message && (
              <Text style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText
              ]}>
                {item.message}
              </Text>
            )}
            
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                isMyMessage ? styles.myMessageTime : styles.otherMessageTime
              ]}>
                {formatTime(item.created_at)}
              </Text>
              
              {isMyMessage && (
                <MaterialIcons 
                  name={item.is_read ? "done-all" : "done"} 
                  size={16} 
                  color={item.is_read ? Colors.primary : Colors.textSecondary} 
                />
              )}
            </View>
          </View>
        </Animatable.View>
      </View>
    );
  };

  const renderHeader = () => (
    <Animatable.View animation="fadeInDown" duration={600}>
      <LinearGradient colors={[Colors.primary, Colors.info]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color={Colors.white} />
        </TouchableOpacity>
        
        <Image 
          source={
            partnerAvatar && partnerAvatar.trim() !== '' 
              ? { uri: partnerAvatar.startsWith('http') ? partnerAvatar : `https://your-domain.com${partnerAvatar}` }
              : require('../../assets/Avartar.png')
          } 
          style={styles.headerAvatar} 
        />
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{partnerName}</Text>
          <Text style={styles.headerRole}>{partnerRole}</Text>
        </View>
        
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>
    </Animatable.View>
  );

  const renderInput = () => (
    <View style={styles.inputContainer}>
      <TouchableOpacity style={styles.attachButton} onPress={handleImagePicker}>
        <Ionicons name="attach" size={24} color={Colors.primary} />
      </TouchableOpacity>
      
      <TextInput
        style={styles.textInput}
        value={newMessage}
        onChangeText={setNewMessage}
        placeholder="Type a message..."
        placeholderTextColor={Colors.textSecondary}
        multiline
        maxLength={1000}
      />
      
      <TouchableOpacity 
        style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
        onPress={() => sendMessage()}
        disabled={!newMessage.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Ionicons name="send" size={20} color={Colors.white} />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {renderHeader()}
        
        <View style={styles.messagesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={64} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>Start a conversation with {partnerName}</Text>
                </View>
              }
            />
          )}
        </View>
        
        {renderInput()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: 50,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 15,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerRole: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
  },
  moreButton: {
    padding: 5,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  messagesList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 15,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageWithoutAvatar: {
    marginLeft: 40,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: Colors.text,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
  },
  myMessageTime: {
    color: Colors.white,
    opacity: 0.8,
  },
  otherMessageTime: {
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 15,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attachButton: {
    padding: 8,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    maxHeight: 100,
    backgroundColor: Colors.background,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
});
