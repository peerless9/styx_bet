import Ionicons from '@expo/vector-icons/Ionicons';
import { format, isPast, parseISO } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { SignaturePad } from '@/components/SignaturePad';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Check,
  ChoiceRow,
  Divider,
  IconButton,
  MoneyField,
  Pill,
  Row,
  Sheet,
  T,
  success,
  tap,
} from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBets } from '@/context/BetsContext';
import { db } from '@/lib/firebase';
import type { Bet } from '@/lib/types';
import {
  cancelBet,
  confirmParticipantBet,
  joinOpenBet,
  requestArbitration,
  voteOutcome,
} from '@/services/betService';

export default function BetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bets } = useBets();
  const [bet, setBet] = useState<Bet | null>(() => bets.find((b) => b.id === id) || null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, 'bets', id),
      (snap) => {
        if (snap.exists()) setBet({ id: snap.id, ...snap.data() } as Bet);
        else setMissing(true);
      },
      () => setMissing(true)
    );
    return () => unsub();
  }, [id]);

  const close = () => router.back();

  if (!bet) {
    return (
      <Sheet title="Contract" onClose={close}>
        {missing ? <Banner text="This bet couldn't be found." /> : <ActivityIndicator style={{ marginTop: 40 }} />}
      </Sheet>
    );
  }
  return <BetDetailBody bet={bet} onClose={close} />;
}

