import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';

const WhiteBackground = ({ children }) => {
  const Colors = useColors();
  
  return (
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default WhiteBackground;
