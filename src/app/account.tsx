import Ionicons from '@expo/vector-icons/Ionicons';
import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { Avatar, Button, Card, Divider, Pill, Row, Sheet, T, success } from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { formatPhoneInput, US_STATES } from '@/lib/validation';

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 }}>
      <T v="small">{label}</T>
      <T v="bodyBold" style={{ flexShrink: 1, textAlign: 'right' }} numberOfLines={1}>
        {value || '—'}
      </T>
    </Row>
  );
}

export default function Account() {
  const { currentUser, privateProfile: p, isDemo, mockUsersList, switchActiveUser, signOut, firebaseUser } = useAuth();

  const confirmSignOut = () =>
    Alert.alert(isDemo ? 'Leave demo mode?' : 'Log out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: isDemo ? 'Leave demo' : 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <Sheet title="Account" onClose={() => router.back()}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Avatar name={currentUser?.name} photo={currentUser?.photo} size={72} dark />
        <T v="h2">{currentUser?.name}</T>
        <Row gap={6}>
          <T v="small">{currentUser?.username ? `@${currentUser.username}` : 'No handle yet'}</T>
          <Pressable hitSlop={8} onPress={() => router.push('/username')}>
            <T v="small" style={{ color: C.ink, fontWeight: '700', textDecorationLine: 'underline' }}>
              Edit
            </T>
          </Pressable>
        </Row>
        <T v="money" style={{ color: C.greenDark }}>
          {money(currentUser?.balance)}
        </T>
        {currentUser?.isRegistered ? (
          <Pill label="18+ ID verified" tone="green" icon="shield-checkmark" />
        ) : (
          <Button small title="Verify ID & add signature" icon="shield-checkmark-outline" onPress={() => router.push('/register')} />
        )}
      </Card>

      {currentUser?.isStaff ? (
        <Card onPress={() => router.push('/review')}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={8}>
              <Ionicons name="shield-checkmark" size={18} color={C.ink} />
              <T v="bodyBold">Staff review queue</T>
            </Row>
            <Ionicons name="chevron-forward" size={18} color={C.faint} />
          </Row>
        </Card>
      ) : null}

      {!isDemo ? (
        <>
          <Row gap={6}>
            <Ionicons name="lock-closed" size={13} color={C.faint} />
            <T v="label">Private — only you can see this</T>
          </Row>
          <Card style={{ gap: 0, padding: 0 }}>
            <InfoRow label="Legal name" value={p ? `${p.legalFirstName} ${p.legalLastName}` : undefined} />
            <Divider />
            <InfoRow label="Email" value={p?.email || firebaseUser?.email || undefined} />
            <Divider />
            <InfoRow label="Phone" value={p?.phone ? formatPhoneInput(p.phone) : undefined} />
            <Divider />
            <InfoRow label="Date of birth" value={p?.dateOfBirth ? format(parseISO(p.dateOfBirth), 'MMM d, yyyy') : undefined} />
            <Divider />
            <InfoRow label="State" value={US_STATES.find(([c]) => c === p?.state)?.[1]} />
          </Card>
        </>
      ) : (
        <>
          <View style={{ gap: 4 }}>
            <T v="label">Demo mode · switch persona</T>
            <T v="tiny">Play as different friends to test accepting and voting on bets.</T>
          </View>
          <Card style={{ gap: 0, padding: 0 }}>
            {mockUsersList.map((u, i) => (
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
                  {u.id === currentUser?.id ? <Ionicons name="checkmark-circle" size={22} color={C.green} /> : null}
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      )}

      <Button kind="danger" title={isDemo ? 'Leave demo — create a real account' : 'Log out'} icon="log-out-outline" onPress={confirmSignOut} />
    </Sheet>
  );
}
