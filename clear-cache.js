// Clear API cache and restart app
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearAllCache = async () => {
  try {
    console.log('🧹 Clearing all cached data...');
    
    // Clear API cache
    await AsyncStorage.removeItem('customApiUrl');
    await AsyncStorage.removeItem('cachedApiUrl');
    
    // Clear user session data
    await AsyncStorage.removeItem('sessionToken');
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('userRole');
    
    // Clear any other cached data
    await AsyncStorage.removeItem('attendanceData');
    await AsyncStorage.removeItem('branchData');
    
    console.log('✅ All cache cleared successfully!');
    console.log('🔄 App will now use the new IP address: 10.91.217.139');
    
    // Force app restart by clearing all AsyncStorage
    await AsyncStorage.clear();
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    return false;
  }
};

export default clearAllCache;
