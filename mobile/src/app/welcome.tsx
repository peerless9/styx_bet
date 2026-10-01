import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { Banner, Button, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { FIREBASE_CONFIG_MISSING } from '@/lib/firebase';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { enterDemo } = useAuth();

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={s.hero}>
        <View style={{ marginBottom: 8 }}>
          <Logo size={88} radius={24} />
        </View>
        <T v="h1" style={{ fontSize: 34, textAlign: 'center' }}>
          Styx Bet
        </T>
        <T v="small" style={{ fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 300 }}>
          Bet your friends on anything. Stakes held in escrow, outcomes confirmed by everyone.
        </T>
      </View>

      <View style={{ gap: 12 }}>
        {FIREBASE_CONFIG_MISSING ? (
          <Banner tone="amber" text="Firebase key not set yet — accounts won’t work until it’s added to .env. Demo still works." />
        ) : null}
        <Button title="Create account" onPress={() => router.push('/sign-up')} />
        <Button kind="secondary" title="Log in" onPress={() => router.push('/sign-in')} />
        <Button kind="ghost" title="Try the demo accounts" onPress={enterDemo} />
        <T v="tiny" style={{ textAlign: 'center' }}>
          18+ only. Balances are play money.
        </T>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24, justifyContent: 'space-between' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
});
