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
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import Colors from './constants/colors';
import authFetch from './utils/api';
import { sendPushTokenToServer } from './utils/notifications';
import { clearApiUrlCache } from '../config';

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
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPasswordVisible, setPasswordVisible] = useState(false);
    const [tapCount, setTapCount] = useState(0);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [customUrl, setCustomUrl] = useState('');

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

        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
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
                    
                    // Send push token after successful login
                    try {
                        await sendPushTokenToServer();
                        console.log('Push token sent successfully');
                    } catch (pushError) {
                        console.log('Push token registration failed:', pushError.message);
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
                            Alert.alert('Login Failed', `Unknown user role: "${userRole}". Available roles: ${Object.keys(roleRoutes).join(', ')}`);
                        }
                    }
                } else {
                    Alert.alert('Login Failed', 'Incomplete login data received from server.');
                }
            } else {
                Alert.alert('Login Failed', data.message || 'An unknown error occurred.');
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'An error occurred during login.');
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
        <LinearGradient 
            colors={Colors.gradientMain}
            style={styles.container}
        >
            {/* Modern floating background elements */}
            <View style={styles.backgroundElements}>
                <FloatingElement style={[styles.circle1, { opacity: fadeAnim }]}>
                    <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.circleGradient} />
                </FloatingElement>
                <FloatingElement style={[styles.circle2, { opacity: fadeAnim }]}>
                    <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']} style={styles.circleGradient} />
                </FloatingElement>
                <FloatingElement style={[styles.circle3, { opacity: fadeAnim }]}>
                    <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']} style={styles.circleGradient} />
                </FloatingElement>
            </View>

            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView 
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <Animatable.View animation="fadeInUp" duration={800} style={styles.contentContainer}>
                        {/* Header Section */}
                        <View style={styles.headerContainer}>
                            <TouchableOpacity onPress={handleLogoTap} activeOpacity={1}>
                                <View style={styles.logoContainer}>
                                    <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']} style={styles.logoBackground}>
                                        <Image source={require('../assets/Avartar.png')} style={styles.logo} />
                                    </LinearGradient>
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.title}>TN Happy Kids</Text>
                            <Text style={styles.subtitle}>Playschool Management</Text>
                            <Text style={styles.welcomeText}>Welcome back! Please sign in to continue</Text>
                        </View>

                        {/* Login Form */}
                        <Animatable.View animation="fadeInUp" duration={1000} delay={200} style={styles.formContainer}>
                                <View style={styles.formContent}>
                                    <Text style={styles.formTitle}>Sign In</Text>
                                    
                                    <View style={styles.inputGroup}>
                                        <View style={styles.inputContainer}>
                                            <View style={styles.inputIconContainer}>
                                                <Feather name="mail" size={20} color="rgba(255, 255, 255, 0.8)" />
                                            </View>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Email or Phone Number"
                                                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                                value={email}
                                                onChangeText={setEmail}
                                                keyboardType="default"
                                                autoCapitalize="none"
                                                selectionColor={Colors.primary}
                                            />
                                        </View>
                                        
                                        <View style={styles.inputContainer}>
                                            <View style={styles.inputIconContainer}>
                                                <Feather name="lock" size={20} color="rgba(255, 255, 255, 0.8)" />
                                            </View>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Password"
                                                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry={!isPasswordVisible}
                                                selectionColor={Colors.primary}
                                            />
                                            <TouchableOpacity 
                                                onPress={() => setPasswordVisible(!isPasswordVisible)} 
                                                style={styles.eyeIconContainer}
                                            >
                                                <Feather 
                                                    name={isPasswordVisible ? 'eye-off' : 'eye'} 
                                                    size={20} 
                                                    color={Colors.textSecondary} 
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <TouchableOpacity style={styles.forgotPasswordButton}>
                                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
                                        onPress={handleLogin} 
                                        disabled={loading}
                                    >
                                        <LinearGradient colors={Colors.gradientPrimary} style={styles.loginButtonGradient}>
                                            {loading ? (
                                                <ActivityIndicator color={Colors.white} size="small" />
                                            ) : (
                                                <>
                                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                                    <Feather name="arrow-right" size={20} color={Colors.white} style={styles.loginArrow} />
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>

                                </View>
                        </Animatable.View>

                    </Animatable.View>
                </KeyboardAvoidingView>
            </SafeAreaView>
            
            {/* API URL Modal */}
            <Modal
                visible={showUrlModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowUrlModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <LinearGradient 
                            colors={Colors.gradientMain}
                            style={styles.modalContent}
                        >
                            <Text style={styles.modalTitle}>API Configuration</Text>
                            <Text style={styles.modalSubtitle}>Enter custom API URL</Text>
                            
                            <View style={styles.modalInputContainer}>
                                <Feather name="server" size={20} color="rgba(255, 255, 255, 0.8)" style={styles.modalInputIcon} />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="http://192.168.1.100/lastchapter"
                                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                    value={customUrl}
                                    onChangeText={setCustomUrl}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    selectionColor={Colors.primary}
                                />
                            </View>
                            
                            <Text style={styles.modalHint}>Current URL: {customUrl || 'Using default'}</Text>
                            
                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={styles.modalCancelButton}
                                    onPress={() => {
                                        setShowUrlModal(false);
                                        loadCustomUrl(); // Reload the saved URL
                                    }}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.modalSaveButton}
                                    onPress={handleUrlSave}
                                >
                                    <LinearGradient 
                                        colors={Colors.gradientPrimary}
                                        style={styles.modalSaveGradient}
                                    >
                                        <Text style={styles.modalSaveText}>Save</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    
    // Background Elements
    backgroundElements: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
    },
    floatingElement: {
        position: 'absolute',
    },
    circle1: {
        top: height * 0.1,
        right: -width * 0.2,
        width: width * 0.6,
        height: width * 0.6,
    },
    circle2: {
        top: height * 0.3,
        left: -width * 0.3,
        width: width * 0.8,
        height: width * 0.8,
    },
    circle3: {
        bottom: height * 0.1,
        right: -width * 0.1,
        width: width * 0.4,
        height: width * 0.4,
    },
    circleGradient: {
        flex: 1,
        borderRadius: width * 0.4,
    },
    
    // Header Section
    headerContainer: {
        alignItems: 'center',
        paddingTop: 20,
    },
    logoContainer: {
        marginBottom: 24,
    },
    logoBackground: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.white,
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 8,
        textAlign: 'center',
        fontWeight: '500',
    },
    welcomeText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 20,
    },
    
    // Form Container
    formContainer: {
        marginHorizontal: 24,
        paddingVertical: 20,
    },
    formContent: {
        alignItems: 'center',
    },
    formTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.white,
        marginBottom: 32,
        textAlign: 'center',
    },
    
    // Input Group
    inputGroup: {
        width: '100%',
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    inputIconContainer: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.white,
        fontWeight: '500',
    },
    eyeIconContainer: {
        padding: 8,
        marginLeft: 8,
    },
    
    // Forgot Password
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginBottom: 32,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
    },
    
    // Login Button
    loginButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.white,
        letterSpacing: 0.5,
    },
    loginArrow: {
        marginLeft: 8,
    },
    
    // Divider
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
        width: '100%',
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    dividerText: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginHorizontal: 16,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    
    // Google Button
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        height: 56,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginLeft: 12,
    },
    
    // Footer
    footer: {
        alignItems: 'center',
        paddingBottom: 20,
    },
    footerText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
    footerLink: {
        color: Colors.white,
        fontWeight: '600',
    },
    
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.85,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalContent: {
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.white,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 24,
    },
    modalInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    modalInputIcon: {
        marginRight: 12,
    },
    modalInput: {
        flex: 1,
        fontSize: 14,
        color: Colors.white,
        fontWeight: '500',
    },
    modalHint: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
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
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    modalSaveButton: {
        flex: 1,
        marginLeft: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalSaveGradient: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    modalSaveText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.white,
    },
});
