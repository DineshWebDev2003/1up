import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Switch, Modal, TextInput, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import WhiteBackground from '../components/WhiteBackground';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../contexts/ThemeContext';
import { API_URL } from '../../config';

const SettingsScreen = () => {
  const router = useRouter();
  const Colors = useColors();
  const { isDarkMode, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: null });

  const loadUserData = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userData');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        console.log('Teacher settings - loaded user data:', userData);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Refresh user data when screen comes into focus (e.g., returning from edit-profile)
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['userData', 'sessionToken']);
              router.replace('/login');
            } catch (error) {
              console.error('Error during logout:', error);
              router.replace('/login');
            }
          }
        }
      ]
    );
  };

  const openModal = (title, content) => {
    setModalContent({ title, content });
    setModalVisible(true);
  };


  const aboutContent = (
    <Text style={[styles.modalText, { color: '#666666' }]}>
      Welcome to TN Happy kids Play School, a nurturing and vibrant learning community where curiosity and imagination thrive! Our mission is to inspire a love of learning and build confidence in each child.
    </Text>
  );

  const helpContent = (
    <Text style={[styles.modalText, { color: '#666666' }]}>
      For any support or queries, please contact us at support@tnhappykids.in or call us at +91 9514900069.
    </Text>
  );

  const settingsSections = [
    {
      title: 'General',
      options: [
        { title: 'Notifications', icon: 'notifications', type: 'switch', value: isNotificationsEnabled, action: setNotificationsEnabled },
        { title: 'Dark Mode', icon: 'brightness-4', type: 'switch', value: isDarkMode, action: toggleTheme },
        { title: 'Language', icon: 'language', action: () => alert('Language selection coming soon!') },
      ]
    },
    {
      title: 'Account',
      options: [
        { title: 'Edit Profile', icon: 'person', action: () => router.push('/(common)/edit-profile') },
        { title: 'Change Password', icon: 'lock', action: () => router.push('/(common)/change-password') },
      ]
    },
    {
      title: 'More',
      options: [
        { title: 'About', icon: 'info', action: () => openModal('About Us', aboutContent) },
        { title: 'Help & Support', icon: 'help', action: () => openModal('Help & Support', helpContent) },
      ]
    }
  ];


  return (
    <WhiteBackground>
      <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with Back Button */}
          <Animatable.View animation="fadeInDown" duration={600} delay={100}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={[styles.backButton, { backgroundColor: '#F8F8F8' }]}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={24} color={'#000000'} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: '#000000' }]}>Settings</Text>
              <View style={styles.headerSpacer} />
            </View>
          </Animatable.View>

          {/* Profile Section */}
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
            <View style={[styles.profileContainer, { backgroundColor: '#FFFFFF' }]}>
              <View style={styles.profileHeader}>
                <View style={styles.profileImageContainer}>
                  <Image 
                    source={
                      user?.avatar 
                        ? { uri: user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}` }
                        : user?.profile_image
                        ? { uri: user.profile_image.startsWith('http') ? user.profile_image : `${API_URL}${user.profile_image}` }
                        : require('../../assets/Avartar.png')
                    }
                    style={styles.profileImage}
                    onError={(error) => {
                      console.log('Profile image load error in settings:', error);
                    }}
                  />
                  <View style={styles.profileBadge}>
                    <Text style={styles.profileBadgeText}>TR</Text>
                  </View>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: '#000000' }]}>{user?.name || 'Teacher'}</Text>
                  <Text style={[styles.profileRole, { color: '#FFD700' }]}>Teacher</Text>
                  <Text style={[styles.profileBranch, { color: '#666666' }]}>{user?.branch_name || user?.branch || 'Main Branch'}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.editProfileButton, { backgroundColor: '#F8F8F8' }]}
                  onPress={() => router.push('/(common)/edit-profile')}
                >
                  <MaterialIcons name="edit" size={20} color={'#FFD700'} />
                </TouchableOpacity>
              </View>
            </View>
          </Animatable.View>

          {/* Settings Sections */}
          {settingsSections.map((section, sectionIndex) => (
            <Animatable.View 
              key={sectionIndex} 
              animation="fadeInUp" 
              duration={800} 
              delay={300 + (sectionIndex * 100)}
            >
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: '#000000' }]}>{section.title}</Text>
                <View style={[styles.sectionCard, { backgroundColor: '#FFFFFF' }]}>
                  {section.options.map((option, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.optionButton, 
                        index === section.options.length - 1 && styles.noBorder
                      ]} 
                      onPress={option.type !== 'switch' ? option.action : null} 
                      activeOpacity={option.type === 'switch' ? 1 : 0.7}
                    >
                      <View style={[styles.optionIconContainer, { backgroundColor: '#F8F8F8' }]}>
                        <MaterialIcons name={option.icon} size={22} color={'#FFD700'} />
                      </View>
                      <Text style={[styles.optionText, { color: '#000000' }]}>{option.title}</Text>
                      {option.type === 'switch' ? (
                        <Switch
                          trackColor={{ false: '#F8F8F8', true: '#FFD700' }}
                          thumbColor={option.value ? '#FFFFFF' : '#666666'}
                          onValueChange={option.action}
                          value={option.value}
                        />
                      ) : (
                        <MaterialIcons name="chevron-right" size={20} color={'#666666'} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animatable.View>
          ))}

          {/* Logout Button */}
          <Animatable.View animation="fadeInUp" duration={800} delay={600}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LinearGradient
                colors={['#ff6b6b', '#ee5a52']}
                style={styles.logoutButtonGradient}
              >
                <MaterialIcons name="logout" size={24} color="white" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: '#666666' }]}>Developed by Maasgroup of companies</Text>
          </View>

          {/* Spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalView, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: '#000000' }]}>{modalContent.title}</Text>
            {modalContent.content}
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: '#FFD700' }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </WhiteBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },

  // Profile Section
  profileContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  profileBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 2,
  },
  profileBranch: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Settings Sections
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },

  // Logout Button
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    width: '90%',
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: '#666666',
  },
  closeButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SettingsScreen;
