import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      const stored = await AsyncStorage.getItem('isLoggedIn')
      if (stored === null) {
        // first‑download: leave as null
        setIsLoggedIn(null)
      } else {
        // we've stored either 'true' or 'false'
        setIsLoggedIn(stored === 'true')
      }
    }
    checkLogin()
  }, []);

  if (isLoggedIn === null) {
    return null; // or splash screen
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isLoggedIn
        ? <Stack.Screen name="(tabs)" />
        : <Stack.Screen name="(auth)/login" />}
    </Stack>
  );
}
