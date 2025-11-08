import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import Colors from './constants/colors';
import authFetch from './utils/api';
import { useNotifications } from './contexts/NotificationContext';
import ModernBackground from './components/ModernBackground';
import { clearApiUrlCache } from '../config';
import { handleLoginError, validateLoginFields, handleLoginSuccess, setErrorPopupRef } from './components/LoginErrorHandler';
import LoginErrorPopup from './components/LoginErrorPopup';
import TNKidsLogo from './components/TNKidsLogo';

const { width, height } = Dimensions.get('window');

const roleRoutes = {
    'Admin': '/(admin)/home',
    'Administrator': '/(admin)/home',
    'Franchisee': '/(franchisee)/home',
    'Student': '/(student)/home',
    'Teacher': '/(teacher)/home',
    'Tuition Student': '/(tuition-student)/home',
    'Tuition Teacher': '/(tuition-teacher)/home',
    'Captain': '/(captain)/home',
    'Developer': '/(developer)/home',
    // Add lowercase variants for robustness
    'admin': '/(admin)/home',
    'administrator': '/(admin)/home',
    'franchisee': '/(franchisee)/home',
    'student': '/(student)/home',
    'teacher': '/(teacher)/home',
    'tuition student': '/(tuition-student)/home',
    'tuition teacher': '/(tuition-teacher)/home',
    'captain': '/(captain)/home',
    'developer': '/(developer)/home',
};

