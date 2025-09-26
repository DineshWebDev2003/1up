import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FlipCard from 'react-native-flip-card';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

const schoolContactNumber = '95149 00070';

const VirtualIDCard = ({ student, branchData }) => {
  if (!student) {
    return null;
  }

  // Determine contact number and label
  const getContactInfo = () => {
    if (student.father_number) {
      return { number: student.father_number, label: 'Father Number' };
    } else if (branchData?.franchisee_number) {
      return { number: branchData.franchisee_number, label: 'Franchisee Number' };
    } else {
      return { number: schoolContactNumber, label: 'School Number' };
    }
  };

  const contactInfo = getContactInfo();
  // Generate proper student ID format: STU + padded ID
  const studentId = student.studentId || `STU${String(student.id || '000').padStart(3, '0')}`;

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
        {/* Violet Header */}
        <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} />
          <Text style={styles.schoolName}>TN Happy Kids Playschool</Text>
        </LinearGradient>
        
        <View style={styles.content}>
          <Image
            source={student.photo ? { uri: student.photo } : require('../../assets/Avartar.png')}
            style={styles.profilePic}
          />
          <View style={styles.infoContainer}>
            <Text style={styles.studentName}>{student.name || 'N/A'}</Text>
            <Text style={styles.studentInfo}>Student ID: {studentId}</Text>
            <Text style={styles.studentInfo}>Father: {student.father_name || 'N/A'}</Text>
            <Text style={styles.studentInfo}>Class: {student.class_name || student.class || 'N/A'}</Text>
            <Text style={styles.studentInfo}>Branch: {student.branch || branchData?.name || 'N/A'}</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.contactRow}>
            <Ionicons name="call" size={14} color="#8B5CF6" />
            <Text style={styles.contactLabel}>{contactInfo.label}:</Text>
          </View>
          <Text style={styles.contactNumber}>{contactInfo.number}</Text>
        </View>
      </View>

      {/* Back Side */}
      <View style={styles.card}>
        {/* Violet Header */}
        <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.backHeader}>
          <Text style={styles.backHeaderText}>Student ID Card</Text>
        </LinearGradient>
        
        <View style={styles.backContent}>
          <Text style={styles.studentIdLabel}>Student ID: {studentId}</Text>
          
          <View style={styles.qrContainer}>
            <QRCode
              value={JSON.stringify({ 
                student_id: studentId, 
                name: student.name, 
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
              <Text style={styles.backContactText}>School: {schoolContactNumber}</Text>
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
    height: 200,
    width: 300,
    overflow: 'hidden',
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
  schoolName: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
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
  },
  studentName: {
    color: '#2D3748',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  studentInfo: {
    color: '#4A5568',
    fontSize: 11,
    marginBottom: 2,
    flexWrap: 'wrap',
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
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  contactNumber: {
    color: '#2D3748',
    fontSize: 12,
    fontWeight: 'bold',
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
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
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
    fontSize: 10,
    fontWeight: '600',
  },
});

export default VirtualIDCard;
