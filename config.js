// Configuration for TN Happy Kids Playschool
// Update these URLs to match your server configuration

// Get the current IP from environment or use default
const getServerIP = () => {
  // You can set this in your environment or update manually
  return '10.31.82.139';
};

const SERVER_IP = getServerIP();

// Default API URLs
const DEFAULT_API_URL = `http://${SERVER_IP}/lastchapter`;
const DEFAULT_BASE_URL = `http://${SERVER_IP}/lastchapter/tn-happykids-playschool/server`;

// Function to get API URL (checks for custom URL first)
let cachedApiUrl = null;

export const getApiUrl = async () => {
  if (cachedApiUrl) {
    return cachedApiUrl;
  }
  
  try {
    // Lazy load AsyncStorage to avoid import issues
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const customUrl = await AsyncStorage.getItem('customApiUrl');
    if (customUrl) {
      cachedApiUrl = customUrl;
      return customUrl;
    }
  } catch (error) {
    console.log('Error loading custom API URL:', error);
  }
  
  cachedApiUrl = DEFAULT_API_URL;
  return DEFAULT_API_URL;
};

// Clear cache when URL is updated
export const clearApiUrlCache = () => {
  cachedApiUrl = null;
};

// Export default values for backward compatibility
export const API_URL = DEFAULT_API_URL;
export const BASE_URL = DEFAULT_BASE_URL;

// For development, you can uncomment and modify these:
// export const API_URL = 'http://localhost/lastchapter';
// export const BASE_URL = 'http://localhost/lastchapter/tn-happykids-playschool/server';
