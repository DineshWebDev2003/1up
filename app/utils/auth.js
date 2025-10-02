import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Default export to fix warning
const AuthUtils = {
  checkAuthentication,
  clearAuthAndRedirect,
  logout,
  isAuthenticated,
  handleAuthError,
  getUserData
};

export default AuthUtils;

/**
 * Check if user is authenticated and redirect to login if not
 * @returns {Promise<boolean>} - Returns true if authenticated, false otherwise
 */
export const checkAuthentication = async () => {
  try {
    const sessionToken = await AsyncStorage.getItem('sessionToken');
    if (!sessionToken) {
      console.warn('No session token found, redirecting to login');
      router.replace('/login');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking authentication:', error);
    router.replace('/login');
    return false;
  }
};

/**
 * Clear all authentication data and redirect to login
 */
export const clearAuthAndRedirect = async () => {
  try {
    await AsyncStorage.multiRemove(['sessionToken', 'userData', 'userRole', 'pendingPushToken']);
    router.replace('/login');
  } catch (error) {
    console.error('Error clearing auth data:', error);
    router.replace('/login');
  }
};

/**
 * Logout user - clear all auth data and redirect to login
 */
export const logout = async () => {
  try {
    console.log('Logging out user...');
    await AsyncStorage.multiRemove(['sessionToken', 'userData', 'userRole', 'pendingPushToken']);
    router.replace('/login');
  } catch (error) {
    console.error('Error during logout:', error);
    router.replace('/login');
  }
};

/**
 * Check if user is authenticated without redirecting
 * @returns {Promise<boolean>} - Returns true if authenticated, false otherwise
 */
export const isAuthenticated = async () => {
  try {
    const sessionToken = await AsyncStorage.getItem('sessionToken');
    const userData = await AsyncStorage.getItem('userData');
    const userRole = await AsyncStorage.getItem('userRole');
    
    return !!(sessionToken && userData && userRole);
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Handle authentication errors in API calls
 * @param {Error} error - The error object
 * @returns {boolean} - Returns true if error was handled, false otherwise
 */
export const handleAuthError = async (error) => {
  if (error.message && (
    error.message.includes('Authentication required') ||
    error.message.includes('HTTP 401') ||
    error.message.includes('Unauthorized')
  )) {
    console.log('Authentication error detected, clearing session and redirecting');
    await clearAuthAndRedirect();
    return true;
  }
  return false;
};

/**
 * Get user data from storage with fallback
 * @returns {Promise<Object>} - User data object
 */
export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      return JSON.parse(userData);
    }
    return { name: 'Loading...', role: 'Loading...', branch: 'Loading...' };
  } catch (error) {
    console.error('Error getting user data:', error);
    return { name: 'Error', role: 'Error', branch: 'Error' };
  }
};