export default function LoginScreen() {
    const router = useRouter();
    const { refreshToken } = useNotifications();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setPasswordVisible] = useState(false);
    const [tapCount, setTapCount] = useState(0);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [customUrl, setCustomUrl] = useState('');
    const [errorPopup, setErrorPopup] = useState({ visible: false, title: '', message: '', type: 'error' });
    const [focusedInput, setFocusedInput] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [iconStyles, setIconStyles] = useState([]);

    // Background icons for floating elements
    const backgroundIcons = [
        'school', 'child-care', 'palette', 'music-note', 'sports-soccer', 'book',
        'toys', 'cake', 'star', 'favorite', 'emoji-emotions', 'celebration',
        'auto-stories', 'brush', 'color-lens', 'games', 'park', 'pets',
        'local-florist', 'wb-sunny', 'cloud', 'beach-access', 'nature', 'eco'
    ];

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();

        const numRows = 6;
        const numCols = 4;
        const cellWidth = 100 / numCols;
        const cellHeight = 100 / numRows;

        const styles = backgroundIcons.map((_, index) => {
            const row = Math.floor(index / numCols);
            const col = index % numCols;

            // Center the icon in the cell and add a larger random offset
            const x = col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 15;
            const y = row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * 15;

            return {
                position: 'absolute',
                top: `${y}%`,
                left: `${x}%`,
                transform: [{ rotate: `${Math.floor(Math.random() * 61) - 30}deg` }],
            };
        });
        setIconStyles(styles);
        
        // Load saved custom URL
        loadCustomUrl();
        
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

    const loadCustomUrl = async () => {
        try {
            const savedUrl = await AsyncStorage.getItem('customApiUrl');
            if (savedUrl) {
                setCustomUrl(savedUrl);
            } else {
                // Load default from config
                const { API_URL } = require('../config');
                setCustomUrl(API_URL);
            }
        } catch (error) {
            console.error('Error loading custom URL:', error);
        }
    };

    const handleLogoTap = () => {
        const newTapCount = tapCount + 1;
        setTapCount(newTapCount);
        
        if (newTapCount === 3) {
            setShowUrlModal(true);
            setTapCount(0); // Reset tap count
        }
        
        // Reset tap count after 2 seconds if not reached 3
        setTimeout(() => {
            if (tapCount < 3) {
                setTapCount(0);
            }
        }, 2000);
    };

    const handleUrlSave = async () => {
        if (!customUrl.trim()) {
            Alert.alert('Error', 'Please enter a valid URL');
            return;
        }
        
        // Validate URL format
        if (!customUrl.trim().startsWith('http://') && !customUrl.trim().startsWith('https://')) {
            Alert.alert('Error', 'URL must start with http:// or https://');
            return;
        }
        
        try {
            await AsyncStorage.setItem('customApiUrl', customUrl.trim());
            clearApiUrlCache(); // Clear the cached API URL
            Alert.alert(
                'Success', 
                'API URL updated successfully. The app will use the new URL for all API calls.',
                [
                    { text: 'OK', onPress: () => setShowUrlModal(false) }
                ]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to save URL');
        }
    };

    const closeErrorPopup = () => {
        setErrorPopup({ visible: false, title: '', message: '', type: 'error' });
    };

    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);
            console.log('🔐 Starting Google Sign-In...');
            
            // Show immediate feedback
            setErrorPopup({
                visible: true,
                title: 'Google Sign-In',
                message: 'Initializing Google Sign-In...',
                type: 'info'
            });
            
            const result = await simpleGoogleSignInService.signIn();
            
            // Close info popup
            setErrorPopup({ visible: false, title: '', message: '', type: 'error' });
            
            if (result.success) {
                console.log('✅ Google Sign-In successful:', result.user);
                
                // Store user data and session
                await AsyncStorage.setItem('userData', JSON.stringify(result.user));
                await AsyncStorage.setItem('sessionToken', result.token);
                await AsyncStorage.setItem('userRole', result.user.role);
                
                // Refresh FCM token after successful login
                try {
                    await refreshToken();
                    console.log('FCM token refreshed successfully');
                } catch (pushError) {
                    console.log('FCM token refresh failed:', pushError.message);
                }
                
                // Navigate based on role
                const userRole = result.user.role;
                const path = roleRoutes[userRole];
                
                if (path) {
                    console.log('✅ Google Sign-In - Navigating to path:', path, 'for role:', userRole);
                    router.replace(path);
                } else {
                    setErrorPopup({
                        visible: true,
                        title: 'Login Failed',
                        message: `Unknown user role: ${userRole}`,
                        type: 'error'
                    });
                }
            } else {
                setErrorPopup({
                    visible: true,
                    title: 'Google Sign-In Failed',
                    message: result.error || 'Unknown error occurred',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('❌ Google Sign-In error:', error);
            setErrorPopup({
                visible: true,
                title: 'Google Sign-In Error',
                message: error.message || 'Failed to sign in with Google',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        // Mock users for development
        const mockUsers = {
            'admin': { role: 'Admin' },
            'student': { role: 'Student' },
            'teacher': { role: 'Teacher' },
            'captain': { role: 'Captain' },
            'franchisee': { role: 'Franchisee' },
            'tuition student': { role: 'Tuition Student' },
            'tuition teacher': { role: 'Tuition Teacher' },
        };

        const trimmedEmail = email.trim().toLowerCase();
        if (mockUsers[trimmedEmail]) {
            const userRole = mockUsers[trimmedEmail].role;
            const path = roleRoutes[userRole];
            
            console.log('🔍 MOCK DEBUG - User role:', userRole);
            console.log('🔍 MOCK DEBUG - Path found:', path);
            console.log('🔍 MOCK DEBUG - Available routes:', Object.keys(roleRoutes));
            
            if (path) {
                await AsyncStorage.setItem('userRole', userRole);
                console.log('✅ Mock Login - Navigating to path:', path, 'for role:', userRole);
                // For admin mock login, set admin user data
                if (userRole === 'Admin') {
                    const mockUserData = JSON.stringify({ 
                        id: 101, 
                        role: 'admin', 
                        username: 'admin',
                        name: 'Admin Test User',
                        email: 'admin@test.com'
                    });
                    await AsyncStorage.setItem('userData', mockUserData);
                }
                // For student mock login, also set mock user data for the home screen to use
                if (userRole === 'Student') {
                    const mockUserData = JSON.stringify({ 
                        id: 'mock-student-01', 
                        name: 'Mock Student',
                        role: 'Student',
                        class_name: 'Playschool',
                        branch_name: 'Main Branch'
                    });
                    await AsyncStorage.setItem('userData', mockUserData);
                }
                // For captain mock login, set captain user data
                if (userRole === 'Captain') {
                    const mockUserData = JSON.stringify({ 
                        id: 'captain', 
                        name: 'Captain Test User', 
                        role: 'captain',
                        avatar: 'https://i.pravatar.cc/150?u=captain',
                        branch: 'Main Branch'
                    });
                    await AsyncStorage.setItem('userData', mockUserData);
                }
                // For franchisee mock login, set franchisee user data
                if (userRole === 'Franchisee') {
                    const mockUserData = JSON.stringify({ 
                        id: 'franchisee', 
                        name: 'Franchisee Test User', 
                        role: 'franchisee',
                        avatar: 'https://i.pravatar.cc/150?u=franchisee',
                        branch: 'Main Branch'
                    });
                    await AsyncStorage.setItem('userData', mockUserData);
                }
                // For teacher mock login, set teacher user data
                if (userRole === 'Teacher') {
                    const mockUsers = {
                        'teacher': { 
                          id: 'teacher', 
                          name: 'Teacher Test User', 
                          role: 'teacher',
                          avatar: 'https://i.pravatar.cc/150?u=teacher',
                          branch: 'Main Branch'
                        },
                        'captain': { 
                          id: 'captain', 
                          name: 'Captain Test User', 
                          role: 'captain',
                          avatar: 'https://i.pravatar.cc/150?u=captain',
                          branch: 'Main Branch'
                        },
                        'franchisee': { 
                          id: 'franchisee', 
                          name: 'Franchisee Test User', 
                          role: 'franchisee',
                          avatar: 'https://i.pravatar.cc/150?u=franchisee',
                          branch: 'Main Branch'
                        },
                    };
                    const mockUserData = JSON.stringify({ 
                        id: 201, 
                        branchId: 1, 
                        role: 'teacher', 
                        username: 'teacher',
                        name: 'Teacher Test User',
                        branch: 'Main Branch',
                        photo: 'https://randomuser.me/api/portraits/women/44.jpg'
                    });
                    await AsyncStorage.setItem('userData', mockUserData);
                }
                
                // Add extra debugging for student route
                if (userRole === 'Student') {
                    console.log('🎓 STUDENT MOCK TEST - Attempting navigation to:', path);
                    console.log('🎓 STUDENT MOCK TEST - Route exists in config:', roleRoutes['Student']);
                }
                
                console.log('✅ Mock Login - Navigating to path:', path, 'for role:', userRole);
                router.replace(path);
            } else {
                Alert.alert('Login Failed', `Unknown user role: ${userRole}`);
            }
            return;
        }

        // Validate input fields with user-friendly messages
        if (!validateLoginFields(email, password)) {
            return;
        }
        setLoading(true);
        try {
            // Check if input is email or phone
            const isEmail = email.includes('@');
            const loginData = isEmail 
                ? { email: email.trim(), password: password.trim() }
                : { phone: email.trim(), password: password.trim() };
            
            console.log('Login attempt with:', isEmail ? 'email' : 'phone', email.trim());
            
            const response = await authFetch('/api/auth/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });
            
            const data = await response.json();
            console.log('Server login response:', data);
            
            if (data.success) {
                if (data.data && data.data.role) {
                    await AsyncStorage.setItem('userRole', data.data.role);
                    await AsyncStorage.setItem('sessionToken', data.data.session_token);
                    await AsyncStorage.setItem('userData', JSON.stringify(data.data));
                    
                    // Handle successful login
                    handleLoginSuccess(data.data);
                    
                    // Refresh FCM token after successful login
                    try {
                        await refreshToken();
                        console.log('FCM token refreshed successfully');
                    } catch (pushError) {
                        console.log('FCM token refresh failed:', pushError.message);
                    }
                    
                    const userRole = data.data.role;
                    const path = roleRoutes[userRole];
                    
                    console.log('🔍 DEBUG - User role received:', userRole);
                    console.log('🔍 DEBUG - Role type:', typeof userRole);
                    console.log('🔍 DEBUG - Available routes:', Object.keys(roleRoutes));
                    console.log('🔍 DEBUG - Path found:', path);
                    
                    if (path) {
                        console.log('✅ Mock Login - Navigating to path:', path, 'for role:', userRole);
                
                // Add extra debugging for student route
                if (userRole === 'Student') {
                    console.log('🎓 STUDENT ROUTE TEST - Attempting navigation to:', path);
                    console.log('🎓 STUDENT ROUTE TEST - Route exists in config:', roleRoutes['Student']);
                }
                
                router.replace(path);
                    } else {
                        console.log('❌ No route found for role:', userRole);
                        // Try with lowercase
                        const lowerPath = roleRoutes[userRole.toLowerCase()];
                        if (lowerPath) {
                            console.log('✅ Found lowercase route:', lowerPath);
                            router.replace(lowerPath);
                        } else {
                            // Use user-friendly error for unknown role
                            handleLoginError(new Error('Invalid user role'), response);
                        }
                    }
                } else {
                    // Handle incomplete login data
                    handleLoginError(new Error('Incomplete login data'), response);
                }
            } else {
                // Handle login failure with server message
                const errorMessage = data.message || 'Login failed';
                handleLoginError(new Error(errorMessage), response);
            }
        } catch (error) {
            // Handle all other errors with user-friendly messages
            handleLoginError(error, null);
        } finally {
            setLoading(false);
        }
    };

    // Modern floating elements for background
    const FloatingElement = ({ style, children }) => (
        <Animated.View style={[styles.floatingElement, style]}>
            {children}
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
            
            {/* Top Half - Playschool Background Section */}
            <View style={styles.topSection}>
                <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80' }}
                    style={styles.playingImage}
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['rgba(255,107,107,0.1)', 'rgba(78,205,196,0.2)', 'rgba(255,255,255,0.95)']}
                    style={styles.imageOverlay}
                />
                
                {/* Floating Playful Elements */}
                <View style={styles.floatingElementsContainer}>
                    <Animatable.View animation="bounce" iterationCount="infinite" duration={2000} style={[styles.floatingIcon, { top: '15%', left: '10%' }]}>
                        <MaterialIcons name="school" size={24} color="rgba(255,193,7,0.8)" />
                    </Animatable.View>
                    <Animatable.View animation="bounce" iterationCount="infinite" duration={2500} delay={500} style={[styles.floatingIcon, { top: '25%', right: '15%' }]}>
                        <MaterialIcons name="palette" size={20} color="rgba(76,175,80,0.8)" />
                    </Animatable.View>
                    <Animatable.View animation="bounce" iterationCount="infinite" duration={3000} delay={1000} style={[styles.floatingIcon, { top: '35%', left: '20%' }]}>
                        <MaterialIcons name="toys" size={18} color="rgba(233,30,99,0.8)" />
                    </Animatable.View>
                    <Animatable.View animation="bounce" iterationCount="infinite" duration={2200} delay={1500} style={[styles.floatingIcon, { top: '20%', right: '25%' }]}>
                        <MaterialIcons name="child-care" size={22} color="rgba(156,39,176,0.8)" />
                    </Animatable.View>
                    <Animatable.View animation="bounce" iterationCount="infinite" duration={2800} delay={2000} style={[styles.floatingIcon, { top: '40%', right: '10%' }]}>
                        <MaterialIcons name="star" size={16} color="rgba(255,152,0,0.8)" />
                    </Animatable.View>
                </View>
                
                {/* Logo and Title Overlay */}
                <View style={styles.logoOverlay}>
                    <TouchableOpacity onPress={handleLogoTap} activeOpacity={1}>
                        <Animatable.View animation="bounceIn" duration={1200} style={styles.logoContainer}>
                            <View style={styles.modernLogoWrapper}>
                                <TNKidsLogo size={90} showText={false} />
                            </View>
                        </Animatable.View>
                    </TouchableOpacity>
                    <Animatable.Text animation="fadeInUp" delay={600} style={styles.overlayTitle}>TN Happy Kids</Animatable.Text>
                    <Animatable.Text animation="fadeInUp" delay={800} style={styles.overlaySubtitle}>🎨 Creative Learning Platform 🌟</Animatable.Text>
                </View>
            </View>

            {/* Bottom Half - Login Form */}
            <KeyboardAvoidingView 
                style={styles.bottomSection}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animatable.View animation="slideInUp" duration={800} style={styles.loginContainer}>
                    <View style={styles.welcomeSection}>
                        <View style={styles.welcomeHeader}>
                            <MaterialIcons name="waving-hand" size={28} color="#FF6B6B" style={styles.waveIcon} />
                            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
                        </View>
                        <Text style={styles.welcomeSubtext}>Ready for another fun learning adventure? 🚀</Text>
                    </View>

                    <View style={styles.formSection}>
                        {/* Input Fields Section */}
                        <View style={styles.inputSection}>
                            <View style={[styles.inputContainer, focusedInput === 'email' && styles.inputFocused]}>
                                <Feather name="mail" size={20} color={focusedInput === 'email' ? '#4285F4' : '#666'} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email or Phone Number"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="default"
                                    autoCapitalize="none"
                                    onFocus={() => setFocusedInput('email')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                            </View>
                            
                            <View style={[styles.inputContainer, focusedInput === 'password' && styles.inputFocused]}>
                                <Feather name="lock" size={20} color={focusedInput === 'password' ? '#4285F4' : '#666'} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!isPasswordVisible}
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                                <TouchableOpacity 
                                    onPress={() => setPasswordVisible(!isPasswordVisible)} 
                                    style={styles.eyeIcon}
                                    activeOpacity={0.7}
                                >
                                    <Feather 
                                        name={isPasswordVisible ? 'eye-off' : 'eye'} 
                                        size={20} 
                                        color={focusedInput === 'password' ? '#4285F4' : '#666'} 
                                    />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.forgotPassword} activeOpacity={0.7}>
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Buttons Section */}
                        <View style={styles.buttonsSection}>
                            {/* Login Button */}
                            <TouchableOpacity 
                                style={[styles.signInButton, styles.fullWidthButton, loading && styles.buttonDisabled]} 
                                onPress={handleLogin} 
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#FF6B6B', '#4ECDC4']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.signInGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <View style={styles.signInContent}>
                                            <MaterialIcons name="login" size={18} color="#FFFFFF" style={styles.signInIcon} />
                                            <Text style={styles.signInButtonText}>Let's Go! 🎯</Text>
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animatable.View>
            </KeyboardAvoidingView>
            
            {/* API URL Modal */}
            <Modal
                visible={showUrlModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowUrlModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>API Configuration</Text>
                            <Text style={styles.modalSubtitle}>Enter custom API URL</Text>
                            
                            <View style={styles.modalInputContainer}>
                                <Feather name="server" size={20} color="#666" style={styles.modalInputIcon} />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="http://192.168.1.5/lastchapter"
                                    placeholderTextColor="#999"
                                    value={customUrl}
                                    onChangeText={setCustomUrl}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                            
                            <Text style={styles.modalHint}>Current URL: {customUrl || 'Using default'}</Text>
                            
                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={styles.modalCancelButton}
                                    onPress={() => {
                                        setShowUrlModal(false);
                                        loadCustomUrl();
                                    }}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.modalSaveButton}
                                    onPress={handleUrlSave}
                                >
                                    <Text style={styles.modalSaveText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
            
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
        backgroundColor: 'transparent',
    },
    
    // Top Section - Playschool Background
    topSection: {
        height: height * 0.45,
        position: 'relative',
    },
    playingImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    floatingElementsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    floatingIcon: {
        position: 'absolute',
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    logoOverlay: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    logoContainer: {
        marginBottom: 20,
    },
    modernLogoWrapper: {
        padding: 15,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.95)',
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
        borderWidth: 3,
        borderColor: 'rgba(255,107,107,0.2)',
    },
    overlayTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#2D3748',
        marginBottom: 8,
        textAlign: 'center',
        textShadowColor: 'rgba(255,255,255,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        letterSpacing: -0.5,
    },
    overlaySubtitle: {
        fontSize: 16,
        color: '#4A5568',
        textAlign: 'center',
        fontWeight: '600',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
    },
    
    // Bottom Section - Login Form
    bottomSection: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        paddingBottom: 20,
    },
    loginContainer: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 40,
        paddingBottom: 30,
    },
    welcomeSection: {
        marginBottom: 24,
        alignItems: 'center',
    },
    welcomeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    waveIcon: {
        marginRight: 12,
    },
    welcomeTitle: {
        fontSize: 30,
        fontWeight: '900',
        color: '#2D3748',
        letterSpacing: -0.5,
    },
    welcomeSubtext: {
        fontSize: 17,
        color: '#718096',
        fontWeight: '600',
        lineHeight: 26,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    
    // Form Section
    formSection: {
        flex: 1,
        justifyContent: 'space-between',
    },
    inputSection: {
        flex: 0,
    },
    buttonsSection: {
        flex: 0,
        justifyContent: 'flex-end',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        paddingHorizontal: 20,
        height: 56,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        shadowColor: '#4299E1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    inputFocused: {
        borderColor: '#4299E1',
        backgroundColor: '#FFFFFF',
        shadowColor: '#4299E1',
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
        transform: [{ scale: 1.02 }],
    },
    inputIcon: {
        marginRight: 15,
    },
    input: {
        flex: 1,
        fontSize: 17,
        color: '#2D3748',
        fontWeight: '600',
    },
    eyeIcon: {
        padding: 10,
    },
    
    // Forgot Password
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 20,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    forgotPasswordText: {
        fontSize: 15,
        color: '#4299E1',
        fontWeight: '700',
    },
    
    // Sign In Button
    signInButton: {
        flex: 1,
        borderRadius: 16,
        height: 56,
        marginRight: 6,
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    signInGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    signInContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    signInIcon: {
        marginRight: 8,
    },
    signInButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    fullWidthButton: {
        flex: 0,
        width: '100%',
    },
    
    // Divider
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 28,
    },
    dividerLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#E2E8F0',
        borderRadius: 1,
    },
    dividerText: {
        marginHorizontal: 20,
        fontSize: 13,
        color: '#A0AEC0',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
    },
    
    // Google Button
    googleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        height: 56,
        borderWidth: 2,
        borderColor: '#E8F4FD',
        shadowColor: '#4285F4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        marginLeft: 6,
    },
    googleButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleIconContainer: {
        marginRight: 8,
        padding: 2,
        borderRadius: 6,
        backgroundColor: '#F7FAFC',
    },
    googleButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2D3748',
        letterSpacing: 0.2,
    },
    devNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 4,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FFF8E1',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    devNoteIcon: {
        marginRight: 8,
    },
    devNoteText: {
        fontSize: 13,
        color: '#F57C00',
        fontWeight: '600',
        textAlign: 'center',
    },
    
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.85,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    modalContent: {
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
    },
    modalInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: 16,
        height: 48,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    modalInputIcon: {
        marginRight: 12,
    },
    modalInput: {
        flex: 1,
        fontSize: 14,
        color: '#000',
        fontWeight: '500',
    },
    modalHint: {
        fontSize: 12,
        color: '#999',
        marginBottom: 24,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalCancelButton: {
        flex: 1,
        marginRight: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    modalSaveButton: {
        flex: 1,
        marginLeft: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: '#FF6B6B',
        alignItems: 'center',
    },
    modalSaveText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
