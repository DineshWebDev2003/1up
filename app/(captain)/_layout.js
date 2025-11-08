import React from 'react';
import { Tabs } from 'expo-router';
import { StatusBar, View, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/colors';
import CustomTabBar from '../components/CustomTabBar';
import { CaptainProvider } from '../(common)/CaptainProvider';

const CaptainLayout = () => {
  return (
    <CaptainProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="home" />
          <Tabs.Screen name="student-navigator" />
          <Tabs.Screen name="attendance" />
          <Tabs.Screen name="settings" />
        </Tabs>
      </View>
    </CaptainProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});

export default CaptainLayout;
