import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Switch, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GreenGradientBackground from '../components/GreenGradientBackground';
import Colors from '../constants/colors';

const TuitionStudentSettingsScreen = () => {
  const router = useRouter();
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isPrivacyLockEnabled, setPrivacyLockEnabled] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: null });

  const handleLogout = () => {
    router.replace('/login');
  };

  const openModal = (title, content) => {
    setModalContent({ title, content });
    setModalVisible(true);
  };

  const aboutContent = (
    <Text style={styles.modalText}>
      Welcome to TN Happy kids Play School Tuition Center, where we provide quality education and nurturing environment for students to excel in their academic journey.
    </Text>
  );

  const editProfileContent = (
    <View style={{width: '100%'}}>
        <TouchableOpacity style={styles.profileOption}>
            <Text style={styles.profileOptionText}>Change Profile Picture</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileOption}>
            <Text style={styles.profileOptionText}>Change Password</Text>
        </TouchableOpacity>
    </View>
  );

  const settingsSections = [
    {
      title: 'Account',
      options: [
        { title: 'Edit Profile', icon: 'person-outline', action: () => openModal('Edit Profile', editProfileContent) },
      ]
    },
    {
      title: 'Preferences',
      options: [
        { title: 'Notifications', icon: 'notifications-outline', type: 'switch', value: isNotificationsEnabled, action: setNotificationsEnabled },
        { title: 'Privacy Lock', icon: 'lock-closed-outline', type: 'switch', value: isPrivacyLockEnabled, action: setPrivacyLockEnabled },
      ]
    },
    {
      title: 'More',
      options: [
        { title: 'About', icon: 'information-circle-outline', action: () => openModal('About Us', aboutContent) },
      ]
    }
  ];

  return (
    <GreenGradientBackground>
      <SafeAreaView style={styles.container}>
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
  sectionContainer: { marginHorizontal: 20, marginTop: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 10, marginLeft: 5 },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' },
  optionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  noBorder: { borderBottomWidth: 0 },
  optionIcon: { marginRight: 20 },
  optionText: { flex: 1, fontSize: 16, color: Colors.white, fontWeight: '500' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: Colors.white, paddingVertical: 15, marginHorizontal: 20, marginTop: 30, borderRadius: 25 },
  logoutButtonText: { color: Colors.white, fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  footerText: { textAlign: 'center', padding: 20, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { margin: 20, backgroundColor: 'rgba(30,30,30,0.9)', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%' },
  modalTitle: { marginBottom: 20, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: Colors.white },
  modalText: { marginBottom: 15, textAlign: 'center', fontSize: 16, lineHeight: 24, color: 'rgba(255,255,255,0.8)' },
  profileOption: { paddingVertical: 15, width: '100%', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  profileOptionText: { color: Colors.white, fontSize: 16, fontWeight: '600' },
  closeButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 30, marginTop: 20 },
  closeButtonText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
});

export default TuitionStudentSettingsScreen;
