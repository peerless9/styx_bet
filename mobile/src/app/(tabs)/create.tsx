import Ionicons from '@expo/vector-icons/Ionicons';
import { addHours, format } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { TopBar } from '@/components/TopBar';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  ChoiceRow,
  Field,
  MoneyField,
  Row,
  Screen,
  T,
  success,
  tap,
} from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBets, type BetDraft } from '@/context/BetsContext';
import { PUBLIC_WEB_URL } from '@/lib/firebase';
import type { BetType, PayoutRule, StanceCategory, UserProfile } from '@/lib/types';
import {
  WEEKLY_HOT_TOPICS,
  calculateOdds,
  createBet,
  extractRecentOpponents,
  searchRegisteredUsers,
} from '@/services/betService';

interface Opp {
  user: { id: string; name: string; username?: string; photo?: string };
  side: string;
  stake: number;
}

const PRESETS = [
  { label: 'Yes / No', sides: ['Yes', 'No'] },
  { label: 'Over / Under', sides: ['Over', 'Under'] },
  { label: 'Win / Lose / Tie', sides: ['Win', 'Lose', 'Tie'] },
  { label: 'Team A / Team B', sides: ['Team A', 'Team B'] },
];

const DEADLINES = [
  { label: '24 hours', hours: 24 },
  { label: '2 days', hours: 48 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
  { label: '2 weeks', hours: 336 },
];

export default function CreateScreen() {
  const { draft, draftVersion } = useBets();
  // Remount the form whenever a new draft (hot topic / rematch) is handed over
  return (
    <Screen header={<TopBar />}>
      <CreateForm key={draftVersion} draft={draft} />
    </Screen>
  );
}

function CreateForm({ draft }: { draft: BetDraft | null }) {
  const { currentUser, mockUsersList } = useAuth();
  const { bets, setDraft } = useBets();
  const tpl = draft?.topicIndex !== undefined ? WEEKLY_HOT_TOPICS[draft.topicIndex] : undefined;

  const [terms, setTerms] = useState(tpl?.terms || draft?.terms || '');
  const [topic, setTopic] = useState(tpl?.topic || '');
  const [stance, setStance] = useState<StanceCategory>(tpl?.category || 'binary');
  const [sides, setSides] = useState<string[]>(tpl?.sides || ['Yes', 'No']);
  const [newSide, setNewSide] = useState('');
  const [myStake, setMyStake] = useState(tpl?.suggestedStake || 25);
  const [mySide, setMySide] = useState((tpl?.sides || ['Yes'])[0]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [solo, setSolo] = useState(false);
  const [openToAll, setOpenToAll] = useState(false);
  const [payout, setPayout] = useState<PayoutRule>('winner_takes_all');
  const [hours, setHours] = useState(48);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [opps, setOpps] = useState<Opp[]>(() => {
    const fromDraft = draft?.participants?.filter((p) => p.userId !== currentUser?.id) || [];
    if (fromDraft.length) {
      return fromDraft.map((p) => ({ user: { id: p.userId, name: p.name, username: p.username, photo: p.photo }, side: p.side || 'No', stake: p.stake || 25 }));
    }
    const friend = mockUsersList.find((u) => u.id !== currentUser?.id);
    const opposite = (tpl?.sides || ['Yes', 'No'])[1];
    return friend ? [{ user: { id: friend.id, name: friend.name, username: friend.username, photo: friend.photo }, side: opposite, stake: tpl?.suggestedStake || 25 }] : [];
  });

  const recent = useMemo(() => extractRecentOpponents(bets, currentUser?.id || '', mockUsersList), [bets, currentUser?.id, mockUsersList]);

  // Debounced user search; `resultsFor` tracks which query the results belong to
  const [resultsFor, setResultsFor] = useState('');
  const query = search.trim();
  const searching = !!query && resultsFor !== query;
  useEffect(() => {
    if (!query || !currentUser) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await searchRegisteredUsers(query, currentUser.id, mockUsersList).catch(() => []);
      if (live) {
        setResults(r);
        setResultsFor(query);
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, currentUser, mockUsersList]);

  const betType: BetType = openToAll ? 'open' : solo || opps.length === 0 ? 'personal' : opps.length === 1 ? '1-on-1' : 'group';

  const stakes = useMemo(() => {
    const m: Record<string, number> = {};
    sides.forEach((s) => (m[s] = 0));
    m[mySide] = (m[mySide] || 0) + myStake;
    opps.forEach((o) => (m[o.side] = (m[o.side] || 0) + o.stake));
    return m;
  }, [sides, mySide, myStake, opps]);
  const pot = Object.values(stakes).reduce((a, b) => a + b, 0);
  const odds = useMemo(() => calculateOdds(stakes, pot), [stakes, pot]);

  const addOpp = (u: UserProfile) => {
    if (opps.some((o) => o.user.id === u.id)) return;
    tap();
    setOpps((prev) => [...prev, { user: { id: u.id, name: u.name, username: u.username, photo: u.photo }, side: sides.find((s) => s !== mySide) || sides[0], stake: myStake || 25 }]);
    setSolo(false);
    setSearch('');
  };
  const removeOpp = (id: string) => setOpps((p) => p.filter((o) => o.user.id !== id));
  const updateOpp = (id: string, u: Partial<Opp>) => setOpps((p) => p.map((o) => (o.user.id === id ? { ...o, ...u } : o)));

  const applySides = (next: string[]) => {
    setSides(next);
    setMySide(next[0]);
    setOpps((p) => p.map((o) => ({ ...o, side: next[1] || next[0] })));
    setError('');
  };
  const applyTemplate = (i: number) => {
    const t = WEEKLY_HOT_TOPICS[i];
    setTopic(t.topic);
    setTerms(t.terms);
    setStance(t.category);
    setMyStake(t.suggestedStake);
    applySides(t.sides);
  };
  const addSide = () => {
    const name = newSide.trim();
    if (!name) return;
    if (sides.some((s) => s.toLowerCase() === name.toLowerCase())) return setError(`"${name}" is already a position.`);
    setSides([...sides, name]);
    setNewSide('');
    setError('');
  };
  const removeSide = (side: string) => {
    if (sides.length <= 2) return setError('A bet needs at least 2 positions.');
    const next = sides.filter((s) => s !== side);
    setSides(next);
    if (mySide === side) setMySide(next[0]);
    setOpps((p) => p.map((o) => (o.side === side ? { ...o, side: next[0] } : o)));
    setError('');
  };

  const shareInvite = () => {
    const url = `${PUBLIC_WEB_URL}/#invite=${currentUser?.username || currentUser?.id}`;
    Share.share({ message: `Bet me on Styx: ${url}`, url }).catch(() => {});
  };

  const submit = async () => {
    if (!currentUser) return;
    setError('');
    if (!terms.trim()) return setError('Write the terms of the bet.');
    if (sides.length < 2) return setError('Add at least 2 positions.');
    if (myStake <= 0) return setError('Enter a stake.');
    if ((currentUser.balance || 0) < myStake) return setError(`Not enough balance (${money(currentUser.balance)} available).`);
    if (!solo && !openToAll && opps.length === 0) return setError('Pick an opponent, make it open to anyone, or bet on yourself.');
    try {
      setSubmitting(true);
      const id = await createBet({
        creator: currentUser,
        terms: terms.trim(),
        topic: topic.trim() || undefined,
        stanceCategory: stance,
        betType,
        sides,
        creatorSide: mySide,
        creatorStake: myStake,
        opponents: opps.map((o) => ({ user: o.user, side: o.side, stake: o.stake })),
        betOnYourself: solo,
        odds,
        totalPot: pot,
        payoutRule: payout,
        deadline: addHours(new Date(), hours).toISOString(),
        isOpenToPublic: openToAll,
      });
      success();
      setDraft(null);
      router.navigate('/');
      router.push(`/bet/${id}`);
    } catch (e: any) {
      setError(e?.message || 'Could not post the bet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h2">Create Smart Contract Bet</T>
          <T v="small">Escrowed stakes & mutual consensus verification</T>
        </View>
        <Button small kind="secondary" icon="share-outline" title="Invite" onPress={shareInvite} />
      </Row>

      {/* 1. Opponents */}
      <Card>
        <Row gap={6}>
          <Ionicons name="people" size={16} color={C.ink} />
          <T v="bodyBold">Choose opponents</T>
        </Row>
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip
            label="Open for anyone"
            icon="globe-outline"
            selected={openToAll}
            onPress={() => {
              setOpenToAll(!openToAll);
              if (!openToAll) setSolo(false);
            }}
          />
          <Chip
            label="Bet on yourself"
            icon="person-outline"
            selected={solo}
            onPress={() => {
              const next = !solo;
              setSolo(next);
              if (next) {
                setOpps([]);
                setOpenToAll(false);
              }
            }}
          />
        </Row>

        <View style={s.search}>
          <Ionicons name="search" size={17} color={C.faint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search @username or name"
            placeholderTextColor={C.faint}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, fontSize: 16, color: C.ink, paddingVertical: 10 }}
          />
          {searching ? <ActivityIndicator size="small" /> : null}
        </View>
        {search.trim() && !searching ? (
          results.length === 0 ? (
            <T v="small">No one matches “{search}”. Tap Invite to send them a link.</T>
          ) : (
            <View style={{ gap: 4 }}>
              {results.map((u) => {
                const added = opps.some((o) => o.user.id === u.id);
                return (
                  <Pressable key={u.id} disabled={added} onPress={() => addOpp(u)} style={[s.result, added && { opacity: 0.4 }]}>
                    <Avatar name={u.name} photo={u.photo} size={30} />
                    <View style={{ flex: 1 }}>
                      <T v="bodyBold">{u.name}</T>
                      {u.username ? <T v="tiny">@{u.username}</T> : null}
                    </View>
                    <T v="small" style={{ color: C.ink, fontWeight: '700' }}>
                      {added ? 'Added' : '+ Add'}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          )
        ) : null}

        {recent.length > 0 ? (
          <View style={{ gap: 8 }}>
            <T v="label">Recent opponents</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {recent.map((p) => (
                <Chip key={p.id} label={p.name.split(' ')[0]} icon="person" selected={opps.some((o) => o.user.id === p.id)} onPress={() => (opps.some((o) => o.user.id === p.id) ? removeOpp(p.id) : addOpp(p))} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {opps.length === 0 ? (
          <T v="small">
            {openToAll ? 'Open bet: anyone on Styx can find and join it.' : solo ? 'Personal bet on your own goal.' : 'No opponents yet — search above or pick a recent one.'}
          </T>
        ) : null}
      </Card>

      {/* 2. Hot topics */}
      <View style={{ gap: 8 }}>
        <Row gap={6}>
          <Ionicons name="sparkles" size={15} color={C.green} />
          <T v="bodyBold">Hot topics for the week</T>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 16 }} style={{ marginRight: -16 }}>
          {WEEKLY_HOT_TOPICS.map((t, i) => (
            <Pressable key={t.code} onPress={() => { tap(); applyTemplate(i); }} style={({ pressed }) => [s.topic, topic === t.topic && { borderColor: C.ink }, pressed && { opacity: 0.8 }]}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="tiny" style={{ fontFamily: 'Menlo', color: C.faint }}>
                  {t.code}
                </T>
                <T v="tiny" style={{ color: C.greenDark, fontWeight: '700' }}>
                  ${t.suggestedStake}
                </T>
              </Row>
              <T v="bodyBold" numberOfLines={2}>
                {t.topic}
              </T>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 3. Terms */}
      <Field label="Contract terms" value={terms} onChangeText={setTerms} multiline placeholder="e.g. Alex runs a sub-20 min 5K before Sunday, with Strava link…" />

      {/* 4. Positions */}
      <Card>
        <Row gap={6}>
          <Ionicons name="locate" size={16} color={C.ink} />
          <T v="bodyBold">Positions ({sides.length})</T>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PRESETS.map((p) => (
            <Chip key={p.label} label={p.label} selected={p.sides.join() === sides.join()} onPress={() => applySides(p.sides)} />
          ))}
        </ScrollView>
        <View style={{ gap: 6 }}>
          {sides.map((side, i) => {
            const n = opps.filter((o) => o.side === side).length;
            return (
              <Row key={side} style={s.position}>
                <T v="tiny" style={{ width: 18, fontWeight: '800', color: C.faint }}>
                  {i + 1}
                </T>
                <T v="bodyBold" style={{ flex: 1 }} numberOfLines={1}>
                  {side}
                </T>
                {mySide === side ? <T v="tiny" style={{ color: C.greenDark, fontWeight: '700' }}>Your pick</T> : null}
                {n > 0 ? <T v="tiny">{n} opp.</T> : null}
                <Pressable hitSlop={8} onPress={() => removeSide(side)} disabled={sides.length <= 2} style={{ opacity: sides.length <= 2 ? 0.25 : 1 }}>
                  <Ionicons name="close-circle" size={20} color={C.faint} />
                </Pressable>
              </Row>
            );
          })}
        </View>
        <Row>
          <TextInput
            value={newSide}
            onChangeText={setNewSide}
            onSubmitEditing={addSide}
            returnKeyType="done"
            placeholder="Add a position (e.g. Chiefs, Draw)"
            placeholderTextColor={C.faint}
            style={[s.inlineInput, { flex: 1 }]}
          />
          <Button small title="Add" icon="add" disabled={!newSide.trim()} onPress={addSide} />
        </Row>
      </Card>

      {/* 5. Your position */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="bodyBold">Your position & stake</T>
          <T v="small">
            Balance <T v="small" style={{ color: C.ink, fontWeight: '800' }}>{money(currentUser?.balance)}</T>
          </T>
        </Row>
        <MoneyField label="Your stake" value={myStake} onChange={setMyStake} />
        <View style={{ gap: 6 }}>
          <T v="label">Your side</T>
          <ChoiceRow options={sides} value={mySide} onChange={setMySide} />
        </View>
      </Card>

      {/* 6. Opponent stakes */}
      {opps.map((o) => (
        <Card key={o.user.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ flex: 1 }}>
              <Avatar name={o.user.name} photo={o.user.photo} size={30} />
              <View style={{ flex: 1 }}>
                <T v="bodyBold">{o.user.name}</T>
                {o.user.username ? <T v="tiny">@{o.user.username}</T> : null}
              </View>
            </Row>
            <Pressable hitSlop={8} onPress={() => removeOpp(o.user.id)}>
              <Ionicons name="close-circle" size={22} color={C.faint} />
            </Pressable>
          </Row>
          <MoneyField label="Their stake" value={o.stake} onChange={(n) => updateOpp(o.user.id, { stake: n })} />
          <View style={{ gap: 6 }}>
            <T v="label">Their side</T>
            <ChoiceRow options={sides} value={o.side} onChange={(v) => updateOpp(o.user.id, { side: v })} />
          </View>
        </Card>
      ))}

      {/* 7. Deadline & payout */}
      <Card>
        <View style={{ gap: 6 }}>
          <T v="label">Settlement deadline</T>
          <ChoiceRow options={DEADLINES.map((d) => String(d.hours))} value={String(hours)} onChange={(v) => setHours(Number(v))} labels={Object.fromEntries(DEADLINES.map((d) => [String(d.hours), d.label]))} />
          <T v="tiny">Ends {format(addHours(new Date(), hours), "EEE, MMM d 'at' h:mm a")}</T>
        </View>
        <View style={{ gap: 6 }}>
          <T v="label">Payout</T>
          <ChoiceRow<PayoutRule>
            options={['winner_takes_all', 'proportional']}
            value={payout}
            onChange={setPayout}
            labels={{ winner_takes_all: 'Winner takes all', proportional: 'Proportional split' }}
          />
        </View>
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="lock-closed" size={14} color={C.muted} style={{ marginTop: 2 }} />
          <T v="tiny" style={{ flex: 1 }}>
            Your stake is held in escrow right away. The bet locks when every challenger accepts.
          </T>
        </Row>
      </Card>

      {/* Summary */}
      <View style={s.summary}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="label" style={{ color: '#A3A3A3' }}>
            Total escrow pot
          </T>
          <T v="money" style={{ color: '#fff' }}>
            {money(pot)}
          </T>
        </Row>
        <Row style={{ flexWrap: 'wrap', gap: 12 }}>
          {sides.map((side) => (
            <T key={side} v="tiny" style={{ color: '#D4D4D4' }}>
              {side}: <T v="tiny" style={{ color: '#6EE7B7', fontWeight: '800' }}>{(odds[side] || 2).toFixed(2)}x</T>
            </T>
          ))}
        </Row>
      </View>

      {error ? <Banner text={error} /> : null}
      <Button title="Post Smart Contract Bet" icon="paper-plane" loading={submitting} onPress={submit} />
    </>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, backgroundColor: C.bg },
  topic: { width: 190, gap: 6, padding: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  position: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.lineSoft },
  inlineInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16, color: C.ink },
  summary: { backgroundColor: C.ink, borderRadius: 20, padding: 16, gap: 10 },
});
