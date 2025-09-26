import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';

const ModernButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  animation = 'pulse',
  animationDelay = 0
}) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return Colors.gradientPrimary;
      case 'secondary':
        return Colors.gradientSecondary;
      case 'accent':
        return Colors.gradientAccent;
      case 'success':
        return Colors.gradientSuccess;
      case 'danger':
        return Colors.gradientDanger;
      case 'info':
        return Colors.gradientInfo;
      case 'outline':
        return ['transparent', 'transparent'];
      default:
        return Colors.gradientPrimary;
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (size === 'small') {
      baseStyle.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonLarge);
    } else {
      baseStyle.push(styles.buttonMedium);
    }

    if (variant === 'outline') {
      baseStyle.push(styles.buttonOutline);
    }

    if (disabled || loading) {
      baseStyle.push(styles.buttonDisabled);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText];
    
    if (size === 'small') {
      baseStyle.push(styles.textSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.textLarge);
    } else {
      baseStyle.push(styles.textMedium);
    }

    if (variant === 'outline') {
      baseStyle.push(styles.textOutline);
    }

    return baseStyle;
  };

  const renderIcon = () => {
    if (!icon || loading) return null;
    
    return (
      <Feather 
        name={icon} 
        size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
        color={variant === 'outline' ? Colors.primary : Colors.white}
        style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
      />
    );
  };

  return (
    <Animatable.View animation={animation} delay={animationDelay}>
      <TouchableOpacity
        style={[getButtonStyle(), style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={getGradientColors()}
          style={styles.gradient}
        >
          {iconPosition === 'left' && renderIcon()}
          {loading ? (
            <ActivityIndicator 
              color={variant === 'outline' ? Colors.primary : Colors.white} 
              size="small" 
            />
          ) : (
            <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          )}
          {iconPosition === 'right' && renderIcon()}
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonSmall: {
    height: 40,
  },
  buttonMedium: {
    height: 48,
  },
  buttonLarge: {
    height: 56,
  },
  buttonOutline: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },
  textOutline: {
    color: Colors.primary,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default ModernButton;
