import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';

const ModernInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  icon,
  error,
  style,
  inputStyle,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  maxLength,
  onFocus,
  onBlur,
  animation = 'fadeInUp',
  delay = 0
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus && onFocus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur && onBlur();
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!isPasswordVisible);
  };

  return (
    <Animatable.View animation={animation} delay={delay} style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        !editable && styles.inputContainerDisabled
      ]}>
        {icon && (
          <View style={styles.iconContainer}>
            <Feather 
              name={icon} 
              size={20} 
              color={isFocused ? Colors.primary : Colors.textSecondary} 
            />
          </View>
        )}
        <TextInput
          style={[styles.input, inputStyle, multiline && styles.inputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textLight}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          maxLength={maxLength}
          selectionColor={Colors.primary}
        />
        {secureTextEntry && (
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={togglePasswordVisibility}
          >
            <Feather 
              name={isPasswordVisible ? 'eye-off' : 'eye'} 
              size={20} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Animatable.View animation="shake" duration={500}>
          <Text style={styles.errorText}>{error}</Text>
        </Animatable.View>
      )}
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainerError: {
    borderColor: Colors.danger,
    shadowColor: Colors.danger,
  },
  inputContainerDisabled: {
    backgroundColor: Colors.surfaceVariant,
    opacity: 0.7,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
    paddingVertical: 16,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    paddingTop: 16,
    paddingBottom: 16,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default ModernInput;
