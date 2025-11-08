import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import Colors from '../constants/colors';

const TalkView = ({ user, talk, visible, onClose }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      if (videoRef.current) {
        videoRef.current.replayAsync();
      }
    } else {
      if (videoRef.current) {
        videoRef.current.stopAsync();
      }
    }
  }, [visible]);

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded && status.durationMillis) {
      const progressValue = status.positionMillis / status.durationMillis;
      progress.setValue(progressValue);
      if (status.didJustFinish) {
        onClose();
      }
    }
  };

  if (!user || !talk) {
    return null;
  }

  const progressInterpolation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal animationType="fade" transparent={false} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, { width: progressInterpolation }]} />
        </View>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <Text style={styles.userName}>{user.name}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={32} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Video
          ref={videoRef}
          source={{ uri: talk.videoUrl }}
          style={styles.video}
          useNativeControls={false}
          resizeMode="contain"
          isLooping={false}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          shouldPlay={visible}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: Colors.lightText,
    marginTop: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 15,
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    padding: 5,
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default TalkView;
