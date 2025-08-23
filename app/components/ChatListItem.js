import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ChatListItem = ({ chat, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={chat.profilePic} style={styles.profilePic} />
      <View style={styles.contentContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.name}>{chat.name}</Text>
          <Text style={styles.time}>{chat.time}</Text>
        </View>
        <View style={styles.subHeaderContainer}>
          <Text style={{ fontSize: 14, color: '#555', fontWeight: 'bold' }}>{`${chat.branch} - ${chat.role}`}</Text>
        </View>
        <View style={styles.messageContainer}>
          <MaterialIcons
            name={chat.isRead ? 'done-all' : 'done'}
            size={16}
            color={chat.isRead ? '#4facfe' : '#999'}
            style={styles.tickIcon}
          />
          <Text style={styles.lastMessage} numberOfLines={1}>{chat.lastMessage}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profilePic: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 15,
  },
  contentContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
    color: '#777',
  },
  subHeaderContainer: {
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#555',
    fontWeight: 'bold',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickIcon: {
    marginRight: 5,
  },
  lastMessage: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: 'bold',
  },
});

export default ChatListItem;
