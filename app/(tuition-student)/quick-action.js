import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TuitionStudentQuickActionScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tuition Student Quick Actions</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default TuitionStudentQuickActionScreen;
