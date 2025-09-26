import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import Theme from '../constants/theme';

const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  fullWidth = false
}) => {
  const getButtonColors = () => {
    switch (variant) {
      case 'primary':
        return Colors.gradientPrimary;
      case 'secondary':
        return Colors.gradientSecondary;
      case 'success':
        return Colors.gradientSuccess;
      case 'warning':
        return Colors.gradientWarning;
      case 'danger':
        return Colors.gradientDanger;
      case 'info':
        return Colors.gradientInfo;
      default:
        return Colors.gradientPrimary;
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: Theme.spacing.sm,
          paddingHorizontal: Theme.spacing.md,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingVertical: Theme.spacing.md + 4,
          paddingHorizontal: Theme.spacing.xl,
          minHeight: 56,
        };
      default: // medium
        return {
          paddingVertical: Theme.spacing.md,
          paddingHorizontal: Theme.spacing.lg,
          minHeight: 48,
        };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return { fontSize: 14, fontWeight: '600' };
      case 'large':
        return { fontSize: 18, fontWeight: '700' };
      default:
        return { fontSize: 16, fontWeight: '600' };
    }
  };

  const buttonStyle = [
    styles.button,
    getButtonSize(),
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style
  ];

  const textStyles = [
    styles.text,
    getTextSize(),
    textStyle
  ];

  if (variant === 'outline') {
    return (
      <Pressable
        style={({ pressed }) => [
          buttonStyle,
          styles.outlineButton,
          { borderColor: disabled ? Colors.textLight : Colors.primary },
          pressed && !disabled && styles.pressed
        ]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[textStyles, { color: disabled ? Colors.textLight : Colors.primary }]}>
              {title}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  if (variant === 'ghost') {
    return (
      <Pressable
        style={({ pressed }) => [
          buttonStyle,
          styles.ghostButton,
          pressed && !disabled && styles.ghostPressed
        ]}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[textStyles, { color: disabled ? Colors.textLight : Colors.primary }]}>
              {title}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyle,
        pressed && !disabled && styles.pressed
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <LinearGradient
        colors={disabled ? [Colors.textLight, Colors.textLight] : getButtonColors()}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={Colors.textOnPrimary} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[textStyles, { color: Colors.textOnPrimary }]}>
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Theme.shadows.sm,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
  },
  text: {
    color: Colors.textOnPrimary,
    textAlign: 'center',
    marginLeft: Theme.spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: Colors.primaryLight + '20',
  },
});

export default Button;
