import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, FlatList, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authFetch from '../utils/api';
import Colors from '../constants/colors';

export default function RequestLeaveScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('my-form');
  const [currentUser, setCurrentUser] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [leaveType, setLeaveType] = useState('sick');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser && activeTab === 'requested') {
      fetchLeaveRequests();
    }
  }, [currentUser, activeTab]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/leave/get_leave_requests.php');
      const result = await response.json();
      if (result.success) {
        setLeaveRequests(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitLeaveRequest = async () => {
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for leave');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch('/api/leave/submit_leave_request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type: leaveType,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          reason: reason.trim(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', 'Leave request submitted successfully');
        setReason('');
        setStartDate(new Date());
        setEndDate(new Date());
        setLeaveType('sick');
      } else {
        Alert.alert('Error', result.message || 'Failed to submit leave request');
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Debounced autosave to create/refresh draft and reflect in My Requests
  const autoSave = useCallback(() => {
    if (!reason.trim()) return; // only autosave when there is content
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    const timer = setTimeout(async () => {
      try {
        setAutoSaving(true);
        await authFetch('/api/leave/submit_leave_request.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leave_type: leaveType,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            reason: reason.trim()
          })
        });
        if (activeTab === 'requested') {
          fetchLeaveRequests();
        }
      } catch (e) {
        // silent
      } finally {
        setAutoSaving(false);
      }
    }, 600);
    setAutoSaveTimer(timer);
  }, [reason, leaveType, startDate, endDate, activeTab]);

  const handleLeaveAction = async (requestId, action) => {
    try {
      const response = await authFetch('/api/leave/handle_leave_request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          action: action, // 'approve' or 'decline'
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('Success', `Leave request ${action}d successfully`);
        fetchLeaveRequests(); // Refresh the list
      } else {
        Alert.alert('Error', result.message || `Failed to ${action} leave request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing leave request:`, error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const onStartDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || startDate;
    setShowStartDatePicker(Platform.OS === 'ios');
    setStartDate(currentDate);
    if (currentDate > endDate) {
      setEndDate(currentDate);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || endDate;
    setShowEndDatePicker(Platform.OS === 'ios');
    setEndDate(currentDate);
  };

  const renderLeaveRequest = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" duration={600} delay={index * 100}>
      <LinearGradient
        colors={
          item.status === 'approved' ? Colors.gradientSuccess :
          item.status === 'declined' ? Colors.gradientDanger :
          Colors.gradientOrange
        }
        style={styles.requestCard}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{item.name}</Text>
            <Text style={styles.requestRole}>{item.role} - {item.branch}</Text>
          </View>
          <View style={styles.statusBadge}>
            <MaterialCommunityIcons 
              name={
                item.status === 'approved' ? 'check-circle' :
                item.status === 'declined' ? 'close-circle' :
                'clock-outline'
              } 
              size={20} 
              color={Colors.white} 
            />
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-range" size={16} color={Colors.lightText} />
            <Text style={styles.detailText}>
              {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="medical-bag" size={16} color={Colors.lightText} />
            <Text style={styles.detailText}>{item.leave_type.toUpperCase()} LEAVE</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="text" size={16} color={Colors.lightText} />
            <Text style={styles.detailText} numberOfLines={2}>{item.reason}</Text>
          </View>
        </View>

        {currentUser?.role === 'Admin' && item.status === 'inactive' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleLeaveAction(item.id, 'approve')}
            >
              <MaterialCommunityIcons name="check" size={18} color={Colors.white} />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleLeaveAction(item.id, 'decline')}
            >
              <MaterialCommunityIcons name="close" size={18} color={Colors.white} />
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </Animatable.View>
  );

  const MyFormTab = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <Animatable.View animation="fadeInUp" duration={800}>
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={32} color={Colors.primary} />
            <Text style={styles.formTitle}>Submit Leave Request</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Leave Type</Text>
            <View style={styles.leaveTypeContainer}>
              {['sick', 'personal', 'vacation', 'emergency'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.leaveTypeButton, leaveType === type && styles.selectedLeaveType]}
                  onPress={() => setLeaveType(type)}
                >
                  <MaterialCommunityIcons 
                    name={
                      type === 'sick' ? 'medical-bag' :
                      type === 'personal' ? 'account' :
                      type === 'vacation' ? 'beach' :
                      'alert-circle'
                    } 
                    size={20} 
                    color={leaveType === type ? Colors.white : Colors.primary} 
                  />
                  <Text style={[styles.leaveTypeText, leaveType === type && styles.selectedLeaveTypeText]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{startDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateGroup}>
              <Text style={styles.inputLabel}>End Date</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{endDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Reason for Leave</Text>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              placeholder="Please provide detailed reason for your leave request..."
              value={reason}
              onChangeText={(t) => { setReason(t); autoSave(); }}
              textAlignVertical="top"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={submitLeaveRequest}
            disabled={submitting}
          >
            <MaterialCommunityIcons name="send" size={20} color={Colors.white} />
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Text>
          </TouchableOpacity>
          {autoSaving && (
            <Text style={{ marginTop: 8, color: Colors.textSecondary }}>Saving...</Text>
          )}
        </View>
      </Animatable.View>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={onStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={onEndDateChange}
          minimumDate={startDate}
        />
      )}
    </ScrollView>
  );

  const RequestedTab = () => (
    <FlatList
      data={leaveRequests}
      renderItem={renderLeaveRequest}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={() => (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-text-off-outline" size={80} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>
            {loading ? 'Loading requests...' : 'No leave requests found'}
          </Text>
        </View>
      )}
      refreshing={loading}
      onRefresh={fetchLeaveRequests}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={Colors.gradient1} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Leave Requests</Text>
        <View style={{width: 40}} />
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'my-form' && styles.activeTab]}
          onPress={() => setActiveTab('my-form')}
        >
          <MaterialCommunityIcons 
            name="clipboard-edit-outline" 
            size={20} 
            color={activeTab === 'my-form' ? Colors.white : Colors.primary} 
          />
          <Text style={[styles.tabText, activeTab === 'my-form' && styles.activeTabText]}>
            My Form
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requested' && styles.activeTab]}
          onPress={() => setActiveTab('requested')}
        >
          <MaterialCommunityIcons 
            name="clipboard-list-outline" 
            size={20} 
            color={activeTab === 'requested' ? Colors.white : Colors.primary} 
          />
          <Text style={[styles.tabText, activeTab === 'requested' && styles.activeTabText]}>
            {currentUser?.role === 'Admin' ? 'All Requests' : 'My Requests'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'my-form' ? <MyFormTab /> : <RequestedTab />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 15,
    backgroundColor: Colors.card,
    borderRadius: 25,
    padding: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  activeTabText: {
    color: Colors.white,
  },
  formContainer: {
    flex: 1,
    padding: 15,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 10,
  },
  leaveTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  leaveTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  selectedLeaveType: {
    backgroundColor: Colors.primary,
  },
  leaveTypeText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectedLeaveTypeText: {
    color: Colors.white,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  dateGroup: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  dateButtonText: {
    marginLeft: 10,
    fontSize: 14,
    color: Colors.darkText,
    fontWeight: '500',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: Colors.white,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 100,
  },
  requestCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  requestRole: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  requestDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    color: Colors.white,
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  declineButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 20,
    textAlign: 'center',
  },
});
