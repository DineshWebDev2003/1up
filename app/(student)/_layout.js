import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'home') {
            iconName = 'home';
          } else if (route.name === 'quick-action') {
            iconName = 'rocket';
          } else if (route.name === 'chats') {
            iconName = 'comments';
          } else if (route.name === 'settings') {
            iconName = 'cog';
          }

          return <FontAwesome name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="quick-action" options={{ title: 'Quick Action' }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
