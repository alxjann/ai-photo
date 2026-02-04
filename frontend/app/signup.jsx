import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const router = useRouter();

  return (
    <View className="flex-1 justify-center px-6 bg-white">
      <Text className="text-2xl font-bold mb-6">Signup</Text>

      <Text className="mb-1">Email</Text>
      <TextInput
        placeholder="Email"
        className="border p-3 rounded mb-4"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Text className="mb-1">Password</Text>
      <TextInput
        placeholder="Password"
        className="border p-3 rounded mb-3"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      
      <View className='flex-row gap-2 mb-5'>
        <Text>Already have an account?</Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text className='text-blue-600'>Login</Text>
        </Pressable>
      </View>

      <Pressable className="bg-blue-600 p-4 rounded">
        <Text className="text-white text-center font-semibold">
          Signup
        </Text>
      </Pressable>
    </View>
  );
}
