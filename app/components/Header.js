import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import Theme from '../constants/theme';

const Header = ({ 
  title, 
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  variant = 'gradient',
  showBackButton = false,
  navigation
}) => {
  const handleBackPress = () => {
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    } else if (onLeftPress) {
      onLeftPress();
    }
  };

  const renderContent = () => (
    <View style={styles.content}>
      <View style={styles.leftSection}>
        {(showBackButton || leftIcon) && (
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={showBackButton ? handleBackPress : onLeftPress}
          >
            <Ionicons 
              name={showBackButton ? 'arrow-back' : leftIcon} 
              size={24} 
              color={variant === 'gradient' ? Colors.textOnPrimary : Colors.text} 
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerSection}>
        <Text style={[
          styles.title, 
          { color: variant === 'gradient' ? Colors.textOnPrimary : Colors.text }
        ]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[
            styles.subtitle, 
            { color: variant === 'gradient' ? Colors.textOnPrimary + '80' : Colors.textSecondary }
          ]}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightSection}>
        {rightIcon && (
          <TouchableOpacity style={styles.iconButton} onPress={onRightPress}>
            <Ionicons 
              name={rightIcon} 
              size={24} 
              color={variant === 'gradient' ? Colors.textOnPrimary : Colors.text} 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (variant === 'gradient') {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <LinearGradient colors={Colors.gradientPrimary} style={styles.container}>
          {renderContent()}
        </LinearGradient>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={[styles.container, styles.solidHeader]}>
        {renderContent()}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
  },
  solidHeader: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    ...Theme.shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    ...Theme.typography.h5,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...Theme.typography.caption,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default Header;
