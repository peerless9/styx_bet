import Ionicons from '@expo/vector-icons/Ionicons';
import { format, isPast, parseISO } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import { EvidenceComposer, EvidenceList, useEvidence } from '@/components/Evidence';
import { SignaturePad } from '@/components/SignaturePad';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Check,
  confirmAction,
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
import { betLink } from '@/lib/links';
import type { Bet } from '@/lib/types';
import {
  cancelBet,
  confirmParticipantBet,
  joinBetViaLink,
  linkJoinProblem,
  canDecide,
  requestStaffReview,
  staffDecide,
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
  const deadline = bet.deadline ? parseISO(bet.deadline) : null;
  const method = bet.resolution || 'players';
  const evidence = useEvidence(bet.id);
  const isStaff = !!currentUser?.isStaff;
  // re-check the deadline every 30s so the "who won" step appears on time
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const decidable = canDecide(bet, now);
  const active = bet.status === 'locked' || bet.status === 'settling';
  const [staffSide, setStaffSide] = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState('');
  // Invited (listed) players accept; anyone else who opens the link can join
  const canAccept = !!me && bet.status === 'pending' && !me.confirmed;
  const canJoin = canAccept || (!me && !linkJoinProblem(bet, currentUser, now));
  const canInvite =
    !!me &&
    bet.betType !== 'personal' &&
    (bet.status === 'pending' || bet.status === 'locked') &&
    (!bet.deadline || new Date(bet.deadline).getTime() > now);
  const creatorSide = bet.participants.find((p) => p.userId === bet.creatorId)?.side;
  const [copied, setCopied] = useState(false);

  const [side, setSide] = useState(me?.side || bet.sides.find((x) => x !== creatorSide) || bet.sides[0]);
  const [stake, setStake] = useState(me?.stake || bet.participants[0]?.stake || 10);
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
    act('sign', () => (me ? confirmParticipantBet(bet, currentUser, side, stake) : joinBetViaLink(bet, currentUser, side, stake)));
  };

  const confirmCancel = () =>
