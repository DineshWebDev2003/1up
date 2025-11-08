import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '../constants/colors';
import Theme from '../constants/theme';

const Card = ({ 
  children, 
  variant = 'default', 
  style, 
  padding = Theme.spacing.md,
  margin = 0,
  borderRadius = Theme.borderRadius.lg 
}) => {
  const getCardStyle = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: Colors.surface,
          borderRadius: borderRadius,
          padding: padding,
          margin: margin,
          ...Theme.shadows.lg,
        };
      case 'playful':
        return {
          backgroundColor: Colors.surface,
          borderRadius: borderRadius,
          padding: padding,
          margin: margin,
          borderWidth: 2,
          borderColor: Colors.primaryLight,
          ...Theme.shadows.md,
        };
      case 'gradient':
        return {
          borderRadius: borderRadius,
          padding: 2,
          margin: margin,
          ...Theme.shadows.md,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: Colors.border,
          borderRadius: borderRadius,
          padding: padding,
          margin: margin,
        };
      default:
        return {
          backgroundColor: Colors.surface,
          borderRadius: borderRadius,
          padding: padding,
          margin: margin,
          ...Theme.shadows.sm,
        };
    }
  };

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

export default Card;
