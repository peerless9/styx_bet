import Ionicons from '@expo/vector-icons/Ionicons';
import { addHours, format } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { TopBar } from '@/components/TopBar';
import { Avatar, Banner, Button, Chip, MoneyField, Row, Screen, Segmented, T, success, tap, type IconName } from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBets, type BetDraft } from '@/context/BetsContext';
import { PUBLIC_WEB_URL } from '@/lib/firebase';
import type { BetType, ResolutionMethod, UserProfile } from '@/lib/types';
import { calculateOdds, createBet, extractRecentOpponents, searchRegisteredUsers } from '@/services/betService';

type Person = { id: string; name: string; username?: string; photo?: string };
type Who = 'friends' | 'anyone' | 'solo';

const PRESETS = [
  { label: 'Yes / No', sides: ['Yes', 'No'] },
  { label: 'Over / Under', sides: ['Over', 'Under'] },
  { label: 'Win / Lose / Draw', sides: ['Win', 'Lose', 'Draw'] },
];
const letter = (i: number) => String.fromCharCode(65 + i); // A, B, C…

const DEADLINES: { id: string; label: string; hours: number | null }[] = [
  { id: 'none', label: 'No deadline', hours: null },
  { id: '24', label: 'Tomorrow', hours: 24 },
  { id: '72', label: '3 days', hours: 72 },
  { id: '168', label: '1 week', hours: 168 },
  { id: '720', label: '1 month', hours: 720 },
];

const STAKES = [5, 10, 25, 50];

export default function CreateScreen() {
  const { draft, draftVersion } = useBets();
  // A new draft (hot topic / rematch) remounts the form with those values
  return (
    <Screen header={<TopBar />}>
      <CreateForm key={draftVersion} draft={draft} />
    </Screen>
  );
}

function Section({ n, title, children, right }: { n: number; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={8}>
          <View style={s.num}>
            <T v="tiny" style={{ color: '#fff', fontWeight: '800' }}>
              {n}
            </T>
          </View>
          <T v="h3">{title}</T>
        </Row>
        {right}
      </Row>
      {children}
    </View>
  );
}

