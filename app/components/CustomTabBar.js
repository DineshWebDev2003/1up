import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Text, Platform } from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors } from '../hooks/useColors';
import { useTheme } from '../contexts/ThemeContext';
import Theme from '../constants/theme';

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const Colors = useColors();
  const { isDarkMode } = useTheme();
  const { routes, index: activeIndex } = state;
  const scaleAnims = useRef(routes && Array.isArray(routes) ? routes.map(() => new Animated.Value(1)) : []).current;

  useEffect(() => {
    scaleAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === activeIndex ? 1.2 : 1,
        friction: i === activeIndex ? 3 : 5,
        useNativeDriver: true,
      }).start();
    });
  }, [activeIndex]);

  const getIcon = (routeName, isFocused) => {
    const color = isFocused ? Colors.textOnPrimary : Colors.textSecondary;
    const size = 22;
    let iconComponent;

    switch (routeName) {
      case 'home':
        iconComponent = <MaterialIcons name="home" size={size} color={color} />;
        break;
      case 'income-expense':
        iconComponent = <MaterialIcons name="account-balance-wallet" size={size} color={color} />;
        break;
      case 'payments-history':
        iconComponent = <MaterialIcons name="history" size={size} color={color} />;
        break;
      case 'quick-action':
        iconComponent = <MaterialIcons name="dashboard" size={size} color={color} />;
        break;
      case 'chat':
      case 'chats':
        iconComponent = <MaterialIcons name="chat" size={size} color={color} />;
        break;
      case 'settings':
        iconComponent = <MaterialIcons name="settings" size={size} color={color} />;
        break;
      case 'my-idcard':
        iconComponent = <MaterialIcons name="badge" size={size} color={color} />;
        break;
      case 'student-navigator':
        iconComponent = <MaterialIcons name="explore" size={size} color={color} />;
        break;
      case 'attendance':
        iconComponent = <MaterialIcons name="event-available" size={size} color={color} />;
        break;
      default:
        return null;
    }
    return iconComponent;
  };

  const getLabel = (routeName) => {
    switch (routeName) {
      case 'home':
        return 'Home';
      case 'income-expense':
        return 'Finance';
      case 'payments-history':
        return 'History';
      case 'quick-action':
        return 'Actions';
      case 'chat':
      case 'chats':
        return 'Chat';
      case 'settings':
        return 'Settings';
      case 'my-idcard':
        return 'ID Card';
      case 'student-navigator':
        return 'Navigate';
      case 'attendance':
        return 'Attendance';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={95} tint={isDarkMode ? "dark" : "light"} style={[styles.blurContainer, { backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
          <View style={styles.tabBarContent}>
            {routes && Array.isArray(routes) ? routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = activeIndex === index;
              const animatedStyle = {
                transform: [{ scale: scaleAnims[index] }],
              };

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  style={styles.tabItem}
                  activeOpacity={0.7}
                >
                  <Animated.View style={[styles.tabContent, animatedStyle]}>
                    <View style={[styles.iconContainer, isFocused && [styles.activeIconContainer, { backgroundColor: Colors.primary }]]}>
                      {getIcon(route.name, isFocused)}
                    </View>
                    <Text style={[styles.tabLabel, { color: Colors.textSecondary }, isFocused && [styles.activeTabLabel, { color: Colors.primary }]]}>
                      {getLabel(route.name)}
                    </Text>
                    {isFocused && <View style={[styles.activeIndicator, { backgroundColor: Colors.primary }]} />}
                  </Animated.View>
                </TouchableOpacity>
              );
            }) : null}
          </View>
        </BlurView>
      ) : (
        <View style={[styles.androidContainer, { backgroundColor: Colors.surface, borderColor: Colors.border }]}>
          <View style={styles.tabBarContent}>
            {routes && Array.isArray(routes) ? routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = activeIndex === index;
              const animatedStyle = {
                transform: [{ scale: scaleAnims[index] }],
              };

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  style={styles.tabItem}
                  activeOpacity={0.7}
                >
                  <Animated.View style={[styles.tabContent, animatedStyle]}>
                    <View style={[styles.iconContainer, isFocused && [styles.activeIconContainer, { backgroundColor: Colors.primary }]]}>
                      {getIcon(route.name, isFocused)}
                    </View>
                    <Text style={[styles.tabLabel, { color: Colors.textSecondary }, isFocused && [styles.activeTabLabel, { color: Colors.primary }]]}>
                      {getLabel(route.name)}
                    </Text>
                    {isFocused && <View style={[styles.activeIndicator, { backgroundColor: Colors.primary }]} />}
                  </Animated.View>
                </TouchableOpacity>
              );
            }) : null}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 16,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  androidContainer: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 72,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  activeIconContainer: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default CustomTabBar;
