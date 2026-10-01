import { formatDistanceToNow, parseISO } from 'date-fns';
import { router } from 'expo-router';

import { Card, Empty, Pill, Row, Sheet, T } from '@/components/ui';
import { money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBets } from '@/context/BetsContext';

/** Staff-only queue of bets waiting for a decision. */
export default function ReviewQueue() {
  const { currentUser } = useAuth();
  const { bets } = useBets();
  const queue = bets
    .filter((b) => b.status === 'in_review' || b.status === 'disputed')
    .sort((a, b) => (a.reviewRequestedAt || a.createdAt).localeCompare(b.reviewRequestedAt || b.createdAt));

  if (!currentUser?.isStaff) {
    return (
      <Sheet title="Review queue" onClose={() => router.back()}>
        <Empty icon="lock-closed-outline" title="Staff only" text="This screen is for the Styx team." />
      </Sheet>
    );
  }

  return (
    <Sheet title="Review queue" subtitle={`${queue.length} waiting · oldest first`} onClose={() => router.back()}>
      {queue.length === 0 ? (
        <Empty icon="checkmark-done-outline" title="All caught up" text="No bets are waiting for review." />
      ) : (
        queue.map((b) => (
          <Card key={b.id} onPress={() => router.push(`/bet/${b.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Pill label={b.status === 'disputed' ? 'Disputed' : 'Evidence submitted'} tone={b.status === 'disputed' ? 'red' : 'amber'} />
              <T v="tiny">{b.reviewRequestedAt ? `${formatDistanceToNow(parseISO(b.reviewRequestedAt))} ago` : ''}</T>
            </Row>
            <T v="bodyBold">{b.terms}</T>
            <T v="small">
              {b.participants.map((p) => `${p.name.split(' ')[0]} (${p.side})`).join(' vs ')} · {money(b.totalPot)}
            </T>
          </Card>
        ))
      )}
    </Sheet>
  );
}
