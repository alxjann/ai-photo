import { View, Text, Pressable, Alert } from 'react-native';
import { logout } from '../../service/auth/authService.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeContext } from 'context/ThemeContext.jsx';
import { getThemeColors } from 'theme/appColors.js';

const CACHE_KEY = 'photos_cache';

export default function Logout() {
  const { isDarkMode } = useThemeContext();
  const colors = getThemeColors(isDarkMode);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      Alert.alert('Logout failed', err.message);
    }
  };

  const handleDeleteCache = async () => {
    Alert.alert(
      'Delete Cache',
      'This will clear all locally cached photos. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(CACHE_KEY);
              Alert.alert('Cache cleared', 'Local photo cache has been deleted.');
            } catch (err) {
              Alert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  };

  return (
    <View className={`flex-1 px-6 justify-center items-center gap-4 ${colors.pageBg}`}>
      <Text className={`text-2xl font-semibold mb-2 ${colors.title}`}>Are you sure you want to logout?</Text>

      <Pressable
        className="bg-red-600 rounded-xl py-4 px-8 items-center w-full"
        onPress={handleLogout}
      >
        <Text className="text-white font-semibold">Logout</Text>
      </Pressable>

      <Pressable
        className={`rounded-xl py-4 px-8 items-center w-full ${colors.secondaryBtn}`}
        onPress={handleDeleteCache}
      >
        <Text className={`font-semibold ${colors.secondaryText}`}>Delete Cache</Text>
      </Pressable>
    </View>
  );
}