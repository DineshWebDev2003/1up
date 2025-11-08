import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import VerticalIDCard from '../components/VerticalIDCard';

const VerticalIDCardDemo = () => {
  const [selectedStudent, setSelectedStudent] = useState(0);

  // Sample student data for demo
  const sampleStudents = [
    {
      name: 'Aarav Kumar',
      student_id: 'TN2024001',
      class: 'Pre-KG',
      blood_group: 'A+',
      father_name: 'Rajesh Kumar',
      father_phone: '9876543210',
      branch: 'Chennai Main',
      category: 'Regular',
      address: '123 Anna Nagar, Chennai',
      date_of_birth: '2019-05-15',
      avatar_url: 'https://ui-avatars.com/api/?name=Aarav+Kumar&background=4F46E5&color=fff&size=200'
    },
    {
      name: 'Priya Sharma',
      student_id: 'TN2024002',
      class: 'LKG',
      blood_group: 'B+',
      father_name: 'Vikash Sharma',
      father_phone: '9876543211',
      branch: 'Coimbatore',
      category: 'Regular',
      address: '456 RS Puram, Coimbatore',
      date_of_birth: '2018-08-22',
      avatar_url: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=EC4899&color=fff&size=200'
    },
    {
      name: 'Arjun Patel',
      student_id: 'TN2024003',
      class: 'UKG',
      blood_group: 'O+',
      father_name: 'Kiran Patel',
      father_phone: '9876543212',
      branch: 'Madurai',
      category: 'Regular',
      address: '789 KK Nagar, Madurai',
      date_of_birth: '2017-12-10',
      avatar_url: 'https://ui-avatars.com/api/?name=Arjun+Patel&background=10B981&color=fff&size=200'
    }
  ];

  const sampleBranchData = {
    name: 'TN Happy Kids Playschool',
    franchisee_number: '95149 00080',
    phone: '95149 00080',
    address: 'Main Branch, Tamil Nadu'
  };

  const attendanceStatuses = ['present', 'absent', 'late', 'unknown'];
  const [currentStatus, setCurrentStatus] = useState('present');

  const handleDownload = (uri) => {
    Alert.alert(
      'Success!', 
      'Vertical ID Card has been downloaded successfully!',
      [
        { text: 'OK', style: 'default' }
      ]
    );
    console.log('Downloaded vertical ID card:', uri);
  };

  const cycleAttendanceStatus = () => {
    const currentIndex = attendanceStatuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % attendanceStatuses.length;
    setCurrentStatus(attendanceStatuses[nextIndex]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <Text style={styles.headerTitle}>Vertical ID Card Demo</Text>
        <Text style={styles.headerSubtitle}>Portrait Orientation with QR Back Side</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Student Selector */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>Select Student:</Text>
          <View style={styles.studentButtons}>
            {sampleStudents.map((student, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.studentButton,
                  selectedStudent === index && styles.selectedStudentButton
                ]}
                onPress={() => setSelectedStudent(index)}
              >
                <Text style={[
                  styles.studentButtonText,
                  selectedStudent === index && styles.selectedStudentButtonText
                ]}>
                  {student.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status Controller */}
        <View style={styles.controlContainer}>
          <Text style={styles.controlTitle}>Attendance Status:</Text>
          <TouchableOpacity style={styles.statusButton} onPress={cycleAttendanceStatus}>
            <Text style={styles.statusButtonText}>
              Current: {currentStatus.toUpperCase()} (Tap to change)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>✨ Vertical ID Card Features:</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="card-outline" size={20} color="#4F46E5" />
              <Text style={styles.featureText}>Portrait orientation (1.6:1 ratio)</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="flip-horizontal" size={20} color="#4F46E5" />
              <Text style={styles.featureText}>Flip card with front & back sides</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="qr-code" size={20} color="#4F46E5" />
              <Text style={styles.featureText}>Comprehensive QR code on back</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="medical" size={20} color="#4F46E5" />
              <Text style={styles.featureText}>Emergency information display</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="download" size={20} color="#4F46E5" />
              <Text style={styles.featureText}>High-quality PNG download</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="color-palette" size={20} color="#4F46E5" />
              <Text style={styles.featureText}>Gradient backgrounds & modern design</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>📱 How to Use:</Text>
          <Text style={styles.instructionText}>• Tap the card to flip between front and back sides</Text>
          <Text style={styles.instructionText}>• Front side shows student photo and details</Text>
          <Text style={styles.instructionText}>• Back side displays QR code and emergency info</Text>
          <Text style={styles.instructionText}>• QR code contains complete student information</Text>
          <Text style={styles.instructionText}>• Tap download button to save as PNG image</Text>
        </View>

        {/* Vertical ID Card */}
        <View style={styles.cardWrapper}>
          <VerticalIDCard
            student={sampleStudents[selectedStudent]}
            branchData={sampleBranchData}
            attendanceStatus={currentStatus}
            onDownload={handleDownload}
          />
        </View>

        {/* QR Code Information */}
        <View style={styles.qrInfoContainer}>
          <Text style={styles.qrInfoTitle}>🔍 QR Code Contains:</Text>
          <View style={styles.qrInfoList}>
            <Text style={styles.qrInfoItem}>• Student ID & Name</Text>
            <Text style={styles.qrInfoItem}>• Father's Name & Phone</Text>
            <Text style={styles.qrInfoItem}>• Blood Group & Class</Text>
            <Text style={styles.qrInfoItem}>• Branch & School Information</Text>
            <Text style={styles.qrInfoItem}>• Emergency Contact Numbers</Text>
            <Text style={styles.qrInfoItem}>• Verification URL</Text>
            <Text style={styles.qrInfoItem}>• Date of Birth & Address</Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  selectorContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  studentButtons: {
    gap: 10,
  },
  studentButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedStudentButton: {
    backgroundColor: '#ede9fe',
    borderColor: '#4F46E5',
  },
  studentButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedStudentButtonText: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  controlContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  statusButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  statusButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  featuresContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 12,
    flex: 1,
  },
  instructionsContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 5,
    lineHeight: 20,
  },
  cardWrapper: {
    alignItems: 'center',
    marginTop: 20,
  },
  qrInfoContainer: {
    backgroundColor: '#ecfdf5',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  qrInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 10,
  },
  qrInfoList: {
    gap: 5,
  },
  qrInfoItem: {
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 50,
  },
});

export default VerticalIDCardDemo;
