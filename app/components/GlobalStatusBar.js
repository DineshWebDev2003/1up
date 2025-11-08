import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Yellow color variations
export const YELLOW_COLORS = {
  primary: '#FFD700',      // Gold
  bright: '#FFFF00',       // Bright Yellow
  amber: '#FFBF00',        // Amber
  golden: '#FFC107',       // Material Golden
  light: '#FFF59D',        // Light Yellow
  dark: '#F57F17'          // Dark Yellow
};

const GlobalStatusBar = ({ 
  color = YELLOW_COLORS.primary, 
  barStyle = 'dark-content',
  translucent = false 
}) => {
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(color, true);
        StatusBar.setBarStyle(barStyle, true);
        StatusBar.setTranslucent(translucent);
      }
    }, [color, barStyle, translucent])
  );

  return (
    <StatusBar
      backgroundColor={color}
      barStyle={barStyle}
      translucent={translucent}
    />
  );
};

export default GlobalStatusBar;
