import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { signup } from '../../service/auth/authService.js';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    try {
      await signup(email, password);
      //Alert.alert('Success', 'Check your email to confirm your account!');
      router.replace('(tabs)/library');
    } catch (err) {
      Alert.alert('Signup failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <Text className="text-3xl font-bold mb-8">Create Account</Text>

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
        onPress={handleSignup}
        disabled={loading}
      >
        <Text className="text-white font-semibold">{loading ? 'Signing up...' : 'Sign Up'}</Text>
      </Pressable>

      <Pressable
        className="mt-4 items-center"
        onPress={() => router.push('/login')}
      >
        <Text className="text-gray-500">Already have an account? Login</Text>
      </Pressable>
    </View>
  );
}