import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const SuccessPopup = ({ 
  visible, 
  onClose, 
  userName, 
  userEmail, 
  studentId, 
  onViewIdCard, 
  onCreateAnother,
  isStudent = false,
  isPending = false,
  status = 'active'
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Animatable.View 
          animation="zoomIn" 
          duration={600} 
          style={styles.modalContent}
        >
          <LinearGradient
            colors={isPending ? ['#FF9800', '#F57C00'] : ['#4CAF50', '#45a049']}
            style={styles.successHeader}
          >
            <LottieView
              source={require('../../assets/lottie/success.json')}
              autoPlay
              loop={false}
              style={styles.successAnimation}
            />
            <Text style={styles.successTitle}>
              {isPending ? '⏳ Submitted!' : '🎉 Success!'}
            </Text>
            <Text style={styles.successSubtitle}>
              {isPending ? 'User Submitted for Approval' : 'User Created Successfully'}
            </Text>
          </LinearGradient>

          <View style={styles.userInfoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#4CAF50" />
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{userName}</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#4CAF50" />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{userEmail}</Text>
            </View>

            {isStudent && studentId && !isPending && (
              <Animatable.View 
                animation="fadeInUp" 
                delay={300} 
                style={styles.studentIdContainer}
              >
                <View style={styles.infoRow}>
                  <Ionicons name="school-outline" size={20} color="#FF6B35" />
                  <Text style={styles.infoLabel}>Student ID:</Text>
                  <Text style={[styles.infoValue, styles.studentIdText]}>{studentId}</Text>
                </View>
                <Text style={styles.storageInfo}>💾 Stored in both Users and Students tables</Text>
              </Animatable.View>
            )}

            {isPending && isStudent && (
              <Animatable.View 
                animation="fadeInUp" 
                delay={300} 
                style={[styles.studentIdContainer, styles.pendingContainer]}
              >
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={20} color="#FF9800" />
                  <Text style={styles.infoLabel}>Student ID:</Text>
                  <Text style={[styles.infoValue, styles.pendingText]}>Will be assigned upon approval</Text>
                </View>
                <Text style={styles.storageInfo}>📝 Student record will be created when admin approves</Text>
              </Animatable.View>
            )}

            <View style={[styles.statusContainer, isPending && styles.pendingStatusContainer]}>
              <Ionicons 
                name={isPending ? "hourglass-outline" : "checkmark-circle"} 
                size={20} 
                color={isPending ? "#FF9800" : "#4CAF50"} 
              />
              <Text style={[styles.statusText, isPending && styles.pendingStatusText]}>
                Status: {isPending ? 'Waiting for Approval' : 'Active'}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            {isStudent && studentId && !isPending && (
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={onViewIdCard}
              >
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="card-outline" size={18} color="#FFF" />
                  <Text style={styles.buttonText}>View ID Card</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={onCreateAnother}
            >
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                style={styles.buttonGradient}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                <Text style={styles.buttonText}>Create Another</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.doneButton]} 
              onPress={onClose}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: width * 0.9,
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  successHeader: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  successAnimation: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
  },
  userInfoContainer: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginLeft: 10,
    marginRight: 10,
    minWidth: 60,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  studentIdContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  studentIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  storageInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 10,
  },
  actionButtons: {
    padding: 20,
    paddingTop: 10,
  },
  actionButton: {
    marginBottom: 10,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  doneButton: {
    backgroundColor: '#F5F5F5',
    elevation: 1,
  },
  doneButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: 15,
  },
  pendingContainer: {
    backgroundColor: '#FFF8E1',
    borderLeftColor: '#FF9800',
  },
  pendingText: {
    color: '#FF9800',
    fontStyle: 'italic',
  },
  pendingStatusContainer: {
    backgroundColor: '#FFF8E1',
  },
  pendingStatusText: {
    color: '#FF9800',
  },
});

export default SuccessPopup;
