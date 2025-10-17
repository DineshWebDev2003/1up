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
    console.log('🚀 Making fetch request to:', `${API_URL}${url}`);
    
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers,
    });
    
    console.log('✅ Response received - Status:', response.status);
    try {
      const rawSnippet = await response.clone().text();
      console.log('🔍 RAW TEXT snippet:', rawSnippet.substring(0, 300));
    } catch (e) {
      console.log('🔍 Unable to read raw text snippet:', e.message);
    }
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      console.error('❌ Response status:', response.status);
      console.error('❌ Response statusText:', response.statusText);
      
      // If unauthorized, clear stored session data
      if (response.status === 401) {
        console.log('🔐 Unauthorized response - clearing session data');
        await AsyncStorage.multiRemove(['sessionToken', 'userData', 'userRole']);
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response;
    
  } catch (error) {
    console.error('💥 DETAILED API ERROR:');
    console.error('💥 Error name:', error.name);
    console.error('💥 Error message:', error.message);
    console.error('💥 Error stack:', error.stack);
    console.error('💥 Full error object:', error);
    console.error('💥 API URL attempted:', `${await getApiUrl()}${url}`);
    console.error('💥 Request options:', JSON.stringify(options, null, 2));
    
    // Check for specific network error types
    if (error.message === 'Network request failed') {
      console.error('🌐 NETWORK REQUEST FAILED - Possible causes:');
      console.error('   1. Server is not running');
      console.error('   2. Wrong IP address or port');
      console.error('   3. Firewall blocking connection');
      console.error('   4. CORS issues');
      console.error('   5. SSL/TLS certificate issues');
    }
    
    throw error;
  }
};


const authFetch = realApi;

export default authFetch;
