import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { TopBar } from '@/components/TopBar';
import { Avatar, Card, Divider, Pill, Row, Screen, T } from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBets } from '@/context/BetsContext';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';

export default function Ranks() {
  const { currentUser } = useAuth();
  const { bets } = useBets();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProfile);
        list.sort((a, b) => (b.balance || 0) - (a.balance || 0));
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Leaderboard error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const settled = bets.filter((b) => b.status === 'settled');
  const volume = settled.reduce((sum, b) => sum + (b.totalPot || 0), 0);
  const medal = ['#F59E0B', '#A3A3A3', '#B45309'];

  return (
    <Screen header={<TopBar />}>
      <View style={{ gap: 4 }}>
        <T v="h2">Solvency & Leaderboard</T>
        <T v="small">Audited balances and settled volume across the network.</T>
      </View>

      <Row gap={12}>
        <Card style={{ flex: 1, gap: 4 }}>
          <T v="label">Settled volume</T>
          <T v="money">{money(volume)}</T>
        </Card>
        <Card style={{ flex: 1, gap: 4 }}>
          <T v="label">Settled bets</T>
          <T v="money">{settled.length}</T>
        </Card>
      </Row>

      <Card style={{ gap: 0, padding: 0 }}>
        {loading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : (
          users.map((u, i) => (
            <View key={u.id}>
              {i > 0 ? <Divider /> : null}
              <Row style={{ padding: 14, backgroundColor: u.id === currentUser?.id ? C.greenBg : undefined }} gap={12}>
                <T v="bodyBold" style={{ width: 22, textAlign: 'center', color: medal[i] || C.faint }}>
                  {i + 1}
                </T>
                <Avatar name={u.name} photo={u.photo} size={36} />
                <View style={{ flex: 1 }}>
                  <T v="bodyBold" numberOfLines={1}>
                    {u.name}
                    {u.id === currentUser?.id ? <T v="tiny"> (you)</T> : null}
                  </T>
                  {u.username ? <T v="tiny">@{u.username}</T> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <T v="bodyBold">{money(u.balance)}</T>
                  {u.isRegistered ? <Pill label="Verified" tone="green" icon="shield-checkmark" /> : null}
                </View>
              </Row>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
