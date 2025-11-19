import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FlipCard from 'react-native-flip-card';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch, { API_URL } from '../utils/api';
import Colors from '../constants/colors';

const DEFAULT_AVATAR = require('../../assets/Avartar.png');
const { width } = Dimensions.get('window');

export default function IDCardScreen() {
  const { branch } = useLocalSearchParams();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [branchData, setBranchData] = useState(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);

  // Fetch detailed student info when student is selected
  useEffect(() => {
    const fetchStudentInfo = async () => {
      if (!selectedStudent) return;
      
      setStudentDetailLoading(true);
      try {
        console.log('🔍 Fetching detailed info for student ID:', selectedStudent.id);
        console.log('🔍 Student name:', selectedStudent.name);
        
        // Fetch student info from students API using student_id
        const response = await authFetch(`/api/students/get_student_info.php?student_id=${selectedStudent.student_id}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const studentInfo = result.data;
          console.log('✅ Student info fetched:', studentInfo);
          console.log('📞 Phone from student info:', studentInfo.phone);
          console.log('📞 Father phone from student info:', studentInfo.father_phone);
          console.log('📞 Mother phone from student info:', studentInfo.mother_phone);
          
          // Update selected student with detailed phone information
          // Priority: student.phone > father_phone > mother_phone
          const studentPhone = studentInfo.phone || studentInfo.father_phone || studentInfo.mother_phone;
          
          const updatedStudent = {
            ...selectedStudent,
            phone: studentPhone || selectedStudent.phone,
            father_phone: studentInfo.father_phone,
            mother_phone: studentInfo.mother_phone,
            display_phone: studentPhone || selectedStudent.display_phone || 'Contact School'
          };
          
          setSelectedStudent(updatedStudent);
          console.log('✅ Student data updated with phone info:', updatedStudent);
          console.log('📞 Final display phone:', updatedStudent.display_phone);
        } else {
          console.warn('⚠️ No student info returned for:', selectedStudent.student_id);
        }
      } catch (error) {
        console.error('❌ Failed to fetch student info:', error);
      } finally {
        setStudentDetailLoading(false);
      }
    };
    
    fetchStudentInfo();
  }, [selectedStudent?.id]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        const sessionToken = await AsyncStorage.getItem('sessionToken');
        const userData = await AsyncStorage.getItem('userData');
        
        if (!sessionToken || !userData) {
          console.warn('No session token or user data found');
          setLoading(false);
          return;
        }

        const user = JSON.parse(userData);
        setCurrentUser(user);

        // Set default branch data using dynamic franchisee/user phone
        const defaultBranchData = {
          name: user.branch_name || 'TN Happy Kids',
          franchisee_number: user.franchisee_number || user.phone || 'Contact School',
          phone: user.franchisee_number || user.phone || 'Contact School',
          address: 'TN Happy Kids Playschool'
        };
        setBranchData(defaultBranchData);

        // Fetch branches - Admin gets all branches
        try {
          const branchResponse = await authFetch('/api/branches/get_branches.php');
          const branchResult = await branchResponse.json();
          if (branchResult.success) {
            if (user.role === 'Admin') {
              // Map branch objects to simple name strings for Picker
              const branchNames = (branchResult.data || []).map(b =>
                b.name || b.branch_name || `Branch ${b.id}`
              );
              setBranches(['All Branches', ...branchNames]);
            } else {
              const userBranchName = user.branch_name || branchResult?.data?.find(b => b.id === user.branch_id)?.name || 'TN Happy Kids';
              setBranches([userBranchName]);
              setSelectedBranch(userBranchName);
            }
          }
        } catch (branchError) {
          console.error('Failed to fetch branches:', branchError);
        }

        // Fetch students from students table API
        try {
          const studentResponse = await authFetch('/api/students/get_students.php');
          const studentResult = await studentResponse.json();
          
          if (studentResult.success && studentResult.data) {
            let studentList = studentResult.data;
            
            // If not admin, filter by branch
            if (user.role !== 'Admin' && user.branch_id) {
              studentList = studentList.filter(student => student.branch_id === user.branch_id);
            }

            // Fetch franchisee data for each branch
            const franchiseeDataMap = {};
            const uniqueBranchIds = [...new Set(studentList.map(s => s.branch_id))];
            
            for (const branchId of uniqueBranchIds) {
              try {
                const franchiseeResp = await authFetch(`/api/users/get_franchisee_by_branch.php?branch_id=${branchId}`);
                const franchiseeResult = await franchiseeResp.json();
                if (franchiseeResult.success && franchiseeResult.data && franchiseeResult.data.length > 0) {
                  franchiseeDataMap[branchId] = franchiseeResult.data[0].phone || 'Contact School';
                  console.log(`✅ Franchisee phone for branch ${branchId}:`, franchiseeDataMap[branchId]);
                } else {
                  franchiseeDataMap[branchId] = 'Contact School';
                }
              } catch (franchiseeError) {
                console.warn(`⚠️ Failed to fetch franchisee for branch ${branchId}:`, franchiseeError);
                franchiseeDataMap[branchId] = 'Contact School';
              }
            }

            // Transform student data - students API already has proper student_id from students table
            const transformedStudents = studentList.map((student) => {
              // Prefer student/parent contact number for front-side display
              const displayPhone =
                student.phone ||
                student.parent_phone ||
                student.father_number ||
                student.mother_phone ||
                '';

              // Get franchisee phone from the fetched data
              const franchiseePhone = franchiseeDataMap[student.branch_id] || 'Contact School';

              return {
                id: student.user_id || student.id,
                name: student.name,
                student_id: student.student_id || `STU${(student.user_id || student.id).toString().padStart(4, '0')}`,
                branch_name: student.branch_name,
                branch_id: student.branch_id,
                class_name: student.class || 'Student',
                email: student.email,
                // student's own phone from users/students table (front side)
                phone: student.phone || student.parent_phone,
                display_phone: displayPhone || 'Contact School',
                // franchisee contact for this student's branch (back side)
                franchisee_phone: franchiseePhone,
                photo: student.avatar ? 
                  (student.avatar.startsWith('http') ? student.avatar : `${API_URL}${student.avatar}`) : 
                  null,
                blood_group: student.blood_group || '',
                father_name: student.father_name || '',
                father_number: student.father_number || '',
              };
            });
            
            console.log('✅ Loaded students with proper student_id from students table:', transformedStudents.length);
            console.log('📞 Franchisee data map:', franchiseeDataMap);
            setStudents(transformedStudents);
          }
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

  // Filter students
  useEffect(() => {
    let result = students;
    if (selectedBranch && selectedBranch !== 'All Branches') {
      result = result.filter(student => student.branch_name === selectedBranch);
    }
    if (searchQuery) {
      result = result.filter(student => 
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredStudents(result);
  }, [searchQuery, selectedBranch, students]);

  // Render student list item
  const renderStudentListItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
      <TouchableOpacity onPress={() => setSelectedStudent(item)}>
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.studentCard}
        >
          <Image 
            source={item.photo ? { uri: item.photo } : DEFAULT_AVATAR} 
            style={styles.studentListAvatar}
          />
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentDetails}>{item.branch_name} - {item.student_id}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading student ID cards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ID Card Modal
  const renderIDCardModal = () => {
    if (!selectedStudent) return null;

    return (
      <SafeAreaView style={styles.modalContainer}>
        <ScrollView contentContainerStyle={styles.modalScrollContainer} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animatable.View animation="fadeInDown" duration={600}>
            <LinearGradient colors={Colors.gradientMain} style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => {
                  console.log('🔙 Back button pressed from ID Card modal - closing modal');
                  setSelectedStudent(null);
                }}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalHeaderTitle}>Student ID Card</Text>
                <Text style={styles.modalHeaderSubtitle}>{selectedStudent.name}</Text>
              </View>
            </LinearGradient>
          </Animatable.View>

          {/* ID Card */}
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
                        source={selectedStudent.photo ? { uri: selectedStudent.photo } : DEFAULT_AVATAR}
                        style={styles.studentPhoto}
                      />
                      <View style={styles.photoFrame} />
                    </View>
                  </View>

                  {/* Student Info */}
                  <View style={styles.infoSection}>
                    <Text style={styles.cardStudentName} numberOfLines={2}>
                      {selectedStudent.name}
                    </Text>
                    
                    <View style={styles.infoGrid}>
                      <View style={styles.infoRow}>
                        <MaterialIcons name="badge" size={16} color="#333" />
                        <Text style={styles.infoLabel}>ID:</Text>
                        <Text style={styles.infoValue}>{selectedStudent.student_id}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <MaterialIcons name="school" size={16} color="#333" />
                        <Text style={styles.infoLabel}>Class:</Text>
                        <Text style={styles.infoValue}>{selectedStudent.class_name}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <MaterialIcons name="location-on" size={16} color="#333" />
                        <Text style={styles.infoLabel}>Branch:</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>{selectedStudent.branch_name}</Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <MaterialIcons name="phone" size={16} color="#333" />
                        <Text style={styles.infoLabel}>Phone:</Text>
                        <Text style={styles.infoValue}>
                          {studentDetailLoading ? 'Loading...' : (selectedStudent.display_phone || selectedStudent.phone || 'Contact School')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.websiteText}>www.tnhappykids.in</Text>
                    <Text style={styles.validityText}>Academic Year 2024-25</Text>
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
                          student_id: selectedStudent.student_id,
                          name: selectedStudent.name,
                          class: selectedStudent.class_name,
                          branch: selectedStudent.branch_name,
                          franchisee: branchData?.franchisee_number || 'Contact School',
                          verify_url: `https://www.tnhappykids.in/verify/${selectedStudent.student_id}`
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
                          Branch: {selectedStudent.branch_name}
                        </Text>
                      </View>
                      
                      <View style={styles.contactRow}>
                        <MaterialIcons name="phone" size={16} color="white" />
                        <Text style={styles.contactText}>
                          School: {selectedStudent.franchisee_phone || branchData?.franchisee_number || 'Contact School'}
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
        </ScrollView>
      </SafeAreaView>
    );
  };

  // Main render
  return (
    <SafeAreaView style={styles.container}>
      {selectedStudent ? (
        renderIDCardModal()
      ) : (
        <>
          {/* Header */}
          <Animatable.View animation="fadeInDown" duration={600}>
            <LinearGradient colors={Colors.gradientMain} style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => {
                  console.log('🔙 Back button pressed from ID Card list');
                  router.back();
                }}
              >
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Student ID Cards</Text>
                <Text style={styles.headerSubtitle}>
                  {currentUser?.role === 'Admin' ? 'All Branches Access' : 'Branch Access'}
                </Text>
              </View>
            </LinearGradient>
          </Animatable.View>

          {/* Filters */}
          {currentUser?.role === 'Admin' && (
            <Animatable.View animation="fadeInUp" duration={600} delay={200}>
              <View style={styles.filtersContainer}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedBranch}
                    onValueChange={setSelectedBranch}
                    style={styles.picker}
                  >
                    {branches.map(branch => (
                      <Picker.Item key={branch} label={branch} value={branch} />
                    ))}
                  </Picker>
                </View>
              </View>
            </Animatable.View>
          )}

          {/* Search */}
          <Animatable.View animation="fadeInUp" duration={600} delay={300}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={Colors.lightText} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                placeholderTextColor={Colors.lightText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </Animatable.View>

          {/* Student List */}
          <FlatList
            data={filteredStudents}
            renderItem={renderStudentListItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="card-membership" size={64} color={Colors.lightText} />
                <Text style={styles.emptyText}>No students found</Text>
                <Text style={styles.emptySubtext}>
                  {currentUser?.role === 'Admin' 
                    ? 'Try adjusting your search or branch filter' 
                    : 'No students in your branch'}
                </Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background,
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  pickerContainer: {
    backgroundColor: Colors.card,
    borderRadius: 15,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  picker: {
    height: 50,
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 15,
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: Colors.shadow,
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
    color: Colors.text,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  studentListAvatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 15,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  studentDetails: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalScrollContainer: {
    paddingBottom: 100,
  },
  modalHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  modalHeaderSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  // Card styles (same as student my-idcard)
  cardContainer: {
    marginHorizontal: 20,
    marginTop: 30,
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
  cardStudentName: {
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
});
