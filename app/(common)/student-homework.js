import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useColors } from '../hooks/useColors';
import Header from '../components/Header';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function StudentHomeworkScreen() {
  const Colors = useColors();
  const [loading, setLoading] = useState(false);
  const [homework, setHomework] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submissionModalVisible, setSubmissionModalVisible] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, submitted, overdue
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
    filterContainer: {
      flexDirection: 'row',
      marginBottom: 20,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: Colors.surfaceVariant,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    activeFilter: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    filterText: {
      fontSize: 12,
      fontWeight: '600',
      color: Colors.textSecondary,
    },
    activeFilterText: {
      color: 'white',
    },
    homeworkCard: {
      backgroundColor: Colors.surface,
      borderRadius: 15,
      padding: 20,
      marginBottom: 15,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    homeworkHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 15,
    },
    homeworkTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.text,
      flex: 1,
      marginRight: 10,
    },
    priorityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    priorityText: {
      fontSize: 10,
      fontWeight: '600',
      color: 'white',
    },
    homeworkSubject: {
      fontSize: 14,
      color: Colors.primary,
      fontWeight: '600',
      marginBottom: 8,
    },
    homeworkDescription: {
      fontSize: 14,
      color: Colors.textSecondary,
      lineHeight: 20,
      marginBottom: 15,
    },
    homeworkMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaText: {
      fontSize: 12,
      color: Colors.textSecondary,
      marginLeft: 5,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'white',
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    actionGradient: {
      paddingVertical: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    actionText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 5,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 50,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.textSecondary,
      marginTop: 15,
    },
    emptySubtext: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: 'center',
      marginTop: 5,
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
      padding: 20,
    },
    modalHomeworkTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.text,
      marginBottom: 10,
    },
    modalHomeworkDescription: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginBottom: 20,
      lineHeight: 20,
    },
    submissionInput: {
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 12,
      padding: 15,
      fontSize: 16,
      backgroundColor: Colors.surfaceVariant,
      height: 120,
      textAlignVertical: 'top',
      marginBottom: 20,
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
    loadHomework();
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

  const loadHomework = async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/tuition/get_student_homework.php');
      const result = await response.json();
      
      if (result.success) {
        setHomework(result.data || []);
      }
    } catch (error) {
      console.error('Error loading homework:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredHomework = () => {
    const now = new Date();
    
    return homework.filter(item => {
      switch (filter) {
        case 'pending':
          return item.status === 'pending';
        case 'submitted':
          return item.status === 'submitted';
        case 'overdue':
          return item.status === 'pending' && new Date(item.due_date) < now;
        default:
          return true;
      }
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#FF9800';
    }
  };

  const getStatusColor = (status, dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    
    if (status === 'submitted') return Colors.success;
    if (status === 'pending' && due < now) return Colors.error;
    return Colors.warning;
  };

  const getStatusText = (status, dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    
    if (status === 'submitted') return 'Submitted';
    if (status === 'pending' && due < now) return 'Overdue';
    return 'Pending';
  };

  const handleSubmitHomework = (homeworkItem) => {
    setSelectedHomework(homeworkItem);
    setSubmissionText('');
    setSubmissionModalVisible(true);
  };

  const submitHomework = async () => {
    if (!submissionText.trim()) {
      Alert.alert('Error', 'Please enter your homework submission');
      return;
    }

    try {
      setLoading(true);
      
      const response = await authFetch('/api/tuition/submit_homework.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          homework_id: selectedHomework.id,
          submission_text: submissionText,
          student_id: userData?.id,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Homework submitted successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setSubmissionModalVisible(false);
              setSelectedHomework(null);
              setSubmissionText('');
              loadHomework(); // Refresh the list
            },
          },
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to submit homework');
      }
    } catch (error) {
      console.error('Error submitting homework:', error);
      Alert.alert('Error', 'Failed to submit homework');
    } finally {
      setLoading(false);
    }
  };

  const renderHomeworkItem = ({ item, index }) => {
    const isOverdue = item.status === 'pending' && new Date(item.due_date) < new Date();
    
    return (
      <Animatable.View 
        animation="fadeInUp" 
        delay={index * 100} 
        duration={600}
        style={styles.homeworkCard}
      >
        <View style={styles.homeworkHeader}>
          <Text style={styles.homeworkTitle}>{item.title}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
          </View>
        </View>

        {item.subject && (
          <Text style={styles.homeworkSubject}>📚 {item.subject}</Text>
        )}

        <Text style={styles.homeworkDescription}>{item.description}</Text>

        <View style={styles.homeworkMeta}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="calendar" size={16} color={Colors.textSecondary} />
            <Text style={styles.metaText}>
              Due: {new Date(item.due_date).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status, item.due_date) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status, item.due_date)}</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleSubmitHomework(item)}
            >
              <LinearGradient 
                colors={isOverdue ? ['#F44336', '#D32F2F'] : Colors.gradientSuccess} 
                style={styles.actionGradient}
              >
                <MaterialCommunityIcons name="upload" size={16} color="white" />
                <Text style={styles.actionText}>
                  {isOverdue ? 'Submit Late' : 'Submit'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'submitted' && item.teacher_feedback && (
          <View style={{ marginTop: 15, padding: 15, backgroundColor: Colors.surfaceVariant, borderRadius: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 5 }}>
              Teacher Feedback:
            </Text>
            <Text style={{ fontSize: 14, color: Colors.textSecondary }}>
              {item.teacher_feedback}
            </Text>
          </View>
        )}
      </Animatable.View>
    );
  };

  const renderSubmissionModal = () => (
    <Modal
      visible={submissionModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setSubmissionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Animatable.View animation="slideInUp" style={styles.modalContainer}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            style={styles.modalHeader}
          >
            <MaterialCommunityIcons name="upload" size={32} color="white" />
            <Text style={styles.modalTitle}>Submit Homework</Text>
          </LinearGradient>
          
          <View style={styles.modalContent}>
            {selectedHomework && (
              <>
                <Text style={styles.modalHomeworkTitle}>{selectedHomework.title}</Text>
                <Text style={styles.modalHomeworkDescription}>{selectedHomework.description}</Text>
              </>
            )}
            
            <TextInput
              style={styles.submissionInput}
              placeholder="Enter your homework submission..."
              value={submissionText}
              onChangeText={setSubmissionText}
              multiline
              numberOfLines={6}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setSubmissionModalVisible(false)}
            >
              <LinearGradient colors={['#757575', '#616161']} style={styles.modalButtonGradient}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={submitHomework}
              disabled={loading}
            >
              <LinearGradient colors={Colors.gradientSuccess} style={styles.modalButtonGradient}>
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalButtonText}>Submit</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );

  const filteredHomework = getFilteredHomework();

  return (
    <SafeAreaView style={styles.container}>
      <Header title="📚 My Homework" subtitle="View and submit assignments" />
      
      <View style={styles.content}>
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'submitted', label: 'Submitted' },
            { key: 'overdue', label: 'Overdue' },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterButton, filter === key && styles.activeFilter]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterText, filter === key && styles.activeFilterText]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Homework List */}
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.emptySubtext}>Loading homework...</Text>
          </View>
        ) : filteredHomework.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="book-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No Homework Found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' 
                ? 'No homework assignments available' 
                : `No ${filter} homework assignments`
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHomework}
            renderItem={renderHomeworkItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {renderSubmissionModal()}
    </SafeAreaView>
  );
}
