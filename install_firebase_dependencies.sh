#!/bin/bash

echo "🔥 Installing Firebase Dependencies for TN Happy Kids Management System"
echo "======================================================================"

echo ""
echo "📦 Installing Firebase SDK..."
npm install firebase

echo ""
echo "🔐 Installing Expo Auth Session..."
npm install expo-auth-session

echo ""
echo "🔒 Installing Expo Crypto..."
npm install expo-crypto

echo ""
echo "🌐 Installing Expo Web Browser (if not already installed)..."
npm install expo-web-browser

echo ""
echo "📱 Installing React Native Async Storage (if not already installed)..."
npm install @react-native-async-storage/async-storage

echo ""
echo "✅ All Firebase dependencies installed successfully!"
echo ""
echo "🔧 Next Steps:"
echo "1. Get your Google OAuth Client ID from Firebase Console"
echo "2. Update the clientId in SimpleGoogleSignInService.js"
echo "3. Configure your app's redirect URI in Firebase Console"
echo "4. Test the Google Sign-In flow"
echo ""
echo "🔗 Firebase Console: https://console.firebase.google.com/project/management-7c3d1"
echo "📚 Expo Auth Session Docs: https://docs.expo.dev/guides/authentication/"
