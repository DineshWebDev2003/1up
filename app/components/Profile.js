import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';
import { API_URL } from '../../config';

const Profile = ({ name, role, branch, profileImage, hasUnreadNotifications = true }) => {
  const router = useRouter();

  return (
    <Animatable.View animation="fadeInDown" duration={600} delay={100}>
      <View style={styles.container}>
        <LinearGradient
          colors={Colors.gradientPrimary}
          style={styles.cardGradient}
        >
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.avatarBackground}
              >
                <Image
                  source={
                    profileImage 
                      ? { uri: profileImage.startsWith('http') ? profileImage : `${API_URL}${profileImage}` }
                      : require('../../assets/Avartar.png')
                  }
                  style={styles.profilePic}
                  onError={(error) => {
                    console.log('Profile image load error:', error);
                  }}
                  onLoad={() => {
                    console.log('Profile image loaded successfully:', profileImage);
                  }}
                />
              </LinearGradient>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.role}>{role}</Text>
              <Text style={styles.branch}>{branch || 'No Branch Assigned'}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton} 
            onPress={() => router.push('/(common)/notifications')}
            activeOpacity={0.7}
          >
            <View style={styles.notificationIconContainer}>
              <Ionicons name="notifications-outline" size={22} color="rgba(255,255,255,0.9)" />
              {hasUnreadNotifications && <View style={styles.notificationDot} />}
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Animatable.View>
  );

};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
    marginVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  cardGradient: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarBackground: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  role: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    marginBottom: 4,
  },
  branch: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  notificationButton: {
    padding: 8,
  },
  notificationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.white,
  },
});

export default Profile;