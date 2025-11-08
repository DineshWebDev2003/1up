import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';
import Colors from '../constants/colors';
import { formatPhotoSource } from '../utils/imageUtils';

const StudentInfoScreen = () => {
  const { student_id } = useLocalSearchParams();
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [studentsList, setStudentsList] = useState([]);

  useEffect(() => {
    loadStudentInfo();
    loadUserRole();
  }, [student_id]);

  useEffect(() => {
    if (!student_id && userRole) {
      loadStudentsList();
    }
  }, [userRole, student_id]);

  const loadUserRole = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadStudentInfo = async () => {
    try {
      if (!student_id) {
        console.log('ℹ️ No student_id provided, will show student selector');
        setLoading(false);
        return;
      }
      
      console.log('📚 Loading student info for ID:', student_id);
      const response = await authFetch(`/api/students/get_student_info.php?student_id=${student_id}`);
      const result = await response.json();
      
      if (result.success) {
        setStudent(result.data);
        console.log('✅ Student info loaded:', result.data);
      } else {
        Alert.alert('Error', result.message || 'Failed to load student information');
      }
    } catch (error) {
      console.error('❌ Error loading student info:', error);
      Alert.alert('Error', 'Failed to load student information. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStudentsList = async () => {
    try {
      console.log('📚 Loading students list for role:', userRole);
      // Explicitly request students with role parameter
      const response = await authFetch('/api/users/user_crud.php?role=Student');
      const result = await response.json();
      
      if (result.success) {
        // Data is already filtered by API for teachers (branch-specific students)
        setStudentsList(result.data);
        console.log('✅ Students list loaded:', result.data.length, 'students');
      } else {
        Alert.alert('Error', result.message || 'Failed to load students list');
      }
    } catch (error) {
      console.error('❌ Error loading students list:', error);
      Alert.alert('Error', 'Failed to load students list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (student_id) {
      loadStudentInfo();
    } else {
      loadStudentsList();
    }
  };

  const makePhoneCall = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const sendSMS = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`sms:${phoneNumber}`);
    }
  };

  const openMaps = (latitude, longitude, address) => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      Linking.openURL(url);
    } else if (address) {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      Linking.openURL(url);
    }
  };

  const handleStudentSelect = (selectedStudent) => {
    console.log('📚 Student selected:', selectedStudent.student_id);
    router.push({
      pathname: '/(common)/student-info',
      params: { student_id: selectedStudent.student_id }
    });
  };

  const renderContactCard = (title, name, phone, photo, iconName) => (
    <Animatable.View animation="fadeInUp" style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.contactIconContainer}>
          <Ionicons name={iconName} size={24} color={Colors.primary} />
        </View>
        <Text style={styles.contactTitle}>{title}</Text>
      </View>
      
      <View style={styles.contactContent}>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{name || 'Not provided'}</Text>
          {phone && (
            <View style={styles.phoneContainer}>
              <Text style={styles.phoneNumber}>{phone}</Text>
              <View style={styles.phoneActions}>
                <TouchableOpacity 
                  style={styles.phoneButton}
                  onPress={() => makePhoneCall(phone)}
                >
                  <Ionicons name="call" size={18} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.smsButton}
                  onPress={() => sendSMS(phone)}
                >
                  <Ionicons name="chatbubble" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        {photo && (
          <View style={styles.contactPhotoContainer}>
            <Image 
              source={formatPhotoSource(photo)} 
              style={styles.contactPhoto}
              defaultSource={require('../../assets/Avartar.png')}
            />
          </View>
        )}
      </View>
    </Animatable.View>
  );

  const renderInfoSection = (title, children, iconName) => (
    <Animatable.View animation="fadeInUp" style={styles.infoSection}>
      <View style={styles.sectionHeader}>
        <Ionicons name={iconName} size={24} color={Colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </Animatable.View>
  );

  const renderInfoRow = (label, value, onPress = null) => (
    <TouchableOpacity 
      style={[styles.infoRow, !onPress && styles.infoRowDisabled]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueContainer}>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
        {onPress && <Ionicons name="chevron-forward" size={16} color={Colors.gray} />}
      </View>
    </TouchableOpacity>
  );

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.studentItem}
      onPress={() => handleStudentSelect(item)}
    >
      <Image 
        source={formatPhotoSource(item.avatar || item.profile_image)} 
        style={styles.studentAvatar}
        defaultSource={require('../../assets/Avartar.png')}
      />
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentDetails}>ID: {item.student_id}</Text>
        <Text style={styles.studentDetails}>Branch: {item.branch_name || 'No Branch'}</Text>
        {item.class && <Text style={styles.studentDetails}>Class: {item.class}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading student information...</Text>
      </View>
    );
  }

  // Show students list if no student_id is provided
  if (!student_id) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={Colors.gradientMain} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Students List</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <FlatList
          data={studentsList}
          renderItem={renderStudentItem}
          keyExtractor={(item, index) => `${item.internal_id || item.student_id || item.id}_${index}`}
          style={styles.studentsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          }
        />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={Colors.danger} />
        <Text style={styles.errorText}>Student not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadStudentInfo}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={Colors.gradientMain} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Information</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Student Profile Card */}
        <Animatable.View animation="fadeInDown" style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={formatPhotoSource(student.photo)} 
              style={styles.profileImage}
              defaultSource={require('../../assets/Avartar.png')}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentId}>ID: {student.student_id}</Text>
            <Text style={styles.studentClass}>Class: {student.class || 'Not assigned'}</Text>
            <Text style={styles.branchName}>{student.branch_name}</Text>
          </View>
        </Animatable.View>

        {/* Basic Information */}
        {renderInfoSection('Basic Information', (
          <>
            {renderInfoRow('Email', student.email)}
            {renderInfoRow('Phone', student.phone, student.phone ? () => makePhoneCall(student.phone) : null)}
            {renderInfoRow('Monthly Fees', student.fees ? `₹${parseFloat(student.fees).toLocaleString('en-IN')}` : 'Not set')}
            {renderInfoRow('Blood Group', student.blood_group)}
            {renderInfoRow('Date of Birth', student.date_of_birth)}
            {renderInfoRow('Gender', student.gender)}
            {renderInfoRow('Status', student.status)}
            {renderInfoRow('Joined Date', student.created_at?.split(' ')[0])}
          </>
        ), 'person')}

        {/* Contact Information */}
        {renderContactCard(
          "Father's Information",
          student.father_name,
          student.father_phone,
          student.father_photo,
          'man'
        )}

        {renderContactCard(
          "Mother's Information", 
          student.mother_name,
          student.mother_phone,
          student.mother_photo,
          'woman'
        )}

        {renderContactCard(
          "Guardian's Information",
          student.guardian_name, 
          student.guardian_phone,
          student.guardian_photo,
          'people'
        )}

        {/* Address Information */}
        {renderInfoSection('Address Information', (
          <>
            {renderInfoRow(
              'Home Address', 
              student.home_address,
              student.home_address ? () => openMaps(student.home_latitude, student.home_longitude, student.home_address) : null
            )}
            {renderInfoRow('Pickup Notes', student.pickup_location_notes)}
            {student.home_latitude && student.home_longitude && (
              <TouchableOpacity 
                style={styles.mapButton}
                onPress={() => openMaps(student.home_latitude, student.home_longitude, student.home_address)}
              >
                <Ionicons name="map" size={20} color={Colors.white} />
                <Text style={styles.mapButtonText}>View on Map</Text>
              </TouchableOpacity>
            )}
          </>
        ), 'location')}

        {/* Academic Information */}
        {renderInfoSection('Academic Information', (
          <>
            {renderInfoRow('Current Class', student.class)}
            {renderInfoRow('Branch', student.branch_name)}
            {renderInfoRow('Admission Date', student.admission_date)}
            {renderInfoRow('Academic Year', student.academic_year)}
          </>
        ), 'school')}

        {/* Quick Actions for Admin/Franchisee */}
        {(userRole === 'Admin' || userRole === 'Franchisee') && (
          <Animatable.View animation="fadeInUp" style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push(`/(common)/mark-attendance?student_id=${student.id}`)}
              >
                <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
                <Text style={styles.actionButtonText}>Mark Attendance</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push(`/(common)/student-activities?student_id=${student.id}`)}
              >
                <Ionicons name="camera" size={24} color={Colors.white} />
                <Text style={styles.actionButtonText}>View Activities</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push(`/(common)/payments-history?student_id=${student.id}`)}
              >
                <Ionicons name="card" size={24} color={Colors.white} />
                <Text style={styles.actionButtonText}>Payment History</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.danger,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileInfo: {
    alignItems: 'center',
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  studentId: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentClass: {
    fontSize: 16,
    color: Colors.gray,
    marginBottom: 4,
  },
  branchName: {
    fontSize: 14,
    color: Colors.gray,
  },
  infoSection: {
    backgroundColor: Colors.white,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surfaceVariant,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  sectionContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoRowDisabled: {
    opacity: 1,
  },
  infoLabel: {
    fontSize: 16,
    color: Colors.gray,
    flex: 1,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'right',
    marginRight: 8,
  },
  contactCard: {
    backgroundColor: Colors.white,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surfaceVariant,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 12,
  },
  contactContent: {
    flexDirection: 'row',
    padding: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneNumber: {
    fontSize: 16,
    color: Colors.gray,
    flex: 1,
  },
  phoneActions: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneButton: {
    backgroundColor: Colors.success,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smsButton: {
    backgroundColor: Colors.info,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactPhotoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginLeft: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  contactPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  mapButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  quickActions: {
    margin: 16,
    marginTop: 8,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: '45%',
  },
  actionButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  bottomSpacer: {
    height: 20,
  },
  // Students List Styles
  studentsList: {
    flex: 1,
    padding: 16,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  studentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default StudentInfoScreen;
