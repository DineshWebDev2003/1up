import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/colors';

const Background = ({ children, variant = 'default' }) => {
  const playfulIcons = [
    { name: 'school', top: '8%', left: '15%', transform: [{ rotate: '-15deg' }], size: 28 },
    { name: 'palette', top: '12%', left: '75%', transform: [{ rotate: '20deg' }], size: 24 },
    { name: 'book-open', top: '25%', left: '8%', transform: [{ rotate: '10deg' }], size: 26 },
    { name: 'shapes', top: '30%', left: '85%', transform: [{ rotate: '-25deg' }], size: 30 },
    { name: 'rocket', top: '45%', left: '12%', transform: [{ rotate: '15deg' }], size: 32 },
    { name: 'child', top: '50%', left: '78%', transform: [{ rotate: '-10deg' }], size: 28 },
    { name: 'apple-alt', top: '65%', left: '20%', transform: [{ rotate: '25deg' }], size: 24 },
    { name: 'globe-americas', top: '70%', left: '70%', transform: [{ rotate: '-15deg' }], size: 26 },
    { name: 'bus', top: '85%', left: '15%', transform: [{ rotate: '5deg' }], size: 30 },
    { name: 'bell', top: '90%', left: '80%', transform: [{ rotate: '10deg' }], size: 22 },
    { name: 'paint-brush', top: '35%', left: '45%', transform: [{ rotate: '-8deg' }], size: 24 },
    { name: 'calculator', top: '18%', left: '50%', transform: [{ rotate: '18deg' }], size: 22 },
    { name: 'pencil-ruler', top: '55%', left: '50%', transform: [{ rotate: '-12deg' }], size: 26 },
    { name: 'atom', top: '75%', left: '45%', transform: [{ rotate: '22deg' }], size: 28 },
  ];

  const getGradientColors = () => {
    switch (variant) {
      case 'sunrise':
        return Colors.gradientSunrise;
      case 'sky':
        return Colors.gradientSky;
      case 'ocean':
        return Colors.gradientOcean;
      case 'sunset':
        return Colors.gradientSunset;
      case 'mint':
        return Colors.gradientMint;
      case 'lavender':
        return Colors.gradientLavender;
      default:
        return Colors.gradientSunrise; // Default to sunrise gradient
    }
  };

  return (
    <LinearGradient colors={getGradientColors()} style={styles.container}>
      {playfulIcons.map((icon, index) => (
        <FontAwesome5
          key={index}
          name={icon.name}
          size={icon.size}
          color="rgba(255, 255, 255, 0.08)"
          style={[
            styles.icon, 
            { 
              top: icon.top, 
              left: icon.left, 
              transform: icon.transform 
            }
          ]}
        />
      ))}
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  icon: {
    position: 'absolute',
  },
});

export default Background;
