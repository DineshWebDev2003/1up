import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Dimensions, Animated, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';

const { width: screenWidth } = Dimensions.get('window');

const StoryViewer = () => {
  const { allStories: allStoriesJson, startIndex } = useLocalSearchParams();
  const router = useRouter();

  const [allStories, setAllStories] = useState([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (allStoriesJson) {
      try {
        const parsedStories = JSON.parse(allStoriesJson);
        setAllStories(parsedStories);
        setCurrentUserIndex(parseInt(startIndex, 10) || 0);
      } catch (e) {
        console.error("Failed to parse stories:", e);
        router.back();
      }
      setLoading(false);
    }
  }, [allStoriesJson, startIndex]);

  useEffect(() => {
    progressAnim.stopAnimation();
    if (allStories.length > 0 && allStories[currentUserIndex]) {
      const currentUserStories = allStories[currentUserIndex].items || allStories[currentUserIndex].stories;
      if (currentUserStories && currentUserStories.length > 0) {
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 15000, // 15 seconds for a story
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) {
            handleNextStory();
          }
        });
      }
    }
    return () => progressAnim.stopAnimation();
  }, [currentUserIndex, currentStoryIndex, allStories]);

  const handleNextStory = () => {
    const currentUserStories = allStories[currentUserIndex].items || allStories[currentUserIndex].stories;
    if (currentStoryIndex < currentUserStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentUserIndex < allStories.length - 1) {
      setCurrentUserIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      router.back();
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentUserIndex > 0) {
      const prevUserIndex = currentUserIndex - 1;
      const prevUserStories = allStories[prevUserIndex].items || allStories[prevUserIndex].stories;
      setCurrentUserIndex(prevUserIndex);
      setCurrentStoryIndex(prevUserStories.length - 1);
    }
  };

  const handleTouch = (evt) => {
    const x = evt.nativeEvent.locationX;
    if (x < screenWidth / 3) {
      handlePrevStory();
    } else {
      handleNextStory();
    }
  };

  if (loading || allStories.length === 0 || !allStories[currentUserIndex]) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentUser = allStories[currentUserIndex];
  const currentUserStories = currentUser.items || currentUser.stories;
  const currentStory = currentUserStories[currentStoryIndex];
  const isVideo = currentStory.uri.endsWith('.mp4') || currentStory.uri.endsWith('.mov');

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.touchableContainer} onPress={handleTouch} activeOpacity={1}>
        {isVideo ? (
          <Video
            source={{ uri: currentStory.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            isLooping
            shouldPlay
          />
        ) : (
          <Image source={{ uri: currentStory.uri }} style={styles.content} resizeMode="contain" />
        )}

        <View style={styles.overlay}>
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={styles.headerGradient}
          >
            <View style={styles.progressBarContainer}>
              {currentUserStories.map((_, index) => (
                <View key={index} style={styles.progressBarBackground}>
                  <Animated.View
                    style={[
                      styles.progressBar,
                      {
                        width: index === currentStoryIndex
                          ? progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%']
                            })
                          : (index < currentStoryIndex ? '100%' : '0%')
                      }
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={styles.header}>
              <Image source={typeof currentUser.profilePic === 'string' ? { uri: currentUser.profilePic } : currentUser.profilePic} style={styles.profilePic} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{currentUser.name}</Text>
                <Text style={styles.storyTimestamp}>{currentStory.timestamp}</Text>
              </View>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={Colors.lightText} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchableContainer: {
    flex: 1,
  },
  content: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    color: Colors.lightText,
    fontWeight: 'bold',
    fontSize: 16,
  },
  storyTimestamp: {
    color: Colors.lightText,
    fontSize: 12,
    opacity: 0.8,
  },
  closeButton: {
    marginLeft: 'auto',
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  progressBarContainer: {
    flexDirection: 'row',
    height: 4,
    gap: 4,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 5,
  },
  progressBarBackground: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.lightText,
    borderRadius: 2,
  },
});

export default StoryViewer;
