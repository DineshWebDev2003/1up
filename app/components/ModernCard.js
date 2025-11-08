import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';

const ModernCard = ({ 
  children, 
  style, 
  gradient = ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)'],
  onPress,
  animation = 'fadeInUp',
  delay = 0,
  duration = 600,
  shadowIntensity = 'medium'
}) => {
  const getShadowStyle = () => {
    switch (shadowIntensity) {
      case 'light':
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        };
      case 'medium':
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        };
      case 'heavy':
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 12,
        };
      default:
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        };
    }
  };

  const CardContent = () => (
    <View style={[styles.container, getShadowStyle(), style]}>
      <LinearGradient colors={gradient} style={styles.gradient}>
        {children}
      </LinearGradient>
    </View>
  );

  if (onPress) {
    return (
      <Animatable.View animation={animation} duration={duration} delay={delay}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          <CardContent />
        </TouchableOpacity>
      </Animatable.View>
    );
  }

  return (
    <Animatable.View animation={animation} duration={duration} delay={delay}>
      <CardContent />
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginVertical: 8,
  },
  gradient: {
    borderRadius: 20,
    padding: 20,
  },
});

export default ModernCard;
