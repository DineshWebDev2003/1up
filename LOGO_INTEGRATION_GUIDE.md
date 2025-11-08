# TN Kids+ Logo Integration Guide

## Overview
This guide explains how to use the TN Kids+ logo components in your React Native app.

## Components Created

### 1. TNKidsLogo.js
Main logo component with customizable size and text options.

```javascript
import TNKidsLogo from './components/TNKidsLogo';

// Basic usage
<TNKidsLogo size={120} showText={true} />

// Custom styling
<TNKidsLogo 
  size={80} 
  showText={false} 
  style={{ marginVertical: 20 }} 
/>
```

### 2. SplashScreen.js
Animated splash screen with attractive animations.

```javascript
import SplashScreen from './components/SplashScreen';

// Usage in App.js or main component
const [isLoading, setIsLoading] = useState(true);

if (isLoading) {
  return (
    <SplashScreen 
      onAnimationComplete={() => setIsLoading(false)}
    />
  );
}
```

### 3. LogoVariants.js
Pre-configured logo variants for different use cases.

```javascript
import {
  HeaderLogo,
  AppIconLogo,
  MainLogo,
  HeroLogo,
  HorizontalLogo,
  MinimalLogo
} from './components/LogoVariants';

// In navigation header
<HeaderLogo />

// In main screens
<MainLogo />

// In horizontal layout
<HorizontalLogo size={80} />
```

### 4. LogoShowcase.js
Demo component showing all logo variants (for development/testing).

```javascript
import LogoShowcase from './components/LogoShowcase';

// Use for testing and showcasing logos
<LogoShowcase />
```

## Installation Requirements

Make sure you have these dependencies installed:

```bash
npm install react-native-svg expo-linear-gradient
```

For Expo projects:
```bash
expo install react-native-svg expo-linear-gradient
```

## Usage Examples

### App Header
```javascript
import { HeaderLogo } from './components/LogoVariants';

const AppHeader = () => (
  <View style={styles.header}>
    <HeaderLogo />
    <Text style={styles.headerTitle}>TN Kids+</Text>
  </View>
);
```

### Login Screen
```javascript
import { HeroLogo } from './components/LogoVariants';

const LoginScreen = () => (
  <View style={styles.container}>
    <HeroLogo />
    <Text style={styles.welcomeText}>Welcome to TN Kids+</Text>
    {/* Login form */}
  </View>
);
```

### Navigation Drawer
```javascript
import { HorizontalLogo } from './components/LogoVariants';

const DrawerContent = () => (
  <View style={styles.drawerHeader}>
    <HorizontalLogo size={60} />
  </View>
);
```

## Color Scheme

- **Primary Yellow**: #FFD700 (Gold)
- **Secondary Yellow**: #FFA500 (Orange)
- **Black**: #000000
- **Dark Gray**: #2C2C2C
- **White**: #FFFFFF
- **Light Gray**: #F8F9FA

## Logo Sizes

- **Small**: 40px (Headers, buttons)
- **Medium**: 80px (App icons, cards)
- **Large**: 120px (Main screens)
- **XLarge**: 160px (Hero sections)
- **Splash**: 200px (Splash screens)

## Best Practices

1. **Minimum Size**: Never use smaller than 24px
2. **Clear Space**: Maintain padding equal to 25% of logo size
3. **Background**: Works best on light backgrounds
4. **Accessibility**: Always provide alt text for screen readers
5. **Performance**: Use appropriate size for context to optimize performance

## Animation Features

The splash screen includes:
- Logo scale and rotation animations
- Text slide-in effects
- Sparkle animations
- Background gradient transitions
- Loading progress bar
- Elastic bounce effects

## Customization

### Custom Colors
```javascript
import { CustomColorLogo } from './components/LogoVariants';

<CustomColorLogo 
  size={80}
  primaryColor="#FF6B6B"
  secondaryColor="#FFF"
  textColor="#2C2C2C"
/>
```

### Custom Animations
Modify the SplashScreen.js file to adjust:
- Animation duration
- Easing functions
- Sequence timing
- Color transitions

## Integration Steps

1. Copy all component files to your `components/` directory
2. Install required dependencies
3. Import the logo component you need
4. Add to your screens/components
5. Customize size and styling as needed

## File Structure
```
components/
├── TNKidsLogo.js          # Main logo component
├── SplashScreen.js        # Animated splash screen
├── LogoVariants.js        # Pre-configured variants
└── LogoShowcase.js        # Demo/testing component
```

## Support

For any issues or customization needs, refer to:
- React Native SVG documentation
- Expo LinearGradient documentation
- React Native Animated API documentation
