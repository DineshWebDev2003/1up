import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Switch, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GreenGradientBackground from '../components/GreenGradientBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/colors';

const FranchiseeSettingsScreen = () => {
  const router = useRouter();
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDarkModeEnabled, setDarkModeEnabled] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: null });

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/login');
  };

  const openModal = (title, content) => {
    setModalContent({ title, content });
    setModalVisible(true);
  };

  const aboutContent = (
    <Text style={styles.modalText}>
      Welcome to TN Happy kids Play School, a nurturing and vibrant learning community where curiosity and imagination thrive! Our mission is to inspire a love of learning and build confidence in each child.
    </Text>
  );

  const helpContent = (
    <Text style={styles.modalText}>
      For any support or queries, please contact us at support@tnhappykids.in or call us at +91 9514900069.
    </Text>
  );

  const settingsSections = [
    {
      title: 'General',
      options: [
        { title: 'Notifications', icon: 'notifications-outline', type: 'switch', value: isNotificationsEnabled, action: setNotificationsEnabled },
        { title: 'Dark Mode', icon: 'moon-outline', type: 'switch', value: isDarkModeEnabled, action: setDarkModeEnabled },
        { title: 'Language', icon: 'language-outline', action: () => alert('Language selection coming soon!') },
      ]
    },
    {
      title: 'Account',
      options: [
        { title: 'Edit Profile', icon: 'person-outline', action: () => router.push('/(common)/edit-profile') },
        { title: 'Change Password', icon: 'lock-closed-outline', action: () => router.push('/(common)/change-password') },
      ]
    },
    {
      title: 'More',
      options: [
        { title: 'About', icon: 'information-circle-outline', action: () => openModal('About Us', aboutContent) },
        { title: 'Help & Support', icon: 'help-circle-outline', action: () => openModal('Help & Support', helpContent) },
      ]
    }
  ];

  return (
    <GreenGradientBackground>
      <SafeAreaView style={styles.container}>
        {/* Header with same style as chats */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Franchisee • Preferences</Text>
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          {settingsSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.options.map((option, index) => (
                  <TouchableOpacity key={index} style={[styles.optionButton, index === section.options.length - 1 && styles.noBorder]} onPress={option.type !== 'switch' ? option.action : null} activeOpacity={option.type === 'switch' ? 1 : 0.7}>
                    <Ionicons name={option.icon} size={24} color={Colors.white} style={styles.optionIcon} />
                    <Text style={styles.optionText}>{option.title}</Text>
                    {option.type === 'switch' ? (
                      <Switch
                        trackColor={{ false: 'rgba(255,255,255,0.2)', true: Colors.primary }}
                        thumbColor={option.value ? Colors.white : Colors.lightGray}
                        onValueChange={option.action}
                        value={option.value}
                      />
                    ) : (
                      <Ionicons name="chevron-forward-outline" size={20} color={'rgba(255,255,255,0.5)'} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.white} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

        </ScrollView>
        <Text style={styles.footerText}>Developed by Maasgroup of companies</Text>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>{modalContent.title}</Text>
              {modalContent.content}
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GreenGradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollViewContent: { flexGrow: 1, paddingBottom: 100 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    backgroundColor: Colors.gradientPrimary[0],
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginTop:20,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionContainer: { marginHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.white, marginBottom: 10, marginLeft: 5 },
  sectionCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, overflow: 'hidden' },
  optionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.2)' },
  noBorder: { borderBottomWidth: 0 },
  optionIcon: { marginRight: 20 },
  optionText: { flex: 1, fontSize: 16, color: Colors.white, fontWeight: '500' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', paddingVertical: 15, marginHorizontal: 20, marginTop: 30, borderRadius: 25 },
  logoutButtonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  footerText: { textAlign: 'center', padding: 20, fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { margin: 20, backgroundColor: Colors.card, borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
  modalTitle: { marginBottom: 20, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: Colors.primary },
  modalText: { marginBottom: 15, textAlign: 'center', fontSize: 16, lineHeight: 24, color: Colors.text },
  input: { width: '100%', height: 50, backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  profileOption: { paddingVertical: 15, width: '100%', alignItems: 'center' },
  profileOptionText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  closeButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 30, marginTop: 20, elevation: 2 },
  closeButtonText: { color: Colors.lightText, fontSize: 16, fontWeight: 'bold' },
});

export default FranchiseeSettingsScreen;
