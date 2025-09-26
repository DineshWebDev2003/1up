#!/usr/bin/env node

/**
 * Script to update server IP in config.js
 * Usage: node update-server-ip.js <new-ip>
 * Example: node update-server-ip.js 192.168.1.100
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.js');
const newIP = process.argv[2];

if (!newIP) {
  console.error('Usage: node update-server-ip.js <new-ip>');
  console.error('Example: node update-server-ip.js 192.168.1.100');
  process.exit(1);
}

// Validate IP format (basic validation)
const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
if (!ipRegex.test(newIP)) {
  console.error('Invalid IP format. Please provide a valid IP address.');
  process.exit(1);
}

try {
  // Read current config
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Replace the IP in the getServerIP function
  const oldIPRegex = /return process\.env\.EXPO_PUBLIC_SERVER_IP \|\| '[\d.]+';/;
  const newLine = `return process.env.EXPO_PUBLIC_SERVER_IP || '${newIP}';`;
  
  configContent = configContent.replace(oldIPRegex, newLine);
  
  // Write back to file
  fs.writeFileSync(configPath, configContent, 'utf8');
  
  console.log(`✅ Server IP updated successfully to: ${newIP}`);
  console.log('📱 Please restart your Expo development server for changes to take effect.');
  
} catch (error) {
  console.error('❌ Error updating config:', error.message);
  process.exit(1);
}
