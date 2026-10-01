import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { TopBar } from '@/components/TopBar';
import { Card, Empty, Pill, Row, Screen, T } from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBets } from '@/context/BetsContext';

export default function LedgerTab() {
  const { currentUser } = useAuth();
  const { bets } = useBets();
  const escrow = bets.filter((b) => b.status === 'locked' || b.status === 'settling');

  return (
    <Screen header={<TopBar />}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h2">Public Escrow & Ledger</T>
          <T v="small">Verifiable audit trail of locked stakes, signatures and payouts.</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T v="label">Balance</T>
          <T v="money" style={{ color: C.greenDark }}>
            {money(currentUser?.balance)}
          </T>
        </View>
      </Row>

      <Row style={{ alignItems: 'stretch' }} gap={12}>
        <Card style={{ flex: 1 }} onPress={() => router.push('/audit')}>
          <Ionicons name="document-lock-outline" size={22} color={C.ink} />
          <T v="bodyBold">Audit public ledger</T>
          <T v="tiny">Live transaction stream and verified 18+ signatures</T>
        </Card>
        <Card style={{ flex: 1 }} onPress={() => router.push('/wallet')}>
          <Ionicons name="arrow-up-circle-outline" size={22} color={C.ink} />
          <T v="bodyBold">Cash out</T>
          <T v="tiny">Withdraw your balance to your linked bank</T>
        </Card>
      </Row>

      <T v="label">Active contracts in escrow</T>
      {escrow.length === 0 ? (
        <Empty icon="lock-open-outline" title="Nothing in escrow" text="Locked bets across the network show up here." />
      ) : (
        escrow.map((bet) => (
          <Card key={bet.id} onPress={() => router.push(`/bet/${bet.id}`)}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Pill label={`Vault #${bet.id.slice(0, 8)}`} />
                <T v="bodyBold">{bet.terms}</T>
              </View>
              <T v="h3">{money(bet.totalPot)}</T>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="tiny">{bet.participants.length} bettors locked</T>
              <T v="tiny" style={{ color: C.ink, fontWeight: '700' }}>
                View contract →
              </T>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
