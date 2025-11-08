import React, { useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import Colors from '../constants/colors';

const { width: screenWidth } = Dimensions.get('window');

// Standard ID card ratio (CR80 - 85.60 × 53.98 mm, ratio 1.586:1)
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = CARD_WIDTH / 1.586;

const ModernIDCard = ({ student, onDownload }) => {
  const viewShotRef = useRef();

  if (!student) {
    return null;
  }

  const handleDownload = async () => {
    try {
      const uri = await viewShotRef.current.capture({
        format: 'png',
        quality: 1.0,
        width: 856, // Standard ID card width in pixels
        height: 540, // Standard ID card height in pixels
      });

      const fileName = `${(student.name || student.username || 'Student').replace(/\s+/g, '_')}_ID_Card.png`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.moveAsync({
        from: uri,
        to: fileUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: 'Save ID Card',
        });
      } else {
        Alert.alert('Success', 'ID Card saved to device');
      }

      if (onDownload) {
        onDownload(fileUri);
      }
    } catch (error) {
      console.error('Error downloading ID card:', error);
      Alert.alert('Error', 'Failed to download ID card');
    }
  };

  const getAvatarSource = () => {
    if (student.avatar) {
      return { uri: student.avatar };
    }
    if (student.photo) {
      return { uri: student.photo };
    }
    return require('../../assets/Avartar.png');
  };

  const generateQRValue = () => {
    return JSON.stringify({
      id: student.student_id || student.studentId,
      name: student.name,
      branch: student.branch_name || student.branch,
      verify_url: `https://www.tnhappykids.in/verify/${student.student_id || student.studentId}`
    });
  };

  return (
    <View style={styles.container}>
      <ViewShot ref={viewShotRef} style={styles.cardContainer}>
        {/* Front Side */}
        <LinearGradient
          colors={['#FFD700', '#FFA500', '#FF8C00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Header */}
          <View style={styles.header}>
            <Image 
              source={{ uri: 'https://www.tnhappykids.in/public/images/hk.png' }}
              style={styles.schoolLogo}
              resizeMode="contain"
            />
            <View style={styles.headerText}>
              <Text style={styles.schoolName}>TN HAPPY KIDS</Text>
              <Text style={styles.schoolSubtitle}>PLAYSCHOOL</Text>
              <Text style={styles.idCardTitle}>STUDENT ID CARD</Text>
            </View>
          </View>

          {/* Student Info Section */}
          <View style={styles.studentSection}>
            <View style={styles.photoContainer}>
              <Image 
                source={getAvatarSource()}
                style={styles.studentPhoto}
                resizeMode="cover"
              />
              <View style={styles.photoFrame} />
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue} numberOfLines={2} adjustsFontSizeToFit={true}>
                  {student.name || student.username || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ID:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {student.student_id || student.studentId || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Class:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {student.class || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Blood:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {student.blood_group || student.bloodGroup || 'N/A'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {student.father_number || student.father_phone || 'N/A'}
                </Text>
              </View>
            </View>

            <View style={styles.qrContainer}>
              <QRCode
                value={generateQRValue()}
                size={55}
                backgroundColor="white"
                color="black"
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.contactInfo}>
              <MaterialIcons name="phone" size={12} color="#333" />
              <Text style={styles.contactText}>95149 00080</Text>
            </View>
            <View style={styles.contactInfo}>
              <MaterialIcons name="web" size={12} color="#333" />
              <Text style={styles.contactText}>www.tnhappykids.in</Text>
            </View>
          </View>

          {/* Decorative Elements */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
        </LinearGradient>
      </ViewShot>

      {/* Download Button */}
      <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
        <LinearGradient
          colors={Colors.gradientPrimary}
          style={styles.downloadGradient}
        >
          <Ionicons name="download" size={20} color="white" />
          <Text style={styles.downloadText}>Download ID Card</Text>
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 15,
    padding: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  schoolLogo: {
    width: 40,
    height: 40,
    marginRight: 10,
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
  idCardTitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  studentSection: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
    paddingVertical: 5,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  studentPhoto: {
    width: 70,
    height: 90,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'white',
  },
  photoFrame: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#333',
  },
  infoContainer: {
    flex: 1,
    paddingRight: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
    minHeight: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    width: 45,
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 11,
    color: '#333',
    flex: 1,
    fontWeight: '600',
    lineHeight: 14,
    flexWrap: 'wrap',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 10,
    color: '#333',
    marginLeft: 4,
    fontWeight: '600',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  downloadButton: {
    marginTop: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  downloadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  downloadText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default ModernIDCard;
