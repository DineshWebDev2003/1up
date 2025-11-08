const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle missing files
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Handle missing InternalBytecode.js
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
