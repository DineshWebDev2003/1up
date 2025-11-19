import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from './api';

class SessionKeeper {
  constructor() {
    this.interval = null;
    this.isActive = false;
    this.refreshInterval = 10 * 60 * 1000; // 10 minutes
  }

  async start() {
    if (this.isActive) return;
    
    console.log('🔄 Starting session keeper...');
    this.isActive = true;
    
    // Initial check
    await this.refreshSession();
    
    // Set up periodic refresh
    this.interval = setInterval(async () => {
      await this.refreshSession();
    }, this.refreshInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isActive = false;
    console.log('⏹️ Session keeper stopped');
  }

  async refreshSession() {
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (!sessionToken) {
        console.log('⚠️ No session token found, stopping session keeper');
        this.stop();
        return;
      }

      console.log('🔄 Refreshing session...');
      const response = await authFetch('/api/auth/refresh_session.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Session refreshed successfully, expires:', result.expires_at);
        
        // Update user data if provided
        if (result.user) {
          const currentUserData = await AsyncStorage.getItem('userData');
          if (currentUserData) {
            const userData = JSON.parse(currentUserData);
            const updatedUserData = { ...userData, ...result.user };
            await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
          }
        }
      } else {
        console.log('❌ Session refresh failed:', result.message);
        
        // If refresh fails, the session is likely expired
        if (result.message && result.message.includes('Invalid or expired')) {
          console.log('🚪 Session expired, user needs to login again');
          this.stop();
          // Could emit an event here to trigger logout
        }
      }
    } catch (error) {
      console.log('⚠️ Session refresh error:', error.message);
      
      // Don't stop on network errors, keep trying
      if (error.message && !error.message.includes('Network')) {
        this.stop();
      }
    }
  }

  // Manual refresh method for when user performs actions
  async manualRefresh() {
    if (!this.isActive) return;
    await this.refreshSession();
  }
}

// Export singleton instance
export default new SessionKeeper();
