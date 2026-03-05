import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { login } from '../../service/auth/authService.js';
import { useThemeContext } from 'context/ThemeContext.jsx';
import { getThemeColors } from 'theme/appColors.js';

export default function Login() {
  const { isDarkMode } = useThemeContext();
  const colors = getThemeColors(isDarkMode);
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
    <View className={`flex-1 px-6 justify-center ${colors.pageBg}`}>
      <Text className={`text-3xl font-bold mb-8 ${colors.title}`}>Welcome Back</Text>

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
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className={`font-semibold ${colors.buttonText}`}>{loading ? 'Logging in...' : 'Login'}</Text>
      </Pressable>

      <Pressable
        className="mt-4 items-center"
        onPress={() => router.push('/signup')}
      >
        <Text className={colors.footer}>Don't have an account? Sign up</Text>
      </Pressable>
    </View>
  );
}

