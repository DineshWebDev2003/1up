import { InteractionManager, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Image optimization utilities
export const optimizeImageUri = (uri, maxWidth = 300, maxHeight = 300, quality = 0.8) => {
  if (!uri) return null;
  
  // If it's a local asset, return as is
  if (uri.startsWith('file://') || uri.startsWith('asset://')) {
    return uri;
  }
  
  // For remote images, add resize parameters if the server supports it
  if (uri.includes('http')) {
    const separator = uri.includes('?') ? '&' : '?';
    return `${uri}${separator}w=${maxWidth}&h=${maxHeight}&q=${Math.round(quality * 100)}`;
  }
  
  return uri;
};

// Memory management for large lists
export const getOptimizedFlatListProps = (dataLength) => {
  const { height } = Dimensions.get('window');
  const estimatedItemHeight = 100; // Adjust based on your item height
  const windowSize = Math.max(Math.ceil(height / estimatedItemHeight), 10);
  
  return {
    windowSize: Math.min(windowSize, 21), // React Native recommends 21 max
    maxToRenderPerBatch: Math.min(Math.ceil(windowSize / 2), 10),
    initialNumToRender: Math.min(Math.ceil(windowSize / 2), 10),
    removeClippedSubviews: dataLength > 50,
    getItemLayout: estimatedItemHeight ? (data, index) => ({
      length: estimatedItemHeight,
      offset: estimatedItemHeight * index,
      index,
    }) : undefined,
  };
};

// Debounce function to prevent excessive API calls
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for scroll events
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Batch state updates to prevent excessive re-renders
export const batchStateUpdates = (updates) => {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      updates.forEach(update => update());
      resolve();
    });
  });
};

// Clean up old cache data
export const cleanupOldCache = async (maxAge = 7 * 24 * 60 * 60 * 1000) => { // 7 days
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      key.startsWith('cache_') || 
      key.startsWith('temp_') ||
      key.includes('_timestamp')
    );
    
    const now = Date.now();
    const keysToRemove = [];
    
    for (const key of cacheKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.timestamp && (now - parsed.timestamp) > maxAge) {
            keysToRemove.push(key);
          }
        }
      } catch (e) {
        // If we can't parse it, it might be corrupted, remove it
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`🧹 Cleaned up ${keysToRemove.length} old cache entries`);
    }
  } catch (error) {
    console.error('Failed to cleanup old cache:', error);
  }
};

// Monitor memory usage (if available)
export const checkMemoryUsage = () => {
  if (global.performance && global.performance.memory) {
    const memory = global.performance.memory;
    const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
    const limit = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
    
    console.log(`📊 Memory Usage: ${used}MB / ${total}MB (Limit: ${limit}MB)`);
    
    // Warn if memory usage is high
    if (used > limit * 0.8) {
      console.warn('⚠️ High memory usage detected!');
      return { status: 'high', used, total, limit };
    }
    
    return { status: 'normal', used, total, limit };
  }
  
  return { status: 'unavailable' };
};

// Optimize images for better performance
export const preloadCriticalImages = async (imageUris) => {
  const promises = imageUris.map(uri => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(uri);
      image.onerror = () => resolve(null);
      image.src = uri;
    });
  });
  
  try {
    const results = await Promise.all(promises);
    const loaded = results.filter(Boolean);
    console.log(`🖼️ Preloaded ${loaded.length}/${imageUris.length} images`);
    return loaded;
  } catch (error) {
    console.error('Failed to preload images:', error);
    return [];
  }
};

// Lazy loading utility for heavy components
export const createLazyComponent = (importFunc, fallback = null) => {
  // Note: React.lazy requires React import in the consuming component
  return (React) => React.lazy(() => {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        importFunc().then(resolve);
      });
    });
  });
};

// Performance monitoring
export const measurePerformance = (name, func) => {
  return async (...args) => {
    const start = Date.now();
    try {
      const result = await func(...args);
      const duration = Date.now() - start;
      console.log(`⏱️ ${name} took ${duration}ms`);
      
      // Log slow operations
      if (duration > 1000) {
        console.warn(`🐌 Slow operation detected: ${name} (${duration}ms)`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`❌ ${name} failed after ${duration}ms:`, error);
      throw error;
    }
  };
};

// Network request optimization
export const optimizeNetworkRequests = {
  // Cancel previous requests if new one is made
  cancelPrevious: (() => {
    const controllers = new Map();
    
    return (key, requestFunc) => {
      // Cancel previous request with same key
      if (controllers.has(key)) {
        controllers.get(key).abort();
      }
      
      // Create new controller
      const controller = new AbortController();
      controllers.set(key, controller);
      
      // Make request with abort signal
      return requestFunc(controller.signal).finally(() => {
        controllers.delete(key);
      });
    };
  })(),
  
  // Batch multiple requests
  batch: (requests, batchSize = 3) => {
    const batches = [];
    for (let i = 0; i < requests.length; i += batchSize) {
      batches.push(requests.slice(i, i + batchSize));
    }
    
    return batches.reduce(async (prev, batch) => {
      await prev;
      return Promise.all(batch.map(req => req()));
    }, Promise.resolve());
  }
};

export default {
  optimizeImageUri,
  getOptimizedFlatListProps,
  debounce,
  throttle,
  batchStateUpdates,
  cleanupOldCache,
  checkMemoryUsage,
  preloadCriticalImages,
  createLazyComponent,
  measurePerformance,
  optimizeNetworkRequests,
};
