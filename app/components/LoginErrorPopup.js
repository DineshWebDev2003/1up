import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';

const LoginErrorPopup = ({ visible, onClose, title, message, type = 'error' }) => {
  const getIconName = () => {
    switch (type) {
      case 'warning':
        return 'alert-circle-outline';
      case 'info':
        return 'information-outline';
      case 'success':
        return 'check-circle-outline';
      default:
        return 'close-circle-outline';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      case 'success':
        return '#10b981';
      default:
        return '#ef4444';
    }
  };

  const getGradientColors = () => {
    switch (type) {
      case 'warning':
        return ['#fef3c7', '#fde68a'];
      case 'info':
        return ['#dbeafe', '#bfdbfe'];
      case 'success':
        return ['#d1fae5', '#a7f3d0'];
      default:
        return ['#fee2e2', '#fecaca'];
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animatable.View 
          animation="zoomIn" 
          duration={300}
          style={styles.container}
        >
          <LinearGradient
            colors={getGradientColors()}
            style={styles.content}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={getIconName()}
                size={60}
                color={getIconColor()}
              />
            </View>
            
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            
            <TouchableOpacity
              style={[styles.button, { backgroundColor: getIconColor() }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Got it</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animatable.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: 30,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LoginErrorPopup;
