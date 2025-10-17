// Configuration for TN Happy Kids Playschool
// Update these URLs to match your server configuration

// Production server configuration (live server)
const PRODUCTION_API_URL = 'https://appv5.tnhappykids.in/lastchapter';

// Local development server configuration (e.g. XAMPP)
// 👉 Replace <YOUR_LOCAL_IP> with the actual IP of your computer running XAMPP
//    Example: 'http://192.168.1.10/lastchapter'
const LOCAL_API_URL = 'http://192.168.31.222/school/lastchapter';

// Decide which server URL to use based on build type
// • In development (__DEV__ === true) the app will use your local XAMPP API so that
//   the remote "main" server is muted.
// • In production build it will automatically switch back to the live server.
const getServerURL = () => {
  // React Native sets __DEV__ to true when running in development mode
  if (__DEV__) {
    console.log('[Config] Running in development mode – using LOCAL_API_URL:', LOCAL_API_URL);
    return LOCAL_API_URL;
  }
  console.log('[Config] Running in production mode – using PRODUCTION_API_URL:', PRODUCTION_API_URL);
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
// const DEVELOPMENT_API_URL = 'http://192.168.31.222/school/lastchapter'; // Current IP: 192.168.31.222
// const DEVELOPMENT_API_URL = LOCAL_API_URL; // Alternative shorthand
// const DEVELOPMENT_API_URL = 'http://10.31.82.139/lastchapter';
// 
// Production URL (currently active):
// https://appv5.tnhappykids.in/lastchapter

// Web pages configuration
export const WEB_CONFIG = {
  // Base API URL for web pages (PHP)
  API_BASE_URL: 'https://appv5.tnhappykids.in/lastchapter',
  
  // Alternative URLs for different environments
  DEVELOPMENT: 'http://192.168.31.222/school/lastchapter',
  PRODUCTION: 'https://appv5.tnhappykids.in/lastchapter',
  LIVE: 'https://appv5.tnhappykids.in/lastchapter',
  
  // Web pages base URL
  WEB_BASE_URL: 'https://appv5.tnhappykids.in/lastchapter/tn-happykids-playschool/web',
  
  // Login redirect URL
  LOGIN_URL: 'https://appv5.tnhappykids.in/lastchapter/tn-happykids-playschool/web/login.php'
};
