import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import UnifiedChatList from '../(common)/unified-chat-list';

const TeacherChatScreen = () => {
  const router = useRouter();

  useEffect(() => {
    // Any teacher-specific chat initialization can go here
  }, []);

    return (
    <View style={styles.container}>
      <UnifiedChatList />
            </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TeacherChatScreen;