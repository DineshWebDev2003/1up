import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, Modal, Animated, SafeAreaView, Platform, TouchableWithoutFeedback, Alert, ActivityIndicator } from 'react-native';
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

const { width, height } = Dimensions.get('window');
const gridItemSize = (width - 40) / 3;

const KidsFeedScreen = () => {
  const { branch: initialBranch, branch_id: initialBranchId } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedData, setFeedData] = useState([]);
  const flatListRef = useRef(null);
  const [userRole, setUserRole] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(initialBranchId || '');
  const [selectedBranchName, setSelectedBranchName] = useState(initialBranch || 'All Branches');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await authFetch('/api/branches/get_branches.php');
        const result = await response.json();
        if (result.success) {
          setBranches([{ id: '', name: 'All Branches' }, ...result.data]);
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };
    
    fetchBranches();
  }, []);

  useEffect(() => {
    const fetchFeed = async () => {
      setIsLoading(true);
      try {
        const url = selectedBranch ? `/api/activities/get_activities.php?branch_id=${selectedBranch}` : '/api/activities/get_activities.php';
        console.log('Fetching activities from:', url);
        const response = await authFetch(url);
        const result = await response.json();
        console.log('Activities response:', result);
        if (result.success) {
          // Transform activities data to feed format
          const transformedData = result.data.map(activity => ({
            id: activity.id,
            type: activity.image_path && (activity.image_path.includes('.mp4') || activity.image_path.includes('.mov') || activity.image_path.includes('.avi')) ? 'video' : 'image',
            source: activity.image_path ? { uri: `${API_URL}/${activity.image_path}` } : require('../../assets/Avartar.png'),
            kidName: activity.student_name || 'Student',
            kidId: activity.student_id || '',
            activityName: activity.title || activity.description || 'Activity',
            branch: activity.branch_name || 'Branch',
            profilePic: activity.student_photo ? `${API_URL}/${activity.student_photo}` : null,
            duration: 3000 // 3 seconds for images
          }));
          setFeedData(transformedData);
        } else {
          console.error("Failed to fetch activities:", result.message);
          setFeedData([]);
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
        setFeedData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();

    const fetchUserRole = async () => {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role || '');
    };
    fetchUserRole();
    
    // Auto-refresh feed every 30 seconds
    const interval = setInterval(() => {
      fetchFeed();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [selectedBranch]);


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

  const handleDelete = async (postId) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const response = await authFetch('/api/activities/create_activity.php', {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: postId }),
              });
              const result = await response.json();
              if (result.success) {
                const newFeedData = feedData.filter(item => item.id !== postId);
                setFeedData(newFeedData);
                if (newFeedData.length === 0) {
                  setModalVisible(false);
                }
              } else {
                Alert.alert('Error', result.message || 'Failed to delete post.');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while deleting the post.');
            }
          }
        }
      ]
    );
  };

  const GridItem = ({ item, index, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, [scaleAnim, index]);

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity style={styles.gridItemContainer} onPress={onPress}>
          <Image 
            source={item.source}
            style={styles.gridItemImage}
            defaultSource={require('../../assets/Avartar.png')}
            onError={() => console.log('Failed to load image:', item.source)}
          />
          {item.type === 'video' && (
            <View style={styles.gridIconWrapper}>
              <Ionicons name="play-circle" size={32} color="rgba(255, 255, 255, 0.8)" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderGridItem = ({ item, index }) => (
    <GridItem item={item} index={index} onPress={() => openModal(item)} />
  );

  const ReelItem = ({ item, isVisible, userRole, onDelete, onNext }) => {
    const progressAnim = useRef(new Animated.Value(0)).current;
    const videoRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
      if (isVisible && item.type === 'image') {
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: item.duration,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) {
            onNext();
          }
        });
      } else {
        progressAnim.setValue(0);
      }

      if (videoRef.current) {
        if (isVisible && !isPaused) {
          videoRef.current.playAsync();
        } else {
          videoRef.current.pauseAsync();
        }
      }
    }, [isVisible, isPaused, item.duration]);

    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    const handlePlaybackStatusUpdate = (status) => {
      if (status.didJustFinish) {
        onNext();
      }
    };

    return (
      <TouchableWithoutFeedback onPress={() => item.type === 'video' && setIsPaused(!isPaused)}>
        <View style={styles.reelItemContainer}>
          {item.type === 'video' ? (
            <Video
              ref={videoRef}
              source={item.source}
              style={styles.reelItemImage}
              resizeMode="contain"
              shouldPlay={isVisible && !isPaused}
              isLooping={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            />
          ) : (
            <Image source={item.source} style={styles.reelItemImage} resizeMode="contain" />
          )}
          {item.type === 'video' && isPaused && (
            <View style={styles.playIconContainer}>
              <Ionicons name="play" size={80} color="rgba(255, 255, 255, 0.7)" />
            </View>
          )}
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.reelInfoOverlay}>
          <View style={styles.infoRow}>
            <Image 
              source={item.profilePic ? { uri: `${API_URL}/${item.profilePic}` } : require('../../assets/Avartar.png')}
              style={styles.profilePic}
            />
            <View>
              <Text style={styles.reelKidName}>{item.kidName}</Text>
              {item.kidId && <Text style={styles.reelKidId}>ID: {item.kidId}</Text>}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="color-palette-outline" size={24} color={Colors.white} style={styles.infoIcon} />
            <Text style={styles.reelActivityName}>{item.activityName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={24} color={Colors.white} style={styles.infoIcon} />
            <Text style={styles.reelBranchName}>{item.branch}</Text>
          </View>
        </LinearGradient>
        {['Admin', 'Administrator', 'Teacher', 'Franchisee'].includes(userRole) && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(item.id)}>
            <Ionicons name="trash-outline" size={28} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>
      </TouchableWithoutFeedback>
    );
  };

  const renderReelItem = ({ item, index }) => (
    <ReelItem 
      item={item} 
      isVisible={index === selectedIndex} 
      userRole={userRole} 
      onDelete={handleDelete} 
      onNext={handleScrollToNext}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animatable.View animation="fadeInDown" duration={800}>
        <LinearGradient colors={Colors.gradientMain} style={styles.header}>
          <LottieView
            source={require('../../assets/Calendar Animation.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.headerTitle}>Student Activities</Text>
          
          <View style={styles.branchPickerContainer}>
            <Picker
              selectedValue={selectedBranch}
              style={styles.branchPicker}
              onValueChange={(itemValue, itemIndex) => {
                setSelectedBranch(itemValue);
                setSelectedBranchName(branches.find(b => b.id === itemValue)?.name || 'All Branches');
              }}
              dropdownIconColor={Colors.white}
            >
              {branches.map(branch => (
                <Picker.Item key={branch.id} label={branch.name} value={branch.id} color={Colors.text} />
              ))}
            </Picker>
          </View>
        </LinearGradient>
      </Animatable.View>

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
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Ionicons name="close-circle" size={36} color={Colors.white} />
          </TouchableOpacity>
          <FlatList
            ref={flatListRef}
            data={feedData}
            renderItem={renderReelItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedIndex}
            onScrollToIndexFailed={() => {}}
            getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
            onViewableItemsChanged={({ viewableItems }) => {
              if (viewableItems.length > 0) {
                setSelectedIndex(viewableItems[0].index);
              }
            }}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          />
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
    alignItems: 'center',
  },
  headerTitle: { fontSize: 34, fontWeight: 'bold', color: Colors.white, textAlign: 'center' },
  branchPickerContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    marginTop: 10,
    width: '80%',
    overflow: 'hidden',
  },
  branchPicker: {
    height: 50,
    width: '100%',
    color: Colors.white,
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
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  closeButton: { position: 'absolute', top: 40, right: 20, zIndex: 1 },
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
});

export default KidsFeedScreen;
