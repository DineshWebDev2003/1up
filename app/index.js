import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import Colors from './constants/colors';

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

export default function Index() {
    const [isLoading, setIsLoading] = useState(true);
    const [redirectTo, setRedirectTo] = useState('/login');

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                // Check if user has session token and user data
                const sessionToken = await AsyncStorage.getItem('sessionToken');
                const userData = await AsyncStorage.getItem('userData');
                const userRole = await AsyncStorage.getItem('userRole');

                if (sessionToken && userData && userRole) {
                    // User is authenticated, redirect to their home screen
                    const path = roleRoutes[userRole];
                    if (path) {
                        console.log('✅ User authenticated, redirecting to:', path, 'for role:', userRole);
                        setRedirectTo(path);
                    } else {
                        // Unknown role, redirect to login
                        console.warn('❌ Unknown user role:', userRole, 'redirecting to login');
                        setRedirectTo('/login');
                    }
                } else {
                    // User is not authenticated, redirect to login
                    console.log('❌ User not authenticated, redirecting to login');
                    setRedirectTo('/login');
                }
            } catch (error) {
                console.error('Error checking authentication:', error);
                setRedirectTo('/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthentication();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return <Redirect href={redirectTo} />;
}
