import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const { width: screenWidth } = Dimensions.get('window');

const UpdateModal = ({ 
  visible, 
  onClose, 
  updateInfo, 
  onInstall,
  isInstalling = false 
}) => {
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    if (visible) {
      setAnimationStep(0);
      // Stagger animations
      setTimeout(() => setAnimationStep(1), 300);
      setTimeout(() => setAnimationStep(2), 600);
    }
  }, [visible]);

  if (!updateInfo) return null;

  const { version, releaseNotes, forceUpdate, currentVersion } = updateInfo;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={forceUpdate ? null : onClose}
    >
      <View style={styles.modalOverlay}>
        <Animatable.View 
          animation="zoomIn" 
          duration={500}
          style={styles.modalContainer}
        >
          {/* Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.modalHeader}
          >
            <Animatable.View 
              animation={animationStep >= 0 ? "bounceIn" : null}
              delay={200}
              style={styles.headerIconContainer}
            >
              <MaterialCommunityIcons 
                name="rocket-launch" 
                size={40} 
                color="#FFFFFF" 
              />
            </Animatable.View>
            
            <Animatable.Text 
              animation={animationStep >= 0 ? "fadeInUp" : null}
              delay={400}
              style={styles.modalTitle}
            >
              🚀 New Version Available!
            </Animatable.Text>
            
            <Animatable.View 
              animation={animationStep >= 1 ? "fadeInUp" : null}
              delay={100}
              style={styles.versionContainer}
            >
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v{currentVersion}</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
                <Text style={styles.versionText}>v{version}</Text>
              </View>
            </Animatable.View>
          </LinearGradient>

          {/* Content */}
          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Animatable.View 
              animation={animationStep >= 1 ? "fadeInUp" : null}
              delay={200}
            >
              {/* Update Type Badge */}
              <View style={styles.updateTypeContainer}>
                <View style={[
                  styles.updateTypeBadge,
                  { backgroundColor: forceUpdate ? '#ff6b6b' : '#4ecdc4' }
                ]}>
                  <MaterialCommunityIcons 
                    name={forceUpdate ? "alert-circle" : "information"} 
                    size={16} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.updateTypeText}>
                    {forceUpdate ? 'Critical Update' : 'Optional Update'}
                  </Text>
                </View>
              </View>

              {/* Release Notes */}
              <View style={styles.releaseNotesContainer}>
                <Text style={styles.releaseNotesTitle}>📝 What's New:</Text>
                <View style={styles.releaseNotesBox}>
                  <Text style={styles.releaseNotesText}>{releaseNotes}</Text>
                </View>
              </View>

              {/* Features Highlight */}
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>✨ Key Improvements:</Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <MaterialCommunityIcons name="speedometer" size={20} color="#4ecdc4" />
                    <Text style={styles.featureText}>Better Performance</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <MaterialCommunityIcons name="shield-check" size={20} color="#4ecdc4" />
                    <Text style={styles.featureText}>Enhanced Security</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <MaterialCommunityIcons name="bug-check" size={20} color="#4ecdc4" />
                    <Text style={styles.featureText}>Bug Fixes</Text>
                  </View>
                </View>
              </View>
            </Animatable.View>
          </ScrollView>

          {/* Action Buttons */}
          <Animatable.View 
            animation={animationStep >= 2 ? "fadeInUp" : null}
            delay={100}
            style={styles.modalActions}
          >
            {!forceUpdate && (
              <TouchableOpacity 
                style={styles.laterButton}
                onPress={onClose}
                disabled={isInstalling}
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[
                styles.installButton,
                { flex: forceUpdate ? 1 : 0.6 }
              ]}
              onPress={onInstall}
              disabled={isInstalling}
            >
              <LinearGradient
                colors={['#4ecdc4', '#44a08d']}
                style={styles.installButtonGradient}
              >
                {isInstalling ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.installButtonText}>Installing...</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="download" size={20} color="#FFFFFF" />
                    <Text style={styles.installButtonText}>Install Now</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>

          {/* Close Button (only if not force update) */}
          {!forceUpdate && (
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              disabled={isInstalling}
            >
              <MaterialCommunityIcons name="close" size={24} color="#666666" />
            </TouchableOpacity>
          )}
        </Animatable.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: screenWidth - 40,
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  
  // Header
  modalHeader: {
    padding: 24,
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  versionContainer: {
    alignItems: 'center',
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  versionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Content
  modalContent: {
    maxHeight: 300,
    paddingHorizontal: 24,
  },
  updateTypeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  updateTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  updateTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  releaseNotesContainer: {
    marginBottom: 20,
  },
  releaseNotesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  releaseNotesBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4ecdc4',
  },
  releaseNotesText: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  
  featuresContainer: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#555555',
    fontWeight: '500',
  },

  // Actions
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  laterButton: {
    flex: 0.4,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  installButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  installButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  installButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default UpdateModal;
