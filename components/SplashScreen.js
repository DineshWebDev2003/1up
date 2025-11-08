import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TNKidsLogo from './TNKidsLogo';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onAnimationComplete }) => {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(50)).current;
  const circleScale = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startAnimation();
  }, []);

  const startAnimation = () => {
    // Background fade in
    Animated.timing(backgroundOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Circle animation
    Animated.sequence([
      Animated.timing(circleScale, {
        toValue: 1.2,
        duration: 800,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
      Animated.timing(circleScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo animation
    Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1000,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Text animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);

    // Sparkle animation
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleOpacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, 1000);

    // Complete animation
    setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 3500);
  };

  const logoRotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const Sparkle = ({ style }) => (
    <Animated.View style={[styles.sparkle, style, { opacity: sparkleOpacity }]}>
      <View style={styles.sparkleInner} />
    </Animated.View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: backgroundOpacity }]}>
      <LinearGradient
        colors={['#FFD700', '#FFA500', '#FF8C00']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Background Circles */}
        <Animated.View style={[
          styles.backgroundCircle,
          styles.circle1,
          { transform: [{ scale: circleScale }] }
        ]} />
        <Animated.View style={[
          styles.backgroundCircle,
          styles.circle2,
          { transform: [{ scale: circleScale }] }
        ]} />
        <Animated.View style={[
          styles.backgroundCircle,
          styles.circle3,
          { transform: [{ scale: circleScale }] }
        ]} />

        {/* Sparkles */}
        <Sparkle style={{ top: '20%', left: '15%' }} />
        <Sparkle style={{ top: '25%', right: '20%' }} />
        <Sparkle style={{ top: '70%', left: '10%' }} />
        <Sparkle style={{ top: '75%', right: '15%' }} />
        <Sparkle style={{ top: '40%', left: '5%' }} />
        <Sparkle style={{ top: '60%', right: '8%' }} />

        {/* Main Content */}
        <View style={styles.content}>
          {/* Logo */}
          <Animated.View style={[
            styles.logoContainer,
            {
              transform: [
                { scale: logoScale },
                { rotate: logoRotateInterpolate }
              ]
            }
          ]}>
            <TNKidsLogo size={150} showText={false} />
          </Animated.View>

          {/* App Name */}
          <Animated.View style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textSlide }]
            }
          ]}>
            <Text style={styles.appName}>TN Kids+</Text>
            <Text style={styles.tagline}>Learning Made Fun</Text>
          </Animated.View>
        </View>

        {/* Loading Indicator */}
        <Animated.View style={[styles.loadingContainer, { opacity: textOpacity }]}>
          <View style={styles.loadingBar}>
            <Animated.View style={[
              styles.loadingProgress,
              { transform: [{ scaleX: logoScale }] }
            ]} />
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: width * 0.8,
    height: width * 0.8,
    top: -width * 0.2,
    left: -width * 0.2,
  },
  circle2: {
    width: width * 0.6,
    height: width * 0.6,
    bottom: -width * 0.1,
    right: -width * 0.1,
  },
  circle3: {
    width: width * 0.4,
    height: width * 0.4,
    top: height * 0.1,
    right: -width * 0.1,
  },
  sparkle: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  sparkleInner: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    borderRadius: 4,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default SplashScreen;
