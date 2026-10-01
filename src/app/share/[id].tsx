import { format } from 'date-fns';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Banner, Button, Pill, Row, Sheet, T } from '@/components/ui';
import { C, money } from '@/constants/theme';
import { useBets } from '@/context/BetsContext';

/** Certificate card you can send to the group chat or save to Photos. */
export default function ShareCard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bets } = useBets();
  const bet = bets.find((b) => b.id === id);
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!bet) {
    return (
      <Sheet title="Share card" onClose={() => router.back()}>
        <Banner text="This bet couldn't be found." />
      </Sheet>
    );
  }

  const winningSide = bet.ruling?.winningSide || bet.sides[0];
  const winners = bet.participants.filter((p) => p.side === winningSide && (p.confirmed || p.status === 'accepted'));
  const winnerNames = winners.map((w) => w.name).join(', ') || 'Consensus winner';

  const share = async () => {
    setError('');
    try {
      setBusy(true);
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
        setError('Sharing is only available on your phone.');
        return;
      }
      // iOS share sheet: Messages, Instagram, Save Image, Copy…
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share bet' });
    } catch (e: any) {
      setError(e?.message || 'Could not create the image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Contract certificate" onClose={() => router.back()}>
      <View ref={cardRef} collapsable={false} style={s.card}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={8}>
            <View style={s.logo}>
              <T v="bodyBold" style={{ color: '#fff' }}>
                S
              </T>
            </View>
            <T v="bodyBold">Styx Public Escrow</T>
          </Row>
          <Pill label={bet.status.toUpperCase()} tone="green" />
        </Row>
        <View>
          <T v="label">{bet.status === 'settled' ? 'Settled escrow pot' : 'Escrow pot'}</T>
          <T style={{ fontSize: 40, fontWeight: '900', color: C.ink, letterSpacing: -1 }}>{money(bet.totalPot)}</T>
        </View>
        <View style={s.box}>
          <T v="body">“{bet.terms}”</T>
        </View>
        <View style={s.box}>
          <T v="label">{bet.ruling ? 'Winning side' : 'Leading side'}</T>
          <T v="h3">{winningSide}</T>
          <T v="small" style={{ color: C.greenDark, fontWeight: '700' }}>
            {bet.ruling ? 'Winner' : 'Backed by'}: {winnerNames}
          </T>
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="tiny">Contract #{bet.id.slice(0, 8)}</T>
          <T v="tiny">{format(new Date(), 'MMM d, yyyy')}</T>
        </Row>
      </View>

      {error ? <Banner text={error} /> : null}
      <Button title="Share image" icon="share-outline" loading={busy} onPress={share} />
      <T v="tiny" style={{ textAlign: 'center' }}>
        Use “Save Image” in the share sheet to keep it in Photos.
      </T>
    </Sheet>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#FAFAFA', borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 18, gap: 14 },
  logo: { width: 26, height: 26, borderRadius: 8, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  box: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12, gap: 2 },
});
