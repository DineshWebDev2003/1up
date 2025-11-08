import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Global error handler for unhandled promise rejections
export const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
  
  global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    console.error('🚨 Global Error Handler:', error);
    console.error('🚨 Is Fatal:', isFatal);
    
    // Log the error
    logCrashData(error, { isFatal, source: 'GlobalHandler' });
    
    // Call original handler if it exists
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  // Handle unhandled promise rejections
  if (typeof global.addEventListener === 'function') {
    global.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
      logCrashData(event.reason, { source: 'UnhandledPromiseRejection' });
      
      // Prevent the default behavior (which would crash the app)
      event.preventDefault();
    });
  }
};

// Safe async wrapper to prevent crashes
export const safeAsync = (asyncFunction, fallbackValue = null) => {
  return async (...args) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      console.error('🛡️ Safe Async Error:', error);
      logCrashData(error, { source: 'SafeAsync', function: asyncFunction.name });
      return fallbackValue;
    }
  };
};

// Safe state setter to prevent crashes from invalid state updates
export const safeSetState = (setStateFunction, newState) => {
  try {
    if (typeof setStateFunction === 'function') {
      setStateFunction(newState);
    }
  } catch (error) {
    console.error('🛡️ Safe SetState Error:', error);
    logCrashData(error, { source: 'SafeSetState' });
  }
};

// Safe navigation to prevent navigation crashes
export const safeNavigate = (router, route, params = {}) => {
  try {
    if (router && typeof router.push === 'function') {
      if (params && Object.keys(params).length > 0) {
        router.push({ pathname: route, params });
      } else {
        router.push(route);
      }
    }
  } catch (error) {
    console.error('🛡️ Safe Navigate Error:', error);
    logCrashData(error, { source: 'SafeNavigate', route, params });
    
    // Fallback navigation
    try {
      router.replace('/');
    } catch (fallbackError) {
      console.error('🛡️ Fallback Navigate Error:', fallbackError);
    }
  }
};

// Safe API call wrapper
export const safeApiCall = async (apiFunction, fallbackResponse = { success: false, message: 'API call failed' }) => {
  try {
    const response = await apiFunction();
    return response;
  } catch (error) {
    console.error('🛡️ Safe API Call Error:', error);
    logCrashData(error, { source: 'SafeApiCall' });
    
    // Show user-friendly error
    Alert.alert(
      'Connection Error',
      'Unable to connect to server. Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
    
    return fallbackResponse;
  }
};

// Log crash data for debugging
const logCrashData = async (error, context = {}) => {
  try {
    const crashData = {
      error: error?.toString() || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      context,
      timestamp: new Date().toISOString(),
      userAgent: global.navigator?.userAgent || 'Unknown',
    };
    
    // Store locally
    const existingCrashes = await AsyncStorage.getItem('crashLogs');
    const crashes = existingCrashes ? JSON.parse(existingCrashes) : [];
    crashes.push(crashData);
    
    // Keep only last 10 crashes to prevent storage bloat
    const recentCrashes = crashes.slice(-10);
    await AsyncStorage.setItem('crashLogs', JSON.stringify(recentCrashes));
    
    console.log('💾 Crash logged successfully');
  } catch (logError) {
    console.error('Failed to log crash data:', logError);
  }
};

// Get crash logs for debugging
export const getCrashLogs = async () => {
  try {
    const logs = await AsyncStorage.getItem('crashLogs');
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Failed to get crash logs:', error);
    return [];
  }
};

// Clear crash logs
export const clearCrashLogs = async () => {
  try {
    await AsyncStorage.removeItem('crashLogs');
    console.log('🧹 Crash logs cleared');
  } catch (error) {
    console.error('Failed to clear crash logs:', error);
  }
};

// Memory management helpers
export const cleanupMemory = () => {
  try {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear any cached data that might be causing memory issues
    console.log('🧹 Memory cleanup attempted');
  } catch (error) {
    console.error('Memory cleanup failed:', error);
  }
};

// Check app health
export const checkAppHealth = async () => {
  try {
    const healthData = {
      timestamp: new Date().toISOString(),
      memoryUsage: global.performance?.memory || 'Not available',
      crashLogs: await getCrashLogs(),
    };
    
    console.log('🏥 App Health Check:', healthData);
    return healthData;
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
};

export default {
  setupGlobalErrorHandlers,
  safeAsync,
  safeSetState,
  safeNavigate,
  safeApiCall,
  getCrashLogs,
  clearCrashLogs,
  cleanupMemory,
  checkAppHealth,
};
