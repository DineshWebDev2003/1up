import { API_URL, getApiUrl } from '../../config';

/**
 * Formats a photo path to a complete URL for display
 * Handles different path formats including onboarding images
 * @param {string} photoPath - The photo path from database
 * @returns {string|null} - Complete URL or null if no path
 */
export const formatPhotoUrl = (photoPath) => {
  // Early return for null/invalid paths to reduce log spam
  if (!photoPath || typeof photoPath !== 'string') {
    return null;
  }
  
  console.log('🔥 formatPhotoUrl called with:', photoPath);
  
  // Use static API_URL first, then fallback to hardcoded URL
  let baseUrl = API_URL;
  if (!baseUrl || baseUrl === 'undefined' || typeof baseUrl === 'undefined') {
    baseUrl = 'http://10.95.243.139/server_app/lastchapter';
  }
  
  // Already a complete URL
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  
  // Handle different path formats
  if (photoPath.startsWith('uploads/students/')) {
    // Student photos are stored in api/uploads/students/
    return `${baseUrl}/api/${photoPath}`;
  } else if (photoPath.startsWith('uploads/')) {
    // Other upload folders might be in different locations
    return `${baseUrl}/${photoPath}`;
  } else {
    // Fallback for other formats
    return `${baseUrl}/${photoPath}`;
  }
};

/**
 * Formats a photo path to an object suitable for React Native Image component
 * @param {string} photoPath - The photo path from database
 * @returns {object|null} - Object with uri property or null
 */
export const formatPhotoSource = (photoPath) => {
  const url = formatPhotoUrl(photoPath);
  return url ? { uri: url } : null;
};

export default { formatPhotoUrl, formatPhotoSource };
