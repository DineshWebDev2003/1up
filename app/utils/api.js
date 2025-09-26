import AsyncStorage from '@react-native-async-storage/async-storage';
import { encode } from 'base-64';
import { getApiUrl } from '../../config'; // Import from central config

// Real API function for XAMPP backend
const realApi = async (url, options = {}) => {
  try {
    // Get dynamic API URL
    const API_URL = await getApiUrl();
    
    // Get session token from AsyncStorage
    const sessionToken = await AsyncStorage.getItem('sessionToken');
    
    // For login endpoint, don't require session token
    const isLoginEndpoint = url.includes('/api/auth/login.php');
    
    // If not login endpoint and no session token, throw authentication error
    if (!isLoginEndpoint && !sessionToken) {
      console.warn(`API call to ${url} attempted without session token`);
      throw new Error('Authentication required - please log in first');
    }
    
    // Prepare headers
    const headers = {
      ...options.headers,
    };
    
    // Only set Content-Type to application/json if not uploading FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Add authorization header if token exists
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    console.log(`API Call: ${API_URL}${url}`);
    console.log('Method:', options.method || 'GET');
    console.log('Headers:', headers);
    console.log('Session Token:', sessionToken ? 'Present' : 'Missing');
    console.log('Request Body Type:', options.body ? (options.body instanceof FormData ? 'FormData' : typeof options.body) : 'None');
    
    if (options.body instanceof FormData) {
      console.log('FormData detected - Content-Type header will be set automatically by browser');
    }
    
    // Make the actual API call
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers,
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      
      // If unauthorized, clear stored session data
      if (response.status === 401) {
        console.log('Unauthorized response - clearing session data');
        await AsyncStorage.multiRemove(['sessionToken', 'userData', 'userRole']);
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response;
    
  } catch (error) {
    console.error('Real API Error:', error);
    throw error;
  }
};


const authFetch = realApi;

export default authFetch;
