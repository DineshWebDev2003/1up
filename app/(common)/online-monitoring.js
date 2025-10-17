import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  StatusBar
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// import * as ScreenOrientation from 'expo-screen-orientation';
import { ImmersiveView } from '../components/FullScreenView';
import Colors from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';

const { width, height } = Dimensions.get('window');

export default function OnlineMonitoring() {
  const router = useRouter();
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(CameraType.back);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [monitoringSession, setMonitoringSession] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Load current user
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    })();
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleFullScreen = async () => {
    try {
      // Simple full screen toggle without orientation lock
      setIsFullScreen(!isFullScreen);
      Alert.alert(
        isFullScreen ? 'Exited Full Screen' : 'Entered Full Screen',
        isFullScreen ? 'You can now see the header controls' : 'Rotate your device for better experience'
      );
    } catch (error) {
      console.warn('Error toggling full screen:', error);
    }
  };

  const startMonitoring = async () => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // Start monitoring session
      const response = await authFetch('/api/monitoring/start_session.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          session_type: 'online_monitoring',
          device_info: Platform.OS
        })
      });

      const result = await response.json();
      if (result.success) {
        setMonitoringSession(result.session_id);
        setIsRecording(true);
        setSessionDuration(0);
        
        // Start camera recording
        if (cameraRef.current) {
          const video = await cameraRef.current.recordAsync({
            quality: Camera.Constants.VideoQuality['720p'],
            maxDuration: 3600, // 1 hour max
            mute: false
          });
          
          // Upload video in chunks or at the end
          console.log('Video recorded:', video.uri);
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to start monitoring');
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      Alert.alert('Error', 'Failed to start monitoring session');
    }
  };

  const stopMonitoring = async () => {
    try {
      if (cameraRef.current && isRecording) {
        cameraRef.current.stopRecording();
      }

      if (monitoringSession) {
        // End monitoring session
        const response = await authFetch('/api/monitoring/end_session.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: monitoringSession,
            duration: sessionDuration,
            end_reason: 'user_stopped'
          })
        });

        const result = await response.json();
        if (result.success) {
          Alert.alert('Success', 'Monitoring session ended successfully');
        }
      }

      setIsRecording(false);
      setMonitoringSession(null);
      setSessionDuration(0);
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      Alert.alert('Error', 'Failed to stop monitoring session');
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCamera = () => {
    setType(current => 
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="camera-off" size={64} color={Colors.textSecondary} />
        <Text style={styles.message}>No access to camera</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={() => Camera.requestCameraPermissionsAsync()}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const CameraContent = () => (
    <View style={isFullScreen ? styles.fullScreenContainer : styles.normalContainer}>
      <Camera 
        style={styles.camera} 
        type={type} 
        ref={cameraRef}
        ratio="16:9"
      >
        {/* Header Controls */}
        {!isFullScreen && (
          <LinearGradient 
            colors={['rgba(0,0,0,0.8)', 'transparent']} 
            style={styles.headerOverlay}
          >
            <TouchableOpacity onPress={() => { try { if (router && typeof router.back === 'function') { router.back(); } } catch (e) {} }} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Online Monitoring</Text>
              {currentUser && (
                <Text style={styles.headerSubtitle}>{currentUser.name}</Text>
              )}
            </View>
            
            <TouchableOpacity onPress={toggleFullScreen} style={styles.fullScreenButton}>
              <MaterialCommunityIcons name="fullscreen" size={24} color={Colors.white} />
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>REC {formatDuration(sessionDuration)}</Text>
          </View>
        )}

        {/* Full Screen Controls */}
        {isFullScreen && (
          <View style={styles.fullScreenControls}>
            <TouchableOpacity onPress={toggleFullScreen} style={styles.exitFullScreenButton}>
              <MaterialCommunityIcons name="fullscreen-exit" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Controls */}
        <LinearGradient 
          colors={['transparent', 'rgba(0,0,0,0.8)']} 
          style={styles.bottomOverlay}
        >
          <View style={styles.controlsContainer}>
            <TouchableOpacity onPress={toggleCamera} style={styles.controlButton}>
              <MaterialCommunityIcons name="camera-flip" size={24} color={Colors.white} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={isRecording ? stopMonitoring : startMonitoring}
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            >
              <MaterialCommunityIcons 
                name={isRecording ? "stop" : "record-circle"} 
                size={32} 
                color={Colors.white} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => {
                Alert.alert(
                  'Monitoring Info',
                  `Session: ${monitoringSession || 'Not started'}\nDuration: ${formatDuration(sessionDuration)}\nCamera: ${type === CameraType.back ? 'Back' : 'Front'}`
                );
              }}
              style={styles.controlButton}
            >
              <MaterialCommunityIcons name="information" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
          
          {isRecording && (
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionText}>
                Session ID: {monitoringSession}
              </Text>
              <Text style={styles.durationText}>
                Duration: {formatDuration(sessionDuration)}
              </Text>
            </View>
          )}
        </LinearGradient>
      </Camera>
    </View>
  );

  return isFullScreen ? (
    <ImmersiveView backgroundColor="#000000">
      <CameraContent />
    </ImmersiveView>
  ) : (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <CameraContent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  normalContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullScreenContainer: {
    flex: 1,
    width: width,
    height: height,
  },
  camera: {
    flex: 1,
  },
  message: {
    fontSize: 18,
    color: Colors.white,
    textAlign: 'center',
    marginVertical: 20,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 20,
    zIndex: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
  fullScreenButton: {
    padding: 8,
  },
  recordingIndicator: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 80 : 120,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 1,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    marginRight: 8,
  },
  recordingText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  fullScreenControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  exitFullScreenButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'android' ? 20 : 40,
    paddingTop: 40,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    padding: 12,
  },
  recordButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 35,
    padding: 16,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  recordButtonActive: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  sessionInfo: {
    alignItems: 'center',
  },
  sessionText: {
    color: Colors.white,
    fontSize: 12,
    opacity: 0.8,
  },
  durationText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
});
