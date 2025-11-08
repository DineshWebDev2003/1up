import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';

// Complete the auth session for web browser
WebBrowser.maybeCompleteAuthSession();

class ExpoGoogleSignInService {
  constructor() {
    this.isConfigured = false;
    this.clientId = 'your-google-client-id.googleusercontent.com'; // Replace with your client ID
  }

  configure(clientId) {
    if (clientId) {
      this.clientId = clientId;
    }
    this.isConfigured = true;
    console.log('✅ Expo Google Sign-In configured successfully');
  }

  async signIn() {
    try {
      if (!this.isConfigured) {
        this.configure();
      }

      console.log('🔐 Starting Expo Google Sign-In...');

      // Create request
      const request = new AuthSession.AuthRequest({
        clientId: this.clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri: AuthSession.makeRedirectUri({
          scheme: 'com.yourapp.scheme', // Replace with your app scheme
          useProxy: true,
        }),
        additionalParameters: {},
        state: await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Math.random().toString(),
          { encoding: Crypto.CryptoEncoding.HEX }
        ),
      });

      // Prompt for authentication
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/oauth/authorize',
        useProxy: true,
        showInRecents: true,
      });

      if (result.type === 'success') {
        console.log('✅ Google auth successful, exchanging code for token...');
        
        // Exchange authorization code for access token
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: this.clientId,
            code: result.params.code,
            redirectUri: AuthSession.makeRedirectUri({
              scheme: 'com.yourapp.scheme',
              useProxy: true,
            }),
            extraParams: {
              code_verifier: request.codeVerifier,
            },
          },
          {
            tokenEndpoint: 'https://oauth2.googleapis.com/token',
          }
        );

        if (tokenResult.accessToken) {
          // Get user info from Google
          const userInfoResponse = await fetch(
            `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenResult.accessToken}`
          );
          const userInfo = await userInfoResponse.json();

          console.log('✅ Google user info retrieved:', userInfo);

          // Send to backend for authentication
          const backendResult = await this.authenticateWithBackend({
            user: {
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              photo: userInfo.picture,
            },
            idToken: tokenResult.idToken,
            accessToken: tokenResult.accessToken,
          });

          if (backendResult.success) {
            // Store user data and session
            await AsyncStorage.setItem('userData', JSON.stringify(backendResult.user));
            await AsyncStorage.setItem('sessionToken', backendResult.token);
            await AsyncStorage.setItem('userRole', backendResult.user.role);

            console.log('✅ User authenticated with backend');
            return {
              success: true,
              user: backendResult.user,
              token: backendResult.token,
            };
          } else {
            throw new Error(backendResult.message || 'Backend authentication failed');
          }
        } else {
          throw new Error('Failed to get access token');
        }
      } else if (result.type === 'cancel') {
        return { success: false, error: 'Sign-in cancelled by user' };
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('❌ Expo Google Sign-In error:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
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
          google_id: googleUserInfo.user.id,
          email: googleUserInfo.user.email,
          name: googleUserInfo.user.name,
          photo: googleUserInfo.user.photo,
          id_token: googleUserInfo.idToken,
          access_token: googleUserInfo.accessToken,
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

      console.log('✅ Expo Google Sign-Out successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Expo Google Sign-Out error:', error);
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

  // Alternative simpler approach using WebBrowser
  async signInWithWebBrowser() {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        useProxy: true,
      });

      const authUrl = `https://accounts.google.com/oauth/authorize?` +
        `client_id=${this.clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `state=${Math.random().toString(36)}`;

      console.log('🔐 Opening Google Sign-In in browser...');
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          console.log('✅ Authorization code received, processing...');
          // Here you would exchange the code for tokens
          // For simplicity, we'll simulate a successful login
          return {
            success: true,
            user: {
              id: 'demo_user',
              name: 'Demo User',
              email: 'demo@example.com',
              role: 'Student', // This should come from your backend
            },
            token: 'demo_token',
          };
        }
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('❌ WebBrowser Google Sign-In error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const expoGoogleSignInService = new ExpoGoogleSignInService();
export default expoGoogleSignInService;
