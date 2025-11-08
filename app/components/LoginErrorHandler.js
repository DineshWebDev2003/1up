import { Alert } from 'react-native';

// Store reference to show popup function
let showErrorPopup = null;

// Set the popup function reference
export const setErrorPopupRef = (popupFunction) => {
  showErrorPopup = popupFunction;
};

// Production-friendly error messages
const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: {
    title: 'Connection Problem',
    message: 'Please check your internet connection and try again.'
  },
  
  // Authentication errors
  INVALID_CREDENTIALS: {
    title: 'Login Failed',
    message: 'Invalid email/phone or password. Please check your credentials and try again.'
  },
  
  // Server errors
  SERVER_ERROR: {
    title: 'Service Unavailable',
    message: 'Our servers are temporarily unavailable. Please try again in a few moments.'
  },
  
  // Account issues
  ACCOUNT_INACTIVE: {
    title: 'Account Issue',
    message: 'Your account is not active. Please contact your administrator for assistance.'
  },
  
  ACCOUNT_SUSPENDED: {
    title: 'Account Suspended',
    message: 'Your account has been suspended. Please contact support for more information.'
  },
  
  // Generic errors
  UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
  },
  
  // Validation errors
  MISSING_FIELDS: {
    title: 'Missing Information',
    message: 'Please enter both email/phone and password to continue.'
  },
  
  INVALID_FORMAT: {
    title: 'Invalid Format',
    message: 'Please enter a valid email address or phone number.'
  }
};

// Map technical errors to user-friendly messages
const mapErrorToUserMessage = (error, response = null) => {
  // Check if it's a network error
  if (error.message === 'Network request failed' || 
      error.message.includes('fetch') || 
      error.message.includes('network')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  // Check response status codes
  if (response) {
    switch (response.status) {
      case 401:
        return ERROR_MESSAGES.INVALID_CREDENTIALS;
      case 403:
        return ERROR_MESSAGES.ACCOUNT_SUSPENDED;
      case 404:
        return ERROR_MESSAGES.INVALID_CREDENTIALS; // Don't reveal that user doesn't exist
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES.SERVER_ERROR;
      default:
        break;
    }
  }
  
  // Check error message content for specific cases
  const errorMsg = error.message?.toLowerCase() || '';
  
  if (errorMsg.includes('invalid') || 
      errorMsg.includes('wrong') || 
      errorMsg.includes('incorrect') ||
      errorMsg.includes('password') ||
      errorMsg.includes('credentials')) {
    return ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  
  if (errorMsg.includes('inactive') || 
      errorMsg.includes('disabled')) {
    return ERROR_MESSAGES.ACCOUNT_INACTIVE;
  }
  
  if (errorMsg.includes('suspended') || 
      errorMsg.includes('blocked')) {
    return ERROR_MESSAGES.ACCOUNT_SUSPENDED;
  }
  
  if (errorMsg.includes('server') || 
      errorMsg.includes('timeout') ||
      errorMsg.includes('unavailable')) {
    return ERROR_MESSAGES.SERVER_ERROR;
  }
  
  // Default to unknown error
  return ERROR_MESSAGES.UNKNOWN_ERROR;
};

// Main error handler function
export const handleLoginError = (error, response = null, isDevelopment = false) => {
  // In development, log the actual error for debugging
  if (isDevelopment || __DEV__) {
    console.error('🚨 Login Error Details:', {
      error: error.message,
      stack: error.stack,
      response: response ? {
        status: response.status,
        statusText: response.statusText
      } : null
    });
  }
  
  // Get user-friendly message
  const userMessage = mapErrorToUserMessage(error, response);
  
  // Show user-friendly popup or fallback to alert
  if (showErrorPopup) {
    showErrorPopup({
      title: userMessage.title,
      message: userMessage.message,
      type: 'error'
    });
  } else {
    // Fallback to Alert if popup is not available
    Alert.alert(
      userMessage.title,
      userMessage.message,
      [
        { 
          text: 'OK', 
          style: 'default'
        }
      ],
      { cancelable: true }
    );
  }
};

// Validation helper
export const validateLoginFields = (email, password) => {
  if (!email?.trim() || !password?.trim()) {
    if (showErrorPopup) {
      showErrorPopup({
        title: ERROR_MESSAGES.MISSING_FIELDS.title,
        message: ERROR_MESSAGES.MISSING_FIELDS.message,
        type: 'warning'
      });
    } else {
      Alert.alert(
        ERROR_MESSAGES.MISSING_FIELDS.title,
        ERROR_MESSAGES.MISSING_FIELDS.message
      );
    }
    return false;
  }
  
  // Basic email/phone validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  
  if (!emailRegex.test(email.trim()) && !phoneRegex.test(email.trim())) {
    if (showErrorPopup) {
      showErrorPopup({
        title: ERROR_MESSAGES.INVALID_FORMAT.title,
        message: ERROR_MESSAGES.INVALID_FORMAT.message,
        type: 'warning'
      });
    } else {
      Alert.alert(
        ERROR_MESSAGES.INVALID_FORMAT.title,
        ERROR_MESSAGES.INVALID_FORMAT.message
      );
    }
    return false;
  }
  
  return true;
};

// Success handler
export const handleLoginSuccess = (userData) => {
  // Log success in development
  if (__DEV__) {
    console.log('✅ Login Success:', {
      userId: userData.id,
      role: userData.role,
      name: userData.name
    });
  }
  
  // You can add success analytics here if needed
};

export default {
  handleLoginError,
  validateLoginFields,
  handleLoginSuccess,
  ERROR_MESSAGES
};
