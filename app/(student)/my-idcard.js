import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator, Alert, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch, { API_URL } from '../utils/api';
import Colors from '../constants/colors';
import * as Animatable from 'react-native-animatable';
import FlipCard from 'react-native-flip-card';

const SCHOOL_LOGO = 'https://www.tnhappykids.in/public/images/hk.png';
const DEFAULT_AVATAR = require('../../assets/Avartar.png');

const generateQRValue = (student) => `https://www.tnhappykids.in/verify/${student.studentId}`;

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_RATIO = 0.6; // height/width for vertical card
const CARD_HEIGHT = CARD_WIDTH / CARD_RATIO;

const StudentIDCardScreen = () => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branchData, setBranchData] = useState(null);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        setError('No user data found');
        setLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      
      // Get student profile data
      const response = await authFetch('/api/users/profile_crud.php');
      const result = await response.json();
      
      if (result.success) {
        const profileData = result.data;
        
        // Enhanced student data with proper photo URL
        const enhancedData = {
          ...profileData,
          photo: profileData.avatar_url || 
                 (profileData.avatar ? 
                   (profileData.avatar.startsWith('http') ? profileData.avatar : `${API_URL}${profileData.avatar}`) : 
                   null),
          student_id: profileData.student_id || user.student_id || 'N/A',
          branch_name: profileData.branch_name || user.branch_name || 'TN Happy Kids',
          class_name: profileData.class || user.class_name || 'Student',
          // Priority: student phone > father phone > mother phone > franchisee number
          display_phone: profileData.phone || profileData.father_phone || profileData.mother_phone || profileData.franchisee_number || 'Contact School'
        };
        
        // Set branch data with franchisee number from users table
        const defaultBranchData = {
          name: enhancedData.branch_name,
          franchisee_number: profileData.franchisee_number || 'Contact School',
          phone: profileData.franchisee_number || 'Contact School',
          address: 'TN Happy Kids Playschool'
        };
        
        setStudentData(enhancedData);
        setBranchData(defaultBranchData);
        console.log('✅ Student data loaded:', enhancedData);
        console.log('✅ Branch data loaded:', defaultBranchData);
        console.log('📞 Display phone (student/father):', enhancedData.display_phone);
        console.log('📞 Franchisee number from users table:', profileData.franchisee_number);
      } else {
        setError(result.message || 'Failed to load student data');
      }
    } catch (error) {
      console.error('❌ Failed to load student data:', error);
      setError(error.message || 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your ID card...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadStudentData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animatable.View animation="fadeInDown" duration={600}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Student ID</Text>
            <Text style={styles.headerSubtitle}>Digital Identity Card</Text>
          </View>
        </Animatable.View>

        {studentData && branchData ? (
          <Animatable.View animation="fadeInUp" duration={800} delay={200}>
            <View style={styles.cardContainer}>
              <FlipCard
                flipHorizontal={true}
                flipVertical={false}
                friction={6}
                perspective={1000}
                style={styles.flipCard}
              >
                {/* FRONT SIDE */}
                <LinearGradient
                  colors={['#FFD700', '#FFA500']}
                  style={styles.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <Image source={require('../../assets/logo.png')} style={styles.schoolLogo} />
                    <View style={styles.schoolInfo}>
                      <Text style={styles.schoolName}>TN HAPPY KIDS</Text>
                      <Text style={styles.schoolSubtitle}>PLAYSCHOOL</Text>
                    </View>
                  </View>

                  {/* Student Photo */}
                  <View style={styles.photoSection}>
                    <View style={styles.photoContainer}>
                      <Image
                        source={studentData.photo ? { uri: studentData.photo } : DEFAULT_AVATAR}
                        style={styles.studentPhoto}
                      />
                      <View style={styles.photoFrame} />
                    </View>
                  </View>

                  {/* Student Info */}
                  <View style={styles.infoSection}>
                    <Text style={styles.studentName} numberOfLines={2}>
                      {studentData.name || 'Student Name'}
                    </Text>
                    
                    <View style={styles.infoGrid}>
                      <View style={styles.infoRow}>
                        <MaterialIcons name="badge" size={16} color="#333" />
                        <Text style={styles.infoLabel}>ID:</Text>
                        <Text style={styles.infoValue}>{studentData.student_id}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <MaterialIcons name="school" size={16} color="#333" />
                        <Text style={styles.infoLabel}>Class:</Text>
                        <Text style={styles.infoValue}>{studentData.class_name}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <MaterialIcons name="location-on" size={16} color="#333" />
                        <Text style={styles.infoLabel}>Branch:</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{studentData.branch_name}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <MaterialIcons name="phone" size={16} color="#333" />
                        <Text style={styles.infoLabel}>Number:</Text>
                        <Text style={styles.infoValue}>{studentData.display_phone}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.tapToFlipText}>Tap to flip for QR code</Text>
                  </View>
                </LinearGradient>

                {/* BACK SIDE */}
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  style={styles.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Back Header */}
                  <View style={styles.backHeader}>
                    <Text style={styles.backHeaderTitle}>STUDENT VERIFICATION</Text>
                    <Text style={styles.backHeaderSubtitle}>QR Code & Contact Information</Text>
                  </View>

                  {/* QR Code Section */}
                  <View style={styles.qrSection}>
                    <View style={styles.qrContainer}>
                      <QRCode
                        value={JSON.stringify({
                          student_id: studentData.student_id,
                          name: studentData.name,
                          class: studentData.class_name,
                          branch: studentData.branch_name,
                          franchisee: branchData.franchisee_number,
                          verify_url: `https://www.tnhappykids.in/verify/${studentData.student_id}`
                        })}
                        size={120}
                        backgroundColor="white"
                        color="#333"
                      />
                    </View>
                    <Text style={styles.qrLabel}>Scan for Student Verification</Text>
                  </View>

                  {/* School Contact Information */}
                  <View style={styles.contactSection}>
                    <Text style={styles.contactTitle}>SCHOOL CONTACT</Text>
                    
                    <View style={styles.contactInfo}>
                      <View style={styles.contactRow}>
                        <MaterialIcons name="business" size={16} color="white" />
                        <Text style={styles.contactText}>
                          Branch: {branchData.name}
                        </Text>
                      </View>
                      
                      <View style={styles.contactRow}>
                        <MaterialIcons name="phone" size={16} color="white" />
                        <Text style={styles.contactText}>
                          Franchisee: {branchData.franchisee_number}
                        </Text>
                      </View>
                      
                      <View style={styles.contactRow}>
                        <MaterialIcons name="web" size={16} color="white" />
                        <Text style={styles.contactText}>
                          www.tnhappykids.in
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Back Footer */}
                  <View style={styles.backFooter}>
                    <Text style={styles.backFooterText}>
                      For inquiries, contact the school number above
                    </Text>
                    <Text style={styles.tapToFlipBackText}>Tap to flip back</Text>
                  </View>
                </LinearGradient>
              </FlipCard>
            </View>
          </Animatable.View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="card-membership" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No student data found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '600',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  cardContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  flipCard: {
    borderWidth: 0,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    minHeight: 320,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  schoolLogo: {
    width: 40,
    height: 40,
    marginRight: 16,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    letterSpacing: 1,
  },
  schoolSubtitle: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
    marginTop: 2,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  photoContainer: {
    position: 'relative',
  },
  studentPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
  },
  photoFrame: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 53,
    borderWidth: 2,
    borderColor: '#333',
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoGrid: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700',
    flex: 1.5,
    textAlign: 'right',
  },
  cardFooter: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  websiteText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '700',
    marginBottom: 4,
  },
  validityText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
    marginBottom: 8,
  },
  tapToFlipText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Back side styles
  backHeader: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  backHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 4,
  },
  backHeaderSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  qrLabel: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  contactSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  contactInfo: {
    gap: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 10,
    fontWeight: '500',
    flex: 1,
  },
  backFooter: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  backFooterText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
  },
  tapToFlipBackText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default StudentIDCardScreen;