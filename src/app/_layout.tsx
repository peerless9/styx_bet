import { DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { C } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BetsProvider } from '@/context/BetsContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, primary: C.ink } };

// Every non-tab screen slides up as an iOS sheet (swipe down to dismiss).
const sheet = { presentation: 'modal' as const, headerShown: false };

function RootStack() {
  const { status } = useAuth();
  const inApp = status === 'signedIn' || status === 'demo';

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === 'loading') return null; // splash screen stays up

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      {/* Signed out: welcome → sign up / log in */}
      <Stack.Protected guard={!inApp}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="sign-in" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>

      {/* Signed in (or demo) */}
      <Stack.Protected guard={inApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bet/[id]" options={sheet} />
        <Stack.Screen name="share/[id]" options={sheet} />
        <Stack.Screen name="wallet" options={sheet} />
        <Stack.Screen name="register" options={sheet} />
        <Stack.Screen name="audit" options={sheet} />
        <Stack.Screen name="account" options={sheet} />
        <Stack.Screen name="username" options={sheet} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <AuthProvider>
          <BetsProvider>
            <StatusBar style="dark" />
            <RootStack />
          </BetsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
