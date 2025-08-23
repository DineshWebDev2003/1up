import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

const actions = [
  { icon: 'store', title: 'Create Branch', colors: ['#ff9a9e', '#fad0c4'], route: '/(common)/create-branch' },
  { icon: 'person-add', title: 'Create & Assign User', colors: ['#a1c4fd', '#c2e9fb'], route: '/(common)/create-assign-user' },
  { icon: 'manage-accounts', title: 'Manage User', colors: ['#ffc3a0', '#ffafbd'], route: '/(common)/manage-user' },
  { icon: 'account-balance-wallet', title: 'Income & Expense', colors: ['#84fab0', '#8fd3f4'], route: '/(common)/income-expense' },
  { icon: 'schedule', title: 'Timetable', colors: ['#fbc2eb', '#a6c1ee'], route: '/(common)/timetable' },
  { icon: 'check-circle', title: 'Attendance', colors: ['#ffecd2', '#fcb69f'], route: '/(common)/attendance' },
  { icon: 'payment', title: 'Update Fees', colors: ['#d4fc79', '#96e6a1'], route: '/(common)/update-fees' },
  { icon: 'videocam', title: 'Live Monitoring', colors: ['#f093fb', '#f5576c'], route: '/(common)/live-monitoring' },
  { icon: 'badge', title: 'ID Card', colors: ['#4facfe', '#00f2fe'], route: '/(common)/id-card' },
  { icon: 'history', title: 'Payments History', colors: ['#fa709a', '#fee140'], route: '/(common)/payments-history' },
];

const ActionButton = ({ action, index, onPress }) => (
  <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
    <TouchableOpacity onPress={onPress} style={styles.button} activeOpacity={0.8}>
      <LinearGradient colors={action.colors} style={styles.iconContainer}>
        <MaterialIcons name={action.icon} size={30} color="#fff" />
      </LinearGradient>
      <Text style={styles.buttonText}>{action.title}</Text>
      <MaterialIcons name="keyboard-arrow-right" size={24} color="#000" />
    </TouchableOpacity>
  </Animatable.View>
);

const AdminQuickActionScreen = () => {
  const router = useRouter();

  const handlePress = (route) => {
    router.push(route);
  };

  return (
    <Animatable.View animation="fadeIn" duration={800} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Quick Actions</Text>
        <FlatList
          data={actions}
          renderItem={({ item, index }) => (
            <ActionButton
              action={item}
              index={index}
              onPress={() => handlePress(item.route)}
            />
          )}
          keyExtractor={(item) => item.title}
          contentContainerStyle={styles.listContainer}
        />
      </SafeAreaView>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#000',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: '#000',
    overflow: 'hidden',
  },
  buttonText: {
    flex: 1,
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdminQuickActionScreen;


