import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const Profile = () => {
  return (
    <LinearGradient
      colors={['#a1c4fd', '#c2e9fb']} // Light blue gradient
      style={styles.container}
    >
      <Image
        source={require('../../assets/Avartar.png')} // Use local avatar image
        style={styles.profilePic}
      />
      <View style={styles.userInfo}>
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.details}>Branch: Main Street</Text>
        <Text style={styles.details}>Role: Administrator</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton}>
        <MaterialIcons name="logout" size={24} color="#555" />
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  details: {
    fontSize: 14,
    color: '#555',
  },
  logoutButton: {
    marginLeft: 'auto',
    padding: 10,
  },
});

export default Profile;
