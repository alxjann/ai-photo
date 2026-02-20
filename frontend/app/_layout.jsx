import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = Math.max(125, Math.min(150, screenHeight * 0.12));
  const headerPaddingTop = Math.max(16, Math.min(40, screenHeight * 0.04)) + insets.top;

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: dark ? '#fff' : '#000',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: dark ? '#1c1c1e' : '#F5F5F7',
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
            backgroundColor: dark ? '#1c1c1e' : '#F5F5F7',
            height: headerHeight,
            paddingTop: headerPaddingTop,
          },
          headerTintColor: dark ? '#fff' : '#000',
          headerTitleStyle: {
            fontSize: 28,
            fontWeight: 'bold',
            marginLeft: 0,
            marginTop: 12,
          },
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
        <Tabs.Screen name="test" options={{ href: null }} />
        <Tabs.Screen name="gallery" options={{ href: null }} />
        <Tabs.Screen name="photoViewer" options={{ href: null }} />
      </Tabs>
    </>
  );
}