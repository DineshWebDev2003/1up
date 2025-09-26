import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernBackground from '../components/ModernBackground';
import Colors from '../constants/colors';

const HomeworkScreen = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      try {
        // Mock student data
        setStudents([
          {
            id: '1',
            name: 'Rahul Kumar',
            class: '9th Grade',
            receivedHomework: [
              { id: 'h1', subject: 'Mathematics', title: 'Algebra Problems', assignedDate: '2024-01-10', dueDate: '2024-01-15', status: 'pending' },
              { id: 'h2', subject: 'Physics', title: 'Motion Problems', assignedDate: '2024-01-08', dueDate: '2024-01-12', status: 'pending' },
            ],
            completedHomework: [
              { id: 'h3', subject: 'Chemistry', title: 'Periodic Table', assignedDate: '2024-01-05', completedDate: '2024-01-07', grade: 'A', progress: 100 },
              { id: 'h4', subject: 'Mathematics', title: 'Geometry', assignedDate: '2024-01-01', completedDate: '2024-01-03', grade: 'B+', progress: 100 },
            ]
          },
          {
            id: '2',
            name: 'Priya Sharma',
            class: '10th Grade',
            receivedHomework: [
              { id: 'h5', subject: 'English', title: 'Essay Writing', assignedDate: '2024-01-12', dueDate: '2024-01-18', status: 'pending' },
            ],
            completedHomework: [
              { id: 'h6', subject: 'History', title: 'World War II', assignedDate: '2024-01-06', completedDate: '2024-01-09', grade: 'A+', progress: 100 },
              { id: 'h7', subject: 'Geography', title: 'Climate Change', assignedDate: '2024-01-02', completedDate: '2024-01-04', grade: 'A', progress: 100 },
            ]
          },
          {
            id: '3',
            name: 'Amit Singh',
            class: '8th Grade',
            receivedHomework: [
              { id: 'h8', subject: 'Science', title: 'Plant Biology', assignedDate: '2024-01-11', dueDate: '2024-01-16', status: 'pending' },
              { id: 'h9', subject: 'Mathematics', title: 'Fractions', assignedDate: '2024-01-09', dueDate: '2024-01-14', status: 'pending' },
            ],
            completedHomework: [
              { id: 'h10', subject: 'English', title: 'Grammar Exercise', assignedDate: '2024-01-03', completedDate: '2024-01-05', grade: 'B', progress: 100 },
            ]
          },
          {
            id: '4',
            name: 'Neha Gupta',
            class: '9th Grade',
            receivedHomework: [
              { id: 'h11', subject: 'Mathematics', title: 'Trigonometry', assignedDate: '2024-01-13', dueDate: '2024-01-19', status: 'pending' },
            ],
            completedHomework: [
              { id: 'h12', subject: 'Physics', title: 'Light and Sound', assignedDate: '2024-01-04', completedDate: '2024-01-06', grade: 'A-', progress: 100 },
              { id: 'h13', subject: 'Chemistry', title: 'Acids and Bases', assignedDate: '2024-01-01', completedDate: '2024-01-02', grade: 'A+', progress: 100 },
            ]
          },
        ]);
      } catch (error) {
        console.error('Error loading students:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  const handleStudentPress = (student) => {
    setSelectedStudent(student);
    setModalVisible(true);
    setActiveTab('received');
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity style={styles.studentCard} onPress={() => handleStudentPress(item)}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.studentGradient}
      >
        <View style={styles.studentInfo}>
          <View style={styles.studentAvatar}>
            <Ionicons name="person" size={24} color="white" />
          </View>
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentClass}>{item.class}</Text>
          </View>
          <View style={styles.homeworkCounts}>
            <View style={styles.countItem}>
              <Text style={styles.countNumber}>{item.receivedHomework.length}</Text>
              <Text style={styles.countLabel}>Pending</Text>
            </View>
            <View style={styles.countItem}>
              <Text style={styles.countNumber}>{item.completedHomework.length}</Text>
              <Text style={styles.countLabel}>Completed</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderHomeworkItem = ({ item }) => {
    const isReceived = activeTab === 'received';

    return (
      <View style={styles.homeworkCard}>
        <View style={styles.homeworkHeader}>
          <Text style={styles.homeworkSubject}>{item.subject}</Text>
          {!isReceived && (
            <View style={[styles.gradeContainer, { backgroundColor: getGradeColor(item.grade) }]}>
              <Text style={styles.gradeText}>{item.grade}</Text>
            </View>
          )}
        </View>
        <Text style={styles.homeworkTitle}>{item.title}</Text>
        <View style={styles.homeworkMeta}>
          <Text style={styles.homeworkDate}>
            {isReceived
              ? `Due: ${item.dueDate}`
              : `Completed: ${item.completedDate}`
            }
          </Text>
          {!isReceived && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{item.progress}%</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const getGradeColor = (grade) => {
    if (grade.includes('A')) return '#4CAF50';
    if (grade.includes('B')) return '#FF9800';
    return '#F44336';
  };

  return (
    <ModernBackground variant="main">
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Homework Management</Text>
            <Text style={styles.headerSubtitle}>Select a student to view homework</Text>
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Loading students...</Text>
          ) : (
            <FlatList
              data={students}
              renderItem={renderStudentItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.studentsList, { paddingBottom: insets.bottom + 100 }]}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Homework Modal */}
          <Modal
            animationType="slide"
            transparent={false}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <ModernBackground variant="main">
              <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
                <View style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.modalTitleContainer}>
                      <Text style={styles.modalTitle}>{selectedStudent?.name}</Text>
                      <Text style={styles.modalSubtitle}>{selectedStudent?.class}</Text>
                    </View>
                    <View style={{ width: 24 }} />
                  </View>

                  {/* Tabs */}
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[styles.tab, activeTab === 'received' && styles.activeTab]}
                      onPress={() => setActiveTab('received')}
                    >
                      <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
                        Received ({selectedStudent?.receivedHomework.length || 0})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
                      onPress={() => setActiveTab('completed')}
                    >
                      <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
                        Completed ({selectedStudent?.completedHomework.length || 0})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Homework List */}
                  <FlatList
                    data={activeTab === 'received' ? selectedStudent?.receivedHomework : selectedStudent?.completedHomework}
                    renderItem={renderHomeworkItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.homeworkList, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </SafeAreaView>
            </ModernBackground>
          </Modal>
        </View>
      </SafeAreaView>
    </ModernBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: 'white',
  },
  studentsList: {
    paddingHorizontal: 20,
  },
  studentCard: {
    marginBottom: 15,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  studentGradient: {
    borderRadius: 15,
    padding: 15,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  studentClass: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  homeworkCounts: {
    flexDirection: 'row',
  },
  countItem: {
    alignItems: 'center',
    marginLeft: 15,
  },
  countNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  countLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitleContainer: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: 20,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'white',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  activeTabText: {
    color: Colors.primary,
  },
  homeworkList: {
    paddingHorizontal: 20,
  },
  homeworkCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  homeworkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  homeworkSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  gradeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  homeworkMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeworkDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: Colors.lightGray,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
});

export default HomeworkScreen;
