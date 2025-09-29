import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FlipCard from 'react-native-flip-card';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { BlurView } from 'expo-blur';

const { width: screenWidth } = Dimensions.get('window');

const schoolContactNumber = '95149 00080';

const VirtualIDCard = ({ student, branchData, isPresent = false, attendanceStatus = 'unknown' }) => {
  if (!student) {
    return null;
  }

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

  // Get school/franchisee number for top
  const getSchoolNumber = () => {
    // Prefer dynamic branch contact; avoid hardcoded fallback
    return branchData?.franchisee_number || branchData?.phone || branchData?.mobile || 'N/A';
  };

  // Get real student ID from database
  const getRealStudentId = () => {
    // Use the actual student_id from database, not the user ID
    return student.student_id || student.studentId || `TNHK${String(student.id || '000').padStart(5, '0')}`;
  };

  // Get father's phone number for bottom right
  const getFatherNumber = () => {
    return student.father_number || student.father_phone || 'N/A';
  };

  const schoolNumber = getSchoolNumber();
  const realStudentId = getRealStudentId();
  const fatherNumber = getFatherNumber();

  return (
    <FlipCard
      flipHorizontal={true}
      flipVertical={false}
      friction={6}
      perspective={1000}
      style={styles.cardContainer}
    >
      {/* Face Side */}
      <View style={styles.card}>
        {/* Enhanced Header with School Number */}
        <LinearGradient colors={['#8B5CF6', '#A855F7', '#06B6D4']} style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.schoolName}>TN Happy Kids Playschool</Text>
            <Text style={styles.schoolNumber}>📞 {schoolNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <MaterialIcons name={getStatusIcon()} size={12} color="white" />
          </View>
        </LinearGradient>
        
        <View style={styles.content}>
          <View style={styles.profileContainer}>
            <Image
              source={
                student.avatar_url ? { uri: student.avatar_url } :
                (student.photo ? { uri: student.photo } : require('../../assets/Avartar.png'))
              }
              style={styles.profilePic}
            />
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
              <MaterialIcons name={getStatusIcon()} size={10} color="white" />
            </View>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.studentName}>{student.name || student.username || 'N/A'}</Text>
            <View style={styles.statusRow}>
              <Text style={styles.studentInfo}>Status: </Text>
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1)}
              </Text>
            </View>
            <Text style={styles.studentInfo}>Student ID: {realStudentId}</Text>
            <Text style={styles.studentInfo}>Father No: {fatherNumber}</Text>
            <Text style={styles.studentInfo}>Class: {student.class_name || student.class || 'N/A'}</Text>
            <Text style={styles.studentInfo}>Branch: {student.branch || branchData?.name || 'N/A'}</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerLabel}>Student ID:</Text>
              <Text style={styles.footerValue}>{realStudentId}</Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.footerLabel}>Father No:</Text>
              <Text style={styles.footerValue}>{fatherNumber}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Back Side */}
      <View style={styles.card}>
        {/* Enhanced Back Header */}
        <LinearGradient colors={['#8B5CF6', '#A855F7', '#06B6D4']} style={styles.backHeader}>
          <Text style={styles.backHeaderText}>Student ID Card</Text>
          <View style={styles.hologramEffect} />
        </LinearGradient>
        
        <View style={styles.backContent}>
          <Text style={styles.studentIdLabel}>Student ID: {realStudentId}</Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={JSON.stringify({ 
                student_id: realStudentId, 
                name: (student.name || student.username), 
                branch: student.branch || branchData?.name,
                school: 'TN Happy Kids Playschool'
              })}
              size={70}
              backgroundColor='white'
              color='#8B5CF6'
            />
          </View>
          
          <Text style={styles.qrLabel}>Scan for Student Info</Text>
          
          <View style={styles.backFooter}>
            <View style={styles.contactRow}>
              <Ionicons name="call" size={14} color="#8B5CF6" />
              <Text style={styles.backContactText}>School: {schoolNumber}</Text>
            </View>
          </View>
        </View>
      </View>
    </FlipCard>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderWidth: 0,
  },
  card: {
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    height: 220,
    width: Math.min(320, screenWidth - 40),
    overflow: 'hidden',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingBottom: 8,
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  schoolName: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  schoolNumber: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '500',
    opacity: 0.9,
    numberOfLines: 1,
    ellipsizeMode: 'middle',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingTop: 5,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
    paddingRight: 5,
  },
  studentName: {
    color: '#2D3748',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    numberOfLines: 2,
    ellipsizeMode: 'tail',
  },
  studentInfo: {
    color: '#4A5568',
    fontSize: 10,
    marginBottom: 2,
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  footer: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  contactLabel: {
    color: '#8B5CF6',
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 4,
    flex: 1,
  },
  contactNumber: {
    color: '#2D3748',
    fontSize: 11,
    fontWeight: 'bold',
    numberOfLines: 1,
    ellipsizeMode: 'middle',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  footerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  footerLabel: {
    color: '#8B5CF6',
    fontSize: 8,
    fontWeight: '600',
    marginBottom: 2,
  },
  footerValue: {
    color: '#2D3748',
    fontSize: 10,
    fontWeight: 'bold',
    numberOfLines: 1,
    ellipsizeMode: 'middle',
  },
  // Back side styles
  backHeader: {
    padding: 10,
    alignItems: 'center',
  },
  backHeaderText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  backContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  studentIdLabel: {
    color: '#2D3748',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    numberOfLines: 1,
    ellipsizeMode: 'tail',
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  qrLabel: {
    color: '#4A5568',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 3,
  },
  backFooter: {
    alignItems: 'center',
  },
  backContactText: {
    color: '#8B5CF6',
    marginLeft: 4,
    fontSize: 9,
    fontWeight: '600',
    numberOfLines: 1,
    ellipsizeMode: 'middle',
  },
  // Enhanced styles
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileContainer: {
    position: 'relative',
    marginRight: 12,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  hologramEffect: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    transform: [{ rotate: '45deg' }],
  },
});

export default VirtualIDCard;
