/**
 * Safe Array Utilities to prevent "Cannot read property 'map' of undefined" errors
 * This utility provides safe array operations that handle undefined/null values gracefully
 */

// Safe map function that handles undefined arrays
export const safeMap = (array, callback, fallback = []) => {
  try {
    if (!Array.isArray(array)) {
      console.warn('safeMap: Received non-array value:', typeof array, array);
      return fallback;
    }
    return array.map(callback);
  } catch (error) {
    console.error('safeMap error:', error);
    return fallback;
  }
};

// Safe filter function
export const safeFilter = (array, callback, fallback = []) => {
  try {
    if (!Array.isArray(array)) {
      console.warn('safeFilter: Received non-array value:', typeof array, array);
      return fallback;
    }
    return array.filter(callback);
  } catch (error) {
    console.error('safeFilter error:', error);
    return fallback;
  }
};

// Safe find function
export const safeFind = (array, callback, fallback = null) => {
  try {
    if (!Array.isArray(array)) {
      console.warn('safeFind: Received non-array value:', typeof array, array);
      return fallback;
    }
    return array.find(callback) || fallback;
  } catch (error) {
    console.error('safeFind error:', error);
    return fallback;
  }
};

// Safe reduce function
export const safeReduce = (array, callback, initialValue, fallback = null) => {
  try {
    if (!Array.isArray(array)) {
      console.warn('safeReduce: Received non-array value:', typeof array, array);
      return fallback;
    }
    return array.reduce(callback, initialValue);
  } catch (error) {
    console.error('safeReduce error:', error);
    return fallback;
  }
};

// Ensure array function - converts any value to a safe array
export const ensureArray = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  // If it's a single value, wrap it in an array
  return [value];
};

// Safe array access with bounds checking
export const safeArrayAccess = (array, index, fallback = null) => {
  try {
    if (!Array.isArray(array) || index < 0 || index >= array.length) {
      return fallback;
    }
    return array[index];
  } catch (error) {
    console.error('safeArrayAccess error:', error);
    return fallback;
  }
};

// Generate safe keys for React lists
export const generateSafeKey = (item, index, prefix = 'item') => {
  try {
    // Try to use id first
    if (item && typeof item === 'object' && item.id !== undefined) {
      return `${prefix}-${item.id}`;
    }
    // Try to use other common identifier fields
    if (item && typeof item === 'object') {
      const identifiers = ['_id', 'key', 'uuid', 'name'];
      for (const field of identifiers) {
        if (item[field] !== undefined) {
          return `${prefix}-${item[field]}`;
        }
      }
    }
    // Fall back to index
    return `${prefix}-${index}`;
  } catch (error) {
    console.error('generateSafeKey error:', error);
    return `${prefix}-${index}`;
  }
};

// Safe object property access
export const safeGet = (obj, path, fallback = null) => {
  try {
    if (!obj || typeof obj !== 'object') {
      return fallback;
    }
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return fallback;
      }
      current = current[key];
    }
    
    return current;
  } catch (error) {
    console.error('safeGet error:', error);
    return fallback;
  }
};

// React component wrapper for safe rendering
export const SafeRender = ({ children, fallback = null, onError = null }) => {
  try {
    return children;
  } catch (error) {
    console.error('SafeRender error:', error);
    if (onError) {
      onError(error);
    }
    return fallback;
  }
};

export default {
  safeMap,
  safeFilter,
  safeFind,
  safeReduce,
  ensureArray,
  safeArrayAccess,
  generateSafeKey,
  safeGet,
  SafeRender
};
