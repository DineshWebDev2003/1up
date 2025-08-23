import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import QuickActionButton from '../components/QuickActionButton';
import { Stack } from 'expo-router';

const actions = [
  { id: '1', icon: 'calendar-check', label: 'Attendance' },
  { id: '2', icon: 'lightbulb-on', label: 'Activities' },
  { id: '3', icon: 'bell', label: 'Notifications' },
  { id: '4', icon: 'image-multiple', label: 'Gallery' },
  { id: '5', icon: 'book-open-page-variant', label: 'Homework' },
  { id: '6', icon: 'bus', label: 'Transport' },
  { id: '7', icon: 'currency-usd', label: 'Fees' },
  { id: '8', icon: 'message-text', label: 'Messages' },
];

const QuickActionsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Quick Actions' }} />
      <View style={styles.grid}>
        {actions.map(action => (
          <View key={action.id} style={styles.buttonWrapper}>
            <QuickActionButton
              icon={action.icon}
              label={action.label}
              onPress={() => console.log(`${action.label} pressed`)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 10,
  },
  buttonWrapper: {
    width: '45%',
    marginBottom: 15,
  },
});

export default QuickActionsScreen;
