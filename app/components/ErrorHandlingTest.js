import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import LoginErrorPopup from './LoginErrorPopup';
import { handleLoginError, validateLoginFields, setErrorPopupRef } from './LoginErrorHandler';

export default function ErrorHandlingTest() {
  const router = useRouter();
  const [errorPopup, setErrorPopup] = useState({ visible: false, title: '', message: '', type: 'error' });

  React.useEffect(() => {
    // Set up error popup reference
    setErrorPopupRef((errorData) => {
      setErrorPopup({
        visible: true,
        title: errorData.title,
        message: errorData.message,
        type: errorData.type || 'error'
      });
    });
  }, []);

  const closeErrorPopup = () => {
    setErrorPopup({ visible: false, title: '', message: '', type: 'error' });
  };

  const testScenarios = [
    {
      title: 'Network Error',
      description: 'Simulate network connection failure',
      action: () => handleLoginError(new Error('Network request failed')),
      type: 'error'
    },
    {
      title: 'Invalid Credentials',
      description: 'Wrong email/password combination',
      action: () => handleLoginError(new Error('Invalid credentials')),
      type: 'error'
    },
    {
      title: 'Server Error',
      description: 'Internal server error (500)',
      action: () => handleLoginError(new Error('Server error'), { status: 500 }),
      type: 'error'
    },
    {
      title: 'Account Suspended',
      description: 'Account has been suspended',
      action: () => handleLoginError(new Error('Account suspended'), { status: 403 }),
      type: 'error'
    },
    {
      title: 'Missing Fields',
      description: 'Empty email and password',
      action: () => validateLoginFields('', ''),
      type: 'warning'
    },
    {
      title: 'Invalid Format',
      description: 'Invalid email format',
      action: () => validateLoginFields('invalid-email', 'password123'),
      type: 'warning'
    },
    {
      title: 'Success Message',
      description: 'Show success popup',
      action: () => {
        setErrorPopup({
          visible: true,
          title: 'Login Successful',
          message: 'Welcome back! You have been successfully logged in.',
          type: 'success'
        });
      },
      type: 'success'
    },
    {
      title: 'Info Message',
      description: 'Show info popup',
      action: () => {
        setErrorPopup({
          visible: true,
          title: 'Information',
          message: 'This is an informational message to guide the user.',
          type: 'info'
        });
      },
      type: 'info'
    }
  ];

  const getIconForType = (type) => {
    switch (type) {
      case 'success': return 'check-circle';
      case 'warning': return 'alert-circle';
      case 'info': return 'information';
      default: return 'close-circle';
    }
  };

  const getColorForType = (type) => {
    switch (type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#ef4444';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Error Handling Test</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.subtitle}>
          Test different error scenarios to see how users will experience them in production.
        </Text>

        {testScenarios.map((scenario, index) => (
          <TouchableOpacity
            key={index}
            style={styles.testButton}
            onPress={scenario.action}
            activeOpacity={0.7}
          >
            <View style={styles.testButtonContent}>
              <View style={[styles.iconContainer, { backgroundColor: getColorForType(scenario.type) }]}>
                <MaterialCommunityIcons
                  name={getIconForType(scenario.type)}
                  size={24}
                  color={Colors.white}
                />
              </View>
              <View style={styles.testButtonText}>
                <Text style={styles.testButtonTitle}>{scenario.title}</Text>
                <Text style={styles.testButtonDescription}>{scenario.description}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="lightbulb-outline" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            In production, users will see these friendly messages instead of technical errors.
            Developers can still see detailed error information in the console for debugging.
          </Text>
        </View>
      </ScrollView>

      {/* Error Popup */}
      <LoginErrorPopup
        visible={errorPopup.visible}
        onClose={closeErrorPopup}
        title={errorPopup.title}
        message={errorPopup.message}
        type={errorPopup.type}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  testButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  testButtonText: {
    flex: 1,
  },
  testButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  testButtonDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: 12,
    lineHeight: 20,
  },
});
