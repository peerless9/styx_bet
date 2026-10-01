import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Banner, Button, Card, Divider, MoneyField, Pill, Row, Sheet, T, success } from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { Transaction } from '@/lib/types';

const TX_LABEL: Record<string, string> = {
  hold: 'Stake held in escrow',
  payout: 'Winnings paid out',
  refund: 'Stake refunded',
  charity: 'Forfeited to charity',
  top_up: 'Top up',
  cashout: 'Cash out',
  instant_cashout_fee: 'Instant cash-out fee',
  system_forfeit: 'Forfeit',
};

export default function Wallet() {
  const { currentUser, topUpBalance } = useAuth();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topping, setTopping] = useState(false);
  const [showCashOut, setShowCashOut] = useState(false);
  const [cashOut, setCashOut] = useState(Math.min(currentUser?.balance || 25, 50));
  const [done, setDone] = useState('');

  const uid = currentUser?.id;
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'transactions'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTxs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction));
        setLoading(false);
      },
      (err) => {
        console.warn('Wallet tx error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  const credit = (t: Transaction['type']) => t === 'payout' || t === 'refund' || t === 'top_up';

  return (
    <Sheet title="Wallet" subtitle="Escrow balance & ledger history" onClose={() => router.back()}>
      <View style={{ backgroundColor: C.ink, borderRadius: 22, padding: 20, gap: 14 }}>
        <T v="label" style={{ color: '#A3A3A3' }}>
          Available balance
        </T>
        <T style={{ fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1, fontVariant: ['tabular-nums'] }}>{money(currentUser?.balance)}</T>
        <Row>
          <Button
            small
            kind="secondary"
            title="Cash out"
            icon="arrow-up"
            disabled={(currentUser?.balance || 0) <= 0}
            onPress={() => setShowCashOut(!showCashOut)}
            style={{ flex: 1 }}
          />
          <Button
            small
            kind="success"
            title="Top up $50"
            icon="add"
            loading={topping}
            onPress={async () => {
              setTopping(true);
              await topUpBalance(50).catch(() => {});
              setTopping(false);
              success();
            }}
            style={{ flex: 1 }}
          />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="tiny" style={{ color: '#A3A3A3' }}>
            18+ identity
          </T>
          {currentUser?.isRegistered ? (
            <Pill label="Verified" tone="green" icon="shield-checkmark" />
          ) : (
            <Pressable hitSlop={8} onPress={() => router.push('/register')}>
              <T v="small" style={{ color: '#6EE7B7', fontWeight: '800' }}>
                Verify ID →
              </T>
            </Pressable>
          )}
        </Row>
      </View>

      {showCashOut ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="bodyBold">Cash out</T>
            <T v="tiny">Max {money(currentUser?.balance)}</T>
          </Row>
          {done ? <Banner tone="green" text={done} /> : null}
          <MoneyField value={cashOut} onChange={(n) => setCashOut(Math.min(n, currentUser?.balance || 0))} />
          <Button
            title={`Confirm cash out ${money(cashOut)}`}
            onPress={() => {
              success();
              setDone(`${money(cashOut)} transfer started to your linked bank.`);
              setTimeout(() => {
                setShowCashOut(false);
                setDone('');
              }, 2500);
            }}
          />
          <T v="tiny">Demo only — no real money moves.</T>
        </Card>
      ) : null}

      <T v="label">Ledger transactions ({txs.length})</T>
      <Card style={{ gap: 0, padding: 0 }}>
        {loading ? (
          <ActivityIndicator style={{ padding: 24 }} />
        ) : txs.length === 0 ? (
          <T v="small" style={{ padding: 16 }}>
            No transactions yet.
          </T>
        ) : (
          txs.map((tx, i) => (
            <View key={tx.id}>
              {i > 0 ? <Divider /> : null}
              <Row style={{ padding: 14, alignItems: 'flex-start' }} gap={12}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="bodyBold">{TX_LABEL[tx.type] || tx.type}</T>
                  {tx.betTerms ? (
                    <T v="tiny" numberOfLines={1}>
                      “{tx.betTerms}”
                    </T>
                  ) : null}
                  <T v="tiny" style={{ color: C.faint }}>
                    {tx.createdAt ? format(parseISO(tx.createdAt), 'MMM d · h:mm a') : ''}
                  </T>
                </View>
                <T v="bodyBold" style={{ color: credit(tx.type) ? C.green : C.ink }}>
                  {credit(tx.type) ? '+' : '−'}
                  {money(Math.abs(tx.amount))}
                </T>
              </Row>
            </View>
          ))
        )}
      </Card>
    </Sheet>
  );
}
