import { DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { C } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { BetsProvider } from '@/context/BetsContext';

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, primary: C.ink } };

// Every non-tab screen slides up as an iOS sheet (swipe down to dismiss).
const sheet = { presentation: 'modal' as const, headerShown: false };

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <AuthProvider>
          <BetsProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="bet/[id]" options={sheet} />
              <Stack.Screen name="share/[id]" options={sheet} />
              <Stack.Screen name="wallet" options={sheet} />
              <Stack.Screen name="register" options={sheet} />
              <Stack.Screen name="audit" options={sheet} />
              <Stack.Screen name="account" options={sheet} />
              <Stack.Screen name="username" options={sheet} />
            </Stack>
          </BetsProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
