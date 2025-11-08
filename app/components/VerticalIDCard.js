import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import FlipCard from 'react-native-flip-card';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import Colors from '../constants/colors';

const { width: screenWidth } = Dimensions.get('window');

// Vertical ID card dimensions (portrait orientation)
const CARD_WIDTH = screenWidth * 0.75;
const CARD_HEIGHT = CARD_WIDTH * 1.6; // 1.6:1 ratio for vertical card

const VerticalIDCard = ({ student, branchData, isPresent = false, attendanceStatus = 'unknown', onDownload }) => {
  const viewShotRef = useRef();

  if (!student) {
    return null;
  }

  const handleDownload = async () => {
    try {
      const uri = await viewShotRef.current.capture({
        format: 'png',
        quality: 1.0,
        width: 600,
        height: 960, // Vertical aspect ratio
      });

      const fileName = `${student.name?.replace(/\s+/g, '_') || 'Student'}_Vertical_ID_Card.png`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.moveAsync({
        from: uri,
        to: fileUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: 'Save Vertical ID Card',
        });
      } else {
        Alert.alert('Success', 'Vertical ID Card saved to device');
      }

      if (onDownload) {
        onDownload(fileUri);
      }
    } catch (error) {
      console.error('Error downloading vertical ID card:', error);
      Alert.alert('Error', 'Failed to download vertical ID card');
    }
  };

  const getStatusColor = () => {
    switch (attendanceStatus) {
      case 'present': return '#10B981';
      case 'absent': return '#EF4444';
      case 'late': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = () => {
    switch (attendanceStatus) {
      case 'present': return 'check-circle';
      case 'absent': return 'cancel';
      case 'late': return 'schedule';
      default: return 'help';
    }
  };

  const getSchoolNumber = () => {
    return branchData?.franchisee_number || branchData?.phone || branchData?.mobile || '95149 00080';
  };

  const getRealStudentId = () => {
    return student.student_id || student.studentId || student.student_code || student.user_student_id || 'N/A';
  };

  const getFatherNumber = () => {
    return student.father_number || student.father_phone || 'N/A';
  };

  const getFatherName = () => {
    return student.father_name || student.parentName || 'N/A';
  };

  const getBloodGroup = () => {
    return student.blood_group || student.bloodGroup || 'N/A';
  };

  const getAvatarSource = () => {
    if (student.avatar_url) return { uri: student.avatar_url };
    if (student.avatar) return { uri: student.avatar };
    if (student.photo) return { uri: student.photo };
    return require('../../assets/Avartar.png');
  };

  const generateQRValue = () => {
    return JSON.stringify({
      student_id: getRealStudentId(),
      name: student.name || student.username,
      father_name: getFatherName(),
      father_phone: getFatherNumber(),
      blood_group: getBloodGroup(),
      branch: student.branch || branchData?.name,
      school: 'TN Happy Kids Playschool',
      verify_url: `https://www.tnhappykids.in/verify/${getRealStudentId()}`,
      emergency_contact: getSchoolNumber(),
      category: student.category || 'Student',
      class: student.class || 'N/A',
      address: student.address || 'N/A',
      date_of_birth: student.date_of_birth || student.dob || 'N/A'
    });
  };

  const schoolNumber = getSchoolNumber();
  const realStudentId = getRealStudentId();
  const fatherNumber = getFatherNumber();
  const fatherName = getFatherName();
  const bloodGroup = getBloodGroup();

  return (
    <View style={styles.container}>
      <ViewShot ref={viewShotRef} style={styles.cardContainer}>
        <FlipCard
          flipHorizontal={true}
          flipVertical={false}
          friction={6}
          perspective={1000}
          style={styles.flipCard}
        >
          {/* FRONT SIDE */}
          <LinearGradient
            colors={['#FFD700', '#FFA500', '#FF8C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Header */}
            <View style={styles.header}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logo} 
                resizeMode="contain"
              />
              <View style={styles.headerText}>
                <Text style={styles.schoolName}>TN HAPPY KIDS</Text>
                <Text style={styles.schoolSubtitle}>PLAYSCHOOL</Text>
                <Text style={styles.contactNumber}>📞 {schoolNumber}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <MaterialIcons name={getStatusIcon()} size={16} color="white" />
              </View>
            </View>

            {/* Student Photo Section */}
            <View style={styles.photoSection}>
              <View style={styles.photoContainer}>
                <Image
                  source={getAvatarSource()}
                  style={styles.studentPhoto}
                  resizeMode="cover"
                />
                <View style={styles.photoFrame} />
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
                  <MaterialIcons name={getStatusIcon()} size={12} color="white" />
                </View>
              </View>
            </View>

            {/* Student Information */}
            <View style={styles.infoSection}>
              <Text style={styles.studentName} numberOfLines={2} adjustsFontSizeToFit={true}>
                {student.name || student.username || 'N/A'}
              </Text>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Student ID:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{realStudentId}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Class:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{student.class || 'N/A'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Blood Group:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{bloodGroup}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{fatherNumber}</Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.websiteInfo}>
                <MaterialIcons name="web" size={14} color="#333" />
                <Text style={styles.websiteText}>www.tnhappykids.in</Text>
              </View>
              <Text style={styles.validityText}>Valid for Academic Year 2024-25</Text>
            </View>

            {/* Decorative Elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
          </LinearGradient>

          {/* BACK SIDE */}
          <LinearGradient
            colors={['#4F46E5', '#7C3AED', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Back Header */}
            <View style={styles.backHeader}>
              <Text style={styles.backHeaderTitle}>STUDENT IDENTIFICATION</Text>
              <Text style={styles.backHeaderSubtitle}>QR Code & Emergency Information</Text>
            </View>

            {/* QR Code Section */}
            <View style={styles.qrSection}>
              <View style={styles.qrContainer}>
                <QRCode
                  value={generateQRValue()}
                  size={100}
                  backgroundColor="white"
                  color="#1F2937"
                  logoSize={16}
                  logoBackgroundColor="white"
                />
              </View>
              <Text style={styles.qrLabel}>Scan for Student Info</Text>
            </View>

            {/* School Information */}
            <View style={styles.emergencySection}>
              <Text style={styles.emergencyTitle}>SCHOOL INFORMATION</Text>
              
              <View style={styles.emergencyInfo}>
                <View style={styles.emergencyRow}>
                  <MaterialIcons name="business" size={16} color="white" />
                  <Text style={styles.emergencyText} numberOfLines={1}>
                    Branch: {student.branch || branchData?.name || 'TN Happy Kids'}
                  </Text>
                </View>
                
                <View style={styles.emergencyRow}>
                  <MaterialIcons name="phone" size={16} color="white" />
                  <Text style={styles.emergencyText}>
                    Franchisee: {branchData?.franchisee_number || '95149 00080'}
                  </Text>
                </View>
                
                <View style={styles.emergencyRow}>
                  <MaterialIcons name="school" size={16} color="white" />
                  <Text style={styles.emergencyText}>
                    School: {schoolNumber}
                  </Text>
                </View>
                
                <View style={styles.emergencyRow}>
                  <MaterialIcons name="web" size={16} color="white" />
                  <Text style={styles.emergencyText}>
                    www.tnhappykids.in
                  </Text>
                </View>
              </View>
            </View>

            {/* Emergency Contact */}
            <View style={styles.contactSection}>
              <Text style={styles.contactTitle}>EMERGENCY CONTACT</Text>
              
              <View style={styles.emergencyInfo}>
                <View style={styles.emergencyRow}>
                  <MaterialIcons name="person" size={16} color="white" />
                  <Text style={styles.emergencyText} numberOfLines={1}>
                    Father: {fatherName}
                  </Text>
                </View>
                
                <View style={styles.emergencyRow}>
                  <MaterialIcons name="phone" size={16} color="white" />
                  <Text style={styles.emergencyText}>
                    {fatherNumber}
                  </Text>
                </View>
                
                <View style={styles.emergencyRow}>
                  <MaterialIcons name="local_hospital" size={16} color="white" />
                  <Text style={styles.emergencyText}>
                    Blood Group: {bloodGroup}
                  </Text>
                </View>
              </View>
            </View>

            {/* Back Footer */}
            <View style={styles.backFooter}>
              <Text style={styles.backFooterText}>In case of emergency, please contact the numbers above</Text>
              <Text style={styles.backFooterWebsite}>www.tnhappykids.in</Text>
            </View>

            {/* Back Decorative Elements */}
            <View style={styles.backDecorativeCircle1} />
            <View style={styles.backDecorativeCircle2} />
          </LinearGradient>
        </FlipCard>
      </ViewShot>

      {/* Download Button */}
      <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
        <LinearGradient
          colors={Colors.gradientPrimary || ['#4F46E5', '#7C3AED']}
          style={styles.downloadGradient}
        >
          <Ionicons name="download" size={20} color="white" />
          <Text style={styles.downloadText}>Download Vertical ID Card</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  cardContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
  },
  flipCard: {
    borderWidth: 0,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  
  // FRONT SIDE STYLES
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 12,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 1,
  },
  schoolSubtitle: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
  contactNumber: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoContainer: {
    position: 'relative',
  },
  studentPhoto: {
    width: 120,
    height: 150,
    borderRadius: 15,
    borderWidth: 4,
    borderColor: 'white',
  },
  photoFrame: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#333',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  
  infoSection: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  infoGrid: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  infoValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
    flex: 1.2,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 51, 51, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  
  footer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
  },
  websiteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  websiteText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 5,
    fontWeight: '600',
  },
  validityText: {
    fontSize: 10,
    color: '#555',
    fontStyle: 'italic',
  },
  
  // BACK SIDE STYLES
  backHeader: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
  },
  backHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1,
  },
  backHeaderSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 5,
  },
  
  qrSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  qrLabel: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
  
  emergencySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  contactSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 1,
  },
  emergencyInfo: {
    gap: 10,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyText: {
    fontSize: 11,
    color: 'white',
    marginLeft: 10,
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  
  backFooter: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
  },
  backFooterText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 5,
  },
  backFooterWebsite: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  
  // DECORATIVE ELEMENTS
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backDecorativeCircle1: {
    position: 'absolute',
    top: -25,
    left: -25,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backDecorativeCircle2: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // DOWNLOAD BUTTON
  downloadButton: {
    marginTop: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  downloadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 12,
  },
  downloadText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default VerticalIDCard;
