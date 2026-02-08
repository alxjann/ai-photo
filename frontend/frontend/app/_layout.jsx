import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import '../global.css';

export default function RootLayout() {
  const insets = useSafeAreaInsets();


  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#374151',
          borderTopWidth: 0,
          height: 45 + insets.bottom,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#374151',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen 
        name="test" 
        options={{ 
          title: 'Test',
          tabBarLabel: 'Test',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="albums" 
        options={{ 
          title: 'Albums',
          tabBarLabel: 'Albums',
        }} 
      />
    </Tabs>
  );
}