function BetDetailBody({ bet, onClose }: { bet: Bet; onClose: () => void }) {
  const { currentUser } = useAuth();
  const { setDraft } = useBets();
  const me = bet.participants.find((p) => p.userId === currentUser?.id);
  const isCreator = currentUser?.id === bet.creatorId;
  const isOpen = bet.betType === 'open';
  const deadline = parseISO(bet.deadline);
  const needsSignature = !me || (bet.status === 'pending' && !me.confirmed);
  const canJoin = needsSignature && (me || (isOpen && bet.status !== 'settled' && bet.status !== 'cancelled'));

  const [side, setSide] = useState(me?.side || bet.sides[0]);
  const [stake, setStake] = useState(me?.stake || 25);
  const [signature, setSignature] = useState(currentUser?.signature || '');
  const [agreed, setAgreed] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const act = async (key: string, fn: () => Promise<void>) => {
    setError('');
    try {
      setBusy(key);
      await fn();
      success();
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const signAndLock = () => {
    if (!currentUser) return;
    if (!signature) return setError('Sign the contract first.');
    if (!agreed) return setError('Tick the agreement box to continue.');
    act('sign', () => (isOpen && !me ? joinOpenBet(bet, currentUser, side, stake) : confirmParticipantBet(bet, currentUser, side, stake)));
  };

  const confirmCancel = () =>
    Alert.alert('Cancel this bet?', 'Everyone’s escrowed stake is refunded immediately.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Cancel bet', style: 'destructive', onPress: () => act('cancel', () => cancelBet(bet)) },
    ]);

  const rematch = () => {
    setDraft({
      terms: `Rematch: ${bet.terms}`,
      participants: bet.participants.map((p) => ({ ...p, confirmed: p.userId === currentUser?.id, status: p.userId === currentUser?.id ? 'accepted' : 'invited', outcomeVote: undefined })),
    });
    router.dismissAll();
    router.navigate('/create');
  };

  const statusTone = bet.status === 'settled' ? 'green' : bet.status === 'disputed' ? 'red' : bet.status === 'locked' || bet.status === 'settling' ? 'dark' : 'neutral';

  return (
    <Sheet
      title={`Contract #${bet.id.slice(0, 8)}`}
      onClose={onClose}
      scrollEnabled={!drawing}
      right={<IconButton icon="share-outline" onPress={() => router.push(`/share/${bet.id}`)} />}>
      {/* Contract */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="label">Social smart contract</T>
          <Pill label={bet.status} tone={statusTone} />
        </Row>
        <T v="h2">{bet.topic || bet.terms}</T>
        <View style={s.quote}>
          <T v="body">“{bet.terms}”</T>
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="small">
            Pot <T v="bodyBold">{money(bet.totalPot)}</T>
          </T>
          <Row gap={4}>
            <Ionicons name="time-outline" size={14} color={isPast(deadline) ? C.red : C.muted} />
            <T v="tiny">{format(deadline, 'MMM d · h:mm a')}</T>
          </Row>
        </Row>
        <Row style={{ flexWrap: 'wrap' }}>
          {bet.sides.map((sd) => (
            <Pill key={sd} label={`${sd} · ${(bet.odds?.[sd] || 2).toFixed(2)}x`} tone={bet.ruling?.winningSide === sd ? 'green' : 'neutral'} />
          ))}
        </Row>
      </Card>

      {error ? <Banner text={error} /> : null}

      {/* Sign & lock */}
      {canJoin ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="bodyBold">Agreement & signature</T>
            <Pill label="18+ verified" tone="green" icon="shield-checkmark" />
          </Row>
          <T v="small">Pick your side and stake, then sign. The contract is recorded on the public ledger.</T>
          <View style={{ gap: 6 }}>
            <T v="label">Your side</T>
            <ChoiceRow options={bet.sides} value={side} onChange={setSide} />
          </View>
          <MoneyField label="Stake" value={stake} onChange={setStake} />
          <SignaturePad value={signature} onChange={setSignature} onDrawingChange={setDrawing} />
          <Check checked={agreed} onToggle={() => setAgreed(!agreed)} label="I agree to the terms and to storing my digital signature on the public ledger." />
          <Button title={`Sign & lock ${money(stake)}`} icon="lock-closed" loading={busy === 'sign'} disabled={!agreed} onPress={signAndLock} />
        </Card>
      ) : null}

      {/* Participants */}
      <Card>
        <T v="bodyBold">Participants ({bet.participants.length})</T>
        {bet.participants.map((p, i) => (
          <View key={p.userId + i} style={{ gap: 12 }}>
            {i > 0 ? <Divider /> : null}
            <Row>
              <Avatar name={p.name} photo={p.photo} size={34} />
              <View style={{ flex: 1 }}>
                <T v="bodyBold" numberOfLines={1}>
                  {p.name}
                  {p.username ? <T v="tiny"> @{p.username}</T> : null}
                </T>
                <T v="tiny">
                  {p.side} · {money(p.stake)}
                  {p.outcomeVote ? ` · voted “${p.outcomeVote}”` : ''}
                </T>
              </View>
              <Pill label={p.status === 'accepted' || p.confirmed ? 'Signed' : p.status === 'declined' ? 'Declined' : 'Waiting'} tone={p.status === 'accepted' || p.confirmed ? 'green' : p.status === 'declined' ? 'red' : 'neutral'} />
            </Row>
          </View>
        ))}
      </Card>

      {/* Vote */}
      {(bet.status === 'locked' || bet.status === 'settling') && me ? (
        <Card>
          <T v="bodyBold">Who won?</T>
          <T v="small">If everyone agrees, the pot pays out instantly. If not, it goes to arbitration.</T>
          <View style={{ gap: 8 }}>
            {bet.sides.map((sd) => {
              const voted = me.outcomeVote === sd;
              return (
                <Pressable
                  key={sd}
                  disabled={busy === 'vote'}
                  onPress={() => {
                    tap();
                    currentUser && act('vote', () => voteOutcome(bet, currentUser, sd));
                  }}
                  style={[s.vote, voted && { backgroundColor: C.ink, borderColor: C.ink }]}>
                  <T v="bodyBold" style={{ color: voted ? '#fff' : C.ink }}>
                    {sd}
                  </T>
                  {voted ? <Ionicons name="checkmark-circle" size={20} color="#fff" /> : null}
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {/* Dispute */}
      {bet.status === 'disputed' ? (
        <Card style={{ borderColor: C.redLine }}>
          <Pill label="Disputed · arbitration required" tone="red" />
          <T v="small">Votes didn’t match. Request a ruling to release the escrow.</T>
          <Button kind="danger" title="Request arbitration ruling" loading={busy === 'arb'} onPress={() => act('arb', () => requestArbitration(bet))} />
        </Card>
      ) : null}

      {/* Verdict */}
      {bet.ruling ? (
        <Card style={{ borderColor: C.greenLine, backgroundColor: C.greenBg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label" style={{ color: C.greenDark }}>
              Official verdict
            </T>
            <Pill label={bet.ruling.judgedBy} tone="green" />
          </Row>
          <T v="h3">Winner: {bet.ruling.winningSide}</T>
          <T v="small">{bet.ruling.reasoning}</T>
          <Row>
            <Button small kind="secondary" title="Rematch" icon="repeat" onPress={rematch} style={{ flex: 1 }} />
            <Button small title="Share card" icon="share-outline" onPress={() => router.push(`/share/${bet.id}`)} style={{ flex: 1 }} />
          </Row>
        </Card>
      ) : null}

      {bet.status === 'pending' && isCreator ? <Button kind="danger" title="Cancel bet (refund all)" loading={busy === 'cancel'} onPress={confirmCancel} /> : null}
    </Sheet>
  );
}

const s = StyleSheet.create({
  quote: { backgroundColor: C.bg, borderRadius: 12, padding: 12 },
  vote: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
});
