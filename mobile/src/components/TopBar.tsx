import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, tap } from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

/** App header: brand, wallet balance pill, profile/persona switcher. */
export function TopBar() {
  const { currentUser } = useAuth();
  return (
    <View style={s.bar}>
      <View style={s.brand}>
        <View style={s.logo}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>S</Text>
        </View>
        <View>
          <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 }}>Styx Bet</Text>
          <Text style={{ fontSize: 11, color: C.muted, fontWeight: '500' }}>Social Smart Contracts</Text>
        </View>
      </View>

      <Pressable
        onPress={() => {
          tap();
          router.push('/wallet');
        }}
        style={({ pressed }) => [s.balance, pressed && { opacity: 0.7 }]}>
        <Ionicons name="wallet-outline" size={15} color={C.muted} />
        <Text style={{ fontWeight: '800', color: C.greenDark, fontSize: 14, fontVariant: ['tabular-nums'] }}>
          {money(currentUser?.balance)}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          tap();
          router.push('/account');
        }}
        hitSlop={6}
        style={({ pressed }) => pressed && { opacity: 0.7 }}>
        <Avatar name={currentUser?.name} photo={currentUser?.photo} size={34} dark />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
  },
});
