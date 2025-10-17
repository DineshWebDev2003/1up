// Script to clear cached API URL from AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearApiCache = async () => {
  try {
    console.log('🧹 Clearing cached API URL...');
    
    // Clear the cached API URL
    await AsyncStorage.removeItem('customApiUrl');
    
    // Also clear any other cached data that might contain old URLs
    await AsyncStorage.removeItem('sessionToken');
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('userRole');
    
    console.log('✅ API cache cleared successfully!');
    console.log('🔄 App will now use the new IP address: 10.91.217.139');
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing API cache:', error);
    return false;
  }
};

export default clearApiCache;
