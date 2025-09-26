import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';

const GreenGradientBackground = ({ children, variant = 'success' }) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'success':
        return Colors.gradientSuccess;
      case 'mint':
        return Colors.gradientMint;
      case 'grass':
        return Colors.gradientGrass;
      case 'ocean':
        return Colors.gradientOcean;
      case 'teal':
        return [Colors.teal, Colors.tealLight];
      case 'lime':
        return [Colors.lime, Colors.limeLight];
      default:
        return Colors.gradientSuccess;
    }
  };

  return (
    <LinearGradient colors={getGradientColors()} style={styles.container}>
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default GreenGradientBackground;
