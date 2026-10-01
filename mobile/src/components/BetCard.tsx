import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Pill, Row, T } from '@/components/ui';
import { C, money } from '@/constants/theme';
import type { Bet } from '@/lib/types';

export function BetCard({ bet, currentUserId, onPress }: { bet: Bet; currentUserId?: string; onPress: () => void }) {
  const mine = bet.participants.find((p) => p.userId === currentUserId);
  const needsMe = !!mine && !mine.confirmed && bet.status === 'pending';
  const isSettled = bet.status === 'settled';
  const isLocked = bet.status === 'locked';
  const kind = bet.betType === 'open' ? 'Open Bet' : bet.betType === 'personal' ? 'Personal' : 'Social Wager';

  return (
    <Card onPress={onPress} highlight={needsMe}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ flex: 1, fontSize: 12, color: C.muted }} numberOfLines={1}>
          <Text style={{ fontWeight: '700', color: C.faint, letterSpacing: 0.6 }}>{kind.toUpperCase()}</Text>
          {'  ·  '}
          {bet.creatorName}
          {bet.creatorId === currentUserId ? ' (You)' : ''}
        </Text>
        {needsMe ? (
          <Pill label="Action Needed" tone="green" />
        ) : isSettled ? (
          <Pill label="Settled" tone="green" icon="shield-checkmark" />
        ) : isLocked ? (
          <Pill label="In Escrow" icon="time-outline" />
        ) : bet.status === 'in_review' ? (
          <Pill label="In review" icon="eye-outline" tone="amber" />
        ) : bet.status === 'disputed' ? (
          <Pill label="Disputed" tone="red" />
        ) : bet.status === 'pending' ? (
          <Pill label="Pending" />
        ) : (
          <Pill label={bet.status} />
        )}
      </Row>

      <Row style={{ alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h3">{bet.topic || bet.terms}</T>
          <T v="small" numberOfLines={2}>
            “{bet.terms}”
          </T>
        </View>
        <View style={s.pot}>
          <T v="label" style={{ fontSize: 9 }}>
            Pot
          </T>
          <Text style={{ fontSize: 18, fontWeight: '900', color: C.ink }}>{money(bet.totalPot)}</Text>
        </View>
      </Row>

      <View style={s.sides}>
        {bet.sides.slice(0, 4).map((side) => {
          const odd = bet.odds?.[side] || 2.0;
          const isPick = mine?.side === side;
          const isWinner = isSettled && bet.ruling?.winningSide === side;
          return (
            <View
              key={side}
              style={[
                s.side,
                isWinner
                  ? { borderColor: C.green, backgroundColor: C.greenBg }
                  : isPick
                    ? { borderColor: C.ink, backgroundColor: C.ink }
                    : null,
              ]}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '600', color: isPick && !isWinner ? '#fff' : C.text }}>
                  {side}
                </Text>
                {isPick ? (
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isWinner ? C.greenDark : '#6EE7B7' }}>
                    Your pick (${mine?.stake})
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: isPick && !isWinner ? '#fff' : C.ink }}>{odd.toFixed(2)}x</Text>
            </View>
          );
        })}
      </View>
      {bet.sides.length > 4 ? <T v="tiny">+{bet.sides.length - 4} more positions</T> : null}

      <Row style={{ justifyContent: 'space-between', paddingTop: 2 }}>
        <Row gap={5}>
          <Ionicons name="people-outline" size={14} color={C.faint} />
          <T v="tiny">
            {bet.participants.length} participant{bet.participants.length !== 1 ? 's' : ''}
          </T>
        </Row>
        <Row gap={2}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>View contract</Text>
          <Ionicons name="chevron-forward" size={14} color={C.faint} />
        </Row>
      </Row>
    </Card>
  );
}

const s = StyleSheet.create({
  pot: { alignItems: 'flex-end', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.lineSoft, paddingHorizontal: 10, paddingVertical: 6 },
  sides: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  side: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#FAFAFA',
  },
});
