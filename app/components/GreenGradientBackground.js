import React from 'react';
import { View } from 'react-native';
import Colors from '../constants/colors';
import Theme from '../constants/theme';

const WhiteBackground = ({ children }) => {
  return (
    <View style={[Theme.components.container.light, { flex: 1 }]}>
      {children}
    </View>
  );
};

export default WhiteBackground;
