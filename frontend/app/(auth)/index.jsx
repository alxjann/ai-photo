import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { login } from '../../service/auth/authService.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <Text className="text-3xl font-bold mb-8">Welcome Back</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border border-gray-300 rounded-xl px-4 py-3 mb-6"
      />

      <Pressable
        className="bg-black rounded-xl py-4 items-center"
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white font-semibold">{loading ? 'Logging in...' : 'Login'}</Text>
      </Pressable>

      <Pressable
        className="mt-4 items-center"
        onPress={() => router.push('/signup')}
      >
        <Text className="text-gray-500">Don't have an account? Sign up</Text>
      </Pressable>
    </View>
  );
}