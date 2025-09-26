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

        // Fetch students
        try {
          const studentResponse = await authFetch('/api/students/get_students.php');
          const studentResult = await studentResponse.json();
          if (studentResult.success) {
            // Transform API data to match component expectations
            const transformedStudents = studentResult.data.map(student => ({
              id: student.id,
              name: student.name,
              studentId: student.student_id,
              branch: student.branch_name,
              branch_id: student.branch_id, // Pass branch_id
              class: student.class,
              section: student.section,
              email: student.email,
              parentName: student.parent_name,
              parentPhone: student.parent_phone,
              admissionDate: student.admission_date,
              photo: student.profile_photo // Use profile_photo
            }));
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
        <TouchableOpacity onPress={() => setSelectedStudent(item)}>
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
                            {branches.map((branch) => (
                              <Picker.Item key={branch.id} label={branch.name} value={branch.name} />
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
                    keyExtractor={(item) => item.id.toString()}
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
                    <VirtualIDCard student={selectedStudent} />
                    <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedStudent(null)}>
                       <LinearGradient colors={['#FF85A1', '#FFD700']} style={styles.closeButtonGradient}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </LinearGradient>
                    </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
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
});

