import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useColors } from '../hooks/useColors';
import Header from '../components/Header';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppUpdatesScreen() {
  const Colors = useColors();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [latestVersion, setLatestVersion] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateUrl, setUpdateUrl] = useState('');
  const [userData, setUserData] = useState(null);

  const getStyles = () => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    versionCard: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    versionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    versionIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    versionInfo: {
      flex: 1,
    },
    versionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 5,
    },
    versionNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: Colors.primary,
    },
    versionSubtitle: {
      fontSize: 14,
      color: Colors.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
      alignSelf: 'flex-start',
      marginTop: 10,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'white',
    },
    actionButton: {
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 15,
    },
    actionGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
    },
    actionText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 10,
    },
    updateSection: {
      marginTop: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 15,
    },
    updateItem: {
      backgroundColor: Colors.surface,
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    updateIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    updateText: {
      flex: 1,
    },
    updateTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: Colors.text,
    },
    updateDescription: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginTop: 2,
    },
    
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '90%',
      backgroundColor: Colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      elevation: 10,
    },
    modalHeader: {
      padding: 25,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: 'white',
      marginTop: 10,
    },
    modalContent: {
      padding: 25,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 12,
      padding: 15,
      fontSize: 16,
      backgroundColor: Colors.surfaceVariant,
      marginBottom: 15,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 15,
    },
    cancelButton: {
      flex: 1,
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: Colors.textSecondary,
      fontWeight: '600',
    },
    publishButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    publishButtonGradient: {
      padding: 15,
      alignItems: 'center',
    },
    publishButtonText: {
      color: 'white',
      fontWeight: 'bold',
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
  });

  const styles = getStyles();

  useEffect(() => {
    loadUserData();
    checkForUpdates();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserData(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/app/check_updates.php');
      const result = await response.json();
      
      if (result.success) {
        setLatestVersion(result.latest_version);
        setUpdateAvailable(result.update_available);
        setCurrentVersion(result.current_version);
      }
    } catch (error) {
      console.error('Error checking updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCheck = () => {
    checkForUpdates();
  };

  const handlePublishUpdate = async () => {
    if (!newVersion || !updateUrl) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await authFetch('/api/app/publish_update.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: newVersion,
          update_notes: updateNotes,
          download_url: updateUrl,
          published_by: userData?.id,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'App update published successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setUpdateModalVisible(false);
              setNewVersion('');
              setUpdateNotes('');
              setUpdateUrl('');
              checkForUpdates();
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to publish update');
      }
    } catch (error) {
      console.error('Error publishing update:', error);
      Alert.alert('Error', 'Failed to publish update');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallUpdate = () => {
    Alert.alert(
      'Install Update',
      'This will download and install the latest version. The app will restart automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Install',
          onPress: () => {
            // In a real app, this would trigger the download and installation
            Alert.alert('Update Started', 'The update is being downloaded and will install automatically.');
          },
        },
      ]
    );
  };

  const renderUpdateModal = () => (
    <Modal
      visible={updateModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setUpdateModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Animatable.View animation="slideInUp" style={styles.modalContainer}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            style={styles.modalHeader}
          >
            <MaterialCommunityIcons name="upload" size={32} color="white" />
            <Text style={styles.modalTitle}>Publish App Update</Text>
          </LinearGradient>
          
          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Version Number (e.g., 1.2.0)"
              value={newVersion}
              onChangeText={setNewVersion}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Download URL"
              value={updateUrl}
              onChangeText={setUpdateUrl}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Update Notes (optional)"
              value={updateNotes}
              onChangeText={setUpdateNotes}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setUpdateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.publishButton}
                onPress={handlePublishUpdate}
                disabled={loading}
              >
                <LinearGradient
                  colors={Colors.gradientSuccess}
                  style={styles.publishButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.publishButtonText}>Publish</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );

  if (loading && !updateModalVisible) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="App Updates" subtitle="System Update Management" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking for updates...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="App Updates" subtitle="System Update Management" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Version */}
        <Animatable.View animation="fadeInUp" duration={600} style={styles.versionCard}>
          <View style={styles.versionHeader}>
            <View style={styles.versionIcon}>
              <MaterialCommunityIcons name="cellphone" size={24} color="white" />
            </View>
            <View style={styles.versionInfo}>
              <Text style={styles.versionTitle}>Current Version</Text>
              <Text style={styles.versionNumber}>{currentVersion}</Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: updateAvailable ? Colors.warning : Colors.success }]}>
            <Text style={styles.statusText}>
              {updateAvailable ? 'Update Available' : 'Up to Date'}
            </Text>
          </View>
        </Animatable.View>

        {/* Latest Version */}
        {latestVersion && (
          <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.versionCard}>
            <View style={styles.versionHeader}>
              <View style={styles.versionIcon}>
                <MaterialCommunityIcons name="download" size={24} color="white" />
              </View>
              <View style={styles.versionInfo}>
                <Text style={styles.versionTitle}>Latest Version</Text>
                <Text style={styles.versionNumber}>{latestVersion}</Text>
                <Text style={styles.versionSubtitle}>Available for download</Text>
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Action Buttons */}
        <Animatable.View animation="fadeInUp" duration={600} delay={400}>
          <TouchableOpacity style={styles.actionButton} onPress={handleUpdateCheck}>
            <LinearGradient colors={Colors.gradientInfo} style={styles.actionGradient}>
              <MaterialCommunityIcons name="refresh" size={20} color="white" />
              <Text style={styles.actionText}>Check for Updates</Text>
            </LinearGradient>
          </TouchableOpacity>

          {updateAvailable && (
            <TouchableOpacity style={styles.actionButton} onPress={handleInstallUpdate}>
              <LinearGradient colors={Colors.gradientSuccess} style={styles.actionGradient}>
                <MaterialCommunityIcons name="download" size={20} color="white" />
                <Text style={styles.actionText}>Install Update</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {userData?.role === 'developer' && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => setUpdateModalVisible(true)}
            >
              <LinearGradient colors={Colors.gradientWarning} style={styles.actionGradient}>
                <MaterialCommunityIcons name="upload" size={20} color="white" />
                <Text style={styles.actionText}>Publish New Update</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animatable.View>

        {/* Update Features */}
        <View style={styles.updateSection}>
          <Text style={styles.sectionTitle}>Update Features</Text>
          
          <Animatable.View animation="fadeInUp" duration={600} delay={600}>
            <View style={styles.updateItem}>
              <View style={styles.updateIcon}>
                <MaterialCommunityIcons name="shield-check" size={20} color="white" />
              </View>
              <View style={styles.updateText}>
                <Text style={styles.updateTitle}>Automatic Updates</Text>
                <Text style={styles.updateDescription}>
                  Updates install automatically without Play Store
                </Text>
              </View>
            </View>

            <View style={styles.updateItem}>
              <View style={styles.updateIcon}>
                <MaterialCommunityIcons name="bell-off" size={20} color="white" />
              </View>
              <View style={styles.updateText}>
                <Text style={styles.updateTitle}>Silent Installation</Text>
                <Text style={styles.updateDescription}>
                  No popup alerts during update process
                </Text>
              </View>
            </View>

            <View style={styles.updateItem}>
              <View style={styles.updateIcon}>
                <MaterialCommunityIcons name="account-group" size={20} color="white" />
              </View>
              <View style={styles.updateText}>
                <Text style={styles.updateTitle}>All Users Updated</Text>
                <Text style={styles.updateDescription}>
                  Updates apply to all roles automatically
                </Text>
              </View>
            </View>
          </Animatable.View>
        </View>
      </ScrollView>

      {renderUpdateModal()}
    </SafeAreaView>
  );
}
