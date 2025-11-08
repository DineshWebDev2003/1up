import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SplashScreen from './SplashScreen';
import {
  HeaderLogo,
  AppIconLogo,
  MainLogo,
  HeroLogo,
  SplashLogo,
  HorizontalLogo,
  MinimalLogo,
  CustomColorLogo,
  LogoSizes,
} from './LogoVariants';

const { width } = Dimensions.get('window');

const LogoShowcase = () => {
  const [showSplash, setShowSplash] = useState(false);

  const LogoSection = ({ title, children, description }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && <Text style={styles.sectionDescription}>{description}</Text>}
      <View style={styles.logoContainer}>
        {children}
      </View>
    </View>
  );

  if (showSplash) {
    return (
      <SplashScreen 
        onAnimationComplete={() => setShowSplash(false)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#F8F9FA', '#E9ECEF']}
        style={styles.header}
      >
        <Text style={styles.title}>TN Kids+ Logo Showcase</Text>
        <Text style={styles.subtitle}>App Logo & Branding Assets</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Splash Screen Demo */}
        <LogoSection 
          title="Splash Screen Animation"
          description="Tap to preview the animated splash screen"
        >
          <TouchableOpacity 
            style={styles.splashButton}
            onPress={() => setShowSplash(true)}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.splashButtonGradient}
            >
              <Text style={styles.splashButtonText}>▶ Play Splash Animation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LogoSection>

        {/* Header Logo */}
        <LogoSection 
          title="Header Logo"
          description="Small size for navigation headers and toolbars"
        >
          <View style={styles.headerDemo}>
            <HeaderLogo />
            <Text style={styles.demoText}>Navigation Header</Text>
          </View>
        </LogoSection>

        {/* App Icon Logo */}
        <LogoSection 
          title="App Icon Logo"
          description="Medium size for app icons and buttons"
        >
          <AppIconLogo />
        </LogoSection>

        {/* Main Logo */}
        <LogoSection 
          title="Main Logo"
          description="Large size with text for main screens"
        >
          <MainLogo />
        </LogoSection>

        {/* Hero Logo */}
        <LogoSection 
          title="Hero Logo"
          description="Extra large for landing pages and welcome screens"
        >
          <HeroLogo />
        </LogoSection>

        {/* Horizontal Logo */}
        <LogoSection 
          title="Horizontal Logo"
          description="Logo with text side by side for headers"
        >
          <HorizontalLogo size={LogoSizes.MEDIUM} />
        </LogoSection>

        {/* Minimal Logo */}
        <LogoSection 
          title="Minimal Logo"
          description="Simplified version for small spaces"
        >
          <View style={styles.minimalRow}>
            <MinimalLogo size={30} />
            <MinimalLogo size={40} />
            <MinimalLogo size={50} />
            <MinimalLogo size={60} />
          </View>
        </LogoSection>

        {/* Custom Color Variants */}
        <LogoSection 
          title="Custom Color Variants"
          description="Logo with different color schemes"
        >
          <View style={styles.colorGrid}>
            <CustomColorLogo 
              size={60}
              primaryColor="#FFD700"
              secondaryColor="#000"
              textColor="#2C2C2C"
            />
            <CustomColorLogo 
              size={60}
              primaryColor="#FF6B6B"
              secondaryColor="#FFF"
              textColor="#2C2C2C"
            />
            <CustomColorLogo 
              size={60}
              primaryColor="#4ECDC4"
              secondaryColor="#2C2C2C"
              textColor="#FFF"
            />
            <CustomColorLogo 
              size={60}
              primaryColor="#A8E6CF"
              secondaryColor="#2C2C2C"
              textColor="#2C2C2C"
            />
          </View>
        </LogoSection>

        {/* Size Comparison */}
        <LogoSection 
          title="Size Comparison"
          description="Different logo sizes for various use cases"
        >
          <View style={styles.sizeRow}>
            <View style={styles.sizeItem}>
              <HeaderLogo />
              <Text style={styles.sizeLabel}>Small (40px)</Text>
            </View>
            <View style={styles.sizeItem}>
              <AppIconLogo />
              <Text style={styles.sizeLabel}>Medium (80px)</Text>
            </View>
            <View style={styles.sizeItem}>
              <MainLogo />
              <Text style={styles.sizeLabel}>Large (120px)</Text>
            </View>
          </View>
        </LogoSection>

        {/* Usage Guidelines */}
        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>Usage Guidelines</Text>
          <View style={styles.guideline}>
            <Text style={styles.guidelineTitle}>• Colors:</Text>
            <Text style={styles.guidelineText}>Primary: #FFD700 (Gold), Secondary: #000 (Black), Background: #FFF (White)</Text>
          </View>
          <View style={styles.guideline}>
            <Text style={styles.guidelineTitle}>• Minimum Size:</Text>
            <Text style={styles.guidelineText}>Never use smaller than 24px to maintain readability</Text>
          </View>
          <View style={styles.guideline}>
            <Text style={styles.guidelineTitle}>• Clear Space:</Text>
            <Text style={styles.guidelineText}>Maintain minimum padding equal to 25% of logo size</Text>
          </View>
          <View style={styles.guideline}>
            <Text style={styles.guidelineTitle}>• Background:</Text>
            <Text style={styles.guidelineText}>Works best on light backgrounds, use white version for dark backgrounds</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 15,
    lineHeight: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  splashButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  splashButtonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  splashButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerDemo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2C',
    padding: 15,
    borderRadius: 10,
  },
  demoText: {
    color: '#FFFFFF',
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  minimalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  sizeItem: {
    alignItems: 'center',
  },
  sizeLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 8,
    fontWeight: '500',
  },
  guidelines: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  guidelinesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 15,
  },
  guideline: {
    marginBottom: 12,
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  guidelineText: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 2,
    lineHeight: 18,
  },
});

export default LogoShowcase;
