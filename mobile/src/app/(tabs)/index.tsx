import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BetCard } from '@/components/BetCard';
import { TopBar } from '@/components/TopBar';
import { Banner, Button, Chip, Empty, Row, Screen, T, tap } from '@/components/ui';
import { C } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBets } from '@/context/BetsContext';
import { WEEKLY_HOT_TOPICS } from '@/services/betService';

type Filter = 'all' | 'open' | 'pending' | 'locked' | 'settled';

export default function BetsFeed() {
  const { currentUser } = useAuth();
  const { bets, loading, setDraft, seedDemoBets } = useBets();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [seeding, setSeeding] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bets.filter((b) => {
      const matches =
        !q ||
        b.terms.toLowerCase().includes(q) ||
        b.creatorName.toLowerCase().includes(q) ||
        b.sides.some((s) => s.toLowerCase().includes(q));
      if (!matches) return false;
      if (filter === 'pending') return b.status === 'pending';
      if (filter === 'locked') return b.status === 'locked' || b.status === 'settling';
      if (filter === 'open') return b.betType === 'open';
      if (filter === 'settled') return b.status === 'settled';
      return true;
    });
  }, [bets, filter, search]);

  const newBet = (draft: Parameters<typeof setDraft>[0] = null) => {
    setDraft(draft);
    router.navigate('/create');
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `All (${bets.length})` },
    { id: 'open', label: 'Open for anyone' },
    { id: 'pending', label: `Pending (${bets.filter((b) => b.status === 'pending').length})` },
    { id: 'locked', label: 'In escrow' },
    { id: 'settled', label: 'Settled' },
  ];

  return (
    <Screen header={<TopBar />}>
      {currentUser && !currentUser.isRegistered ? (
        <Banner
          tone="amber"
          text="18+ identity verification required to settle bets."
          action={{ label: 'Verify', onPress: () => router.push('/register') }}
        />
      ) : null}

      <View style={{ gap: 6 }}>
        <T v="h1">Peer-to-Peer Smart Contract Bets</T>
        <T v="small">Wager with friends on anything with automated escrow, digital signatures, and public ledger records.</T>
      </View>
      <Button title="Post New Bet" icon="add" onPress={() => newBet()} />

      {/* Hot topics */}
      <View style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6}>
            <Ionicons name="flame" size={16} color={C.green} />
            <T v="bodyBold">Hot Topics This Week</T>
          </Row>
          <T v="tiny" style={{ color: C.green, fontWeight: '700' }}>
            Recommended
          </T>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }} style={{ marginRight: -16 }}>
          {WEEKLY_HOT_TOPICS.map((t, i) => (
            <Pressable
              key={t.code}
              onPress={() => {
                tap();
                newBet({ topicIndex: i });
              }}
              style={({ pressed }) => [s.topic, pressed && { opacity: 0.8 }]}>
              <T v="tiny" style={{ fontFamily: 'Menlo', color: C.faint }}>
                {t.code}
              </T>
              <T v="bodyBold" numberOfLines={2}>
                {t.topic}
              </T>
              <T v="tiny" style={{ color: C.greenDark, fontWeight: '700' }}>
                ${t.suggestedStake} stake
              </T>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Search + filters */}
      <View style={s.search}>
        <Ionicons name="search" size={17} color={C.faint} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search bets"
          placeholderTextColor={C.faint}
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={{ flex: 1, fontSize: 16, color: C.ink, paddingVertical: 10 }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }} style={{ marginRight: -16 }}>
        {filters.map((f) => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ paddingVertical: 48, alignItems: 'center', gap: 10 }}>
          <ActivityIndicator />
          <T v="small">Syncing with public ledger…</T>
        </View>
      ) : filtered.length === 0 ? (
        <Empty
          icon="albums-outline"
          title="No bets found"
          text={search ? 'Nothing matched your search.' : 'Start a wager with friends, or load a couple of sample bets to try things out.'}>
          <Row style={{ marginTop: 8 }}>
            <Button small title="Post bet" onPress={() => newBet()} />
            <Button
              small
              kind="secondary"
              title="Load samples"
              loading={seeding}
              onPress={async () => {
                setSeeding(true);
                await seedDemoBets().catch((e) => console.warn(e));
                setSeeding(false);
              }}
            />
          </Row>
        </Empty>
      ) : (
        filtered.map((bet) => (
          <BetCard key={bet.id} bet={bet} currentUserId={currentUser?.id} onPress={() => router.push(`/bet/${bet.id}`)} />
        ))
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  topic: {
    width: 170,
    gap: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
});
