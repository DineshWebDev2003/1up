import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const YellowStatusBar = ({ backgroundColor = '#FFD700', barStyle = 'dark-content' }) => {
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(backgroundColor, true);
        StatusBar.setBarStyle(barStyle, true);
      }
    }, [backgroundColor, barStyle])
  );

  return (
    <StatusBar
      backgroundColor={backgroundColor}
      barStyle={barStyle}
      translucent={false}
    />
  );
};

export default YellowStatusBar;
