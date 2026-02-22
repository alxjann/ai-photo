import { Stack, Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase.js';
import '../global.css';

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoggedIn === null) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)/library');
    } else if (!isLoggedIn && !inAuthGroup) {
      router.replace('(auth)');
    }
  }, [isLoggedIn, segments]);

  if (isLoggedIn === null) return null;

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade',
        animationDuration: 600,
      }} 
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}