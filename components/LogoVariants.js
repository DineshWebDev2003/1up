import React from 'react';
import { View, Text } from 'react-native';
import TNKidsLogo from './TNKidsLogo';

// Logo size presets
export const LogoSizes = {
  SMALL: 40,
  MEDIUM: 80,
  LARGE: 120,
  XLARGE: 160,
  SPLASH: 200,
};

// Header Logo - Small size for navigation headers
export const HeaderLogo = ({ style }) => (
  <TNKidsLogo 
    size={LogoSizes.SMALL} 
    showText={false} 
    style={style}
  />
);

// App Icon Logo - Medium size for app icons
export const AppIconLogo = ({ style }) => (
  <TNKidsLogo 
    size={LogoSizes.MEDIUM} 
    showText={false} 
    style={style}
  />
);

// Main Logo - Large size with text for main screens
export const MainLogo = ({ style }) => (
  <TNKidsLogo 
    size={LogoSizes.LARGE} 
    showText={true} 
    style={style}
  />
);

// Hero Logo - Extra large for landing pages
export const HeroLogo = ({ style }) => (
  <TNKidsLogo 
    size={LogoSizes.XLARGE} 
    showText={true} 
    style={style}
  />
);

// Splash Logo - Largest for splash screens
export const SplashLogo = ({ style }) => (
  <TNKidsLogo 
    size={LogoSizes.SPLASH} 
    showText={false} 
    style={style}
  />
);

// Horizontal Logo Layout - Logo with text side by side
export const HorizontalLogo = ({ size = LogoSizes.MEDIUM, style }) => (
  <View style={[{ 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  }, style]}>
    <TNKidsLogo 
      size={size} 
      showText={false} 
      style={{ marginRight: 12 }}
    />
    <View>
      <Text style={{
        fontSize: size * 0.25,
        fontWeight: 'bold',
        color: '#2C2C2C',
        lineHeight: size * 0.3,
      }}>
        TN Kids+
      </Text>
      <Text style={{
        fontSize: size * 0.12,
        color: '#FFA500',
        fontWeight: '600',
        marginTop: 2,
      }}>
        Learning Made Fun
      </Text>
    </View>
  </View>
);

// Minimal Logo - Just the circle with TN
export const MinimalLogo = ({ size = LogoSizes.SMALL, style }) => (
  <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#FFD700',
      borderWidth: 2,
      borderColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }}>
      <Text style={{
        fontSize: size * 0.3,
        fontWeight: 'bold',
        color: '#000',
      }}>
        TN
      </Text>
    </View>
  </View>
);

// Logo with custom colors
export const CustomColorLogo = ({ 
  size = LogoSizes.MEDIUM, 
  primaryColor = '#FFD700',
  secondaryColor = '#000',
  textColor = '#2C2C2C',
  style 
}) => (
  <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: primaryColor,
      borderWidth: 3,
      borderColor: secondaryColor,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: secondaryColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }}>
      <View style={{
        width: size * 0.75,
        height: size * 0.75,
        borderRadius: size * 0.375,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: secondaryColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{
          fontSize: size * 0.2,
          fontWeight: 'bold',
          color: textColor,
        }}>
          TN
        </Text>
        <Text style={{
          fontSize: size * 0.13,
          fontWeight: '600',
          color: primaryColor,
          marginTop: -2,
        }}>
          Kids+
        </Text>
      </View>
    </View>
  </View>
);

export default {
  HeaderLogo,
  AppIconLogo,
  MainLogo,
  HeroLogo,
  SplashLogo,
  HorizontalLogo,
  MinimalLogo,
  CustomColorLogo,
  LogoSizes,
};
