import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
  SafeAreaView
} from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import * as NavigationBar from 'expo-navigation-bar';

const { width, height } = Dimensions.get('window');

const FullScreenView = ({ 
  children, 
  hideStatusBar = true, 
  hideNavigationBar = true,
  statusBarStyle = 'light-content',
  backgroundColor = '#000000',
  translucent = true 
}) => {
  // const insets = useSafeAreaInsets();
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const enterFullScreen = async () => {
      try {
        // Hide status bar
        if (hideStatusBar) {
          StatusBar.setHidden(true, 'fade');
        } else {
          StatusBar.setHidden(false, 'fade');
          StatusBar.setBarStyle(statusBarStyle, true);
          if (Platform.OS === 'android') {
            StatusBar.setTranslucent(translucent);
            StatusBar.setBackgroundColor(backgroundColor, true);
          }
        }

        // Hide navigation bar on Android (simplified)
        // Navigation bar handling would require expo-navigation-bar

        setIsFullScreen(true);
      } catch (error) {
        console.warn('Error setting full screen:', error);
        setIsFullScreen(true);
      }
    };

    const exitFullScreen = async () => {
      try {
        // Show status bar
        StatusBar.setHidden(false, 'fade');
        StatusBar.setBarStyle('dark-content', true);
        
        if (Platform.OS === 'android') {
          StatusBar.setTranslucent(false);
          StatusBar.setBackgroundColor('#FFFFFF', true);
          
          // Show navigation bar (simplified)
          // Navigation bar handling would require expo-navigation-bar
        }
      } catch (error) {
        console.warn('Error exiting full screen:', error);
      }
    };

    enterFullScreen();

    // Cleanup function to restore normal view when component unmounts
    return () => {
      exitFullScreen();
    };
  }, [hideStatusBar, hideNavigationBar, statusBarStyle, backgroundColor, translucent]);

  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      // Remove top padding/margin when in full screen
      paddingTop: hideStatusBar ? 0 : (Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44),
      // Remove bottom padding when hiding navigation bar
      paddingBottom: hideNavigationBar && Platform.OS === 'android' ? 0 : 34,
    }
  ];

  if (!isFullScreen) {
    // Show loading state while transitioning to full screen
    return (
      <View style={[styles.container, { backgroundColor }]}>
        {children}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {!hideStatusBar && (
        <StatusBar
          barStyle={statusBarStyle}
          backgroundColor={backgroundColor}
          translucent={translucent}
          hidden={false}
        />
      )}
      {children}
    </View>
  );
};

const FullScreenSafeView = ({ 
  children, 
  hideStatusBar = false,
  statusBarStyle = 'dark-content',
  backgroundColor = '#FFFFFF'
}) => {
  useEffect(() => {
    // Configure status bar
    StatusBar.setHidden(hideStatusBar, 'fade');
    if (!hideStatusBar) {
      StatusBar.setBarStyle(statusBarStyle, true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(backgroundColor, true);
        StatusBar.setTranslucent(false);
      }
    }

    return () => {
      // Restore default status bar
      StatusBar.setHidden(false, 'fade');
      StatusBar.setBarStyle('dark-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#FFFFFF', true);
        StatusBar.setTranslucent(false);
      }
    };
  }, [hideStatusBar, statusBarStyle, backgroundColor]);

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor }]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={backgroundColor}
        translucent={false}
        hidden={hideStatusBar}
      />
      {children}
    </SafeAreaView>
  );
};

const ImmersiveView = ({ children, backgroundColor = '#000000' }) => {
  useEffect(() => {
    const setupImmersive = async () => {
      try {
        // Hide status bar completely
        StatusBar.setHidden(true, 'fade');
        
        // Hide navigation bar on Android with immersive mode (simplified)
        // Navigation bar handling would require expo-navigation-bar
      } catch (error) {
        console.warn('Error setting immersive mode:', error);
      }
    };

    const cleanup = async () => {
      try {
        StatusBar.setHidden(false, 'fade');
        StatusBar.setBarStyle('dark-content', true);
        
        if (Platform.OS === 'android') {
          StatusBar.setBackgroundColor('#FFFFFF', true);
          // Navigation bar handling would require expo-navigation-bar
        }
      } catch (error) {
        console.warn('Error cleaning up immersive mode:', error);
      }
    };

    setupImmersive();
    return cleanup;
  }, [backgroundColor]);

  return (
    <View style={[styles.immersiveContainer, { backgroundColor }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  safeContainer: {
    flex: 1,
  },
  immersiveContainer: {
    flex: 1,
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default FullScreenView;
export { FullScreenSafeView, ImmersiveView };
