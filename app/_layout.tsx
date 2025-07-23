import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      const loggedIn = await AsyncStorage.getItem('isLoggedIn');
      setIsLoggedIn(loggedIn === 'true');
    };
    checkLogin();
  }, []);

  if (isLoggedIn === null) {
    return null; // or splash screen
  }

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName={isLoggedIn ? '(tabs)' : '(auth)/login'}
    />
  );
}
