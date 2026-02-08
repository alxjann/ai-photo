import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function login() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-4xl font-bold text-blue-600">Login</Text>
      </View>
    </SafeAreaView>
  );
}