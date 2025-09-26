import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, SectionList, TextInput, TouchableOpacity, Modal, Pressable, KeyboardAvoidingView, Platform, Alert, ActionSheetIOS } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { API_URL } from '../../config'; // Import the base URL
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api'; // Assuming you have this utility
import { jwtDecode } from 'jwt-decode'; // Assuming you have jwt-decode
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';

const ChatDetailScreen = () => {
  const { name, userId, id: chatPartnerId, chatPartnerId: altChatPartnerId, avatar } = useLocalSearchParams(); // Get all possible parameter names
  const actualChatPartnerId = userId || chatPartnerId || altChatPartnerId;
  const decodedName = name ? decodeURIComponent(name) : 'Unknown User';
  const decodedAvatar = avatar ? decodeURIComponent(avatar) : '';
  const router = useRouter();
  const [sections, setSections] = useState([]);
  const [chatPartner, setChatPartner] = useState(null);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [partnerStatus, setPartnerStatus] = useState('Offline'); // Add state for partner status

  const recordingRef = useRef(null);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [liveWaveform, setLiveWaveform] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sound, setSound] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  
  // Story-related states
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyContent, setStoryContent] = useState('');
  const [storyMedia, setStoryMedia] = useState(null);
  const [storyMediaType, setStoryMediaType] = useState('image');
  const [uploadingStory, setUploadingStory] = useState(false);

  const formatTime = (millis) => {
    if (!millis) return '0:00';
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    const getUserId = async () => {
        try {
            const token = await AsyncStorage.getItem('sessionToken');
            if (token) {
                // Get current user info from API instead of JWT decode
                const response = await authFetch('/api/users/get_users.php?currentUser=true');
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    setCurrentUserId(result.data[0].id);
                    console.log('Current user ID set to:', result.data[0].id);
                } else {
                    console.error('Failed to get current user:', result.message);
                }
            }
        } catch (error) {
            console.error('Error getting user ID:', error);
        }
    };
    getUserId();
    requestPermission();
  }, []);

  useEffect(() => {
    let interval;
    if (recordingStatus === 'recording') {
      interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [recordingStatus]);

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  useEffect(() => {
    const fetchChatPartnerData = async () => {
      if (!actualChatPartnerId) return;
      try {
        const response = await authFetch(`/api/users/get_users.php?id=${actualChatPartnerId}`);
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          setChatPartner(result.data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch chat partner data:', error);
      }
    };
    fetchChatPartnerData();
  }, [actualChatPartnerId]);

  useEffect(() => {
    if (!actualChatPartnerId) return;

    const fetchPartnerStatus = async () => {
      try {
        const response = await authFetch(`/api/users/get_users.php?id=${actualChatPartnerId}`);
        const result = await response.json();
        if (response.ok && result.data) {
          const user = result.data;
          if (user.last_seen) {
            const lastSeen = new Date(user.last_seen.replace(' ', 'T'));
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            setPartnerStatus(lastSeen > fiveMinutesAgo ? 'Online' : 'Offline');
          } else {
            setPartnerStatus('Offline');
          }
        }
      } catch (error) {
        console.error('Failed to fetch partner status:', error);
        setPartnerStatus('Offline');
      }
    };

    fetchPartnerStatus();
    const interval = setInterval(fetchPartnerStatus, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [actualChatPartnerId]);

  const groupMessagesByDate = (messages) => {
    if (!messages || !Array.isArray(messages)) return [];
    
    const groups = messages.reduce((acc, message) => {
      try {
        // Handle different timestamp formats
        let messageDate;
        if (message.timestamp) {
          messageDate = new Date(message.timestamp.replace(' ', 'T'));
        } else if (message.created_at) {
          messageDate = new Date(message.created_at.replace(' ', 'T'));
        } else {
          messageDate = new Date();
        }
        
        // Check if date is valid
        if (isNaN(messageDate.getTime())) {
          messageDate = new Date();
        }
        
        const date = messageDate.toDateString();
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(message);
        return acc;
      } catch (error) {
        console.error('Error processing message date:', error);
        const fallbackDate = new Date().toDateString();
        if (!acc[fallbackDate]) {
          acc[fallbackDate] = [];
        }
        acc[fallbackDate].push(message);
        return acc;
      }
    }, {});

    const sections = Object.keys(groups).map(date => {
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let title = date;
      if (date === today) title = 'Today';
      else if (date === yesterday) title = 'Yesterday';
      else {
        const d = new Date(date);
        title = d.toLocaleDateString('en-GB', { month: 'long', day: 'numeric' });
      }
      return { title, data: groups[date] }; // Keep chronological order (oldest to newest)
    });

    return sections; // Keep sections in chronological order
  };

  const fetchMessages = async () => {
    if (!actualChatPartnerId || !currentUserId) return;
    try {
      const response = await authFetch(`/api/messages/get_messages.php?user_id1=${currentUserId}&user_id2=${actualChatPartnerId}`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const formattedMessages = result.data.map(msg => {
          if (msg.message_type === 'audio') {
            return {
              ...msg,
              type: 'audio',
              uri: `${API_URL}${msg.message}`,
              user: { id: msg.sender_id }
            };
          }
          return { ...msg, type: 'text', user: { id: msg.sender_id } };
        });
        const sortedMessages = formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setSections(groupMessagesByDate(sortedMessages));
      } else {
        setSections([]);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [actualChatPartnerId, currentUserId]);

  const handleSend = async () => {
    if (inputText.trim().length === 0) return;

    const messageText = inputText.trim();
    const tempId = `temp_${Date.now()}`;
    const newMessage = {
      id: tempId,
      sender_id: currentUserId,
      message: messageText,
      timestamp: new Date().toISOString(),
      status: 'sending',
      user: { id: currentUserId },
      type: 'text'
    };

    // Add the temporary message to the current sections properly
    setSections(prevSections => {
      if (!prevSections || prevSections.length === 0) {
        // If no sections exist, create a "Today" section
        return [{
          title: 'Today',
          data: [newMessage]
        }];
      }
      
      // Add to the last (most recent) section
      const updatedSections = [...prevSections];
      const lastSection = updatedSections[updatedSections.length - 1];
      
      // Check if the last section is for today
      const today = new Date().toDateString();
      const isToday = lastSection.title === 'Today' || 
                     new Date().toDateString() === new Date().toDateString();
      
      if (isToday || lastSection.title === 'Today') {
        // Add to existing today section
        lastSection.data = [...lastSection.data, newMessage];
      } else {
        // Create new today section
        updatedSections.push({
          title: 'Today',
          data: [newMessage]
        });
      }
      
      return updatedSections;
    });
    setInputText('');

    console.log('Sending message:', {
      receiver_id: parseInt(actualChatPartnerId),
      message: messageText,
      sender_id: currentUserId,
      actualChatPartnerId: actualChatPartnerId
    });

    try {
      const response = await authFetch('/api/messages/message_crud.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          receiver_id: parseInt(actualChatPartnerId), 
          message: messageText 
        }),
      });

      const result = await response.json();
      if (result && result.success) {
        // The message is successfully sent, polling will handle the update
        // We can remove the temporary message and let the fetch bring the real one
        setSections(prevSections => {
          if (!prevSections || prevSections.length === 0) return [];
          
          return prevSections.map(section => ({
            ...section,
            data: section.data.filter(msg => msg.id !== tempId)
          })).filter(section => section.data.length > 0);
        });
        fetchMessages(); // Trigger a fetch immediately to get the new message
      } else {
        throw new Error(result.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setSections(prevSections => {
        if (!prevSections || prevSections.length === 0) return [];
        
        return prevSections.map(section => ({
          ...section,
          data: section.data.map(msg => 
            msg.id === tempId ? { ...msg, status: 'failed' } : msg
          )
        }));
      });
    }
  };

  async function handleRecording() {
    if (recordingStatus === 'recording') {
      await recordingRef.current.pauseAsync();
      setRecordingStatus('paused');
    } else if (recordingStatus === 'paused') {
      await recordingRef.current.startAsync();
      setRecordingStatus('recording');
    } else {
      try {
        if (permissionResponse.status !== 'granted') await requestPermission();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
          (status) => {
            if (status.metering) {
              const normalizedValue = Math.max(0, (status.metering + 160) / 160 * 50);
              setLiveWaveform(prev => [...prev.slice(-30), normalizedValue]);
            }
          }, 100
        );
        recordingRef.current = recording;
        setRecordingStatus('recording');
      } catch (err) {
        console.error('Failed to start recording', err);
      }
    }
  }

  async function cancelRecording() {
    if (recordingStatus === 'idle') return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
    } catch (error) {
      console.error('Failed to cancel recording', error);
    }
    recordingRef.current = null;
    setRecordingStatus('idle');
    setRecordingTime(0);
    setLiveWaveform([]);
  }

  async function stopRecordingAndSend() {
    if (recordingStatus !== 'recording') return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      const formData = new FormData();
      formData.append('receiver_id', actualChatPartnerId);
      formData.append('audio', {
        uri: uri,
        name: `audio_${Date.now()}.m4a`,
        type: 'audio/m4a',
      });

      const response = await authFetch('/api/messages/upload_audio.php', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();
      if (result.success) {
        fetchMessages(); // Refresh messages to show the new audio message
      } else {
        throw new Error(result.message || 'Failed to send audio message');
      }
    } catch (error) {
      console.error('Failed to send audio message:', error);
      Alert.alert('Error', 'Could not send audio message.');
    } finally {
      recordingRef.current = null;
      setRecordingStatus('idle');
      setRecordingTime(0);
      setLiveWaveform([]);
    }
  }

  async function playSound(uri) {
    if (sound && playbackStatus?.uri === uri) {
      playbackStatus.isPlaying ? await sound.pauseAsync() : await sound.playAsync();
    } else {
      if (sound) await sound.unloadAsync();
      try {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (status) => setPlaybackStatus({ uri, ...status }));
        setSound(newSound);
      } catch (error) {
        console.error('Failed to play sound', error);
      }
    }
  }

  const handleDelete = async (messageId) => {
    try {
        const response = await authFetch('/api/messages/message_crud.php', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: messageId }),
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to delete message');
        }
        setSections(prevSections => {
          if (!prevSections || prevSections.length === 0) return [];
          
          return prevSections.map(section => ({
            ...section,
            data: section.data.filter(msg => msg.id !== messageId)
          })).filter(section => section.data.length > 0);
        });
    } catch (error) {
        console.error('Failed to delete message:', error);
    }
    setDeleteModalVisible(false);
    setSelectedMessage(null);
  };

  const handleLongPress = (message) => {
    setSelectedMessage(message);
    setDeleteModalVisible(true);
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_id === currentUserId; const isSending = item.status === 'sending';

    const MessageStatus = () => {
        if (!isMyMessage) return null;
        let iconName = 'checkmark';
        let iconColor = 'rgba(255, 255, 255, 0.7)';
        if (item.status === 'read') {
            iconName = 'checkmark-done';
            iconColor = '#4FC3F7'; // A light blue for 'read'
        } else if (item.status === 'delivered') {
            iconName = 'checkmark-done';
        } else if (item.status === 'sending') {
            iconName = 'time-outline';
        } else if (item.status === 'failed') {
            iconName = 'alert-circle-outline';
            iconColor = Colors.danger;
        }
        return <Ionicons name={iconName} size={16} color={iconColor} style={{ marginRight: 5 }} />;
    };

    const MessageContent = () => {
      if (item.type === 'audio') {
        const isPlaying = playbackStatus?.uri === item.uri && playbackStatus.isPlaying;
        const progress = playbackStatus?.uri === item.uri && playbackStatus.durationMillis > 0 ? playbackStatus.positionMillis / playbackStatus.durationMillis : 0;
        const strokeDashoffset = 157 - (157 * progress);
        return (
          <View style={styles.audioMessageContent}>
            <TouchableOpacity onPress={() => playSound(item.uri)} style={styles.playButtonContainer}>
              <Svg height="50" width="50" viewBox="0 0 50 50">
                <Circle cx="25" cy="25" r="24" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" fill="none" />
                <Circle cx="25" cy="25" r="24" stroke={Colors.lightText} strokeWidth="2.5" fill="none" strokeDasharray="157" strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform="rotate(-90 25 25)" />
              </Svg>
              <View style={styles.playIconWrapper}><Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={Colors.lightText} /></View>
            </TouchableOpacity>
            <Text style={styles.durationText}>
              {playbackStatus?.uri === item.uri ? formatTime(playbackStatus.positionMillis) : '0:00'} / {formatTime(item.duration)}
            </Text>
          </View>
        );
      }
      return (
        <>
          <Text style={[styles.messageText, { color: isMyMessage ? Colors.lightText : Colors.text }]}>{item.message || item.text}</Text>
          <View style={[styles.timestampContainer, isMyMessage ? styles.myTimestampContainer : {}]}>
            {isMyMessage && !isSending && <MessageStatus />}
            <Text style={[styles.timestamp, { color: isMyMessage ? 'rgba(255,255,255,0.7)' : Colors.textSecondary }]}>
              {isSending ? 'sending...' : new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </>
      );
    };

    return (
      <Animatable.View animation="fadeInUp" duration={500} delay={index * 50}>
        <TouchableOpacity onLongPress={() => handleLongPress(item)}>
          <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.theirMessage]}>
            <View style={[styles.messageContent, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
              <MessageContent />
            </View>
          </View>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient colors={[Colors.background, Colors.background]} style={styles.flex}>
        <Animatable.View animation="fadeInDown" duration={600}>
          <LinearGradient colors={[Colors.primary, Colors.info]} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={26} color={Colors.lightText} />
            </TouchableOpacity>
            <Image 
              source={
                (chatPartner?.avatar && chatPartner.avatar.trim() !== '') 
                  ? { uri: chatPartner.avatar.startsWith('http') ? chatPartner.avatar : `${API_URL}${chatPartner.avatar}` }
                  : (decodedAvatar && decodedAvatar.trim() !== '')
                    ? { uri: decodedAvatar.startsWith('http') ? decodedAvatar : `${API_URL}${decodedAvatar}` }
                    : require('../../assets/Avartar.png')
              } 
              style={styles.headerAvatar} 
            />
            <View>
              <Text style={styles.headerName}>{chatPartner?.name || chatPartner?.display_name || decodedName}</Text>
              <Text style={styles.headerStatus}>{partnerStatus}</Text>
            </View>
          </LinearGradient>
        </Animatable.View>
        <SectionList
          sections={sections || []}
          keyExtractor={(item, index) => (item?.id || index) + index}
          renderItem={renderMessage}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.dateSeparatorContainer}>
              <Text style={styles.dateSeparatorText}>{title}</Text>
            </View>
          )}
          style={styles.messagesList}
          contentContainerStyle={{ paddingBottom: 20 }}
          stickySectionHeadersEnabled={false}
          inverted={false}
          ref={(ref) => {
            if (ref && sections.length > 0) {
              setTimeout(() => {
                ref.scrollToLocation({
                  sectionIndex: sections.length - 1,
                  itemIndex: sections[sections.length - 1]?.data?.length - 1 || 0,
                  animated: true
                });
              }, 100);
            }
          }}
        />
        <View style={styles.inputContainer}>
          {recordingStatus === 'idle' ? (
            <View style={styles.textInputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
              <TouchableOpacity style={styles.iconButton} onPress={handleSend}>
                <LinearGradient colors={Colors.gradientSecondary} style={styles.iconButtonGradient}>
                  <Ionicons name="send" size={22} color={Colors.lightText} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.recordingContainer}>
              <TouchableOpacity style={styles.stopButton} onPress={cancelRecording}>
                <Ionicons name="trash" size={24} color={Colors.lightText} />
              </TouchableOpacity>
              <Text style={styles.recordingTimeText}>{formatTime(recordingTime * 1000)}</Text>
              <View style={styles.waveformContainer}>
                {(liveWaveform && Array.isArray(liveWaveform)) ? liveWaveform.map((val, i) => <View key={i} style={[styles.waveformBar, { height: val }]} />) : null}
              </View>
            </View>
          )}
          <Pressable
            style={styles.iconButton}
            onPressIn={handleRecording}
            onPressOut={stopRecordingAndSend}
          >
            <LinearGradient colors={Colors.gradientPrimary} style={styles.iconButtonGradient}>
              <MaterialCommunityIcons name={recordingStatus === 'idle' ? 'microphone' : recordingStatus === 'recording' ? 'pause' : 'play'} size={24} color={Colors.lightText} />
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
      <Modal animationType="slide" transparent={true} visible={deleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Message</Text>
            <Text style={styles.modalText}>Are you sure you want to delete this message?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={() => handleDelete(selectedMessage.id)}>
                <Text style={[styles.modalButtonText, { color: Colors.lightText }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 15, paddingHorizontal: 15, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  backButton: { marginRight: 15 },
  headerAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12, borderWidth: 2, borderColor: Colors.lightText },
  dateSeparatorContainer: { alignItems: 'center', marginVertical: 10 },
  dateSeparatorText: { color: Colors.textSecondary, backgroundColor: Colors.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  headerName: { color: Colors.lightText, fontSize: 18, fontWeight: 'bold' },
  headerStatus: { color: Colors.lightText, fontSize: 14, opacity: 0.8 },
  messagesList: { padding: 10 },
  messageContainer: { flexDirection: 'row', marginVertical: 8, maxWidth: '85%' },
  myMessage: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  theirMessage: { alignSelf: 'flex-start' },
  avatar: { width: 35, height: 35, borderRadius: 17.5, marginHorizontal: 5, alignSelf: 'flex-end' },
  messageContent: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, maxWidth: '100%', flexShrink: 1 },
  myMessageBubble: { borderBottomRightRadius: 5 },
  theirMessageBubble: { borderBottomLeftRadius: 5 },
  messageText: { fontSize: 16 },
  timestamp: { fontSize: 11, alignSelf: 'flex-end', marginTop: 5 },
  timestampContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  myTimestampContainer: { justifyContent: 'flex-end' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  textInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 30, paddingLeft: 15 },
  input: { flex: 1, height: 50, color: Colors.text, fontSize: 16 },
  iconButton: { marginLeft: 10 },
  iconButtonGradient: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  audioMessageContent: { flexDirection: 'row', alignItems: 'center' },
  playButtonContainer: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  playIconWrapper: { position: 'absolute' },
  durationText: { fontSize: 14, color: Colors.lightText, marginLeft: 10, fontWeight: '600' },
  recordingContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, backgroundColor: Colors.card, borderRadius: 30, height: 50 },
  recordingTimeText: { fontSize: 16, color: Colors.text, fontWeight: 'bold' },
  stopButton: { backgroundColor: Colors.danger, borderRadius: 25, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  waveformContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 30, overflow: 'hidden' },
  waveformBar: { width: 3, backgroundColor: Colors.primary, marginHorizontal: 1, borderRadius: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: Colors.card, borderRadius: 15, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 10 },
  modalText: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  cancelButton: { backgroundColor: Colors.border },
  deleteButton: { backgroundColor: Colors.danger },
  modalButtonText: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
});

export default ChatDetailScreen;
