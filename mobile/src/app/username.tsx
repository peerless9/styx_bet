import { router } from 'expo-router';
import { useState } from 'react';

import { Banner, Button, Field, Sheet, T, success } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function Username() {
  const { currentUser, updateUsername } = useAuth();
  const [handle, setHandle] = useState(currentUser?.username || '');
  const [name, setName] = useState(currentUser?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    const clean = handle.trim().replace(/^@/, '');
    if (clean.length < 2) return setError('Handle must be at least 2 characters.');
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) return setError('Only letters, numbers and underscores.');
    setLoading(true);
    const res = await updateUsername(clean, name.trim() || undefined, currentUser?.photo);
    setLoading(false);
    if (!res.success) return setError(res.error || 'Could not save.');
    success();
    router.back();
  };

  return (
    <Sheet title="Your @handle" subtitle="Friends find and tag you by this" onClose={() => router.back()}>
      {error ? <Banner text={error} /> : null}
      <Field label="Display name" value={name} onChangeText={setName} />
      <Field label="Handle" value={handle} onChangeText={setHandle} autoCapitalize="none" autoCorrect={false} autoFocus placeholder="@yourname" />
      <T v="tiny">Letters, numbers and underscores. Must be unique.</T>
      <Button title="Save handle" loading={loading} onPress={save} />
    </Sheet>
  );
}
