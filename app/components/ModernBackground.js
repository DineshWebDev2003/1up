import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';

const { width, height } = Dimensions.get('window');

const ModernBackground = ({ children, variant = 'main' }) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'main':
        return Colors.gradientMain;
      case 'primary':
        return Colors.gradientPrimary;
      case 'secondary':
        return Colors.gradientSecondary;
      case 'accent':
        return Colors.gradientAccent;
      case 'success':
        return Colors.gradientSuccess;
      case 'soft':
        return Colors.gradientSoft;
      case 'warm':
        return Colors.gradientWarm;
      case 'cool':
        return Colors.gradientCool;
      case 'light':
        return Colors.gradientLight;
      case 'dark':
        return Colors.gradientDark;
      default:
        return Colors.gradientMain;
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

export default ModernBackground;
