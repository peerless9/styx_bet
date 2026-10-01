import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { SignaturePad } from '@/components/SignaturePad';
import { Banner, Button, Card, Check, Field, Row, Segmented, Sheet, T, success } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { parseDob } from '@/lib/validation';
import { completeUserRegistration } from '@/services/betService';

export default function Register() {
  const { currentUser, privateProfile } = useAuth();
  const legalName = privateProfile ? `${privateProfile.legalFirstName} ${privateProfile.legalLastName}` : '';
  const dobAge = privateProfile ? parseDob(`${privateProfile.dateOfBirth.slice(5, 7)}/${privateProfile.dateOfBirth.slice(8)}/${privateProfile.dateOfBirth.slice(0, 4)}`)?.age : undefined;
  const [step, setStep] = useState<'1' | '2'>('1');
  const [name, setName] = useState(legalName || currentUser?.name || '');
  const [age, setAge] = useState(String(dobAge || currentUser?.age || ''));
  const [brand, setBrand] = useState('Visa');
  const [last4, setLast4] = useState('');
  const [signature, setSignature] = useState(currentUser?.signature || '');
  const [agreed, setAgreed] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const next = () => {
    setError('');
    if (!name.trim()) return setError('Enter your full legal name.');
    if (Number(age) < 18) return setError('You must be 18 or older.');
    if (!/^\d{4}$/.test(last4)) return setError('Enter the last 4 digits of your card.');
    setStep('2');
  };

  const complete = async () => {
    setError('');
    if (!currentUser) return;
    if (!signature) return setError('Add your signature.');
    if (!agreed) return setError('Tick the box to agree.');
    try {
      setLoading(true);
      await completeUserRegistration({
        userId: currentUser.id,
        name: name.trim(),
        photo: currentUser.photo,
        age: Number(age),
        paymentMethod: { type: 'card', brand, last4, name: name.trim() },
        signature,
      });
      success();
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet title="18+ ID verification" subtitle="Identity record and signature for the public ledger" onClose={() => router.back()} scrollEnabled={!drawing}>
      <Segmented<'1' | '2'>
        value={step}
        onChange={(v) => (v === '2' ? next() : setStep('1'))}
        items={[
          { id: '1', label: '1. Profile & ID' },
          { id: '2', label: '2. Signature' },
        ]}
      />
      {error ? <Banner text={error} /> : null}

      {step === '1' ? (
        <>
          <Field label="Full legal name" value={name} onChangeText={setName} placeholder="e.g. Alex Rivera" textContentType="name" autoComplete="name" />
          <Field label="Age (18+)" value={age} onChangeText={(t) => setAge(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="18" maxLength={3} />
          <Card>
            <T v="bodyBold">Debit / bank card</T>
            <Row gap={12}>
              <View style={{ flex: 1 }}>
                <Field label="Brand" value={brand} onChangeText={setBrand} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Last 4" value={last4} onChangeText={(t) => setLast4(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={4} placeholder="4829" />
              </View>
            </Row>
            <T v="tiny">Demo only — never enter a full card number.</T>
          </Card>
          <Button title="Continue to signature" icon="arrow-forward" onPress={next} />
        </>
      ) : (
        <>
          <SignaturePad value={signature} onChange={setSignature} onDrawingChange={setDrawing} height={150} />
          <Check checked={agreed} onToggle={() => setAgreed(!agreed)} label="I certify I'm 18+ and authorize my electronic signature to be stored on the public ledger." />
          <Row>
            <Button kind="secondary" title="Back" onPress={() => setStep('1')} style={{ flex: 1 }} />
            <Button title="Register" icon="shield-checkmark" loading={loading} onPress={complete} style={{ flex: 2 }} />
          </Row>
        </>
      )}
    </Sheet>
  );
}
