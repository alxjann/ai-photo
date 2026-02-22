import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dimensions } from 'react-native';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = Math.max(125, Math.min(150, screenHeight * 0.12));
  const headerPaddingTop = Math.max(16, Math.min(40, screenHeight * 0.04)) + insets.top;
/*
  headerTitle: 'Photos',
  headerTitleAlign: 'left',
  headerTitleStyle: { fontSize: 28, fontWeight: 'bold', marginLeft: 0, marginTop: 12 },
*/
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#000',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: '#F5F5F7',
            borderTopWidth: 0,
            height: 55 + insets.bottom,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          headerStyle: { backgroundColor: '#F5F5F7', height: headerHeight, paddingTop: headerPaddingTop },
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
      </Tabs>
    </>
  );
}