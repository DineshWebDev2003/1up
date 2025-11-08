import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import Theme from '../constants/theme';

const ActionButton = ({ icon, title, colors, onPress, index, variant = 'default' }) => {

  const getButtonColors = () => {
    if (colors) return colors;
    
    // Default color schemes based on variant
    switch (variant) {
      case 'primary':
        return Colors.gradientPrimary;
      case 'secondary':
        return Colors.gradientSecondary;
      case 'success':
        return Colors.gradientSuccess;
      case 'warning':
        return Colors.gradientWarning;
      case 'info':
        return Colors.gradientInfo;
      case 'purple':
        return [Colors.purple, Colors.purpleLight];
      case 'orange':
        return [Colors.orange, Colors.orangeLight];
      case 'teal':
        return [Colors.teal, Colors.tealLight];
      default:
        return Colors.gradientPrimary;
    }
  };

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={600}
      delay={index * 120}
      style={styles.pressable}
    >
      <Pressable
        style={({ pressed }) => [
          styles.pressableContent,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
        <LinearGradient colors={getButtonColors()} style={styles.container}>
          <MaterialIcons name={icon} size={42} color={Colors.textOnPrimary} />
          <Text style={styles.title}>{title}</Text>
        </LinearGradient>
      </Pressable>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: '28%',
    aspectRatio: 1,
    margin: '2.5%',
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: Colors.surface,
    ...Theme.shadows.lg,
  },
  pressableContent: {
    flex: 1,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
    ...Theme.shadows.md,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.sm,
  },
  title: {
    ...Theme.typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textOnPrimary,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default ActionButton;
