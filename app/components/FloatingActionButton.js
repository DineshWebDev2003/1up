import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import Theme from '../constants/theme';

const FloatingActionButton = ({ 
  icon = 'add', 
  onPress, 
  variant = 'primary',
  size = 'medium',
  style,
  disabled = false 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle breathing animation
    const breathe = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => breathe());
    };

    breathe();
  }, [scaleAnim]);

  const getGradientColors = () => {
    switch (variant) {
      case 'secondary':
        return Colors.gradientSecondary;
      case 'success':
        return Colors.gradientSuccess;
      case 'warning':
        return Colors.gradientWarning;
      case 'danger':
        return Colors.gradientDanger;
      default:
        return Colors.gradientPrimary;
    }
  };

  const getSize = () => {
    switch (size) {
      case 'small':
        return { width: 48, height: 48, borderRadius: 24 };
      case 'large':
        return { width: 72, height: 72, borderRadius: 36 };
      default:
        return { width: 56, height: 56, borderRadius: 28 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 32;
      default:
        return 24;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container, 
        getSize(),
        { transform: [{ scale: scaleAnim }] },
        disabled && styles.disabled,
        style
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={styles.touchable}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={disabled ? [Colors.textLight, Colors.textLight] : getGradientColors()}
          style={[styles.gradient, getSize()]}
        >
          <Ionicons 
            name={icon} 
            size={getIconSize()} 
            color={Colors.textOnPrimary} 
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    right: Theme.spacing.md,
    ...Theme.shadows.xl,
  },
  touchable: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default FloatingActionButton;
