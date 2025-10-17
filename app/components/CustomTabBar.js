import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import Theme from '../constants/theme';

const CustomTabBar = ({ state, descriptors, navigation }) => {
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
    const color = isFocused ? Colors.primary : Colors.white;
    let iconComponent;

    switch (routeName) {
      case 'home':
        iconComponent = <FontAwesome name="home" size={24} color={color} />;
        break;
      case 'income-expense':
        iconComponent = <FontAwesome name="money" size={24} color={color} />;
        break;
      case 'payments-history':
        iconComponent = <FontAwesome name="history" size={24} color={color} />;
        break;
      case 'quick-action':
        iconComponent = <Ionicons name="flash" size={24} color={color} />;
        break;
      case 'chat':
      case 'chats':
        iconComponent = <Ionicons name="chatbubble-ellipses" size={24} color={color} />;
        break;
      case 'settings':
        iconComponent = <FontAwesome name="cog" size={24} color={color} />;
        break;
      case 'my-idcard':
        iconComponent = <FontAwesome name="id-card" size={24} color={color} />;
        break;
      case 'student-navigator':
        iconComponent = <Ionicons name="navigate" size={24} color={color} />;
        break;
      case 'attendance':
        iconComponent = <FontAwesome name="calendar-check-o" size={24} color={color} />;
        break;
      default:
        return null;
    }
    return iconComponent;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={Colors.gradientPrimary} style={styles.gradient}>
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
            >
              <Animated.View
                style={[
                  styles.iconWrapper,
                  isFocused && styles.activeIconContainer,
                  animatedStyle,
                ]}
              >
                {getIcon(route.name, isFocused)}
              </Animated.View>
            </TouchableOpacity>
          );
        }) : null}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 70,
    borderRadius: Theme.borderRadius.xl || 16,
    margin: Theme.spacing.md || 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Theme.spacing.sm || 8,
    borderRadius: Theme.borderRadius.xl || 16,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm || 8,
    margin: 4,
    borderRadius: Theme.borderRadius.md || 8,
    height: 60,
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: Theme.borderRadius.lg || 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeIconContainer: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default CustomTabBar;
