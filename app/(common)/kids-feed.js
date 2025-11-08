import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, Modal, Animated, SafeAreaView, Platform, TouchableWithoutFeedback, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Animatable from 'react-native-animatable';
import Colors from '../constants/colors';
import authFetch from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useNotifications } from '../contexts/NotificationContext';

const { width, height } = Dimensions.get('window');
const gridItemSize = (width - 40) / 3;

const KidsFeedScreen = () => {
  const { branch: initialBranch, branch_id: initialBranchId } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedData, setFeedData] = useState([]);
  const flatListRef = useRef(null);
  const [userRole, setUserRole] = useState('');
  const [userBranchId, setUserBranchId] = useState('');
  const [userBranchName, setUserBranchName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPushDropdown, setShowPushDropdown] = useState(false);
  const [feedType, setFeedType] = useState('my-kid'); // 'my-kid' or 'my-school'
  const [expandedStudents, setExpandedStudents] = useState({});
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('all'); // Default to 'all' for admin
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [myKidOnly, setMyKidOnly] = useState(false); // For parents to filter by their child
  const [userStudentId, setUserStudentId] = useState(null); // Student ID for parent filtering
  const [allFeedData, setAllFeedData] = useState([]); // Store all data for filtering
  
  // Track expanded students per activity in modal
  const [modalExpandedStudents, setModalExpandedStudents] = useState({});
  
  // New state for enhanced functionality
  const [isPaused, setIsPaused] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const [currentActivityStudents, setCurrentActivityStudents] = useState([]);
  const [isHolding, setIsHolding] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const autoScrollTimer = useRef(null);
  
  // Multiple selection and bulk delete states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Firebase notifications hook
  const { 
    isInitialized, 
    fcmToken, 
    subscribeToTopic, 
    unsubscribeFromTopic 
  } = useNotifications();

  // Firebase notification functions
  const enableFirebaseNotifications = async () => {
    try {
      if (isInitialized && fcmToken) {
        // Subscribe to activity notifications for this branch
        if (userBranchId || selectedBranchId) {
          const branchId = selectedBranchId || userBranchId;
          await subscribeToTopic(`activities_${branchId}`);
          await subscribeToTopic(`announcements_${branchId}`);
        }
        
        Alert.alert(
          'Notifications Enabled',
          'You will now receive notifications for new activities and announcements.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Notifications Not Available',
          'Please check your notification settings and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      Alert.alert(
        'Error',
        'Failed to enable notifications. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const disableFirebaseNotifications = async () => {
    try {
      // Unsubscribe from all topics
      if (userBranchId || selectedBranchId) {
        const branchId = selectedBranchId || userBranchId;
        await unsubscribeFromTopic(`activities_${branchId}`);
        await unsubscribeFromTopic(`announcements_${branchId}`);
      }
      
      Alert.alert(
        'Notifications Disabled', 
        'You will no longer receive push notifications.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error disabling notifications:', error);
      Alert.alert('Error', 'Failed to disable notifications.');
    }
  };

  // Fetch user data and branches
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get user role and branch from AsyncStorage
        const role = await AsyncStorage.getItem('userRole');
        const userData = await AsyncStorage.getItem('userData');
        setUserRole(role || '');
        
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          const branchId = parsedUserData.branch_id || parsedUserData.branchId || '';
          setUserBranchId(branchId);
          
          // For admin, default to 'all' branches, otherwise use their branch
          if (role === 'Admin') {
            setSelectedBranchId('all');
          } else {
            setSelectedBranchId(branchId);
          }
          
          // Get student_id for parents
          const studentId = parsedUserData.student_id || parsedUserData.studentId;
          if (studentId) {
            setUserStudentId(studentId);
          }
          
          // If we have branch_id but no branch_name, fetch it from API
          if (branchId && !parsedUserData.branch_name && !parsedUserData.branchName) {
            try {
              const branchResponse = await authFetch(`/api/branches/get_branches.php?id=${branchId}`);
              const branchResult = await branchResponse.json();
              if (branchResult.success && branchResult.data && branchResult.data.length > 0) {
                const branchName = branchResult.data[0].name;
                setUserBranchName(branchName);
                // Update AsyncStorage with the fetched branch name
                const updatedUserData = { ...parsedUserData, branch_name: branchName };
                await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
              }
            } catch (error) {
              console.error("Error fetching branch name:", error);
              setUserBranchName('Branch');
            }
          } else {
            setUserBranchName(parsedUserData.branch_name || parsedUserData.branchName || 'Branch');
          }
        }
        
        // Fetch all branches if user is admin
        if (role === 'Admin') {
          try {
            const branchesResponse = await authFetch('/api/branches/get_branches.php');
            const branchesResult = await branchesResponse.json();
            if (branchesResult.success && branchesResult.data) {
              setBranches(branchesResult.data);
            }
          } catch (error) {
            console.error("Error fetching branches:", error);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    
    fetchUserData();
  }, []);

  const fetchFeed = async () => {
      setIsLoading(true);
      try {
        // Build URL based on feed type and user role - use grouped feed API
        let url = '/api/get_grouped_feed.php';
        
        if (feedType === 'my-school') {
          if (userRole === 'Admin') {
            // Admin can see all branches or filter by selected branch
            if (selectedBranchId && selectedBranchId !== 'all') {
              url += `?branch_id=${selectedBranchId}`;
            }
          } else {
            // Non-admin users see their branch activities
            url += `?branch_id=${userBranchId}`;
          }
        }
        
        console.log('Fetching activities from:', url);
        const response = await authFetch(url);
        const result = await response.json();
        console.log('Activities response:', result);
        console.log('Raw activities data:', result.data);
        if (result.success) {
          // Transform activities data to feed format - handle new grouped API response
          const transformedData = result.data.map(activity => {
            // Get students from the activity
            const students = activity.students || [];
            
            // Use the type from API response (already determined)
            const mediaType = activity.type || 'image';
            const isVideo = mediaType === 'video';
            
            // Use source and thumbnail from API response (already formatted with full URLs)
            const source = activity.source || require('../../assets/Avartar.png');
            const thumbnail = activity.thumbnail || source;
            
            console.log('📊 Activity transformation:', {
              id: activity.id,
              title: activity.title,
              type: activity.type,
              mediaType: mediaType,
              isVideo: isVideo,
              source: source,
              thumbnail: thumbnail,
              students: students.length
            });
            
            return {
              id: activity.id,
              type: mediaType,
              source: source,
              thumbnail: thumbnail,
              students: students, // Array of students
              activityName: activity.title || 'Activity',
              branch: activity.branch_name || userBranchName || 'Branch',
              duration: 3000, // 3 seconds for images
              description: activity.description || '',
              postedBy: activity.author_name || ''
            };
          });
          console.log('Transformed data:', transformedData);
          setAllFeedData(transformedData);
          
          // Apply filtering based on user preferences
          let filteredData = transformedData;
          
          // Filter by "My Kid Only" if parent has checked the box
          if (myKidOnly && userStudentId && userRole !== 'Admin') {
            filteredData = transformedData.filter(activity => {
              // Check if any student in the activity matches the user's student_id
              return activity.students && activity.students.some(student => {
                return student.student_id === userStudentId || student.id === userStudentId;
              });
            });
          }
          
          setFeedData(filteredData);
        } else {
          console.error("Failed to fetch activities:", result.message);
          setFeedData([]);
          setAllFeedData([]);
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
        setFeedData([]);
        setAllFeedData([]);
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => {
    // Only fetch feed if we have user branch data (or admin)
    if (userBranchId || userRole === 'Admin') {
      fetchFeed();
    }

    // Removed auto-refresh functionality as requested
    // No automatic refresh - user can manually refresh if needed
  }, [userBranchId, userBranchName, userRole, feedType, selectedBranchId, myKidOnly, userStudentId]);


  const openModal = (item) => {
    const originalIndex = feedData.findIndex(feedItem => feedItem.id === item.id);
    setSelectedIndex(originalIndex >= 0 ? originalIndex : 0);
    setModalVisible(true);
  };

  const handleScrollToNext = () => {
    const nextIndex = selectedIndex + 1;
    if (nextIndex < feedData.length) {
      setSelectedIndex(nextIndex);
      flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
    }
  };

  // Check if user has delete permission
  const canDelete = () => {
    return ['Admin', 'Franchisee', 'Teacher', 'Tuition Teacher'].includes(userRole);
  };

  const handleDelete = async (postId) => {
    // Check permission first
    if (!canDelete()) {
      Alert.alert('Access Denied', 'You do not have permission to delete activities.');
      return;
    }

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const response = await authFetch('/api/activities/delete_activity.php', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ post_id: postId }),
              });
              const result = await response.json();
              console.log('Delete response:', result);
              
              if (result.success) {
                // Remove from both state arrays immediately
                const newFeedData = feedData.filter(item => item.id !== postId);
                const newAllFeedData = allFeedData.filter(item => item.id !== postId);
                setFeedData(newFeedData);
                setAllFeedData(newAllFeedData);
                
                // Also remove from selected items if in selection mode
                setSelectedItems(prev => prev.filter(id => id !== postId));
                
                if (newFeedData.length === 0) {
                  setModalVisible(false);
                }
                
                // Force refresh to ensure data consistency
                setTimeout(() => {
                  fetchFeed();
                }, 500);
                
                Alert.alert('Success', 'Activity deleted successfully.');
              } else {
                console.error('Delete failed:', result.message);
                Alert.alert('Error', result.message || 'Failed to delete activity.');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while deleting the activity.');
            }
          }
        }
      ]
    );
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems([]);
  };

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  // Select all items
  const selectAllItems = () => {
    if (selectedItems.length === feedData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(feedData.map(item => item.id));
    }
  };

  // Bulk delete function
  const handleBulkDelete = async () => {
    if (!canDelete()) {
      Alert.alert('Access Denied', 'You do not have permission to delete activities.');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('No Selection', 'Please select items to delete.');
      return;
    }

    Alert.alert(
      'Confirm Bulk Deletion',
      `Are you sure you want to delete ${selectedItems.length} selected item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const deletePromises = selectedItems.map(postId => 
                authFetch('/api/activities/delete_activity.php', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ post_id: postId }),
                })
              );
              
              const responses = await Promise.all(deletePromises);
              const results = await Promise.all(responses.map(r => r.json()));
              
              const successfulDeletes = [];
              const failedDeletes = [];
              
              results.forEach((result, index) => {
                if (result.success) {
                  successfulDeletes.push(selectedItems[index]);
                } else {
                  failedDeletes.push(selectedItems[index]);
                }
              });
              
              console.log('Bulk delete results:', { successfulDeletes, failedDeletes });
              
              // Update feed data by removing successfully deleted items
              const newFeedData = feedData.filter(item => !successfulDeletes.includes(item.id));
              const newAllFeedData = allFeedData.filter(item => !successfulDeletes.includes(item.id));
              setFeedData(newFeedData);
              setAllFeedData(newAllFeedData);
              
              // Reset selection
              setSelectedItems([]);
              setSelectionMode(false);
              
              // Force refresh to ensure data consistency
              setTimeout(() => {
                fetchFeed();
              }, 500);
              
              // Show result
              if (failedDeletes.length === 0) {
                Alert.alert('Success', `${successfulDeletes.length} activities deleted successfully.`);
              } else {
                Alert.alert('Partial Success', `${successfulDeletes.length} activities deleted. ${failedDeletes.length} failed to delete.`);
              }
              
            } catch (error) {
              Alert.alert('Error', 'An error occurred during bulk deletion.');
              console.error('Bulk delete error:', error);
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const GridItem = ({ item, index, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const isSelected = selectedItems.includes(item.id);

    useEffect(() => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim, index]);

    const handlePress = () => {
      if (selectionMode) {
        toggleItemSelection(item.id);
      } else {
        onPress();
      }
    };

    const handleLongPress = () => {
      if (!selectionMode && canDelete()) {
        // Start selection mode on long press
        setSelectionMode(true);
        setSelectedItems([item.id]);
      } else if (canDelete()) {
        Alert.alert(
          'Delete Activity',
          'Do you want to delete this activity?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Delete', 
              style: 'destructive',
              onPress: () => handleDelete(item.id)
            }
          ]
        );
      } else {
        Alert.alert('Access Denied', 'You do not have permission to delete activities.');
      }
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity 
          style={[
            styles.gridItemContainer,
            selectionMode && isSelected && styles.selectedGridItem
          ]} 
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={800}
        >
          <Image 
            source={item.thumbnail || item.source}
            style={styles.gridItemImage}
            defaultSource={require('../../assets/Avartar.png')}
            onError={() => console.log('Failed to load thumbnail/image:', item.thumbnail || item.source)}
          />
          {item.type === 'video' && (
            <View style={styles.gridIconWrapper}>
              <Ionicons name="play-circle" size={32} color="rgba(255, 255, 255, 0.8)" />
            </View>
          )}
          
          {/* Selection checkbox */}
          {selectionMode && (
            <View style={styles.selectionCheckbox}>
              <Ionicons 
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} 
                size={24} 
                color={isSelected ? Colors.primary : 'rgba(255, 255, 255, 0.8)'} 
              />
            </View>
          )}
          
          {/* Delete hint - only show when not in selection mode */}
          {!selectionMode && canDelete() && (
            <View style={styles.deleteHintContainer}>
              <Ionicons name="trash-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderGridItem = ({ item, index }) => (
    <GridItem item={item} index={index} onPress={() => openModal(item)} />
  );

  const ReelItem = ({ item, isVisible, userRole, onDelete, onNext, modalExpandedStudents, setModalExpandedStudents, onProgressUpdate, onAutoScroll }) => {
    // Ensure all props have default values
    const safeItem = item || {};
    const safeModalExpandedStudents = modalExpandedStudents || {};
    const safeSetModalExpandedStudents = setModalExpandedStudents || (() => {});
    const safeOnProgressUpdate = onProgressUpdate || (() => {});
    const safeOnAutoScroll = onAutoScroll || (() => {});
    
    // Debug: Log the actual item type and source
    console.log('🎬 ReelItem Debug:', {
      id: safeItem.id,
      type: safeItem.type,
      source: safeItem.source?.uri,
      isVideo: safeItem.source?.uri?.includes('.mp4')
    });
    
    // Fix media type detection - ensure videos are properly detected
    const actualMediaType = (() => {
      if (safeItem.source?.uri) {
        const uri = safeItem.source.uri.toLowerCase();
        if (uri.includes('.mp4') || uri.includes('.mov') || uri.includes('.avi') || 
            uri.includes('.mkv') || uri.includes('.webm') || uri.includes('.m4v')) {
          return 'video';
        }
        if (uri.includes('.mp3') || uri.includes('.wav') || uri.includes('.aac') || 
            uri.includes('.m4a') || uri.includes('.ogg')) {
          return 'audio';
        }
      }
      return 'image';
    })();
    
    // Override the type if it's incorrectly detected
    if (actualMediaType !== safeItem.type) {
      console.log('🔧 Media type corrected:', safeItem.type, '→', actualMediaType);
      safeItem.type = actualMediaType;
    }
    const progressAnim = useRef(new Animated.Value(0)).current;
    const videoRef = useRef(null);
    const [isPausedLocal, setIsPausedLocal] = useState(false);
    const [isHoldingLocal, setIsHoldingLocal] = useState(false);
    const holdTimeoutRef = useRef(null);
    // mediaAspect state removed - using original dimensions
    const animationsStarted = useRef(false); // Flag to prevent animation restarts
    const [currentProgress, setCurrentProgress] = useState(0); // Track progress for display

    // Aspect ratio calculation removed - using original media dimensions

    // Generate dynamic colors based on activity
    const containerColors = [
      ['#FF6B6B', '#FF8E8E'],
      ['#4ECDC4', '#44A08D'],
      ['#45B7D1', '#96C93D'],
      ['#FFA07A', '#FF7F50'],
      ['#98D8C8', '#F7DC6F'],
      ['#BB8FCE', '#85C1E9']
    ];
    const colorIndex = (safeItem.id || 0) % containerColors.length;
    const gradientColors = containerColors[colorIndex];

    useEffect(() => {
      if (isVisible && !isPausedLocal && !isHoldingLocal) {
        // Prevent animation restarts if already started for this item
        if (animationsStarted.current) {
          console.log('🔄 Animations already started, skipping restart for:', safeItem.type);
          return;
        }
        
        // Calculate duration: 15s for images, video duration (max 1 minute) for videos
        let duration = 15000; // 15 seconds for images
        if (safeItem.type === 'video') {
          // Try multiple sources for video duration
          const videoDuration = safeItem.realDuration || safeItem.videoDuration || safeItem.duration || safeItem.durationMillis;
          if (videoDuration) {
            // If duration is in seconds, convert to milliseconds
            const durationMs = videoDuration > 1000 ? videoDuration : videoDuration * 1000;
            duration = Math.min(durationMs, 60000); // Max 1 minute
          } else {
            duration = 30000; // Default 30 seconds for videos without duration
          }
        }
        
        console.log('Progress animation duration:', duration, 'for type:', safeItem.type);
        
        // Simple progress tracking for video and audio media
        if (safeItem.type === 'video' || safeItem.type === 'audio') {
          console.log('✅ Starting progress tracking for media type:', safeItem.type);
          // Set progress to 0 and keep it static for videos
          progressAnim.setValue(0);
          setCurrentProgress(0);
          
          safeOnProgressUpdate(0);
          animationsStarted.current = true; // Mark as started
          
          return () => {
            // No cleanup needed for static display
          };
        }
        
        // Simple progress tracking for image type (no animations)
        console.log('🖼️ Starting progress tracking for image type:', safeItem.type);
        // Reset progress to 0
        progressAnim.setValue(0);
        setCurrentProgress(0);
        
        // No fill animations - just static progress bar
        console.log('📊 Static progress bar for image (15 seconds)');
        
        // Listen to progress updates for auto-scroll timing only
        const listenerId = progressAnim.addListener(({ value }) => {
          setCurrentProgress(value);
          safeOnProgressUpdate(value);
        });
        
        // Auto-scroll after duration without animation
        const autoScrollTimeout = setTimeout(() => {
          console.log('✅ Image duration completed - auto scrolling');
          safeOnAutoScroll();
        }, duration);
        
        animationsStarted.current = true; // Mark as started for images
        
        return () => {
          try {
            progressAnim.removeListener(listenerId);
            clearTimeout(autoScrollTimeout);
          } catch (error) {
            console.warn('Cleanup error:', error);
          }
        };
      } else {
        // Reset animation flag when not visible
        animationsStarted.current = false;
        
        // Reset progress when not visible
        if (safeItem.type !== 'video' && safeItem.type !== 'audio') {
          try {
            progressAnim.setValue(0);
            setCurrentProgress(0);
            safeOnProgressUpdate(0);
          } catch (error) {
            console.warn('Progress reset error:', error);
          }
        }
      }

      if (videoRef.current) {
        if (isVisible && !isPausedLocal && !isHoldingLocal) {
          videoRef.current.playAsync();
        } else {
          videoRef.current.pauseAsync();
        }
      }
    }, [isVisible, isPausedLocal, isHoldingLocal, safeItem.type, safeItem.id]);

    // Cleanup effect on unmount
    useEffect(() => {
      return () => {
        try {
          progressAnim.setValue(0);
        } catch (error) {
          console.warn('Unmount cleanup error:', error);
        }
      };
    }, []);

    // progressWidth removed - using countdown timer instead

    const handlePlaybackStatusUpdate = (status) => {
      if (status.didJustFinish) {
        safeOnAutoScroll();
      }
      
      // Update video duration if available
      if (status.durationMillis && safeItem.type === 'video') {
        const realDuration = Math.min(status.durationMillis, 60000); // Max 1 minute
        console.log('Real video duration detected:', realDuration, 'ms');
        
        // Store duration for future use
        if (!safeItem.videoDuration && !safeItem.duration) {
          safeItem.realDuration = realDuration;
        }
      }
    };

    const students = safeItem.students || [];
    const hasMultipleStudents = students.length > 1;
    const isExpanded = safeModalExpandedStudents[safeItem.id] || false;
    const displayedStudents = isExpanded ? students : students.slice(0, 1);
    
    const toggleExpand = () => {
      safeSetModalExpandedStudents(prev => ({
        ...prev,
        [safeItem.id]: !isExpanded
      }));
    };

    const handleLongPress = () => {
      setIsHoldingLocal(true);
      setIsPausedLocal(true);
    };

    const handlePressOut = () => {
      setIsHoldingLocal(false);
      setIsPausedLocal(false);
    };

    const showStudentListModal = () => {
      setCurrentActivityStudents(students);
      setShowStudentList(true);
    };

    return (
      <TouchableWithoutFeedback
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
        delayLongPress={500}
      >
        <LinearGradient colors={gradientColors} style={styles.modernReelContainer}>
          {/* Media Container */}
          <View style={[styles.mediaContainer, styles.blackMediaBackground]}>
            <View style={styles.originalAspectWrapper}> 
              {safeItem.type === 'video' ? (
                <Video
                  ref={videoRef}
                  source={safeItem.source}
                  style={styles.originalMediaItem}
                  resizeMode="contain"
                  shouldPlay={isVisible && !isPausedLocal && !isHoldingLocal}
                  isLooping={false}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                />
              ) : (
                <Image 
                  source={safeItem.source} 
                  style={styles.originalMediaItem} 
                  resizeMode="contain"
                />
              )}
              
              {/* Play overlay for videos */}
              {safeItem.type === 'video' && (isPausedLocal || isHoldingLocal) && (
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={80} color="rgba(255, 255, 255, 0.9)" />
                </View>
              )}
            </View>
          </View>
          
          {/* Single Combined Details Container */}
          <View style={styles.singleDetailsContainer}>
            {/* Activity Information */}
            <View style={styles.activitySection}>
              <Ionicons name="color-palette-outline" size={18} color={Colors.white} />
              <Text style={styles.simpleActivityName}>{safeItem.activityName}</Text>
              <Ionicons name="business-outline" size={16} color={Colors.white} style={{marginLeft: 15}} />
              <Text style={styles.simpleBranchName}>{safeItem.branch}</Text>
            </View>
            
            {/* Progress bar and duration text removed */}
            
            {/* Student Information with Count */}
            <View style={styles.studentSection}>
              <View style={styles.studentHeader}>
                <Text style={styles.studentCountText}>
                  {students.length} Student{students.length !== 1 ? 's' : ''}
                </Text>
                {students.length > 1 && (
                  <Text style={styles.swipeHint}>← Swipe to see all →</Text>
                )}
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={true}
                style={styles.simpleStudentScroll}
                contentContainerStyle={styles.studentScrollContent}
                pagingEnabled={false}
                decelerationRate="fast"
              >
                {students.map((student, index) => (
                  <View key={`${student.student_id || student.id || index}-${student.user_name || student.name}`} style={styles.simpleStudentCard}>
                    <Image 
                      source={getStudentAvatarSource(student)}
                      style={styles.simpleStudentAvatar}
                      defaultSource={require('../../assets/Avartar.png')}
                    />
                    <View style={styles.simpleStudentInfo}>
                      <Text style={styles.simpleStudentName}>
                        {student.user_name || student.name || student.username || 'Student'}
                      </Text>
                      <Text style={styles.simpleStudentId}>
                        {student.student_id || 'N/A'}
                      </Text>
                    </View>
                  </View>
                ))}
                {/* Add spacing at the end */}
                <View style={styles.scrollEndSpacer} />
              </ScrollView>
            </View>
          </View>
        </LinearGradient>
      </TouchableWithoutFeedback>
    );
  };

  const handleAutoScroll = useCallback(() => {
    const nextIndex = selectedIndex + 1;
    if (nextIndex < feedData.length) {
      setSelectedIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      // Loop back to first item
      setSelectedIndex(0);
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
    }
  }, [selectedIndex, feedData.length]);

  const renderReelItem = ({ item, index }) => (
    <ReelItem
      item={item}
      index={index}
      isVisible={index === selectedIndex}
      userRole={userRole}
      onDelete={handleDelete}
      onNext={handleScrollToNext}
      modalExpandedStudents={modalExpandedStudents}
      setModalExpandedStudents={setModalExpandedStudents}
      onProgressUpdate={(progress) => {
        if (index === selectedIndex) {
          setCurrentProgress(progress);
        }
      }}
      onAutoScroll={handleAutoScroll}
    />
  );

  const toggleExpandedStudents = (activityId) => {
    setExpandedStudents(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }));
  };

  // Helper function to get proper avatar source for students
  const getStudentAvatarSource = (student) => {
    if (!student) return require('../../assets/Avartar.png');
    
    // Check for different avatar field variations
    let avatarUrl = null;
    
    // Priority 1: Full URL (already formatted)
    if (student.avatar_url && (student.avatar_url.startsWith('http://') || student.avatar_url.startsWith('https://'))) {
      avatarUrl = student.avatar_url;
    }
    // Priority 2: Avatar field from users table
    else if (student.avatar && student.avatar.trim() !== '') {
      // If already a full URL, use as is
      if (student.avatar.startsWith('http://') || student.avatar.startsWith('https://')) {
        avatarUrl = student.avatar;
      } else {
        // Relative path, prepend API_URL
        avatarUrl = `${API_URL}/${student.avatar}`;
      }
    }
    // Priority 3: Profile image field
    else if (student.profile_image && student.profile_image.trim() !== '') {
      if (student.profile_image.startsWith('http://') || student.profile_image.startsWith('https://')) {
        avatarUrl = student.profile_image;
      } else {
        avatarUrl = `${API_URL}/${student.profile_image}`;
      }
    }
    
    // Return appropriate source
    return avatarUrl ? { uri: avatarUrl } : require('../../assets/Avartar.png');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animatable.View animation="fadeInDown" duration={800}>
        <LinearGradient colors={Colors.gradientMain} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="people-circle-outline" size={28} color={Colors.white} />
            <Text style={styles.headerTitle}>Student Activities</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => setShowPushDropdown(!showPushDropdown)}
          >
            <Ionicons 
              name={isInitialized && fcmToken ? "notifications" : "notifications-off"} 
              size={24} 
              color={Colors.white} 
            />
          </TouchableOpacity>
          </View>
          
          {userRole === 'Admin' ? (
            <TouchableOpacity 
              style={styles.branchPickerContainer}
              onPress={() => setShowBranchPicker(true)}
            >
              <Ionicons name="business" size={20} color={Colors.white} />
              <Text style={styles.branchPickerText}>
                {selectedBranchId === 'all' 
                  ? 'All Branches' 
                  : branches.find(b => b.id == selectedBranchId)?.name || 'Select Branch'
                }
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <>
            <View style={styles.branchInfoContainer}>
              <Ionicons name="location" size={16} color={Colors.white} style={{ opacity: 0.8 }} />
              <Text style={styles.headerSubtitle}>{userBranchName || 'Branch'}</Text>
            </View>
              {/* My Kid Only Filter for Parents */}
              {userStudentId && (
                <TouchableOpacity 
                  style={styles.myKidFilterContainer}
                  onPress={() => setMyKidOnly(!myKidOnly)}
                >
                  <View style={[styles.checkbox, myKidOnly && styles.checkboxChecked]}>
                    {myKidOnly && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                  </View>
                  <Text style={styles.myKidFilterText}>My Kid Only</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </LinearGradient>
        
        {/* Branch Picker Modal */}
        <Modal
          transparent={true}
          animationType="fade"
          visible={showBranchPicker}
          onRequestClose={() => setShowBranchPicker(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowBranchPicker(false)}
          >
            <TouchableWithoutFeedback>
              <View style={styles.branchPickerModal}>
                <Text style={styles.modalTitle}>Select Branch</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  <TouchableOpacity
                    style={[styles.branchOption, selectedBranchId === 'all' && styles.branchOptionActive]}
                    onPress={() => {
                      setSelectedBranchId('all');
                      setShowBranchPicker(false);
                    }}
                  >
                    <Text style={[styles.branchOptionText, selectedBranchId === 'all' && styles.branchOptionTextActive]}>
                      All Branches
                    </Text>
                    {selectedBranchId === 'all' && <Ionicons name="checkmark" size={20} color={Colors.white} />}
                  </TouchableOpacity>
                  {branches.map((branch) => (
                    <TouchableOpacity
                      key={branch.id}
                      style={[styles.branchOption, selectedBranchId == branch.id && styles.branchOptionActive]}
                      onPress={() => {
                        setSelectedBranchId(branch.id);
                        setShowBranchPicker(false);
                      }}
                    >
                      <Text style={[styles.branchOptionText, selectedBranchId == branch.id && styles.branchOptionTextActive]}>
                        {branch.name}
                      </Text>
                      {selectedBranchId == branch.id && <Ionicons name="checkmark" size={20} color={Colors.white} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowBranchPicker(false)}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
        
        {/* Push Notification Dropdown */}
        {showPushDropdown && (
          <Animatable.View animation="fadeInDown" duration={300} style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                enableFirebaseNotifications();
                setShowPushDropdown(false);
              }}
            >
              <Ionicons name="notifications" size={20} color={Colors.primary} />
              <Text style={styles.dropdownText}>Enable Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                disableFirebaseNotifications();
                setShowPushDropdown(false);
              }}
            >
              <Ionicons name="notifications-off" size={20} color={Colors.textSecondary} />
              <Text style={styles.dropdownText}>Disable Notifications</Text>
            </TouchableOpacity>
          </Animatable.View>
        )}
      </Animatable.View>

      {/* Selection Mode Toolbar */}
      {selectionMode && (
        <Animatable.View animation="slideInDown" duration={300} style={styles.selectionToolbar}>
          <View style={styles.selectionInfo}>
            <TouchableOpacity onPress={selectAllItems} style={styles.selectAllButton}>
              <Ionicons 
                name={selectedItems.length === feedData.length ? 'checkbox' : 'square-outline'} 
                size={20} 
                color={Colors.primary} 
              />
              <Text style={styles.selectAllText}>
                {selectedItems.length === feedData.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectedCount}>
              {selectedItems.length} of {feedData.length} selected
            </Text>
          </View>
          <View style={styles.selectionActions}>
            <TouchableOpacity 
              onPress={handleBulkDelete} 
              style={[
                styles.bulkDeleteButton,
                selectedItems.length === 0 && styles.disabledButton
              ]}
              disabled={selectedItems.length === 0 || isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="trash" size={18} color={Colors.white} />
                  <Text style={styles.bulkDeleteText}>Delete ({selectedItems.length})</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleSelectionMode} style={styles.cancelButton}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      ) : (
        <FlatList
        data={feedData}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContainer}
        ListEmptyComponent={<Animatable.Text animation="fadeInUp" style={styles.emptyText}>No feed available for this branch.</Animatable.Text>}
      />
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
          
          <FlatList
            ref={flatListRef}
            data={feedData}
            renderItem={renderReelItem}
            keyExtractor={(item) => item.id}
            vertical
            pagingEnabled
            showsVerticalScrollIndicator={false}
            initialScrollIndex={selectedIndex}
            onScrollToIndexFailed={() => {}}
            getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
            onViewableItemsChanged={({ viewableItems }) => {
              if (viewableItems.length > 0) {
                setSelectedIndex(viewableItems[0].index);
              }
            }}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            decelerationRate="fast"
            snapToInterval={height}
            snapToAlignment="start"
          />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Student List Modal */}
      <Modal
        visible={showStudentList}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStudentList(false)}
      >
        <View style={styles.studentListModalContainer}>
          <View style={styles.studentListModal}>
            <View style={styles.studentListHeader}>
              <Text style={styles.studentListTitle}>Students in Activity</Text>
              <TouchableOpacity 
                style={styles.closeStudentListButton}
                onPress={() => setShowStudentList(false)}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.studentListContent}>
              {currentActivityStudents.map((student, index) => (
                <View key={`${student.student_id || student.id || index}-${student.user_name || student.name}`} style={styles.studentListItem}>
                  <Image 
                    source={getStudentAvatarSource(student)}
                    style={styles.studentListAvatar}
                    defaultSource={require('../../assets/Avartar.png')}
                  />
                  <View style={styles.studentListInfo}>
                    <Text style={styles.studentListName}>{student.user_name || student.name || student.username || 'Student'}</Text>
                    <Text style={styles.studentListId}>ID: {student.student_id || 'N/A'}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginLeft: 8 },
  headerSubtitle: { fontSize: 14, color: Colors.white, opacity: 0.9, marginLeft: 6 },
  myKidFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  myKidFilterText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  branchPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  lottieAnimation: { width: 120, height: 120, marginBottom: -10 },
  gridContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  gridItemContainer: {
    width: gridItemSize,
    height: gridItemSize,
    margin: 5,
    borderRadius: 15,
    backgroundColor: Colors.lightGray,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 6,
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  gridIconWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  deleteHintContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  modalContent: { flex: 1 },
  modalDeleteButton: {
    position: 'absolute',
    top: 60,
    right: 70,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: { 
    position: 'absolute', 
    top: 50, 
    left: 20, 
    zIndex: 1, 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modern Reel Container Styles
  modernReelContainer: {
    width: width,
    height: height,
    position: 'relative',
  },
  mediaContainer: {
    width: width - 40,
    height: height * 0.75,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 5,
    overflow: 'hidden', // Fix overflow glitch
    position: 'relative',
  },
  blackMediaBackground: {
    backgroundColor: '#000000',
  },
  mediaAspectWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  aspectStory: {
    width: '100%',
    aspectRatio: 9 / 16,
  },
  aspectFourFive: {
    width: '90%',
    aspectRatio: 4 / 5,
  },
  aspectSquare: {
    width: '80%',
    aspectRatio: 1,
  },
  modernMediaItem: {
    width: '100%',
    height: '100%',
    borderRadius: 25, // Match container border radius
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
  },
  
  // Student Information Panel
  studentInfoPanel: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    height: 120,
    paddingHorizontal: 20,
  },
  studentsScroll: {
    flexGrow: 0,
  },
  modernStudentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modernStudentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: Colors.white,
    marginBottom: 8,
  },
  modernStudentName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  modernStudentId: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Activity Side Panel
  activitySidePanel: {
    position: 'absolute',
    right: 20,
    top: '30%',
    width: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 15,
    backdropFilter: 'blur(10px)',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modernActivityName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    marginLeft: 10,
    flex: 1,
  },
  activityDetails: {
    gap: 10,
  },
  activityDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityDetailText: {
    fontSize: 14,
    color: Colors.white,
    marginLeft: 8,
    flex: 1,
    opacity: 0.9,
  },
  
  // Modern Delete Button
  modernDeleteButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 25,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Black media background
  blackMediaBackground: {
    backgroundColor: '#000000',
    overflow: 'hidden', // Ensure content doesn't overflow
    borderRadius: 25, // Match container border radius
  },
  
  // Legacy styles (keeping for compatibility)
  reelItemContainer: { width: width, height: height, justifyContent: 'center', alignItems: 'center' },
  reelItemImage: { width: '100%', height: '80%' },
  progressBarContainer: { position: 'absolute', top: 30, left: 10, right: 10, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressBar: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  reelInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoIcon: { marginRight: 15 },
  reelKidName: { color: Colors.white, fontSize: 22, fontWeight: 'bold' },
  reelKidId: { color: Colors.white, fontSize: 14, opacity: 0.8 },
  reelActivityName: { color: Colors.white, fontSize: 18, fontWeight: '500' },
  reelBranchName: { color: Colors.white, fontSize: 18, fontWeight: '500' },
  playIconContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  deleteButton: {
    position: 'absolute',
    top: 90,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.white,
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  notificationButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  feedTypeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    padding: 4,
    marginBottom: 8,
  },
  feedTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  feedTypeButtonActive: {
    backgroundColor: Colors.white,
  },
  feedTypeText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  feedTypeTextActive: {
    color: Colors.primary,
  },
  studentsContainer: {
    marginBottom: 12,
  },
  moreButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 15,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  branchPickerText: {
    color: Colors.white,
    fontSize: 15,
    marginHorizontal: 8,
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchPickerModal: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  branchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: Colors.lightGray,
  },
  branchOptionActive: {
    backgroundColor: Colors.primary,
  },
  branchOptionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  branchOptionTextActive: {
    color: Colors.white,
  },
  closeModalButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // New styles for enhanced functionality
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pauseText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  studentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  groupActivityButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  groupActivityText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  noStudentsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  noStudentsText: {
    color: Colors.white,
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
  },
  activityInfoContainer: {
    marginTop: 8,
  },
  reelDescription: {
    color: Colors.white,
    fontSize: 14,
    opacity: 0.9,
    flex: 1,
    marginLeft: 8,
  },
  
  // Student List Modal Styles
  studentListModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  studentListModal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '70%',
    minHeight: '40%',
  },
  studentListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  studentListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeStudentListButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
  },
  studentListContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  studentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  studentListAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  studentListInfo: {
    flex: 1,
    marginLeft: 15,
  },
  studentListName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  studentListId: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  
  // Single Progress Bar - Clean Style
  singleProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    alignItems: 'center',
  },
  singleProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  singleProgressBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  singleProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderRadius: 2,
  },
  
  // Single Combined Details Container
  singleDetailsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    borderRadius: 15,
    marginTop: 20,
  },
  
  // Activity Section
  activitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  simpleActivityName: {
    fontSize: 16,
    color: Colors.white,
    marginLeft: 8,
    fontWeight: '600',
  },
  simpleBranchName: {
    fontSize: 14,
    color: Colors.white,
    marginLeft: 8,
    opacity: 0.8,
  },
  
  // Original Aspect Ratio Media Styles
  originalAspectWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  originalMediaItem: {
    width: '100%',
    height: '100%',
    minHeight: 200,
  },
  
  // Progress bar styles removed - using countdown timer instead
  
  // Static progress bar styles removed - using countdown timer instead
  
  // Student Section
  studentSection: {
    marginTop: 10,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentCountText: {
    fontSize: 14,
    color: Colors.white,
    fontWeight: '700',
  },
  swipeHint: {
    fontSize: 11,
    color: Colors.white,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  
  // Simple Student Cards
  simpleStudentScroll: {
    flexGrow: 0,
  },
  studentScrollContent: {
    paddingRight: 20,
  },
  simpleStudentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollEndSpacer: {
    width: 20,
  },
  simpleStudentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  simpleStudentInfo: {
    flex: 1,
  },
  simpleStudentName: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  simpleStudentId: {
    fontSize: 10,
    color: Colors.white,
    opacity: 0.7,
  },
  
  // Legacy swipe indicators (kept for compatibility)
  swipeIndicators: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: 4,
  },
  swipeIndicatorActive: {
    backgroundColor: Colors.white,
    height: 20,
  },
  
  // Selection Mode Styles
  selectedGridItem: {
    borderWidth: 3,
    borderColor: Colors.primary,
    transform: [{ scale: 0.95 }],
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 2,
  },
  
  // Selection Toolbar Styles
  selectionToolbar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  selectedCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkDeleteButton: {
    backgroundColor: Colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  bulkDeleteText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: Colors.lightGray,
    opacity: 0.6,
  },
});

export default KidsFeedScreen;
