import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { signup } from '../../service/auth/authService.js';
import { useThemeContext } from 'context/ThemeContext.jsx';
import { getThemeColors } from 'theme/appColors.js';

export default function Signup() {
  const { isDarkMode } = useThemeContext();
  const colors = getThemeColors(isDarkMode);
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
    <View className={`flex-1 px-6 justify-center ${colors.pageBg}`}>
      <Text className={`text-3xl font-bold mb-8 ${colors.title}`}>Create Account</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.inputPlaceholder}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        className={`border rounded-xl px-4 py-3 mb-4 ${colors.inputBorder} ${colors.inputText} ${colors.inputBg}`}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.inputPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className={`border rounded-xl px-4 py-3 mb-6 ${colors.inputBorder} ${colors.inputText} ${colors.inputBg}`}
      />

      <Pressable
        className={`rounded-xl py-4 items-center ${colors.button}`}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text className={`font-semibold ${colors.buttonText}`}>{loading ? 'Signing up...' : 'Sign Up'}</Text>
      </Pressable>

      <Pressable
        className="mt-4 items-center"
        onPress={() => router.push('/login')}
      >
        <Text className={colors.footer}>Already have an account? Login</Text>
      </Pressable>
    </View>
  );
}

