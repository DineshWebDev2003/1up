import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';
import { Alert, Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

class SimpleGoogleSignInService {
  constructor() {
    this.isConfigured = false;
  }

  configure() {
    this.isConfigured = true;
    console.log('✅ Simple Google Sign-In configured successfully');
  }

  async signIn() {
    try {
      if (!this.isConfigured) {
        this.configure();
      }

      console.log('🔐 Starting Real Google Sign-In...');

      // Use real Google OAuth flow
      return await this.signInWithGoogleOAuth();

    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  }

  // Real Google OAuth Sign-In
  async signInWithGoogleOAuth() {
    try {
      console.log('🔐 Starting Google OAuth flow...');
      
      // Check if we have a valid client ID
      const clientId = '656669591067-cb0lgrhfg0i2in42ifd3a1keicpia1g2.apps.googleusercontent.com';
      if (clientId.includes('your-client-id')) {
        console.log('⚠️ OAuth Client ID not configured, falling back to quick selection');
        return await this.signInWithWebFlow();
      }
      
      // Try OAuth first, but with better error handling
      console.log('🌐 Attempting OAuth with error handling...');
      
      try {
        // Use local server for development
        const localRedirectUri = 'http://10.123.210.139/server_app/lastchapter/auth/callback.php';
        
        // Build the OAuth URL manually
        const authUrl = `https://accounts.google.com/oauth/authorize?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(localRedirectUri)}&` +
          `response_type=code&` +
          `scope=openid%20profile%20email&` +
          `access_type=offline`;
        
        console.log('🔗 Auth URL:', authUrl);
        console.log('🔗 Redirect URI:', localRedirectUri);
        
        // Open in browser with timeout
        const result = await Promise.race([
          WebBrowser.openAuthSessionAsync(
            authUrl,
            localRedirectUri
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OAuth timeout')), 10000)
          )
        ]);
        
        console.log('📱 OAuth result:', result);
        
        if (result.type === 'success' && result.url) {
          // Try to extract user info from the result
          console.log('✅ OAuth successful, processing result...');
          // For now, fall back since we don't have full token exchange
          throw new Error('Token exchange not implemented yet');
        } else {
          throw new Error('OAuth failed or cancelled');
        }
      } catch (oauthError) {
        console.log('⚠️ OAuth failed:', oauthError.message);
        console.log('🔄 Falling back to development mode...');
        throw oauthError; // This will trigger the catch block below
      }

      console.log('📱 OAuth result:', result);

      if (result.type === 'success') {
        console.log('✅ Google OAuth successful, getting user info...');
        
        // Exchange authorization code for access token and get user info
        const userInfo = await this.getUserInfoFromGoogle(result.params.code);
        
        if (userInfo) {
          // Authenticate with backend
          const authResult = await this.authenticateWithBackend({
            google_id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            photo: userInfo.picture,
          });

          if (authResult.success) {
            console.log('✅ Backend authentication successful');
            return {
              success: true,
              user: authResult.user,
              token: authResult.token,
            };
          } else {
            return { success: false, error: authResult.message || 'Backend authentication failed' };
          }
        } else {
          return { success: false, error: 'Failed to get user information from Google' };
        }
      } else if (result.type === 'cancel') {
        return { success: false, error: 'Sign-in cancelled by user' };
      } else {
        console.log('❌ OAuth failed, result:', result);
        return { success: false, error: 'Google Sign-In failed: ' + (result.error || 'Unknown error') };
      }

    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      
      // Fallback to quick selection for development
      console.log('🔄 Falling back to quick selection...');
      return await this.signInWithWebFlow();
    }
  }

  // Get user info from Google using authorization code
  async getUserInfoFromGoogle(authCode) {
    try {
      console.log('📡 Getting user info from Google with code:', authCode);
      
      // For now, we'll extract user info from the URL if available
      // In a full implementation, you'd exchange the code for an access token
      // and then get user info from Google's People API
      
      // Since we're using WebBrowser, we might get the code in the URL
      // For development, let's simulate a successful response
      console.log('⚠️ Simulating user info extraction...');
      
      // Return null to trigger fallback for now
      // This will be improved when we implement proper token exchange
      return null;
      
    } catch (error) {
      console.error('❌ Error getting user info from Google:', error);
      return null;
    }
  }

  // Web-based Google Sign-In flow for existing users
  async signInWithWebFlow() {
    try {
      console.log('🔐 Starting web-based Google Sign-In...');
      
      // Use a simple Alert with predefined options for demo
      console.log('📱 Showing Alert dialog...');
      return new Promise((resolve) => {
        Alert.alert(
          'Google Sign-In (Development Mode)',
          'OAuth not configured yet. Choose a test user:',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                resolve({ success: false, error: 'Sign-in cancelled by user' });
              }
            },
            {
              text: 'Admin User',
              onPress: async () => {
                try {
                  const result = await this.authenticateExistingUser('admin@tnhappykids.in');
                  resolve(result.success ? {
                    success: true,
                    user: result.user,
                    token: result.token,
                  } : { success: false, error: result.message });
                } catch (error) {
                  resolve({ success: false, error: error.message });
                }
              }
            },
            {
              text: 'Franchisee User',
              onPress: async () => {
                try {
                  const result = await this.authenticateExistingUser('coimbatore@tnhappykids.in');
                  resolve(result.success ? {
                    success: true,
                    user: result.user,
                    token: result.token,
                  } : { success: false, error: result.message });
                } catch (error) {
                  resolve({ success: false, error: error.message });
                }
              }
            },
            {
              text: 'Student User',
              onPress: async () => {
                try {
                  const result = await this.authenticateExistingUser('dineshmahi02@gmail.com');
                  resolve(result.success ? {
                    success: true,
                    user: result.user,
                    token: result.token,
                  } : { success: false, error: result.message });
                } catch (error) {
                  resolve({ success: false, error: error.message });
                }
              }
            }
          ]
        );
      });

    } catch (error) {
      console.error('❌ Web-based Google Sign-In error:', error);
      return { success: false, error: error.message };
    }
  }

  // Authenticate existing user by email
  async authenticateExistingUser(email) {
    try {
      // Generate a Google-like user object for existing users
      const googleUser = {
        google_id: `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: email.toLowerCase().trim(),
        name: email.split('@')[0], // Use email prefix as default name
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&size=150&background=4285f4&color=fff`,
      };

      // Send to backend for authentication
      const result = await this.authenticateWithBackend(googleUser);
      
      if (result.success) {
        // Store user data and session
        await AsyncStorage.setItem('userData', JSON.stringify(result.user));
        await AsyncStorage.setItem('sessionToken', result.token);
        await AsyncStorage.setItem('userRole', result.user.role);
        
        return {
          success: true,
          user: result.user,
          token: result.token,
        };
      } else {
        return { success: false, message: result.message || 'User not found or authentication failed' };
      }
    } catch (error) {
      console.error('❌ Existing user authentication error:', error);
      return { success: false, message: error.message || 'Authentication failed' };
    }
  }

  async authenticateWithBackend(googleUserInfo) {
    try {
      const response = await authFetch('/api/auth/google_signin.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          google_id: googleUserInfo.google_id,
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          photo: googleUserInfo.photo,
          id_token: `google_token_${Date.now()}`,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Backend authentication error:', error);
      return { success: false, message: 'Failed to authenticate with backend' };
    }
  }

  async signOut() {
    try {
      // Clear local storage
      await AsyncStorage.multiRemove([
        'userData',
        'sessionToken',
        'userRole',
        'fcm_token',
      ]);

      console.log('✅ Simple Google Sign-Out successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Simple Google Sign-Out error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.log('No user currently signed in');
      return null;
    }
  }

  async isSignedIn() {
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      return !!sessionToken;
    } catch (error) {
      return false;
    }
  }

  // Web-based Google Sign-In (opens in browser)
  async signInWithBrowser() {
    try {
      console.log('🔐 Opening Google Sign-In in browser...');
      
      // This is a simplified web-based approach
      const googleAuthUrl = 'https://accounts.google.com/oauth/authorize?' +
        'client_id=your-client-id.googleusercontent.com&' +
        'redirect_uri=https://your-app.com/auth/callback&' +
        'response_type=code&' +
        'scope=openid%20profile%20email&' +
        'state=demo_state';

      const result = await WebBrowser.openBrowserAsync(googleAuthUrl);
      
      if (result.type === 'opened') {
        console.log('✅ Browser opened for Google Sign-In');
        // In a real implementation, you'd handle the callback URL
        return { success: false, error: 'Please complete sign-in in browser and return to app' };
      }

      return { success: false, error: 'Failed to open browser' };
    } catch (error) {
      console.error('❌ Browser Google Sign-In error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const simpleGoogleSignInService = new SimpleGoogleSignInService();
export default simpleGoogleSignInService;
