import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Card, Divider, Pill, Row, Segmented, Sheet, T } from '@/components/ui';
import { C, mono, money } from '@/constants/theme';
import { db } from '@/lib/firebase';
import type { Transaction, UserProfile } from '@/lib/types';

const sig = (s?: string) => (!s ? '' : s.startsWith('svg:') ? 'Hand-drawn (SVG)' : s.startsWith('data:') ? 'Hand-drawn (PNG)' : `${s.slice(0, 24)}…`);

export default function Audit() {
  const [view, setView] = useState<'tx' | 'ids'>('tx');
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(50)),
      (snap) => {
        setTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction));
        setLoading(false);
      },
      () => setLoading(false)
    );
    const u2 = onSnapshot(query(collection(db, 'users'), limit(50)), (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserProfile)));
    return () => {
      u1();
      u2();
    };
  }, []);

  return (
    <Sheet title="Public ledger" subtitle="Signatures, identity hashes and escrow movements" onClose={() => router.back()}>
      <Segmented<'tx' | 'ids'>
        value={view}
        onChange={setView}
        items={[
          { id: 'tx', label: `Transactions (${txs.length})` },
          { id: 'ids', label: `Verified IDs (${users.filter((u) => u.isRegistered).length})` },
        ]}
      />
      <Card style={{ gap: 0, padding: 0 }}>
        {view === 'tx' ? (
          loading ? (
            <ActivityIndicator style={{ padding: 24 }} />
          ) : txs.length === 0 ? (
            <T v="small" style={{ padding: 16 }}>
              No transactions recorded yet.
            </T>
          ) : (
            txs.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <Divider /> : null}
                <View style={{ padding: 14, gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row style={{ flex: 1 }} gap={6}>
                      <T v="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {t.userName}
                      </T>
                      <Pill label={t.type} />
                    </Row>
                    <T v="bodyBold">{money(Math.abs(t.amount))}</T>
                  </Row>
                  {t.betTerms ? (
                    <T v="tiny" numberOfLines={2}>
                      “{t.betTerms}”
                    </T>
                  ) : null}
                  {t.signature ? (
                    <T v="tiny" style={{ fontFamily: mono }}>
                      sig: {sig(t.signature)}
                    </T>
                  ) : null}
                  <T v="tiny" style={{ color: C.faint }}>
                    {t.createdAt ? format(parseISO(t.createdAt), 'MMM d, yyyy · h:mm a') : ''}
                  </T>
                </View>
              </View>
            ))
          )
        ) : (
          users.map((u, i) => (
            <View key={u.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ padding: 14, gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="bodyBold">
                    {u.name}
                    {u.username ? <T v="tiny"> @{u.username}</T> : null}
                  </T>
                  {u.isRegistered ? <Pill label="18+ verified" tone="green" icon="shield-checkmark" /> : null}
                </Row>
                <T v="tiny" style={{ fontFamily: mono }}>
                  Ledger ID: {u.idDocumentHash || `0xID_${u.id.slice(0, 8).toUpperCase()}`}
                </T>
                {u.signature ? <T v="tiny">Signature: {sig(u.signature)}</T> : null}
                <T v="tiny">
                  Solvency: <T v="tiny" style={{ color: C.ink, fontWeight: '800' }}>{money(u.balance)}</T>
                </T>
              </View>
            </View>
          ))
        )}
      </Card>
    </Sheet>
  );
}
