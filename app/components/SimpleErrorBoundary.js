import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import colors or define them inline to avoid dependency issues
const colors = {
  background: '#f8fafc',
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  primary: '#8b5cf6',
  danger: '#dc2626',
  white: '#ffffff'
};
import AsyncStorage from '@react-native-async-storage/async-storage';

class SimpleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error Boundary Caught Error:', error);
    console.error('🚨 Error Info:', errorInfo);
    
    this.setState({
      error: error,
    });

    // Log error locally
    this.logError(error, errorInfo);
  }

  logError = async (error, errorInfo) => {
    try {
      const crashData = {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount
      };
      
      await AsyncStorage.setItem('lastCrash', JSON.stringify(crashData));
      console.log('💾 Crash data saved');
    } catch (e) {
      console.error('Failed to save crash data:', e);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleClearData = async () => {
    try {
      await AsyncStorage.multiRemove(['sessionToken', 'userData', 'userRole']);
      Alert.alert(
        'Data Cleared',
        'App data has been cleared. Please restart the app.',
        [
          { 
            text: 'Close App', 
            onPress: () => BackHandler.exitApp()
          }
        ]
      );
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons 
              name="alert-circle-outline" 
              size={80} 
              color="#dc2626" 
            />
            
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              The app encountered an error. You can try again or restart the app.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.retryButton]} 
                onPress={this.handleRetry}
              >
                <MaterialCommunityIcons name="refresh" size={20} color="white" />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.clearButton]} 
                onPress={this.handleClearData}
              >
                <MaterialCommunityIcons name="delete-sweep" size={20} color="white" />
                <Text style={styles.buttonText}>Clear Data</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.retryCount}>
              Attempts: {this.state.retryCount}
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 350,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: colors.primary,
  },
  clearButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  retryCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 10,
  },
});

export default SimpleErrorBoundary;
