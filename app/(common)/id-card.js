import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, Modal, Image, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams } from 'expo-router';
import FlipCard from 'react-native-flip-card';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import VirtualIDCard from '../components/VirtualIDCard';


export default function IDCardScreen() {
  const { branch } = useLocalSearchParams();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(branch || '');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Fetch data from backend
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Check authentication
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        if (!sessionToken) {
          console.warn('No session token found, user needs to log in');
          setLoading(false);
          return;
        }

        // Fetch branches
        try {
          const branchResponse = await authFetch('/api/branches/get_branches.php');
          const branchResult = await branchResponse.json();
          if (branchResult.success) {
            setBranches(branchResult.data);
          }
        } catch (branchError) {
          console.error('Failed to fetch branches:', branchError);
        }

        // Fetch students from both students table and users table
        try {
          let allStudents = [];
          
          // First, try to fetch from students table (existing students)
          try {
            const studentResponse = await authFetch('/api/students/get_students.php');
            const studentResult = await studentResponse.json();
            if (studentResult.success && studentResult.data) {
              const transformedStudents = studentResult.data.map(student => ({
                id: student.id,
                name: student.name,
                studentId: student.student_id, // Use actual student_id from database
                branch: student.branch_name,
                branch_id: student.branch_id,
                class: student.class_name || student.class, // Use class_name from classes table
                section: student.section,
                email: student.email,
                parentName: student.parent_name,
                parentPhone: student.parent_phone,
                admissionDate: student.admission_date,
                photo: student.profile_photo || null,
                homeLocation: student.address || student.home_address || '',
                bloodGroup: student.blood_group || '',
                source: 'students_table'
              }));
              allStudents = [...allStudents, ...transformedStudents];
            }
          } catch (error) {
            console.log('Students table fetch failed, trying users table');
          }
          
          // Also fetch student users from users table (new students)
          try {
            const usersResponse = await authFetch('/api/users/user_crud.php?role=Student');
            const usersResult = await usersResponse.json();
            if (usersResult.success && usersResult.data) {
              const studentUsers = usersResult.data
                .filter(user => user.role === 'Student' && (user.status === 'active' || user.user_status === 'active' || user.approval_status === 'active'))
                .map(user => ({
                  id: user.id,
                  name: user.name || user.username,
                  studentId: user.student_id, // Use actual student_id from database (no generation)
                  branch: user.branch_name,
                  branch_id: user.branch_id,
                  class: user.class_name, // Use class_name from classes table join
                  section: user.section,
                  email: user.email,
                  parentName: user.parent_name || user.father_name || user.mother_name || 'N/A',
                  parentPhone: user.mobile || user.father_number || user.mother_number,
                  admissionDate: user.created_at || new Date().toISOString(),
                  photo: user.avatar || user.profile_photo || null,
                  homeLocation: user.home_address || user.address || '',
                  bloodGroup: user.blood_group || '',
                  source: 'users_table'
                }));
              allStudents = [...allStudents, ...studentUsers];
            }
          } catch (error) {
            console.log('Users table fetch failed');
          }
          
          // Remove duplicates based on email or student_id
          const uniqueStudents = allStudents.filter((student, index, self) => 
            index === self.findIndex(s => s.email === student.email || s.studentId === student.studentId)
          );
          
          console.log('Sample student data:', uniqueStudents[0] ? uniqueStudents[0] : {}); // Debug log to see student structure
          
          setStudents(uniqueStudents);
          console.log('Total students loaded:', uniqueStudents.length);
          
        } catch (studentError) {
          console.error('Failed to fetch students:', studentError);
        }

      } catch (error) {
        console.error('Failed to load ID card data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let result = students;
    if (selectedBranch && selectedBranch !== 'All Branches' && selectedBranch !== '') {
      result = result.filter(student => student.branch === selectedBranch);
    } else {
      result = students;
    }

    if (searchQuery) {
      result = result.filter(student => 
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredStudents(result);
  }, [searchQuery, selectedBranch, students]);

  useEffect(() => {
    // Set initial students based on branch param
    if (branch) {
        setSelectedBranch(branch);
    }
  }, [branch]);

  const renderStudentListItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
        <TouchableOpacity onPress={() => {
          console.log('Selected student:', item);
          setSelectedStudent(item);
        }}>
            <LinearGradient
                colors={['#FFD700', '#FF85A1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.studentCard}
            >
                <Image source={item.photo ? { uri: item.photo } : require('../../assets/Avartar.png')} style={styles.studentListAvatar} />
                <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.studentDetails}>{item.branch} - {item.studentId}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#FFF" />
            </LinearGradient>
        </TouchableOpacity>
    </Animatable.View>
  );

  // New ID Card component similar to my-idcard.js
  const StudentIDCard = ({ student, isFront, toggleCard }) => {
    console.log('StudentIDCard received student:', student);
    console.log('Student photo field:', student.photo);
    console.log('Student avatar field:', student.avatar);
    console.log('Student profile_photo field:', student.profile_photo);
    
    if (!student) {
      console.log('No student data provided to StudentIDCard');
      return <Text>No student data available</Text>;
    }
    
    const SCHOOL_LOGO = 'https://www.tnhappykids.in/public/images/hk.png';
    const DEFAULT_AVATAR = require('../../assets/Avartar.png');
    
    const generateQRValue = (student) => `https://www.tnhappykids.in/verify/${student.studentId}`;

    console.log('Rendering StudentIDCard with isFront:', isFront);

    const Front = () => (
      <View style={[styles.idCardFront]}>
        {/* Header */}
        <View style={styles.idCardHeader}>
          <Image source={{ uri: SCHOOL_LOGO }} style={styles.idCardLogo} />
          <View style={styles.idCardSchoolInfo}>
            <Text style={styles.idCardSchoolName}>TN HAPPY KIDS</Text>
            <Text style={styles.idCardBranchName}>{student.branch ?? ''}</Text>
          </View>
        </View>

        {/* Photo and Basic Info */}
        <View style={styles.idCardPhotoContainer}>
          <Image 
            source={student.photo ? { uri: student.photo } : require('../../assets/Avartar.png')} 
            style={styles.idCardPhoto}
          />
        </View>

        {/* Student Details */}
        <View style={styles.idCardDetails}>
          <Text style={[styles.idCardStudentName]}>{student.name}</Text>
          <View style={styles.idCardIdSection}>
            <Text style={styles.idCardIdLabel}>ID:</Text>
            <Text style={styles.idCardIdValue}>{student.studentId}</Text>
          </View>
          <View style={styles.idCardDetailRow}>
            <Text style={styles.idCardDetailLabel}>Father: </Text>
            <Text style={styles.idCardDetailValue}>{student.parentName ?? '-'}</Text>
          </View>
          <View style={styles.idCardDetailRow}>
            <Text style={styles.idCardDetailLabel}>Address: </Text>
            <Text style={[styles.idCardDetailValue, { flex: 1 }]} numberOfLines={2}>{student.homeLocation ?? ''}</Text>
          </View>
          <View style={styles.idCardDetailRow}>
            <Text style={styles.idCardDetailLabel}>Phone: </Text>
            <Text style={styles.idCardDetailValue}>{student.parentPhone ?? '-'}</Text>
          </View>
          {!!student.bloodGroup && <Text style={styles.idCardBloodGroup}>{student.bloodGroup}</Text>}
        </View>

        {/* Footer */}
        <View style={styles.idCardFooter}>
          <Text style={styles.idCardFooterText}>TN HAPPY KIDS - Where Learning Begins</Text>
        </View>
      </View>
    );

    const Back = () => (
      <View style={[styles.idCardBack]}>
        <View style={styles.idCardQrContainer}>
          <View style={styles.idCardQrCode}>
            <QRCode 
              value={generateQRValue(student)} 
              size={120} 
              color="#000" 
              backgroundColor="#ffffff" 
            />
          </View>
          <Text style={styles.idCardQrText}>Scan to verify student ID</Text>
          <Text style={styles.idCardIdInfo}>ID: {student.studentId}</Text>
          <View style={styles.idCardBarcodeContainer}>
            <Text style={styles.idCardBarcode}>| | |  {student.studentId}  | | |</Text>
          </View>
        </View>
        
        <View style={styles.idCardBackDetails}>
          <Image source={{ uri: SCHOOL_LOGO }} style={styles.idCardBackLogo} />
          <Text style={styles.idCardSchoolNameBack}>TN HAPPY KIDS</Text>
          <Text style={styles.idCardContactInfo}>{student.parentPhone ? `Phone: ${student.parentPhone}` : ''}</Text>
        </View>
        
        <View style={styles.idCardFooter}>
          <Text style={styles.idCardFooterText}>This card is property of Happy Kids School</Text>
        </View>
      </View>
    );

    return isFront ? <Front /> : <Back />;
  };

  const [isCardFront, setIsCardFront] = useState(true);

  const toggleCard = () => setIsCardFront(!isCardFront);

  return (
    <SafeAreaView style={styles.safeArea}>
                <LinearGradient colors={['#2A2A72', '#009FFD']} style={styles.header}>
            <LottieView
                source={require('../../assets/Calendar Animation.json')}
                autoPlay
                loop
                style={styles.lottieAnimation}
            />
            <Animatable.Text animation="fadeInDown" style={styles.title}>Student ID Cards</Animatable.Text>
            {branch && <Animatable.Text animation="fadeInDown" delay={200} style={styles.subtitle}>{branch}</Animatable.Text>}
        </LinearGradient>

        <View style={styles.container}>
            {/* Controls */}
            <Animatable.View animation="fadeInUp" delay={300} style={styles.controlsContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput 
                        style={styles.searchInput} 
                        placeholder="Search by name..." 
                        placeholderTextColor="#999"
                        value={searchQuery} 
                        onChangeText={setSearchQuery} 
                    />
                </View>
                {!branch && (
                    <View style={styles.pickerContainer}>
                        <Picker 
                            selectedValue={selectedBranch}
                            onValueChange={(itemValue) => setSelectedBranch(itemValue)}
                            style={styles.picker}
                        >
                            <Picker.Item label="All Branches" value="" />
                            {branches.map((branch, index) => (
                              <Picker.Item key={`branch-${branch.id || index}-${branch.name || Math.random()}`} label={branch.name} value={branch.name} />
                            ))}
                        </Picker>
                    </View>
                )}
            </Animatable.View>

            {/* Student List */}
                        {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
            ) : (
                <FlatList
                    data={filteredStudents}
                    renderItem={renderStudentListItem}
                    keyExtractor={(item, index) => `student-${item.id || index}-${item.studentId || Math.random()}`}
                    ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}

            {/* ID Card Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={!!selectedStudent}
                onRequestClose={() => setSelectedStudent(null)}
            >
                <View style={styles.modalContainer}>
                    {selectedStudent && (
                      <>
                         <Text style={{ color: '#FFF', marginBottom: 10 }}>Debug: Modal opened for {selectedStudent.name}</Text>
                         <TouchableOpacity style={styles.idCardContainer} onPress={toggleCard} activeOpacity={0.9}>
                             <StudentIDCard student={selectedStudent} isFront={isCardFront} toggleCard={toggleCard} />
                         </TouchableOpacity>
                         <View style={styles.instructions}>
                             <Ionicons name="information-circle-outline" size={20} color="#FFF" />
                             <Text style={styles.instructionsText}>Tap the card to flip</Text>
                         </View>
                         <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedStudent(null)}>
                            <LinearGradient colors={['#FF85A1', '#FFD700']} style={styles.closeButtonGradient}>
                                 <Text style={styles.closeButtonText}>Close</Text>
                             </LinearGradient>
                         </TouchableOpacity>
                       </>
                    )}
                </View>
            </Modal>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  lottieAnimation: {
    width: 120,
    height: 120,
    position: 'absolute',
    top: 0,
    right: 0,
    opacity: 0.3,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FFF', 
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginTop: 4,
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 15, 
    paddingTop: 20,
  },
  controlsContainer: { marginBottom: 15 },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: { 
    flex: 1,
    height: 50,
    fontSize: 16, 
    color: '#4F4F4F' 
  },
  pickerContainer: { 
    backgroundColor: '#FFF', 
    borderRadius: 25, 
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden'
  },
  picker: { 
    height: 50, 
    color: '#4F4F4F' 
  },
  studentCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderRadius: 15, 
    marginBottom: 10, 
    elevation: 4,
    shadowColor: '#FF85A1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  studentListAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    marginRight: 15, 
    borderWidth: 2,
    borderColor: '#FFF'
  },
  studentInfo: {
    flex: 1,
  },
  studentName: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },
  studentDetails: { 
    fontSize: 14, 
    color: '#FFF' 
  },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16, color: '#4F4F4F' },
  modalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
    zIndex: 1000
  },
  virtualCardWrapper: {
    width: '90%', // Reduced from 100% to make the card smaller
    alignSelf: 'center', // Center the card within its parent
    alignItems: 'center',
    marginVertical: 20, // Add some vertical margin
  },
  cardContainer: { 
    width: '100%', 
    borderWidth: 0, 
    maxWidth: 340 // Reduced from 380
  },
  idCard: { 
    width: '100%', 
    aspectRatio: 1.586, 
    borderRadius: 15, 
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardFront: { 
    padding: 15,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  schoolName: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#FFF',
    flex: 1,
  },
  cardBody: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 15, 
  },
  idCardAvatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 10, 
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
    marginRight: 15,
  },
  rightSection: { 
    flex: 1, 
  },
  studentNameCard: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  studentDetailCard: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  footerDetailRow: {
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  footerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cardBack: { 
    padding: 15, 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  cardBackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  cardBackDetailRow: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '100%',
    marginBottom: 8,
  },
  cardBackLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  cardBackValue: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
  },
  cardBackBody: {
    flexDirection: 'row',
    flex: 1,
    width: '100%',
  },
  cardBackLeft: {
    flex: 1.2,
    justifyContent: 'center',
  },
  cardBackRight: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrContainer: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 3,
  },
  cardBackFooter: { 
    fontSize: 10, 
    color: 'rgba(255,255,255,0.8)', 
    textAlign: 'center', 
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
  },
  closeButton: { 
    marginTop: 20,
    borderRadius: 25, 
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  closeButtonGradient: {
    paddingVertical: 12, 
    paddingHorizontal: 30, 
    borderRadius: 25, 
  },
  closeButtonText: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },
  // New ID Card styles matching my-idcard.js
  idCardContainer: {
    width: '80%',
    maxWidth: 300,
    aspectRatio: 1.586, // Standard ID card aspect ratio
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    alignSelf: 'center',
  },
  idCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  idCardFront: {
    backgroundColor: '#fff',
    width: '100%',
    height: '100%',
    borderRadius: 15,
    overflow: 'hidden',
  },
  idCardBack: {
    backgroundColor: '#fbbf24',
    width: '100%',
    height: '100%',
    borderRadius: 15,
    overflow: 'hidden',
  },
  idCardHeader: {
    backgroundColor: '#EF4444',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCardLogoContainer: {
    marginRight: 15,
    paddingHorizontal: 5,
  },
  idCardLogo: {
    width: 120,
    height: 50,
    resizeMode: 'contain',
  },
  idCardSchoolInfo: {
    alignItems: 'center',
  },
  idCardSchoolName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  idCardBranchName: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  idCardPhotoContainer: {
    width: 120,
    height: 140,
    backgroundColor: '#f0f0f0',
    alignSelf: 'center',
    marginTop: 20,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  idCardPhoto: {
    width: '100%',
    height: '100%',
  },
  idCardDetails: {
    padding: 16,
    paddingTop: 24,
    alignItems: 'flex-start',
    flex: 1,
    width: '100%',
  },
  idCardIdSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 6,
    borderRadius: 4,
    alignSelf: 'center',
  },
  idCardIdLabel: {
    fontWeight: 'bold',
    marginRight: 4,
    color: '#333',
  },
  idCardIdValue: {
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  idCardDetailRow: {
    flexDirection: 'row',
    marginBottom: 6,
    width: '100%',
  },
  idCardDetailLabel: {
    fontWeight: '600',
    color: '#555',
    minWidth: 70,
  },
  idCardDetailValue: {
    color: '#333',
    flexShrink: 1,
  },
  idCardStudentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  idCardBloodGroup: {
    position: 'absolute',
    top: 24,
    right: 16,
    backgroundColor: '#ff3b30',
    color: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  idCardFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  idCardFooterText: {
    fontSize: 12,
    color: '#fff',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  idCardQrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  idCardQrCode: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  idCardQrText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  idCardBackDetails: {
    padding: 16,
    alignItems: 'center',
  },
  idCardBackLogo: {
    width: 100,
    height: 100,
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 50,
    resizeMode: 'contain',
  },
  idCardSchoolNameBack: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  idCardContactInfo: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  idCardIdInfo: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  idCardBarcodeContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    alignItems: 'center',
  },
  idCardBarcode: {
    fontSize: 16,
    letterSpacing: 1,
    color: '#000',
    fontWeight: 'bold',
    flexWrap: 'nowrap',
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  instructionsText: {
    marginLeft: 8,
    color: '#FFF',
    fontSize: 14,
  },
  idCardContainer: {
    width: '80%',
    maxWidth: 300,
    aspectRatio: 0.55, // Increased height ratio (makes card taller)
    borderRadius: 15,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});

