import React, { useState, useEffect, useRef, useCallback } from 'react';
import ViewShot from 'react-native-view-shot';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, TextInput, Modal, Alert, FlatList } from 'react-native';
import authFetch from '../utils/api';
import { Picker } from '@react-native-picker/picker';
import { Video } from 'expo-av';
import YoutubeIframe from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import * as ScreenOrientation from 'expo-screen-orientation';

const COLORS = {
  primary: '#5D9CEC',
  secondary: '#FFD700',
  accent: '#FF85A1',
  white: '#FFFFFF',
  black: '#000000',
  text: '#4F4F4F',
  lightText: '#A0A0A0',
  background: '#F5F5F5',
  card: '#FFFFFF',
  shadow: '#000000',
  lightBackground: '#EFEFEF',
  overlay: 'rgba(0, 0, 0, 0.5)',
};



export default function LiveMonitoringScreen() {
  const { branch_id: param_branch_id } = useLocalSearchParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [branches, setBranches] = useState([]);

  const video = useRef(null);
  const viewShotRefs = useRef(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenUrl, setFullscreenUrl] = useState(null);
  const [editingBranchId, setEditingBranchId] = useState(null);
  const [tempUrl, setTempUrl] = useState('');
  const [playing, setPlaying] = useState(true);

  const loadData = useCallback(async () => {
    try {
      // Check authentication using session token like id-card screen
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (!sessionToken) {
        console.warn('No session token found, user needs to log in');
        router.replace('/login');
        return;
      }

      // Load user data from AsyncStorage
      let currentUser = null;
      try {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          currentUser = JSON.parse(storedUserData);
          setUser(currentUser);
        }
      } catch (storageError) {
        console.error('Failed to load user data from storage:', storageError);
      }

      let targetBranchId;
      // If the user is a Franchisee, ALWAYS use their own branch_id for security.
      if (currentUser && currentUser.role === 'Franchisee') {
        targetBranchId = currentUser.branch_id;
      } else {
        // For other roles (like Admin), use the param if available.
        targetBranchId = param_branch_id;
      }

      const url = targetBranchId ? `/api/branches/get_branches.php?id=${targetBranchId}` : '/api/branches/get_branches.php';
      console.log('Fetching branch data from URL:', url);
      const response = await authFetch(url);
      const data = await response.json();

      if (data.success) {
        const branchesData = Array.isArray(data.data) ? data.data : [data.data];
        setBranches(branchesData);
      } else {
        setBranches([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch branch data.');
      console.error("Error loading data for live monitoring:", error);
    }
  }, [param_branch_id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onStateChange = (state) => {
    if (state === 'ended') setPlaying(false);
  };

  const onError = (error) => console.error('YouTube Player Error:', error);



  const handleSaveUrl = async (branchId) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    try {
      const response = await authFetch('/api/branches/update_branch.php', {
        method: 'POST',
        body: JSON.stringify({ 
          id: branch.id,
          name: branch.name,
          address: branch.address || '',
          location: branch.location || '',
          camera_url: tempUrl 
        }),
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Camera URL updated successfully.');
        loadData(); // Refresh data
      } else {
        Alert.alert('Error', result.message || 'Failed to update URL.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating the URL.');
    }
    setEditingBranchId(null);
    setTempUrl('');
  };

  const handleFullscreen = async (url) => {
    try {
      setFullscreenUrl(url);
      // Lock to landscape orientation for better video viewing
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
      console.log('✅ Entered fullscreen mode for:', url);
    } catch (error) {
      console.error('Error entering fullscreen:', error);
      Alert.alert('Error', 'Failed to enter fullscreen mode');
    }
  };

  const handleExitFullscreen = async () => {
    try {
      // Unlock orientation to allow normal rotation
      await ScreenOrientation.unlockAsync();
      setIsFullscreen(false);
      setFullscreenUrl(null);
      console.log('✅ Exited fullscreen mode');
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
      // Still close fullscreen even if orientation unlock fails
      setIsFullscreen(false);
      setFullscreenUrl(null);
    }
  };

  const getYoutubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const renderVideoPlayer = (url, inFullscreen = false) => {
    const youtubeId = getYoutubeVideoId(url);
    if (youtubeId) {
      return (
        <View style={inFullscreen ? styles.fullscreenVideoContainer : { flex: 1 }}>
          <YoutubeIframe
            key={youtubeId}
            height={inFullscreen ? '100%' : 300}
            width={inFullscreen ? '100%' : undefined}
            play={playing}
            videoId={youtubeId}
            onChangeState={onStateChange}
            onError={onError}
            webViewProps={{
              style: { 
                flex: 1, 
                borderRadius: inFullscreen ? 0 : 15,
                width: inFullscreen ? '100%' : undefined,
                height: inFullscreen ? '100%' : undefined
              },
              injectedJavaScript: `
                var style = document.createElement('style');
                style.innerHTML = \`
                  * { box-sizing: border-box; }
                  html, body { 
                    width: 100% !important; 
                    height: 100% !important; 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    overflow: hidden !important;
                    ${inFullscreen ? 'position: fixed !important; top: 0 !important; left: 0 !important;' : ''}
                  }
                  #player, iframe { 
                    width: 100% !important; 
                    height: 100% !important; 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    border: none !important;
                    border-radius: ${inFullscreen ? '0' : '15px'} !important;
                    ${inFullscreen ? 'position: fixed !important; top: 0 !important; left: 0 !important;' : ''}
                  }
                \`;
                document.head.appendChild(style);
                ${inFullscreen ? `
                  // Hide YouTube controls overlay for better fullscreen experience
                  setTimeout(() => {
                    var controls = document.querySelector('.ytp-chrome-bottom');
                    if (controls) controls.style.display = 'none';
                    // Ensure video fills entire viewport
                    document.body.style.transform = 'scale(1)';
                    document.body.style.transformOrigin = 'top left';
                  }, 1000);
                ` : ''}
              `,
            }}
          />
        </View>
      );
    }

    if (url && url.includes('twitch.tv')) {
      return (
        <View style={inFullscreen ? styles.fullscreenVideoContainer : { flex: 1 }}>
          <WebView
            source={{ uri: url }}
            style={inFullscreen ? styles.fullscreenVideo : { flex: 1, borderRadius: 15 }}
            allowsInlineMediaPlayback={true}
            originWhitelist={['*']}
            allowsFullscreenVideo={true}
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      );
    }

    if (url && (url.endsWith('.mp4') || url.endsWith('.m3u8'))) {
      return (
        <View style={inFullscreen ? styles.fullscreenVideoContainer : { flex: 1 }}>
          <Video
            ref={video}
            style={inFullscreen ? styles.fullscreenVideo : styles.video}
            source={{ uri: url }}
            useNativeControls
            resizeMode={inFullscreen ? "cover" : "contain"}
            isLooping
            shouldPlay
          />
        </View>
      );
    }

    return (
      <View style={styles.unsupportedVideoContainer}>
        <Ionicons name="videocam-off-outline" size={50} color={COLORS.lightText} />
        <Text style={styles.unsupportedVideoText}>Live feed format not supported.</Text>
      </View>
    );
  };

  const sendPushNotification = async (branchId, branchName) => {
    // Add authentication check before proceeding
    const sessionToken = await AsyncStorage.getItem('sessionToken');
    if (!sessionToken) {
      Alert.alert('Authentication Error', 'You must be logged in to send notifications.');
      return;
    }

    const viewShotRef = viewShotRefs.current.get(branchId);
    if (!viewShotRef) {
      Alert.alert('Error', 'Could not find video to capture.');
      return;
    }

    try {
      const uri = await viewShotRef.capture();

      const formData = new FormData();
      formData.append('thumbnail', {
        uri,
        name: `thumbnail_${branchId}.jpg`,
        type: 'image/jpeg',
      });

      const uploadResponse = await authFetch('/api/notifications/upload_thumbnail.php', {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || 'Failed to upload thumbnail.');
      }

      const thumbnailUrl = uploadResult.url;
      const message = `To users of ${branchName}: Your kid is now live! Want to see what they are doing in playschool, daycare, and toddler care?`;

      const notificationResponse = await authFetch('/api/notifications/send_notification.php', {
        method: 'POST',
        body: JSON.stringify({ 
          branch_id: branchId, 
          message, 
          thumbnail_url: thumbnailUrl 
        }),
      });

      if (!notificationResponse.ok) {
        const error = new Error(`HTTP error! status: ${notificationResponse.status}`);
        error.response = notificationResponse;
        throw error;
      }

      const notificationResult = await notificationResponse.json();

      if (notificationResult.success) {
        Alert.alert('Success', 'Notification sent successfully!');
      } else {
        // Handle cases where the request was successful but the operation failed
        Alert.alert('Error', notificationResult.message || 'Failed to send notification.');
      }
    } catch (error) {
      console.error('--- Notification Error Catcher ---');
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Object:', JSON.stringify(error, null, 2));

      if (error.response) {
        console.error('Error has a response object. Attempting to parse...');
        try {
          const errorData = await error.response.json();
          console.error('Server error details:', errorData);
          Alert.alert('Server Error', errorData.message || 'An unknown error occurred on the server.');
        } catch (jsonError) {
          console.error('Failed to parse JSON from response:', jsonError);
          const rawText = await error.response.text();
          console.error('Raw server response:', rawText);
          Alert.alert('Server Error', 'Failed to parse server response. Check console for details.');
        }
      } else {
        console.error('Error does not have a response object.');
        Alert.alert('Application Error', error.message || 'An unknown application error occurred.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#5D9CEC', '#5D9CEC']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Live Monitoring</Text>
          <Text style={styles.headerSubtitle}>Stay connected with our centers</Text>
        </View>
        <LottieView
          source={require('../../assets/camera.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />
      </LinearGradient>

      <FlatList
        data={branches}
        keyExtractor={(item) => item.id.toString()}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
        renderItem={({ item }) => {
          const isEditing = editingBranchId === item.id;
          return (
            <Animatable.View animation="fadeInUp" duration={800} style={styles.videoCard}>
              <LinearGradient colors={['#ffffff', '#f0f4ff']} style={styles.videoCardGradient}>
                <Text style={styles.branchName}>{item.name}</Text>
                <ViewShot ref={(ref) => viewShotRefs.current.set(item.id, ref)} options={{ format: 'jpg', quality: 0.9 }}>
                  <View style={styles.videoWrapper}>
                    {item.camera_url ? renderVideoPlayer(item.camera_url) : (
                      <View style={styles.unsupportedVideoContainer}>
                        <Ionicons name="videocam-off-outline" size={50} color={COLORS.lightText} />
                        <Text style={styles.unsupportedVideoText}>No camera URL provided.</Text>
                      </View>
                    )}
                  </View>
                </ViewShot>

                {isEditing && (
                  <Animatable.View animation="fadeIn" style={styles.editContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Paste new video URL"
                      placeholderTextColor={COLORS.lightText}
                      value={tempUrl}
                      onChangeText={setTempUrl}
                    />
                    <TouchableOpacity onPress={() => handleSaveUrl(item.id)}>
                      <LinearGradient colors={[COLORS.primary, '#87CEEB']} style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>Save URL</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animatable.View>
                )}

                <View style={styles.controlsContainer}>
                  <TouchableOpacity onPress={() => {
                    if (isEditing) {
                      setEditingBranchId(null);
                      setTempUrl('');
                    } else {
                      setEditingBranchId(item.id);
                      setTempUrl(item.camera_url || '');
                    }
                  }}>
                    <LinearGradient colors={[COLORS.secondary, '#FFEC8B']} style={styles.controlButton}>
                      <Ionicons name={isEditing ? "close-circle-outline" : "camera-outline"} size={24} color={COLORS.white} />
                    </LinearGradient>
                  </TouchableOpacity>

                  {item.camera_url && (
                    <TouchableOpacity onPress={() => handleFullscreen(item.camera_url)}>
                      <LinearGradient colors={[COLORS.accent, '#FFAAB8']} style={styles.controlButton}>
                        <Ionicons name="expand-outline" size={24} color={COLORS.white} />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                                                      <TouchableOpacity onPress={() => sendPushNotification(item.id, item.name)}>
                    <LinearGradient colors={['#90C695', '#A2D4A5']} style={styles.controlButton}>
                      <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animatable.View>
          );
        }}
        ListEmptyComponent={() => (
            <Animatable.View animation="fadeIn" style={styles.noFeedContainer}>
                <Ionicons name="alert-circle-outline" size={60} color={COLORS.lightText} />
                <Text style={styles.noFeedText}>No branches found.</Text>
            </Animatable.View>
        )}
      />

      <Modal 
        visible={isFullscreen} 
        supportedOrientations={['landscape']}
        animationType="fade"
        statusBarTranslucent={true}
        transparent={false}
        presentationStyle="fullScreen"
      >
        <StatusBar hidden={true} />
        <View style={styles.fullscreenContainer}>
          {fullscreenUrl && renderVideoPlayer(fullscreenUrl, true)}
          <TouchableOpacity onPress={handleExitFullscreen} style={styles.exitButton}>
            <Ionicons name="close" size={30} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 70, 
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.white },
  headerSubtitle: { fontSize: 16, color: COLORS.white, opacity: 0.9, marginTop: 4 },
  lottieAnimation: { width: 120, height: 120, position: 'absolute', right: 0, top: 30 },
  container: { flex: 1 },
  pickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    marginHorizontal: 20,
    marginTop: -40, 
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  picker: { flex: 1, height: 55, color: COLORS.text, borderWidth: 0 },
  pickerItem: { color: COLORS.text },
  pickerIcon: { position: 'absolute', right: 15 },
  videoCard: {
    marginHorizontal: 20,
    marginTop: 25,
    borderRadius: 20,
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    backgroundColor: COLORS.white,
  },
  videoCardGradient: { borderRadius: 20, padding: 15 },
  branchName: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 15, textAlign: 'center' },
  videoWrapper: { width: '100%', aspectRatio: 16 / 9, borderRadius: 15, overflow: 'hidden', backgroundColor: COLORS.black },
  video: { flex: 1 },
  controlsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  noFeedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  noFeedText: { fontSize: 18, color: COLORS.lightText, marginTop: 10 },
  editContainer: { width: '100%', marginTop: 20 },
  input: {
    backgroundColor: COLORS.lightBackground,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: { borderRadius: 10, padding: 15, alignItems: 'center' },
  saveButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  fullscreenContainer: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
    padding: 0
  },
  fullscreenVideoContainer: { 
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    margin: 0,
    padding: 0
  },
  fullscreenVideo: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    bottom: 0, 
    right: 0,
    width: '100%',
    height: '100%',
    margin: 0,
    padding: 0
  },
  exitButton: { 
    position: 'absolute', 
    top: 40, 
    right: 20, 
    padding: 15, 
    backgroundColor: COLORS.overlay, 
    borderRadius: 25,
    zIndex: 1000
  },
  unsupportedVideoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0E0E0', borderRadius: 15 },
  unsupportedVideoText: { marginTop: 10, color: COLORS.lightText, fontSize: 16 },
});
