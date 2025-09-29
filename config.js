// Configuration for TN Happy Kids Playschool
// Update these URLs to match your server configuration

// Production server configuration
const PRODUCTION_API_URL = 'http://10.216.219.139/lastchapter';

// Get the current server URL from environment or use production default
const getServerURL = () => {
  // You can set this in your environment or update manually
  // For development, you can change this to your local server
  return PRODUCTION_API_URL;
};

const SERVER_URL = getServerURL();

// Default API URLs
const DEFAULT_API_URL = SERVER_URL;
const DEFAULT_BASE_URL = `${SERVER_URL}/tn-happykids-playschool/server`;

// Function to get API URL (checks for custom URL first)
let cachedApiUrl = null;

export const getApiUrl = async () => {
  if (cachedApiUrl) {
    console.log('🔄 Using cached API URL:', cachedApiUrl);
    return cachedApiUrl;
  }
  
  try {
    // Lazy load AsyncStorage to avoid import issues
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const customUrl = await AsyncStorage.getItem('customApiUrl');
    if (customUrl) {
      console.log('📱 Using custom API URL from AsyncStorage:', customUrl);
      cachedApiUrl = customUrl;
      return customUrl;
    }
  } catch (error) {
    console.log('❌ Error loading custom API URL:', error);
  }
  
  console.log('🌐 Using default API URL:', DEFAULT_API_URL);
  cachedApiUrl = DEFAULT_API_URL;
  return DEFAULT_API_URL;
};

// Clear cache when URL is updated
export const clearApiUrlCache = () => {
  cachedApiUrl = null;
};

// Force clear all cache and restart
export const forceClearCache = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.clear();
    cachedApiUrl = null;
    console.log('🔄 All cache cleared - app will restart with new IP');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
};

// Export default values for backward compatibility
export const API_URL = DEFAULT_API_URL;
export const BASE_URL = DEFAULT_BASE_URL;

// For development, you can uncomment and modify these:
// const DEVELOPMENT_API_URL = 'http://localhost/lastchapter';
// const DEVELOPMENT_API_URL = 'http://10.31.82.139/lastchapter';
// 
// Production URL (currently active):
// https://appv5.tnhappykids.in/lastchapter
