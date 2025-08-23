import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TextInput, TouchableOpacity, ImageBackground, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const messagesData = [
  { id: '1', type: 'text', text: 'Hello!', user: { id: '2', name: 'Jane Doe', avatar: require('../../assets/Avartar.png') }, timestamp: '10:00 AM' },
  { id: '2', type: 'text', text: 'Hi there! How are you?', user: { id: '1', name: 'John Doe', avatar: require('../../assets/Avartar.png') }, timestamp: '10:01 AM' },
  { id: '3', type: 'text', text: 'I am good, thanks! And you?', user: { id: '2', name: 'Jane Doe', avatar: require('../../assets/Avartar.png') }, timestamp: '10:02 AM' },
];

const ChatDetailScreen = () => {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState(messagesData);
  const [inputText, setInputText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('transparent');
  const [modalVisible, setModalVisible] = useState(false);
  const recordingRef = useRef(null);
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle, recording, paused
  const [liveWaveform, setLiveWaveform] = useState([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sound, setSound] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState(null);

  const formatTime = (millis) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    let interval;
    if (recordingStatus === 'recording') {
      interval = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [recordingStatus]);

  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const handleSend = () => {
    if (inputText.trim().length > 0) {
      const newMessage = {
        id: (messages.length + 1).toString(),
        text: inputText,
        type: 'text',
        user: { id: '1', name: 'John Doe', avatar: require('../../assets/Avartar.png') }, // Assuming current user is John Doe
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setInputText('');
    }
  };

  async function handleRecording() {
    if (recordingStatus === 'recording') {
      // Pause recording
      try {
        await recordingRef.current.pauseAsync();
        setRecordingStatus('paused');
      } catch (error) {
        console.error('Failed to pause recording', error);
      }
      return;
    }

    if (recordingStatus === 'paused') {
      // Resume recording
      try {
        await recordingRef.current.startAsync();
        setRecordingStatus('recording');
      } catch (error) {
        console.error('Failed to resume recording', error);
      }
      return;
    }

    // Start new recording
    try {
      if (permissionResponse.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      setLiveWaveform([]);
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.metering) {
            // Normalize the metering value for visualization
            const normalizedValue = Math.max(0, (status.metering + 160) / 160 * 50);
            setLiveWaveform(prev => [...prev.slice(-30), normalizedValue]);
          }
        },
        100 // onStatusUpdateInterval
      );
      recordingRef.current = recording;
      setRecordingStatus('recording');
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (recordingStatus === 'idle') return;
    console.log('Stopping recording..');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      console.log('Recording stopped and stored at', uri);
      const { durationMillis } = await recordingRef.current.getStatusAsync();
      const finalWaveform = [...liveWaveform];
      setLiveWaveform([]);
      const newMessage = {
        id: (messages.length + 1).toString(),
        type: 'audio',
        uri: uri,
        waveformData: finalWaveform,
        duration: durationMillis,
        user: { id: '1', name: 'John Doe', avatar: require('../../assets/Avartar.png') },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prevMessages => [...prevMessages, newMessage]);
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
    recordingRef.current = null;
    setRecordingStatus('idle');
    setRecordingTime(0);
  }

  async function playSound(uri) {
    if (sound && playbackStatus?.uri === uri && playbackStatus.isPlaying) {
      await sound.pauseAsync();
      return;
    }

    if (sound && playbackStatus?.uri === uri && !playbackStatus.isPlaying) {
      await sound.playAsync();
      return;
    }

    if (sound) {
      await sound.unloadAsync();
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => setPlaybackStatus({ uri, ...status })
      );
      setSound(newSound);
    } catch (error) {
      console.error('Failed to play sound', error);
    }
  }

  const handleDelete = (messageId) => {
    // In a real app, 'Delete for everyone' would make an API call.
    // For this simulation, both options behave the same.
    setMessages(messages.filter(msg => msg.id !== messageId));
    setDeleteModalVisible(false);
    setSelectedMessage(null);
  };

  const handleLongPress = (message) => {
    setSelectedMessage(message);
    setDeleteModalVisible(true);
  };

  const renderMessage = ({ item }) => (
    <TouchableOpacity onLongPress={() => handleLongPress(item)}>
      <View style={[styles.messageContainer, item.user.id === '1' ? styles.myMessage : styles.theirMessage]}>
        <Image source={item.user.avatar} style={styles.avatar} />
        {item.type === 'text' ? (
          <View style={styles.messageContent}>
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => playSound(item.uri)} style={[styles.messageContent, styles.audioMessage]}>
            <Ionicons name={playbackStatus?.uri === item.uri && playbackStatus.isPlaying ? 'pause' : 'play'} size={24} color="#007AFF" />
            <View style={styles.audioPlayerContainer}>
              <View style={styles.waveformContainer}>
                {(item.waveformData || []).map((level, index) => {
                  const progress = playbackStatus?.uri === item.uri ? (playbackStatus.positionMillis / playbackStatus.durationMillis) : 0;
                  const isPlayed = (index / item.waveformData.length) < progress;
                  return (
                    <View key={index} style={[styles.waveformBar, { height: level, backgroundColor: isPlayed ? '#007AFF' : '#E0E0E0' }]} />
                  )
                })}
              </View>
              <Text style={styles.durationText}>
                {playbackStatus?.uri === item.uri ? formatTime(playbackStatus.positionMillis) : '0:00'} / {formatTime(item.duration)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ImageBackground source={require('../../assets/logo.png')} style={[styles.backgroundImage, { backgroundColor }]} imageStyle={{ opacity: 0.1 }}>
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Image source={require('../../assets/Avartar.png')} style={styles.headerAvatar} />
            <View>
              <Text style={styles.headerName}>{name}</Text>
              <Text style={styles.headerStatus}>Online</Text>
            </View>
            <TouchableOpacity style={styles.menuButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
          />
          <View style={styles.inputContainer}>
            {recordingStatus === 'idle' ? (
              <>
                <TextInput
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type a message..."
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                  <Ionicons name="send" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.recordingContainer}>
                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <Ionicons name="stop" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.recordingTimeText}>{formatTime(recordingTime * 1000)}</Text>
              </View>
            )}
            <View style={styles.liveWaveformContainer}>
              {liveWaveform.map((level, index) => (
                <View key={index} style={[styles.liveWaveformBar, { height: level }]} />
              ))}
            </View>
            <TouchableOpacity style={styles.micButton} onPress={handleRecording}>
              {recordingStatus === 'paused' ? (
                <Ionicons name="play" size={24} color="#fff" />
              ) : recordingStatus === 'recording' ? (
                <Ionicons name="pause" size={24} color="#fff" />
              ) : (
                <Ionicons name="mic" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible);
          }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Choose Background Color</Text>
              <View style={styles.colorPalette}>
                {['#FFFFFF', '#E3F2FD', '#F3E5F5', '#FFFDE7', '#E8F5E9'].map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }]}
                    onPress={() => {
                      setBackgroundColor(color);
                      setModalVisible(false);
                    }}
                  />
                ))}
              </View>
            </View>
          </Pressable>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Pressable style={styles.modalButton} onPress={() => handleDelete(selectedMessage.id)}>
                <Text style={styles.modalButtonText}>Delete for me</Text>
              </Pressable>
              <Pressable style={styles.modalButton} onPress={() => handleDelete(selectedMessage.id)}>
                <Text style={styles.modalButtonText}>Delete for everyone</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        resizeMode: 'cover',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
    },
    colorPalette: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#007AFF',
        paddingTop: 40,
    },
    backButton: {
        marginRight: 10,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    headerName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerStatus: {
        color: '#d3d3d3',
        fontSize: 14,
    },
    menuButton: {
        marginLeft: 'auto',
    },
    messagesList: {
        padding: 10,
    },
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 5,
        maxWidth: '80%',
    },
    myMessage: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    theirMessage: {
        alignSelf: 'flex-start',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginHorizontal: 5,
    },
    messageContent: {
        padding: 10,
        borderRadius: 10,
        maxWidth: '80%',
        flexShrink: 1,
    },
    messageText: {
        fontSize: 16,
    },
    timestamp: {
        fontSize: 12,
        color: '#999',
        alignSelf: 'flex-end',
        marginTop: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        height: 40,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 15,
    },
    sendButton: {
        marginLeft: 10,
        backgroundColor: '#007AFF',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micButton: {
        marginLeft: 10,
        backgroundColor: '#007AFF',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioPlayerContainer: {
        flex: 1,
        marginLeft: 10,
    },
    durationText: {
        fontSize: 12,
        color: '#888',
        marginTop: 5,
        textAlign: 'right',
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 30,
        width: 120,
        marginLeft: 10,
    },
    waveformBar: {
        width: 4,
        backgroundColor: '#007AFF',
        marginHorizontal: 1.5,
        borderRadius: 3,
    },
    recordingContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    recordingTimeText: {
        fontSize: 16,
        color: '#333',
    },
    liveWaveformContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 30,
    },
    liveWaveformBar: {
        width: 3,
        backgroundColor: '#007AFF',
        marginHorizontal: 1.5,
        borderRadius: 2,
    },
    stopButton: {
        backgroundColor: 'red',
        borderRadius: 25,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    liveWaveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 24,
    },
    liveWaveformBar: {
        width: 2,
        backgroundColor: 'white',
        marginHorizontal: 1,
        borderRadius: 2,
    },
});

export default ChatDetailScreen;
