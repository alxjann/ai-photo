import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions } from 'react-native';
import { useThemeContext } from 'context/ThemeContext.jsx';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = Math.max(125, Math.min(150, screenHeight * 0.12));
  const headerPaddingTop = Math.max(16, Math.min(40, screenHeight * 0.04)) + insets.top;
  const { isDarkMode } = useThemeContext();

  const bgColor = isDarkMode ? '#2A2A2A' : '#F5F5F7';
  const activeTint = isDarkMode ? '#F9FAFB' : '#000000';
  const inactiveTint = isDarkMode ? '#A1A1AA' : '#9CA3AF';

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: activeTint,
          tabBarInactiveTintColor: inactiveTint,
          tabBarStyle: {
            backgroundColor: bgColor,
            borderTopWidth: 0,
            height: 55 + insets.bottom,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          headerStyle: { backgroundColor: bgColor, height: headerHeight, paddingTop: headerPaddingTop },
        }}
      >
        <Tabs.Screen
          name="library"
          options={{
            headerShown: false,
            tabBarLabel: 'Library',
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? 'images' : 'images-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="albums"
          options={{
            headerShown: false,
            tabBarLabel: 'Albums',
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? 'images' : 'images-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            headerShown: false,
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

