import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthField, AuthLayout } from '@/components/AuthLayout';
import { Banner, Button, T } from '@/components/ui';
import { C } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { isEmail } from '@/lib/validation';

export default function SignIn() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async () => {
    setError('');
    setInfo('');
    if (!isEmail(email)) return setError('Enter the email you signed up with.');
    if (!password) return setError('Enter your password.');
    try {
      setLoading(true);
      await signIn(email, password); // the router switches to the app automatically
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    setError('');
    setInfo('');
    if (!isEmail(email)) return setError('Type your email above first, then tap “Forgot password”.');
    try {
      await resetPassword(email);
      setInfo(`Password reset link sent to ${email.trim()}.`);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in with your email and password." footer={<Button title="Log in" loading={loading} onPress={submit} />}>
      {error ? <Banner text={error} /> : null}
      {info ? <Banner tone="green" text={info} /> : null}
      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@berkeley.edu"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secure
        textContentType="password"
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Pressable onPress={forgot} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
        <T v="small" style={{ color: C.ink, fontWeight: '700' }}>
          Forgot password?
        </T>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
        <T v="small">New to Styx?</T>
        <Pressable onPress={() => router.replace('/sign-up')} hitSlop={8}>
          <T v="small" style={{ color: C.ink, fontWeight: '700' }}>
            Create an account
          </T>
        </Pressable>
      </View>
    </AuthLayout>
  );
}
