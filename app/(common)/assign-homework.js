import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useColors } from '../hooks/useColors';
import Header from '../components/Header';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AssignHomeworkScreen() {
  const Colors = useColors();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [homeworkTitle, setHomeworkTitle] = useState('');
  const [homeworkDescription, setHomeworkDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [userData, setUserData] = useState(null);

  const getStyles = () => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    formCard: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 15,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 12,
      padding: 15,
      fontSize: 16,
      backgroundColor: Colors.surfaceVariant,
      marginBottom: 15,
      color: Colors.text,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    priorityContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    priorityButton: {
      flex: 1,
      marginHorizontal: 5,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    priorityGradient: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    priorityText: {
      fontSize: 14,
      fontWeight: '600',
    },
    studentSelector: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 12,
      padding: 15,
      backgroundColor: Colors.surfaceVariant,
      marginBottom: 15,
    },
    studentSelectorText: {
      fontSize: 16,
      color: Colors.text,
    },
    selectedStudentsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 10,
    },
    studentChip: {
      backgroundColor: Colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      margin: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    studentChipText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
      marginRight: 5,
    },
    assignButton: {
      borderRadius: 15,
      overflow: 'hidden',
      marginTop: 20,
    },
    assignGradient: {
      paddingVertical: 15,
      alignItems: 'center',
    },
    assignText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
    
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '90%',
      maxHeight: '80%',
      backgroundColor: Colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      elevation: 10,
    },
    modalHeader: {
      padding: 20,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: 'white',
      marginTop: 10,
    },
    modalContent: {
      flex: 1,
      padding: 20,
    },
    studentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 10,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    studentAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    studentInfo: {
      flex: 1,
    },
    studentName: {
      fontSize: 16,
      fontWeight: '600',
      color: Colors.text,
    },
    studentId: {
      fontSize: 14,
      color: Colors.textSecondary,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      padding: 20,
      gap: 15,
    },
    modalButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    modalButtonGradient: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    modalButtonText: {
      color: 'white',
      fontWeight: '600',
    },
  });

  const styles = getStyles();

  useEffect(() => {
    loadUserData();
    loadStudents();
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserData(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/tuition/get_students.php');
      const result = await response.json();
      
      if (result.success) {
        setStudents(result.data || []);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelection = (student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.find(s => s.id === student.id);
      if (isSelected) {
        return prev.filter(s => s.id !== student.id);
      } else {
        return [...prev, student];
      }
    });
  };

  const selectAllStudents = () => {
    setSelectedStudents(students);
  };

  const clearSelection = () => {
    setSelectedStudents([]);
  };

  const assignHomework = async () => {
    if (!homeworkTitle.trim()) {
      Alert.alert('Error', 'Please enter homework title');
      return;
    }

    if (!homeworkDescription.trim()) {
      Alert.alert('Error', 'Please enter homework description');
      return;
    }

    if (selectedStudents.length === 0) {
      Alert.alert('Error', 'Please select at least one student');
      return;
    }

    try {
      setLoading(true);
      
      const homeworkData = {
        title: homeworkTitle,
        description: homeworkDescription,
        subject: subject,
        due_date: dueDate,
        priority: priority,
        assigned_by: userData?.id,
        students: selectedStudents.map(s => s.id),
      };

      const response = await authFetch('/api/tuition/assign_homework.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(homeworkData),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Homework assigned successfully!', [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setHomeworkTitle('');
              setHomeworkDescription('');
              setSubject('');
              setSelectedStudents([]);
              setPriority('medium');
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to assign homework');
      }
    } catch (error) {
      console.error('Error assigning homework:', error);
      Alert.alert('Error', 'Failed to assign homework');
    } finally {
      setLoading(false);
    }
  };

  const renderStudentModal = () => (
    <Modal
      visible={studentModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setStudentModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Animatable.View animation="slideInUp" style={styles.modalContainer}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            style={styles.modalHeader}
          >
            <MaterialCommunityIcons name="account-group" size={32} color="white" />
            <Text style={styles.modalTitle}>Select Students</Text>
          </LinearGradient>
          
          <ScrollView style={styles.modalContent}>
            {students.map((student) => {
              const isSelected = selectedStudents.find(s => s.id === student.id);
              
              return (
                <TouchableOpacity
                  key={student.id}
                  style={styles.studentItem}
                  onPress={() => handleStudentSelection(student)}
                >
                  <View style={styles.studentAvatar}>
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                      {student.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentId}>ID: {student.student_id || student.id}</Text>
                  </View>
                  
                  <View style={[styles.checkbox, isSelected && { backgroundColor: Colors.primary }]}>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={16} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalButton} onPress={selectAllStudents}>
              <LinearGradient colors={Colors.gradientInfo} style={styles.modalButtonGradient}>
                <Text style={styles.modalButtonText}>Select All</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalButton} onPress={clearSelection}>
              <LinearGradient colors={Colors.gradientWarning} style={styles.modalButtonGradient}>
                <Text style={styles.modalButtonText}>Clear</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setStudentModalVisible(false)}
            >
              <LinearGradient colors={Colors.gradientSuccess} style={styles.modalButtonGradient}>
                <Text style={styles.modalButtonText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );

  const getPriorityColor = (priorityLevel) => {
    switch (priorityLevel) {
      case 'high': return ['#F44336', '#D32F2F'];
      case 'medium': return Colors.gradientWarning;
      case 'low': return Colors.gradientInfo;
      default: return Colors.gradientWarning;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="📝 Assign Homework" subtitle="Create homework assignments" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Homework Details */}
        <Animatable.View animation="fadeInUp" duration={600} style={styles.formCard}>
          <Text style={styles.sectionTitle}>Homework Details</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Homework Title"
            value={homeworkTitle}
            onChangeText={setHomeworkTitle}
            placeholderTextColor={Colors.textSecondary}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Subject (optional)"
            value={subject}
            onChangeText={setSubject}
            placeholderTextColor={Colors.textSecondary}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Homework Description"
            value={homeworkDescription}
            onChangeText={setHomeworkDescription}
            multiline
            numberOfLines={4}
            placeholderTextColor={Colors.textSecondary}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Due Date (YYYY-MM-DD)"
            value={dueDate}
            onChangeText={setDueDate}
            placeholderTextColor={Colors.textSecondary}
          />
        </Animatable.View>

        {/* Priority Selection */}
        <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.formCard}>
          <Text style={styles.sectionTitle}>Priority Level</Text>
          
          <View style={styles.priorityContainer}>
            {['low', 'medium', 'high'].map((level) => (
              <TouchableOpacity
                key={level}
                style={styles.priorityButton}
                onPress={() => setPriority(level)}
              >
                <LinearGradient
                  colors={priority === level ? getPriorityColor(level) : ['#E0E0E0', '#BDBDBD']}
                  style={styles.priorityGradient}
                >
                  <Text style={[
                    styles.priorityText, 
                    { color: priority === level ? 'white' : '#666' }
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Student Selection */}
        <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.formCard}>
          <Text style={styles.sectionTitle}>Assign To Students</Text>
          
          <TouchableOpacity 
            style={styles.studentSelector}
            onPress={() => setStudentModalVisible(true)}
          >
            <Text style={styles.studentSelectorText}>
              {selectedStudents.length === 0 
                ? 'Select Students' 
                : `${selectedStudents.length} student(s) selected`
              }
            </Text>
          </TouchableOpacity>
          
          {selectedStudents.length > 0 && (
            <View style={styles.selectedStudentsContainer}>
              {selectedStudents.map((student) => (
                <View key={student.id} style={styles.studentChip}>
                  <Text style={styles.studentChipText}>{student.name}</Text>
                  <TouchableOpacity onPress={() => handleStudentSelection(student)}>
                    <MaterialCommunityIcons name="close" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Animatable.View>

        {/* Assign Button */}
        <Animatable.View animation="fadeInUp" duration={600} delay={600} style={styles.assignButton}>
          <TouchableOpacity onPress={assignHomework} disabled={loading}>
            <LinearGradient colors={Colors.gradientSuccess} style={styles.assignGradient}>
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.assignText}>Assign Homework</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>
      </ScrollView>

      {renderStudentModal()}
    </SafeAreaView>
  );
}
