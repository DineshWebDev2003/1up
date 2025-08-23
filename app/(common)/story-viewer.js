import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const StoryViewer = () => {
  const { storyUri, user, profilePic } = useLocalSearchParams();
  const router = useRouter();
  const [isVideo, setIsVideo] = useState(false);

  useEffect(() => {
    if (storyUri) {
      setIsVideo(storyUri.endsWith('.mp4') || storyUri.endsWith('.mov'));
    }
  }, [storyUri]);

  if (!storyUri) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Loading story...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isVideo ? (
        <Video
          source={{ uri: storyUri }}
          style={styles.content}
          useNativeControls
          resizeMode="cover"
          isLooping
        />
      ) : (
        <Image source={{ uri: storyUri }} style={styles.content} />
      )}
      <View style={styles.header}>
        <Image source={{ uri: profilePic }} style={styles.profilePic} />
        <Text style={styles.userName}>{user}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  userName: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
  closeButton: {
    marginLeft: 'auto',
  },
});

export default StoryViewer;