function CreateForm({ draft }: { draft: BetDraft | null }) {
  const { currentUser, mockUsersList, isDemo } = useAuth();
  const { bets, setDraft } = useBets();
  const [terms, setTerms] = useState(draft?.terms || '');
  const [sides, setSides] = useState<string[]>(['Yes', 'No']);
  const [custom, setCustom] = useState(false);
  const [pick, setPick] = useState(0); // index into sides
  const [stake, setStake] = useState(10);
  const [who, setWho] = useState<Who>('friends');
  const [people, setPeople] = useState<Person[]>(
    () =>
      draft?.participants
        ?.filter((p) => p.userId !== currentUser?.id)
        .map((p) => ({ id: p.userId, name: p.name, username: p.username, photo: p.photo })) || []
  );
  const [resolution, setResolution] = useState<ResolutionMethod>('players');
  const [deadlineId, setDeadlineId] = useState('72');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [resultsFor, setResultsFor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Suggestions: people you've bet with (plus demo personas in demo mode)
  const recent = useMemo(
    () => extractRecentOpponents(bets, currentUser?.id || '', isDemo ? mockUsersList : []).filter((u) => !people.some((p) => p.id === u.id)),
    [bets, currentUser?.id, mockUsersList, isDemo, people]
  );

  const query = search.trim();
  const searching = !!query && resultsFor !== query;
  useEffect(() => {
    if (!query || !currentUser) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await searchRegisteredUsers(query, currentUser.id, isDemo ? mockUsersList : []).catch(() => []);
      if (live) {
        setResults(r);
        setResultsFor(query);
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, currentUser, mockUsersList, isDemo]);

  const deadlineHours = DEADLINES.find((d) => d.id === deadlineId)?.hours ?? null;
  const deadlineDate = deadlineHours ? addHours(new Date(), deadlineHours) : null;
  const opponents = who === 'friends' ? people : [];
  const players = 1 + opponents.length;
  const pot = stake * players;
  // Friends are put on a different option than you by default; they can switch when they accept
  const otherIndex = (i: number) => {
    const others = sides.map((_, j) => j).filter((j) => j !== pick);
    return others[i % others.length] ?? 0;
  };

  const addPerson = (u: UserProfile | Person) => {
    if (people.some((p) => p.id === u.id)) return;
    tap();
    setPeople((prev) => [...prev, { id: u.id, name: u.name, username: u.username, photo: u.photo }]);
    setWho('friends');
    setSearch('');
  };
  const removePerson = (id: string) => setPeople((p) => p.filter((x) => x.id !== id));

  const choosePreset = (next: string[]) => {
    setCustom(false);
    setSides(next);
    setPick(0);
  };
  const startCustom = () => {
    setCustom(true);
    setSides(['', '']);
    setPick(0);
  };
  const renameSide = (i: number, name: string) => setSides((prev) => prev.map((x, j) => (j === i ? name : x)));
  const addSide = () => sides.length < 26 && setSides((prev) => [...prev, '']);
  const removeSide = (i: number) => {
    if (sides.length <= 2) return;
    setSides((prev) => prev.filter((_, j) => j !== i));
    if (pick === i) setPick(0);
    else if (pick > i) setPick(pick - 1);
  };

  const shareInvite = () => {
    const url = `${PUBLIC_WEB_URL}/#invite=${currentUser?.username || currentUser?.id}`;
    Share.share({ message: `Bet me on Styx: ${url}`, url }).catch(() => {});
  };

  const submit = async () => {
    if (!currentUser) return;
    setError('');
    if (!terms.trim()) return setError('Say what the bet is.');
    const finalSides = sides.map((x, i) => x.trim() || (custom ? '' : letter(i)));
    if (finalSides.some((x) => !x)) return setError('Give every option a name, or remove the empty ones.');
    if (new Set(finalSides.map((x) => x.toLowerCase())).size !== finalSides.length) return setError('Two options have the same name.');
    const mySide = finalSides[pick];
    if (who === 'friends' && people.length === 0) return setError('Add at least one friend — or choose “Anyone” or “Just me”.');
    if (stake <= 0) return setError('Enter a stake.');
    if ((currentUser.balance || 0) < stake) return setError(`Not enough balance — you have ${money(currentUser.balance)}.`);

    const stakesMap: Record<string, number> = Object.fromEntries(finalSides.map((x) => [x, 0]));
    stakesMap[mySide] += stake;
    opponents.forEach((_, i) => (stakesMap[finalSides[otherIndex(i)]] += stake));
    const betType: BetType = who === 'anyone' ? 'open' : who === 'solo' ? 'personal' : opponents.length === 1 ? '1-on-1' : 'group';

    try {
      setSubmitting(true);
      const id = await createBet({
        creator: currentUser,
        terms: terms.trim(),
        stanceCategory: 'binary',
        betType,
        sides: finalSides,
        creatorSide: mySide,
        creatorStake: stake,
        opponents: opponents.map((p, i) => ({ user: p, side: finalSides[otherIndex(i)], stake })),
        betOnYourself: who === 'solo',
        odds: calculateOdds(stakesMap, pot),
        totalPot: pot,
        payoutRule: 'winner_takes_all',
        deadline: deadlineDate ? deadlineDate.toISOString() : null,
        resolution,
        isOpenToPublic: who === 'anyone',
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
      <T v="h2">New bet</T>

      {/* 1. What */}
      <Section n={1} title="What’s the bet?">
        <TextInput
          value={terms}
          onChangeText={setTerms}
          multiline
          placeholder="e.g. I can run a mile under 7 minutes before Sunday"
          placeholderTextColor={C.faint}
          style={s.terms}
        />
      </Section>

      {/* 2. Who */}
      <Section
        n={2}
        title="Who’s in?"
        right={
          who === 'friends' ? (
            <Pressable onPress={shareInvite} hitSlop={8}>
              <Row gap={4}>
                <Ionicons name="link" size={14} color={C.ink} />
                <T v="small" style={{ color: C.ink, fontWeight: '700' }}>
                  Invite link
                </T>
              </Row>
            </Pressable>
          ) : null
        }>
        <Segmented<Who>
          value={who}
          onChange={setWho}
          items={[
            { id: 'friends', label: 'Friends' },
            { id: 'anyone', label: 'Anyone' },
            { id: 'solo', label: 'Just me' },
          ]}
        />
        {who === 'friends' ? (
          <>
            {people.length ? (
              <Row style={{ flexWrap: 'wrap' }}>
                {people.map((p) => (
                  <Pressable key={p.id} onPress={() => removePerson(p.id)} style={s.person}>
                    <Avatar name={p.name} photo={p.photo} size={24} />
                    <T v="bodyBold" style={{ fontSize: 14 }}>
                      {p.name.split(' ')[0]}
                    </T>
                    <Ionicons name="close" size={14} color={C.muted} />
                  </Pressable>
                ))}
              </Row>
            ) : null}
            <View style={s.search}>
              <Ionicons name="search" size={17} color={C.faint} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Add a friend by name or @username"
                placeholderTextColor={C.faint}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ flex: 1, fontSize: 16, color: C.ink, paddingVertical: 11 }}
              />
              {searching ? <ActivityIndicator size="small" /> : null}
            </View>
            {query && !searching ? (
              results.length ? (
                <View style={{ gap: 4 }}>
                  {results.slice(0, 5).map((u) => (
                    <Pressable key={u.id} onPress={() => addPerson(u)} style={s.result}>
                      <Avatar name={u.name} photo={u.photo} size={30} />
                      <View style={{ flex: 1 }}>
                        <T v="bodyBold">{u.name}</T>
                        {u.username ? <T v="tiny">@{u.username}</T> : null}
                      </View>
                      <Ionicons name={people.some((p) => p.id === u.id) ? 'checkmark-circle' : 'add-circle-outline'} size={22} color={C.ink} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <T v="small">No one called “{query}” yet. Send them an invite link.</T>
              )
            ) : recent.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {recent.map((u) => (
                  <Chip key={u.id} icon="add" label={u.name.split(' ')[0]} onPress={() => addPerson(u)} />
                ))}
              </ScrollView>
            ) : null}
          </>
        ) : (
          <T v="small">{who === 'anyone' ? 'Anyone on Styx can find this bet and take the other side.' : 'A bet with yourself — a goal with money on the line.'}</T>
        )}
      </Section>

      {/* 3. Options + your pick */}
      <Section n={3} title="Your pick">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }} style={{ marginRight: -16 }}>
          {PRESETS.map((p) => (
            <Chip key={p.label} label={p.label} selected={!custom && p.sides.join() === sides.join()} onPress={() => choosePreset(p.sides)} />
          ))}
          <Chip label="Custom" icon="create-outline" selected={custom} onPress={startCustom} />
        </ScrollView>
        {custom ? <T v="tiny">Name each option — e.g. candidates in an election — then tap the one you’re backing.</T> : null}
        <View style={{ gap: 8 }}>
          {sides.map((side, i) => {
            const mine = i === pick;
            const others = opponents.filter((_, k) => otherIndex(k) === i);
            return (
              <Pressable
                key={custom ? `c${i}` : side}
                onPress={() => {
                  tap();
                  setPick(i);
                }}
                style={[s.option, mine && s.optionOn, custom && { paddingVertical: 4 }]}>
                <Ionicons name={mine ? 'radio-button-on' : 'radio-button-off'} size={22} color={mine ? '#fff' : C.faint} />
                {custom ? (
                  <TextInput
                    value={side}
                    onChangeText={(t) => renameSide(i, t)}
                    placeholder={`Option ${letter(i)}`}
                    placeholderTextColor={mine ? '#A3A3A3' : C.faint}
                    returnKeyType="done"
                    style={{ flex: 1, fontSize: 16, fontWeight: '700', color: mine ? '#fff' : C.ink, paddingVertical: 10 }}
                  />
                ) : (
                  <T v="bodyBold" style={{ flex: 1, color: mine ? '#fff' : C.ink }} numberOfLines={1}>
                    {side}
                  </T>
                )}
                {mine ? <T v="tiny" style={{ color: '#A7F3D0', fontWeight: '700' }}>You</T> : null}
                {others.length ? (
                  <T v="tiny" style={{ color: mine ? '#D4D4D4' : C.muted }}>
                    {others.map((o) => o.name.split(' ')[0]).join(', ')}
                  </T>
                ) : null}
                {custom && sides.length > 2 ? (
                  <Pressable hitSlop={10} onPress={() => removeSide(i)}>
                    <Ionicons name="close" size={18} color={mine ? '#D4D4D4' : C.faint} />
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })}
          {custom && sides.length < 26 ? (
            <Pressable onPress={addSide} style={s.addOption}>
              <Ionicons name="add" size={18} color={C.muted} />
              <T v="small" style={{ fontWeight: '600' }}>
                Add option {letter(sides.length)}
              </T>
            </Pressable>
          ) : null}
        </View>
        {opponents.length ? <T v="tiny">Friends can switch to a different option when they accept.</T> : null}
      </Section>

      {/* 4. Stake */}
      <Section n={4} title="Stake" right={<T v="small">Balance {money(currentUser?.balance)}</T>}>
        <Row>
          {STAKES.map((v) => (
            <Chip key={v} label={`$${v}`} selected={stake === v} onPress={() => setStake(v)} />
          ))}
        </Row>
        <MoneyField value={stake} onChange={setStake} />
        <T v="tiny">{who === 'solo' ? 'You put this in escrow. Win and you get it back.' : 'Everyone puts in the same amount. Winner takes the pot.'}</T>
      </Section>

      {/* 5. Resolution */}
      <Section n={5} title="Who decides the winner?">
        {(
          [
            { id: 'players', icon: 'people', title: 'Players decide', text: 'When it’s over, everyone picks who won. If you don’t agree, the Styx team reviews it.' },
            { id: 'review', icon: 'document-text', title: 'Evidence review', text: 'When it’s over, upload proof (photos, screenshots, notes). A Styx team member picks the winner.' },
          ] as { id: ResolutionMethod; icon: IconName; title: string; text: string }[]
        ).map((o) => {
          const on = resolution === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => {
                tap();
                setResolution(o.id);
              }}
              style={[s.method, on && { borderColor: C.ink, borderWidth: 2 }]}>
              <View style={[s.methodIcon, on && { backgroundColor: C.ink }]}>
                <Ionicons name={o.icon} size={18} color={on ? '#fff' : C.ink} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyBold">{o.title}</T>
                <T v="small">{o.text}</T>
              </View>
              <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? C.ink : C.line} />
            </Pressable>
          );
        })}
      </Section>

      {/* 6. Deadline */}
      <Section n={6} title="Deadline">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }} style={{ marginRight: -16 }}>
          {DEADLINES.map((d) => (
            <Chip key={d.id} label={d.label} selected={deadlineId === d.id} onPress={() => setDeadlineId(d.id)} />
          ))}
        </ScrollView>
        <T v="tiny">
          {deadlineDate
            ? `Ends ${format(deadlineDate, "EEE, MMM d 'at' h:mm a")}. The winner is decided after that.`
            : 'No deadline — decide the winner whenever it’s done.'}
        </T>
      </Section>

      {/* Summary + post */}
      <View style={s.summary}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="small" style={{ color: '#A3A3A3' }}>
            {players} {players === 1 ? 'player' : 'players'} × {money(stake)}
          </T>
          <T v="money" style={{ color: '#fff' }}>
            {money(pot)} pot
          </T>
        </Row>
        <T v="tiny" style={{ color: '#A3A3A3' }}>
          Your {money(stake)} is held in escrow when you post.
          {who === 'friends' ? ' The bet locks once everyone accepts.' : ''}
        </T>
      </View>
      {error ? <Banner text={error} /> : null}
      <Button title="Post bet" icon="paper-plane" loading={submitting} onPress={submit} />
    </>
  );
}

const s = StyleSheet.create({
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  terms: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 14, paddingTop: 14, minHeight: 90, fontSize: 17, color: C.ink, textAlignVertical: 'top' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, backgroundColor: C.card },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  optionOn: { backgroundColor: C.ink, borderColor: C.ink },
  addOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  methodIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  summary: { backgroundColor: C.ink, borderRadius: 18, padding: 16, gap: 6 },
});
