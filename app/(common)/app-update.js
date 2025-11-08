import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import { API_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppUpdateScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Form states
  const [version, setVersion] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [isForceUpdate, setIsForceUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [apkUrl, setApkUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchVersions();
    }
  }, [isAuthenticated]);

  const verifyPassword = async () => {
    try {
      setPasswordError('');
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        setPasswordError('User data not found');
        return;
      }

      const user = JSON.parse(userData);
      
      // Verify password with backend
      const response = await authFetch('/api/auth/verify_password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          password: password
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setIsAuthenticated(true);
        setShowPasswordModal(false);
        setPassword('');
      } else {
        setPasswordError('Incorrect password');
      }
    } catch (error) {
      console.error('Password verification error:', error);
      setPasswordError('Failed to verify password');
    }
  };

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/app_version/manage_version.php');
      const result = await response.json();
      
      if (result.success) {
        setVersions(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  // File picker removed - using direct URL input instead

  const publishVersion = async () => {
    if (!version || !buildNumber || !apkUrl) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(50);

      // Create version entry in database
      const versionData = {
        version: version,
        build_number: parseInt(buildNumber),
        is_force_update: isForceUpdate ? 1 : 0,
        update_message: updateMessage || `New version ${version} available`,
        download_url: apkUrl
      };

      const versionResponse = await authFetch('/api/app_version/manage_version.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(versionData),
      });

      setUploadProgress(100);
      const versionResult = await versionResponse.json();

      if (versionResult.success) {
        // Show success popup
        showSuccessPopup();
        
        // Reset form
        setVersion('');
        setBuildNumber('');
        setIsForceUpdate(false);
        setUpdateMessage('');
        setApkUrl('');
        
        // Refresh versions list
        fetchVersions();
      } else {
        Alert.alert('Error', versionResult.message || 'Failed to create version entry');
      }
    } catch (error) {
      console.error('Publish error:', error);
      Alert.alert('Error', 'Failed to publish app version');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const showSuccessPopup = () => {
    // Custom success popup
    Alert.alert(
      '✅ Success',
      'App version uploaded successfully!\n\nUsers will be notified about the new update.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const downloadAPK = (downloadUrl) => {
    const fullUrl = `${API_URL}/${downloadUrl}`;
    Linking.openURL(fullUrl).catch(err => {
      console.error('Failed to open URL:', err);
      Alert.alert('Error', 'Failed to download APK');
    });
  };

  if (!isAuthenticated) {
    return (
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModal}>
            <Ionicons name="lock-closed" size={50} color={Colors.primary} />
            <Text style={styles.passwordTitle}>Enter Password</Text>
            <Text style={styles.passwordSubtitle}>
              This is a sensitive area. Please verify your password to continue.
            </Text>
            
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
            
            <View style={styles.passwordButtons}>
              <TouchableOpacity
                style={[styles.passwordButton, styles.cancelButton]}
                onPress={() => router.back()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.passwordButton, styles.verifyButton]}
                onPress={verifyPassword}
              >
                <Text style={styles.verifyButtonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Update Manager</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Upload New Version Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📤 Upload New Version</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Version Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1.0.1"
              value={version}
              onChangeText={setVersion}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Build Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2"
              value={buildNumber}
              onChangeText={setBuildNumber}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Update Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's new in this version?"
              value={updateMessage}
              onChangeText={setUpdateMessage}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsForceUpdate(!isForceUpdate)}
          >
            <Ionicons
              name={isForceUpdate ? 'checkbox' : 'square-outline'}
              size={24}
              color={Colors.primary}
            />
            <Text style={styles.checkboxLabel}>Force Update (Required)</Text>
          </TouchableOpacity>

          <View style={styles.formGroup}>
            <Text style={styles.label}>APK Download URL *</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/app-v1.0.0.apk"
              value={apkUrl}
              onChangeText={setApkUrl}
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>Upload APK to your server and paste the URL here</Text>
          </View>

          {isUploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
            onPress={publishVersion}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={24} color={Colors.white} />
                <Text style={styles.uploadButtonText}>Publish Version</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Versions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Published Versions</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : versions.length === 0 ? (
            <Text style={styles.emptyText}>No versions published yet</Text>
          ) : (
            versions.map((item) => (
              <View key={item.id} style={styles.versionCard}>
                <View style={styles.versionHeader}>
                  <View>
                    <Text style={styles.versionNumber}>Version {item.version}</Text>
                    <Text style={styles.buildNumber}>Build {item.build_number}</Text>
                  </View>
                  {item.is_force_update === 1 && (
                    <View style={styles.forceBadge}>
                      <Text style={styles.forceBadgeText}>FORCE</Text>
                    </View>
                  )}
                </View>

                {item.update_message && (
                  <Text style={styles.updateMessage}>{item.update_message}</Text>
                )}

                <View style={styles.versionFooter}>
                  <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => downloadAPK(item.download_url)}
                  >
                    <Ionicons name="download" size={18} color={Colors.white} />
                    <Text style={styles.downloadButtonText}>Download</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for tab bar
  },
  section: {
    backgroundColor: Colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
    color: Colors.text,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  versionCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  versionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  buildNumber: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  forceBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  forceBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  updateMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  versionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordModal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  passwordTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  passwordSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  passwordInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
  },
  passwordButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  passwordButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
