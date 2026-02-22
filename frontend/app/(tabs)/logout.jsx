
import { View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { logout } from '../../service/auth/authService.js';

export default function Logout() {
  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      Alert.alert('Logout failed', err.message);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 justify-center items-center">
      <Text className="text-2xl font-semibold mb-6">Are you sure you want to logout?</Text>

      <Pressable
        className="bg-red-600 rounded-xl py-4 px-8 items-center"
        onPress={handleLogout}
      >
        <Text className="text-white font-semibold">Logout</Text>
      </Pressable>
    </View>
  );
}
