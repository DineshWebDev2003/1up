import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Modal,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';

const { width, height } = Dimensions.get('window');

export default function EnhancedChatDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const flatListRef = useRef(null);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Chat parameters
  const chatId = params.chatId;
  const receiverId = params.receiverId;
  const senderId = params.senderId;
  const receiverName = params.name;
  const receiverAvatar = params.avatar;
  const userRole = params.userRole;

  useEffect(() => {
    loadCurrentUser();
    fetchMessages();
    
    // Set up real-time message polling
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const response = await authFetch(`/api/chat/get_messages.php?sender_id=${senderId}&receiver_id=${receiverId}`);
      const result = await response.json();
      
      if (result.success) {
        setMessages(result.data || []);
        // Mark messages as read
        markMessagesAsRead();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [senderId, receiverId]);

  const markMessagesAsRead = async () => {
    try {
      await authFetch('/api/chat/mark_as_read.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: receiverId,
          receiver_id: senderId
        })
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (messageData = null) => {
    const messageToSend = messageData || {
      sender_id: senderId,
      receiver_id: receiverId,
      message: newMessage.trim(),
      message_type: 'text'
    };

    if (!messageToSend.message && !messageToSend.file_url) {
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch('/api/chat/send_message.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageToSend)
      });

      const result = await response.json();
      if (result.success) {
        setNewMessage('');
        fetchMessages();
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadFile(result.assets[0], 'image');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
    setShowAttachmentModal(false);
  };

  const handleDocumentPicker = async () => {
    try {
      // For now, show alert that document picker is not available
      Alert.alert('Coming Soon', 'Document picker feature will be available in the next update');
      setShowAttachmentModal(false);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadFile = async (file, type) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
        name: file.name || `file_${Date.now()}.${file.uri.split('.').pop()}`
      });
      formData.append('sender_id', senderId);
      formData.append('receiver_id', receiverId);
      formData.append('message_type', type);

      const response = await fetch(`${API_URL}/api/chat/upload_file.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${await AsyncStorage.getItem('sessionToken')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        // Send message with file
        const messageData = {
          sender_id: senderId,
          receiver_id: receiverId,
          message: result.file_name || 'File',
          message_type: type,
          file_url: result.file_url,
          file_name: result.file_name,
          file_size: result.file_size
        };
        
        await sendMessage(messageData);
      } else {
        Alert.alert('Error', result.message || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_id == senderId;
    const showAvatar = !isMyMessage && (index === 0 || messages[index - 1]?.sender_id != item.sender_id);

    return (
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
            source={receiverAvatar ? { uri: receiverAvatar } : require('../../assets/Avartar.png')} 
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
          
          {item.message_type === 'document' && item.file_url && (
            <TouchableOpacity style={styles.documentContainer}>
              <MaterialIcons name="insert-drive-file" size={24} color={Colors.primary} />
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{item.file_name}</Text>
                <Text style={styles.documentSize}>{formatFileSize(item.file_size || 0)}</Text>
              </View>
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
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        
        <Image 
          source={receiverAvatar ? { uri: receiverAvatar } : require('../../assets/Avartar.png')} 
          style={styles.headerAvatar} 
        />
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{receiverName}</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
        
        <TouchableOpacity style={styles.callButton}>
          <MaterialIcons name="call" size={24} color={Colors.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => `message-${item.id}`}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Upload Progress */}
      {isUploading && (
        <View style={styles.uploadProgress}>
          <Text style={styles.uploadText}>Uploading... {Math.round(uploadProgress)}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity 
            onPress={() => setShowAttachmentModal(true)}
            style={styles.attachButton}
          >
            <MaterialIcons name="attach-file" size={24} color={Colors.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            onPress={() => sendMessage()}
            style={[styles.sendButton, { opacity: newMessage.trim() ? 1 : 0.5 }]}
            disabled={!newMessage.trim() || loading}
          >
            <MaterialIcons name="send" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Modal */}
      <Modal
        visible={showAttachmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAttachmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.attachmentModal}>
            <Text style={styles.modalTitle}>Send Attachment</Text>
            
            <TouchableOpacity style={styles.attachmentOption} onPress={handleImagePicker}>
              <MaterialIcons name="photo" size={24} color={Colors.primary} />
              <Text style={styles.attachmentText}>Photo & Video</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.attachmentOption} onPress={handleDocumentPicker}>
              <MaterialIcons name="insert-drive-file" size={24} color={Colors.primary} />
              <Text style={styles.attachmentText}>Document</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setShowAttachmentModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
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
  headerStatus: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
  callButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
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
    alignSelf: 'flex-end',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myMessageBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    elevation: 1,
  },
  messageWithoutAvatar: {
    marginLeft: 40,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: Colors.textPrimary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    marginRight: 4,
  },
  myMessageTime: {
    color: Colors.white,
    opacity: 0.8,
  },
  otherMessageTime: {
    color: Colors.textSecondary,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  documentInfo: {
    marginLeft: 8,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  documentSize: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputContainer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
  },
  uploadProgress: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  uploadText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.lightGray,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  attachmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  attachmentText: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: 16,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.danger,
    fontWeight: '600',
  },
});
