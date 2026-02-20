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
        name="index" 
        options={{ 
          title: 'Gallery',
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'images' : 'images-outline'} size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="upload" 
        options={{ 
          title: 'Upload',
          tabBarLabel: 'Upload',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'cloud-upload' : 'cloud-upload-outline'} size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="test" 
        options={{ 
          href: null,
        }} 
      />
      <Tabs.Screen 
        name="gallery" 
        options={{ 
          href: null,
        }} 
      />
    </Tabs>
  );
}