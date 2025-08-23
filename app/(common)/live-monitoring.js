import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Video } from 'expo-video';
import YoutubeIframe from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Notifications from 'expo-notifications';

export default function LiveMonitoringScreen() {
  const [isBranchActive, setIsBranchActive] = useState(true);
  const [branchName, setBranchName] = useState('Main Branch');
  const video = useRef(null);
  const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(videoUrl);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playing, setPlaying] = useState(true);

  const onStateChange = (state) => {
    console.log('Player State Changed:', state);
    if (state === 'ended') {
      setPlaying(false);
    }
  };

  const onError = (error) => {
    console.error('YouTube Player Error:', error);
  };

  const handleSaveUrl = () => {
    setVideoUrl(tempUrl);
    setIsEditing(false);
  };

  const handleFullscreen = async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    setIsFullscreen(true);
  };

  const handleExitFullscreen = async () => {
    await ScreenOrientation.unlockAsync();
    setIsFullscreen(false);
  };

  const getYoutubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;
    console.log('Provided URL:', url);
    console.log('Extracted Video ID:', videoId);
    return videoId;
  };

  const getTwitchChannel = (url) => {
    let match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
    if (match) {
      return match[1];
    }
    match = url.match(/[?&]channel=([^&]+)/);
    return match ? match[1] : null;
  };

  const renderVideoPlayer = (inFullscreen = false) => {
    const youtubeId = getYoutubeVideoId(videoUrl);
    if (youtubeId) {
      return (
        <YoutubeIframe
          key={youtubeId}
          height={inFullscreen ? '100%' : 220}
          width={'100%'}
          play={playing}
          videoId={youtubeId}
          onChangeState={onStateChange}
          onError={onError}
          webViewStyle={{opacity: 0.99}}
        />
      );
    }

    const twitchChannel = getTwitchChannel(videoUrl);
    if (twitchChannel) {
      const twitchUrl = `https://player.twitch.tv/?channel=${twitchChannel}&parent=localhost&autoplay=true`;
      return (
        <WebView
          style={{ flex: 1, width: '100%' }}
          source={{ uri: twitchUrl }}
          allowsFullscreenVideo
        />
      );
    }

    // Default to expo-av Video for direct links
    return (
      <Video
        ref={video}
        style={inFullscreen ? styles.fullscreenVideo : styles.video}
        source={{ uri: videoUrl }}
        contentFit="contain"
        loop
        playing
        controls
      />
    );
  };

  const sendPushNotification = async () => {
    // This is a placeholder. In a real app, you'd fetch tokens from your server.
    const message = {
      to: 'ExponentPushToken[...]', // This should be a valid token
      sound: 'default',
      title: 'Live Monitoring Alert',
      body: `${branchName} has an update!`,
      data: { someData: 'goes here' },
    };

    try {
        // The following line is commented out as it requires a valid push token
        // await Notifications.scheduleNotificationAsync({ content: message, trigger: null });
        Alert.alert('Notification Sent', `A notification has been sent to all users of ${branchName}.`);
    } catch (error) {
        console.error('Error sending push notification:', error);
        Alert.alert('Error', 'Could not send notification.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.title}>Live Monitoring</Text>
        <LottieView
          source={require('../../assets/camera.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />

        <Modal visible={isFullscreen} supportedOrientations={['landscape']}>
          <View style={styles.fullscreenContainer}>
            {renderVideoPlayer(true)}
            <TouchableOpacity onPress={handleExitFullscreen} style={styles.exitButton}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>

        {isBranchActive ? (
          <View style={styles.videoContainer}>
            <Text style={styles.branchName}>{branchName}</Text>
            <View style={styles.video}>
              {renderVideoPlayer()}
            </View>
            {isEditing && (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Paste new video URL"
                  value={tempUrl}
                  onChangeText={setTempUrl}
                />
                <TouchableOpacity onPress={handleSaveUrl} style={styles.saveButton}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.controlsContainer}>
              <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                <LinearGradient colors={['#6a11cb', '#2575fc']} style={styles.controlButton}>
                  <Ionicons name="camera-outline" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFullscreen}>
                <LinearGradient colors={['#fc466b', '#3f5efb']} style={styles.controlButton}>
                  <Ionicons name="expand-outline" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={sendPushNotification}>
                <LinearGradient colors={['#f5af19', '#f12711']} style={styles.controlButton}>
                  <Ionicons name="notifications-outline" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noBranchContainer}>
            <Text style={styles.noBranchText}>No active branch to monitor.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f2f5' },
  container: { flex: 1, padding: 20, alignItems: 'center' },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  lottieAnimation: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  videoContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    alignItems: 'center',
  },
  branchName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 15,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 15,
    backgroundColor: '#000',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  noBranchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noBranchText: {
    fontSize: 18,
    color: '#7f8c8d',
  },
  editContainer: {
    width: '100%',
    marginTop: 15,
  },
  input: {
    backgroundColor: '#f0f2f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  exitButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
});

