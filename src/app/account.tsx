import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Avatar, Button, Card, Divider, Pill, Row, Sheet, T, success } from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

/** Profile + demo persona switcher (replaces the web navbar dropdown). */
export default function Account() {
  const { currentUser, mockUsersList, switchActiveUser } = useAuth();

  return (
    <Sheet title="Account" onClose={() => router.back()}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Avatar name={currentUser?.name} photo={currentUser?.photo} size={72} dark />
        <T v="h2">{currentUser?.name}</T>
        <Row gap={6}>
          <T v="small">{currentUser?.username ? `@${currentUser.username}` : 'No handle yet'}</T>
          <Pressable hitSlop={8} onPress={() => router.push('/username')}>
            <T v="small" style={{ color: C.ink, fontWeight: '700', textDecorationLine: 'underline' }}>
              Change
            </T>
          </Pressable>
        </Row>
        <T v="money" style={{ color: C.greenDark }}>
          {money(currentUser?.balance)}
        </T>
        {currentUser?.isRegistered ? (
          <Pill label="18+ ID verified" tone="green" icon="shield-checkmark" />
        ) : (
          <Button small title="Verify 18+ ID" icon="shield-checkmark-outline" onPress={() => router.push('/register')} />
        )}
      </Card>

      <View style={{ gap: 4 }}>
        <T v="label">Switch test persona</T>
        <T v="tiny">Try the app as different friends — accept bets you sent yourself, vote on outcomes, etc.</T>
      </View>
      <Card style={{ gap: 0, padding: 0 }}>
        {mockUsersList.map((u, i) => {
          const active = u.id === currentUser?.id;
          return (
            <View key={u.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => {
                  switchActiveUser(u.id);
                  success();
                  router.back();
                }}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }, pressed && { backgroundColor: C.bg }]}>
                <Avatar name={u.name} photo={u.photo} size={36} />
                <View style={{ flex: 1 }}>
                  <T v="bodyBold">{u.name}</T>
                  <T v="tiny">@{u.username}</T>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={C.green} /> : null}
              </Pressable>
            </View>
          );
        })}
      </Card>
      <T v="tiny" style={{ textAlign: 'center' }}>
        Sign in with Google / Apple comes with the TestFlight build.
      </T>
    </Sheet>
  );
}
