import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { TopBar } from '@/components/TopBar';
import { Avatar, Banner, Button, Card, Divider, Empty, Pill, Row, Screen, Segmented, Stat, T, success } from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBets } from '@/context/BetsContext';
import type { Bet, Participant } from '@/lib/types';
import { acceptBet, cancelSentBet, declineBet } from '@/services/betService';

type Sub = 'received' | 'sent' | 'active' | 'past';

export default function Inbox() {
  const { currentUser } = useAuth();
  const { bets, waitingOnYou } = useBets();
  const [sub, setSub] = useState<Sub>('received');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; msg: string } | null>(null);
  const uid = currentUser?.id || '';

  const isMember = (b: Bet) => b.participantIds?.includes(uid) || b.creatorId === uid;
  const sent = bets.filter((b) => b.creatorId === uid && b.status === 'pending');
  const active = bets.filter((b) => isMember(b) && ['locked', 'settling', 'disputed', 'in_review'].includes(b.status));
  const past = bets.filter((b) => isMember(b) && ['settled', 'cancelled', 'charity', 'system_forfeited'].includes(b.status));

  // live countdown
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const countdown = (bet: Bet) => {
    if (bet.status === 'in_review') return 'In Styx review';
    if (bet.status === 'disputed') return 'Picks didn’t match';
    if (!bet.deadline) return 'No deadline';
    const diff = new Date(bet.deadline).getTime() - now;
    if (diff <= 0) return (bet.resolution || 'players') === 'review' ? 'Send your proof' : 'Pick the winner';
    const h = Math.floor(diff / 3.6e6);
    const m = Math.floor((diff % 3.6e6) / 6e4);
    const sec = Math.floor((diff % 6e4) / 1000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(sec)} left`;
  };

  const run = async (bet: Bet, fn: () => Promise<void>) => {
    setError(null);
    try {
      setBusyId(bet.id);
      await fn();
      success();
    } catch (e: any) {
      setError({ id: bet.id, msg: e?.message || 'Something went wrong.' });
    } finally {
      setBusyId(null);
    }
  };

  const accept = (bet: Bet, mine: Participant) => {
    if (!currentUser) return;
    if ((currentUser.balance || 0) < (mine.stake || 0)) {
      setError({ id: bet.id, msg: `Not enough balance (${money(currentUser.balance)} available, ${money(mine.stake)} needed).` });
      return;
    }
    run(bet, () => acceptBet(bet, currentUser));
  };

  return (
    <Screen header={<TopBar />}>
      <View style={{ gap: 4 }}>
        <T v="h2">Bet Inbox</T>
        <T v="small">Incoming challenges, outgoing requests, and active escrow positions.</T>
      </View>

      <Segmented<Sub>
        value={sub}
        onChange={setSub}
        items={[
          { id: 'received', label: 'Received', badge: waitingOnYou.length },
          { id: 'sent', label: 'Sent', badge: sent.length },
          { id: 'active', label: 'Active', badge: active.length },
          { id: 'past', label: 'Past' },
        ]}
      />

      {sub === 'received' &&
        (waitingOnYou.length === 0 ? (
          <Empty icon="shield-checkmark-outline" title="Inbox is empty" text="You have no pending incoming wager challenges." />
        ) : (
          waitingOnYou.map((bet) => {
            const mine = bet.participants.find((p) => p.userId === uid);
            if (!mine) return null;
            const odds = bet.odds?.[mine.side] || 2.0;
            const busy = busyId === bet.id;
            return (
              <Card key={bet.id} highlight>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ flex: 1 }}>
                    <Avatar name={bet.creatorName} photo={bet.creatorPhoto} size={32} dark />
                    <View style={{ flex: 1 }}>
                      <T v="bodyBold" numberOfLines={1}>
                        {bet.creatorName} <T v="small">challenged you</T>
                      </T>
                      <T v="tiny">Contract #{bet.id.slice(0, 8)}</T>
                    </View>
                  </Row>
                  <Pill label="Action required" tone="green" />
                </Row>
                <View style={{ backgroundColor: C.bg, borderRadius: 12, padding: 12, gap: 4 }}>
                  <T v="label">Terms of wager</T>
                  <T v="body">“{bet.terms}”</T>
                </View>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Stat label="Your side" value={mine.side} />
                  <Stat label="Stake" value={money(mine.stake)} />
                  <Stat label="Odds" value={`${odds.toFixed(2)}x`} />
                  <Stat label="To win" value={money((mine.stake || 0) * odds)} tone="green" />
                </Row>
                {error?.id === bet.id ? (
                  <Banner text={error.msg} action={{ label: 'Top up', onPress: () => router.push('/wallet') }} />
                ) : null}
                <Row>
                  <Button kind="secondary" title="Decline" disabled={busy} onPress={() => currentUser && run(bet, () => declineBet(bet, currentUser))} style={{ flex: 1 }} />
                  <Button title={`Accept · ${money(mine.stake)}`} icon="checkmark" loading={busy} onPress={() => accept(bet, mine)} style={{ flex: 2 }} />
                </Row>
              </Card>
            );
          })
        ))}

      {sub === 'sent' &&
        (sent.length === 0 ? (
          <Empty icon="paper-plane-outline" title="No outgoing requests" text="Bets you send will wait here until your opponents respond." />
        ) : (
          sent.map((bet) => (
            <Card key={bet.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Pill label="Awaiting responses" tone="amber" />
                <T v="bodyBold">{money(bet.totalPot)} pot</T>
              </Row>
              <T v="body">“{bet.terms}”</T>
              <Divider />
              {bet.participants.map((p) => {
                const st = p.status || (p.confirmed ? 'accepted' : 'invited');
                return (
                  <Row key={p.userId} style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <T v="bodyBold" numberOfLines={1}>
                        {p.name}
                        {p.userId === bet.creatorId ? <T v="tiny"> (you)</T> : null}
                      </T>
                      <T v="tiny">
                        {p.side} · {money(p.stake)}
                      </T>
                    </View>
                    <Pill label={st === 'accepted' ? 'Accepted' : st === 'declined' ? 'Declined' : 'Waiting'} tone={st === 'accepted' ? 'green' : st === 'declined' ? 'red' : 'neutral'} />
                  </Row>
                );
              })}
              {error?.id === bet.id ? <Banner text={error.msg} /> : null}
              <Button kind="danger" small title="Cancel bet (refund all)" loading={busyId === bet.id} onPress={() => run(bet, () => cancelSentBet(bet))} />
            </Card>
          ))
        ))}

      {sub === 'active' &&
        (active.length === 0 ? (
          <Empty icon="lock-closed-outline" title="No active escrow bets" text="When everyone accepts, bets lock here until the deadline." />
        ) : (
          active.map((bet) => {
            const mine = bet.participants.find((p) => p.userId === uid);
            return (
              <Card key={bet.id} onPress={() => router.push(`/bet/${bet.id}`)}>
                <Row style={{ justifyContent: 'space-between' }}>
                  {bet.status === 'in_review' ? (
                    <Pill label="In review" icon="eye-outline" tone="amber" />
                  ) : bet.status === 'disputed' ? (
                    <Pill label="Disputed" tone="red" />
                  ) : (
                    <Pill label="Escrow locked" icon="lock-closed" tone="dark" />
                  )}
                  <Row gap={4}>
                    <Ionicons name="time-outline" size={14} color={C.muted} />
                    <T v="tiny" style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>
                      {countdown(bet)}
                    </T>
                  </Row>
                </Row>
                <T v="bodyBold">{bet.terms}</T>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="small">{mine ? `You: ${mine.side} (${money(mine.stake)})` : 'Observer'}</T>
                  <T v="bodyBold">{money(bet.totalPot)}</T>
                </Row>
              </Card>
            );
          })
        ))}

      {sub === 'past' &&
        (past.length === 0 ? (
          <Empty icon="time-outline" title="No past wagers" text="Settled, refunded, or forfeited contracts will appear here." />
        ) : (
          past.map((bet) => {
            const mine = bet.participants.find((p) => p.userId === uid);
            const won = bet.status === 'settled' && bet.ruling?.winningSide === mine?.side;
            const pill =
              bet.status === 'settled'
                ? won
                  ? { label: `Won +${money((mine?.stake || 0) * (bet.odds?.[mine?.side || ''] || 2))}`, tone: 'green' as const }
                  : { label: `Lost -${money(mine?.stake)}`, tone: 'red' as const }
                : bet.status === 'cancelled'
                  ? { label: 'Cancelled · refunded', tone: 'neutral' as const }
                  : bet.status === 'charity'
                    ? { label: 'Forfeited to charity', tone: 'amber' as const }
                    : { label: bet.status, tone: 'neutral' as const };
            return (
              <Card key={bet.id} onPress={() => router.push(`/bet/${bet.id}`)}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="tiny">Contract #{bet.id.slice(0, 8)}</T>
                  <Pill label={pill.label} tone={pill.tone} />
                </Row>
                <T v="bodyBold">{bet.terms}</T>
                {bet.ruling ? <T v="small">Winner: {bet.ruling.winningSide}</T> : null}
              </Card>
            );
          })
        ))}
    </Screen>
  );
}
