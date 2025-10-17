import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StatusView = ({ currentUser, users }) => {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        {/* Current User's Status */}
        <View style={styles.statusItemContainer}>
          <View>
            <Image source={currentUser.profilePic} style={styles.profilePic} />
            <View style={styles.plusIconContainer}>
              <Ionicons name="add-circle" size={22} color="#007AFF" style={{ backgroundColor: 'white', borderRadius: 11 }} />
            </View>
          </View>
          <Text style={styles.statusText}>Your Story</Text>
        </View>
        {/* Other Users' Statuses */}
        {users.map((user) => (
          <View key={user.id} style={styles.statusItemContainer}>
            <Image source={user.profilePic} style={styles.statusImage} />
            <Text style={styles.statusText}>{user.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollView: {
    paddingHorizontal: 10,
  },
  statusItemContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  statusImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#4facfe',
  },
  statusText: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
});

export default StatusView;