confirmAction('Cancel this bet?', 'Everyone’s escrowed stake is refunded immediately.', 'Cancel bet', () => act('cancel', () => cancelBet(bet)), true);

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
            <Ionicons name="time-outline" size={14} color={deadline && isPast(deadline) ? C.red : C.muted} />
            <T v="tiny">{deadline ? format(deadline, 'MMM d · h:mm a') : 'No deadline'}</T>
          </Row>
        </Row>
        <Row gap={6}>
          <Ionicons name={method === 'review' ? 'document-text-outline' : 'people-outline'} size={14} color={C.muted} />
          <T v="tiny">{method === 'review' ? 'Winner decided by Styx review of evidence' : 'Winner decided by the players'}</T>
        </Row>
        <Row style={{ flexWrap: 'wrap' }}>
          {bet.sides.map((sd) => (
            <Pill key={sd} label={`${sd} · ${(bet.odds?.[sd] || 2).toFixed(2)}x`} tone={bet.ruling?.winningSide === sd ? 'green' : 'neutral'} />
          ))}
        </Row>
      </Card>

      {error ? <Banner text={error} /> : null}

      {/* Invite with a link */}
      {canInvite ? (
        <Card>
          <Row gap={8}>
            <Ionicons name="link" size={18} color={C.ink} />
            <T v="bodyBold">Invite people</T>
          </Row>
          <T v="small">Send this link to anyone. It opens Styx right to this bet so they can accept.</T>
          <Row>
            <Button
              small
              kind="secondary"
              icon={copied ? 'checkmark' : 'copy-outline'}
              title={copied ? 'Copied' : 'Copy link'}
              style={{ flex: 1 }}
              onPress={async () => {
                await Clipboard.setStringAsync(betLink(bet.id));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            />
            <Button
              small
              icon="share-outline"
              title="Send"
              style={{ flex: 1 }}
              onPress={() => {
                const url = betLink(bet.id);
                Share.share({ message: `${currentUser?.name || 'A friend'} bet you on Styx: “${bet.terms}” — ${url}`, url }).catch(() => {});
              }}
            />
          </Row>
        </Card>
      ) : null}

      {/* Accept / join */}
      {canJoin ? (
        <Card highlight={!me || canAccept}>
          {!me ? (
            <Row>
              <Avatar name={bet.creatorName} photo={bet.creatorPhoto} size={32} dark />
              <T v="bodyBold" style={{ flex: 1 }}>
                {bet.creatorName} invited you to this bet
              </T>
            </Row>
          ) : null}
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="bodyBold">Accept the bet</T>
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
          <Button title={`Accept & lock ${money(stake)}`} icon="lock-closed" loading={busy === 'sign'} disabled={!agreed} onPress={signAndLock} />
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
                  {p.outcomeVote ? ' · picked a winner' : ''}
                </T>
              </View>
              <Pill label={p.status === 'accepted' || p.confirmed ? 'Signed' : p.status === 'declined' ? 'Declined' : 'Waiting'} tone={p.status === 'accepted' || p.confirmed ? 'green' : p.status === 'declined' ? 'red' : 'neutral'} />
            </Row>
          </View>
        ))}
      </Card>

      {/* Waiting for the deadline */}
      {active && !decidable && me ? (
        <Card>
          <Row gap={8}>
            <Ionicons name="hourglass-outline" size={18} color={C.ink} />
            <T v="bodyBold">Bet is live</T>
          </Row>
          <T v="small">
            {method === 'review'
              ? `After ${deadline ? format(deadline, 'EEE, MMM d · h:mm a') : 'the deadline'}, upload your proof and the Styx team will pick the winner.`
              : `After ${deadline ? format(deadline, 'EEE, MMM d · h:mm a') : 'the deadline'}, everyone picks who won.`}
          </T>
        </Card>
      ) : null}

      {/* Players decide */}
      {active && decidable && method === 'players' && me ? (
        <Card>
          <T v="bodyBold">Who won?</T>
          <T v="small">Everyone picks. If all picks match, the pot pays out right away. If not, the Styx team reviews it.</T>
          <View style={{ gap: 8 }}>
            {bet.sides.map((sd) => {
              const voted = me.outcomeVote === sd;
              return (
                <Pressable
                  key={sd}
                  disabled={busy === 'vote'}
                  onPress={() => {
                    tap();
                    if (currentUser) act('vote', () => voteOutcome(bet, currentUser, sd));
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
          <T v="tiny">
            {bet.participants.filter((p) => p.outcomeVote).length} of {bet.participants.filter((p) => p.confirmed || p.status === 'accepted').length} picked
          </T>
        </Card>
      ) : null}

      {/* Evidence review: submit proof */}
      {active && decidable && method === 'review' && me && currentUser ? (
        <Card>
          <T v="bodyBold">Send your proof</T>
          <T v="small">Add a photo, screenshot or note showing what happened. A Styx team member reviews it and picks the winner.</T>
          <EvidenceComposer bet={bet} user={currentUser} />
        </Card>
      ) : null}

      {/* Players disagreed */}
      {bet.status === 'disputed' ? (
        <Card style={{ borderColor: C.redLine }}>
          <Pill label="Picks didn’t match" tone="red" />
          <T v="small">Send it to the Styx team. Add any proof you have so they can decide fairly.</T>
          {me && currentUser ? <EvidenceComposer bet={bet} user={currentUser} cta="Send to Styx review" /> : null}
          <Button kind="secondary" small title="Send without proof" loading={busy === 'review'} onPress={() => act('review', () => requestStaffReview(bet))} />
        </Card>
      ) : null}

      {/* Under review */}
      {bet.status === 'in_review' ? (
        <Card style={{ borderColor: C.amberLine, backgroundColor: C.amberBg }}>
          <Row gap={8}>
            <Ionicons name="eye-outline" size={18} color={C.amber} />
            <T v="bodyBold" style={{ color: C.amber }}>
              Under review by the Styx team
            </T>
          </Row>
          <T v="small">You’ll see the result here. You can still add more proof below.</T>
          {me && currentUser ? <EvidenceComposer bet={bet} user={currentUser} cta="Add proof" /> : null}
        </Card>
      ) : null}

      <EvidenceList items={evidence} />

      {/* Staff decision */}
      {isStaff && currentUser && (bet.status === 'in_review' || bet.status === 'disputed') ? (
        <Card style={{ borderColor: C.ink, borderWidth: 2 }}>
          <Row gap={8}>
            <Ionicons name="shield-checkmark" size={18} color={C.ink} />
            <T v="bodyBold">Staff decision</T>
          </Row>
          <T v="small">Pick the winning side. Winners are paid out immediately.</T>
          <View style={{ gap: 8 }}>
            {bet.sides.map((sd) => (
              <Pressable key={sd} onPress={() => setStaffSide(sd)} style={[s.vote, staffSide === sd && { backgroundColor: C.ink, borderColor: C.ink }]}>
                <T v="bodyBold" style={{ color: staffSide === sd ? '#fff' : C.ink }}>
                  {sd}
                </T>
                <T v="tiny" style={{ color: staffSide === sd ? '#D4D4D4' : C.muted }}>
                  {bet.participants.filter((p) => p.side === sd).map((p) => p.name.split(' ')[0]).join(', ') || 'no one'}
                </T>
              </Pressable>
            ))}
          </View>
          <TextInput value={staffNote} onChangeText={setStaffNote} placeholder="Reason (shown to players)" placeholderTextColor={C.faint} multiline style={s.note} />
          <Button
            title={staffSide ? `Declare “${staffSide}” the winner` : 'Pick a side'}
            disabled={!staffSide}
            loading={busy === 'staff'}
            onPress={() =>
              confirmAction('Confirm decision', `“${staffSide}” wins and the pot is paid out. This can’t be undone.`, 'Confirm', () => {
                if (staffSide) act('staff', () => staffDecide(bet, currentUser, staffSide, staffNote));
              })
            }
          />
        </Card>
      ) : null}

      {/* Verdict */}
      {bet.ruling ? (
        <Card style={{ borderColor: C.greenLine, backgroundColor: C.greenBg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label" style={{ color: C.greenDark }}>
              Official verdict
            </T>
            <Pill label={bet.ruling.judgedBy === 'staff' ? 'Styx review' : bet.ruling.judgedBy === 'consensus' ? 'Players agreed' : bet.ruling.judgedBy} tone="green" />
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
  note: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, minHeight: 60, fontSize: 16, color: C.ink, textAlignVertical: 'top' },
  vote: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
});
