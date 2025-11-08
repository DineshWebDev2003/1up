import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import authFetch from '../utils/api';
import { API_URL } from '../../config';
import Colors from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_BUILD_NUMBER = 1; // Update this with each release

export default function UpdateChecker({ checkOnMount = true }) {
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (checkOnMount) {
      checkForUpdates();
    }
  }, []);

  const checkForUpdates = async (forceShow = false) => {
    try {
      const response = await authFetch('/api/app_version/manage_version.php?latest=true');
      const result = await response.json();

      if (result.success && result.data) {
        const latestVersion = result.data;
        
        // Check if update is needed
        if (latestVersion.build_number > CURRENT_BUILD_NUMBER) {
          setUpdateAvailable(latestVersion);
          
          if (forceShow) {
            // Manual check - always show
            setShowModal(true);
            return;
          }
          
          // Auto check - show once per day
          const lastShown = await AsyncStorage.getItem('update_last_shown_date');
          const today = new Date().toDateString();
          
          if (lastShown !== today) {
            // Haven't shown today, show the modal
            setShowModal(true);
            await AsyncStorage.setItem('update_last_shown_date', today);
          }
        } else if (forceShow) {
          // Manual check and no update available
          Alert.alert('✅ Up to Date', 'You are using the latest version of the app!');
        }
      } else if (forceShow) {
        Alert.alert('✅ Up to Date', 'You are using the latest version of the app!');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      if (forceShow) {
        Alert.alert('Error', 'Failed to check for updates. Please try again.');
      }
    }
  };

  const downloadAndInstallAPK = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'Direct APK installation is only available on Android');
      return;
    }

    try {
      setDownloading(true);
      setDownloadProgress(0);

      const downloadUrl = `${API_URL}/${updateAvailable.download_url}`;
      const fileUri = FileSystem.documentDirectory + 'app-update.apk';

      // Simulate progress during download
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      // Download with new API
      const downloadResult = await FileSystem.downloadAsync(
        downloadUrl,
        fileUri
      );

      // Clear interval and set to 100%
      clearInterval(progressInterval);
      setDownloadProgress(100);
      
      // Small delay to show 100%
      await new Promise(resolve => setTimeout(resolve, 300));
      setDownloading(false);
      
      // Install APK
      if (Platform.OS === 'android' && downloadResult.uri) {
        const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/vnd.android.package-archive',
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloading(false);
      Alert.alert('Download Failed', 'Failed to download update. Please try again.');
    }
  };

  const dismissUpdate = async () => {
    // Allow dismissing even force updates - user can update when they want
    await AsyncStorage.setItem(`update_dismissed_${updateAvailable.build_number}`, 'true');
    setShowModal(false);
  };

  if (!updateAvailable || !showModal) {
    return null;
  }

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={dismissUpdate}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={dismissUpdate}
            disabled={downloading}
          >
            <Ionicons name="close" size={24} color="#999" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="download" size={60} color={Colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {updateAvailable.is_force_update === 1 ? '🚨 Update Required' : '✨ Update Available'}
          </Text>

          {/* Version Info */}
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>
              Version {updateAvailable.version} (Build {updateAvailable.build_number})
            </Text>
          </View>

          {/* Update Message */}
          {updateAvailable.update_message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageTitle}>What's New:</Text>
              <Text style={styles.messageText}>{updateAvailable.update_message}</Text>
            </View>
          )}

          {/* Download Progress */}
          {downloading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{downloadProgress}%</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={downloadAndInstallAPK}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Download & Install</Text>
                </>
              )}
            </TouchableOpacity>

            {!downloading && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={dismissUpdate}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Later</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Update Info */}
          {updateAvailable.is_force_update === 1 && (
            <Text style={styles.infoText}>
              💡 This is a recommended update for best experience
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  versionInfo: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  messageContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  secondaryButtonText: {
    color: '#666',
  },
  infoText: {
    marginTop: 16,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
