import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { API_URL } from '../../config';

class UpdateService {
  constructor() {
    this.currentVersion = '1.0.0'; // Current app version
    this.updateCheckInterval = null;
    this.autoUpdateEnabled = true;
  }

  // Check for updates from server
  async checkForUpdates() {
    try {
      console.log('🔍 Checking for updates...');
      
      // Make API call to check for new version
      const response = await fetch(`${API_URL}/api/app/check_update.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const { latest_version, download_url, release_notes, force_update } = data;
        
        // Compare versions
        if (this.isNewerVersion(latest_version, this.currentVersion)) {
          console.log(`📱 New version available: ${latest_version}`);
          
          return {
            hasUpdate: true,
            version: latest_version,
            downloadUrl: download_url,
            releaseNotes: release_notes,
            forceUpdate: force_update || false,
            currentVersion: this.currentVersion
          };
        } else {
          console.log('✅ App is up to date');
          return {
            hasUpdate: false,
            currentVersion: this.currentVersion
          };
        }
      } else {
        throw new Error(data.message || 'Failed to check for updates');
      }
    } catch (error) {
      console.error('❌ Update check failed:', error);
      
      // Return mock data for development/testing
      if (__DEV__) {
        return {
          hasUpdate: true,
          version: '1.1.0',
          downloadUrl: 'https://example.com/app-update.apk',
          releaseNotes: 'Bug fixes and performance improvements\n• Fixed attendance issues\n• Improved UI design\n• Enhanced security',
          forceUpdate: false,
          currentVersion: this.currentVersion
        };
      }
      
      return {
        hasUpdate: false,
        error: error.message,
        currentVersion: this.currentVersion
      };
    }
  }

  // Compare version strings (e.g., "1.1.0" vs "1.0.0")
  isNewerVersion(newVersion, currentVersion) {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }
    
    return false;
  }

  // Show update dialog
  async showUpdateDialog(updateInfo) {
    const { version, releaseNotes, forceUpdate } = updateInfo;
    
    return new Promise((resolve) => {
      Alert.alert(
        '🚀 New Version Available!',
        `Version ${version} is now available.\n\n📝 What's New:\n${releaseNotes}`,
        [
          ...(forceUpdate ? [] : [{
            text: 'Later',
            style: 'cancel',
            onPress: () => resolve(false)
          }]),
          {
            text: 'Install Now',
            style: 'default',
            onPress: () => resolve(true)
          }
        ],
        { cancelable: !forceUpdate }
      );
    });
  }

  // Install update
  async installUpdate(downloadUrl) {
    try {
      console.log('📥 Starting update installation...');
      
      // Show installation progress
      Alert.alert(
        '📥 Installing Update',
        'The update is being downloaded and installed. Please wait...',
        [],
        { cancelable: false }
      );

      // For web/development, redirect to download URL
      if (downloadUrl) {
        await Linking.openURL(downloadUrl);
        
        // Show completion message
        setTimeout(() => {
          Alert.alert(
            '✅ Update Ready',
            'The update has been downloaded. Please install the new version manually.',
            [{ text: 'OK' }]
          );
        }, 2000);
      } else {
        throw new Error('No download URL provided');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Update installation failed:', error);
      
      Alert.alert(
        '❌ Update Failed',
        `Failed to install update: ${error.message}`,
        [{ text: 'OK' }]
      );
      
      return false;
    }
  }

  // Enable/disable auto-updates
  async setAutoUpdateEnabled(enabled) {
    this.autoUpdateEnabled = enabled;
    await AsyncStorage.setItem('autoUpdateEnabled', JSON.stringify(enabled));
    
    if (enabled) {
      this.startAutoUpdateCheck();
    } else {
      this.stopAutoUpdateCheck();
    }
  }

  // Get auto-update setting
  async getAutoUpdateEnabled() {
    try {
      const stored = await AsyncStorage.getItem('autoUpdateEnabled');
      return stored ? JSON.parse(stored) : true;
    } catch (error) {
      return true;
    }
  }

  // Start automatic update checking
  async startAutoUpdateCheck() {
    this.autoUpdateEnabled = await this.getAutoUpdateEnabled();
    
    if (!this.autoUpdateEnabled) return;
    
    // Check immediately
    this.performAutoUpdateCheck();
    
    // Set up periodic checking (every 6 hours)
    this.updateCheckInterval = setInterval(() => {
      this.performAutoUpdateCheck();
    }, 6 * 60 * 60 * 1000); // 6 hours
    
    console.log('🔄 Auto-update checking started');
  }

  // Stop automatic update checking
  stopAutoUpdateCheck() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log('⏹️ Auto-update checking stopped');
    }
  }

  // Perform automatic update check
  async performAutoUpdateCheck() {
    try {
      const updateInfo = await this.checkForUpdates();
      
      if (updateInfo.hasUpdate) {
        const shouldInstall = await this.showUpdateDialog(updateInfo);
        
        if (shouldInstall) {
          await this.installUpdate(updateInfo.downloadUrl);
        }
      }
    } catch (error) {
      console.error('Auto-update check failed:', error);
    }
  }

  // Manual update check (triggered by user)
  async manualUpdateCheck() {
    try {
      // Show loading state
      Alert.alert(
        '🔍 Checking for Updates',
        'Please wait while we check for the latest version...',
        [],
        { cancelable: false }
      );

      const updateInfo = await this.checkForUpdates();
      
      // Dismiss loading alert
      setTimeout(() => {
        if (updateInfo.hasUpdate) {
          this.showUpdateDialog(updateInfo).then(shouldInstall => {
            if (shouldInstall) {
              this.installUpdate(updateInfo.downloadUrl);
            }
          });
        } else {
          Alert.alert(
            '✅ Up to Date',
            `You're running the latest version (${this.currentVersion})`,
            [{ text: 'OK' }]
          );
        }
      }, 1000);
      
      return updateInfo;
    } catch (error) {
      setTimeout(() => {
        Alert.alert(
          '❌ Check Failed',
          `Unable to check for updates: ${error.message}`,
          [{ text: 'OK' }]
        );
      }, 1000);
      
      throw error;
    }
  }

  // Get current version
  getCurrentVersion() {
    return this.currentVersion;
  }

  // Set current version (for testing)
  setCurrentVersion(version) {
    this.currentVersion = version;
  }
}

// Create singleton instance
const updateService = new UpdateService();

export default updateService;
