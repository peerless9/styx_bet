import Ionicons from '@expo/vector-icons/Ionicons';
import { format, parseISO } from 'date-fns';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Banner, Button, Card, Divider, Row, T, success } from '@/components/ui';
import { C } from '@/constants/theme';
import { db } from '@/lib/firebase';
import type { Bet, Evidence, UserProfile } from '@/lib/types';
import { submitEvidence } from '@/services/betService';

/** Live list of evidence on a bet. */
export function useEvidence(betId: string) {
  const [items, setItems] = useState<Evidence[]>([]);
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'bets', betId, 'evidence'), orderBy('createdAt', 'asc')),
        (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Evidence)),
        (err) => console.warn('Evidence snapshot error:', err)
      ),
    [betId]
  );
  return items;
}

/** Shrink a photo so it fits comfortably in Firestore (well under the 1 MB doc limit). */
async function toSmallJpeg(uri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(uri).resize({ width: 900, height: null }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.5, base64: true });
  if (!saved.base64) throw new Error('Could not read the photo.');
  return saved.base64;
}

export function EvidenceComposer({ bet, user, cta = 'Submit for review' }: { bet: Bet; user: UserProfile; cta?: string }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null); // base64
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (source: 'camera' | 'library') => {
    setError('');
    try {
      const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setError(`Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to add a photo.`);
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
      const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]) return;
      setBusy(true);
      setImage(await toSmallJpeg(res.assets[0].uri));
    } catch (e: any) {
      setError(e?.message || 'Could not add the photo.');
    } finally {
      setBusy(false);
    }
  };

  const choose = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['Cancel', 'Take photo', 'Choose from library'], cancelButtonIndex: 0 }, (i) => {
        if (i === 1) pick('camera');
        if (i === 2) pick('library');
      });
    } else {
      Alert.alert('Add a photo', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take photo', onPress: () => pick('camera') },
        { text: 'Choose from library', onPress: () => pick('library') },
      ]);
    }
  };

  const submit = async () => {
    setError('');
    try {
      setBusy(true);
      await submitEvidence(bet, user, { text, imageBase64: image || undefined });
      success();
      setText('');
      setImage(null);
    } catch (e: any) {
      setError(e?.message || 'Could not submit.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {error ? <Banner text={error} /> : null}
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        placeholder="What happened? Add links, times, scores…"
        placeholderTextColor={C.faint}
        style={s.note}
      />
      {image ? (
        <View>
          <Image source={{ uri: `data:image/jpeg;base64,${image}` }} style={s.preview} contentFit="cover" />
          <Pressable onPress={() => setImage(null)} style={s.remove} hitSlop={8}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={choose} style={s.addPhoto}>
          <Ionicons name="camera-outline" size={20} color={C.muted} />
          <T v="small" style={{ fontWeight: '600' }}>
            Add a photo or screenshot
          </T>
        </Pressable>
      )}
      <Button title={cta} icon="send" loading={busy} disabled={!text.trim() && !image} onPress={submit} />
    </View>
  );
}

export function EvidenceList({ items }: { items: Evidence[] }) {
  const [zoom, setZoom] = useState<string | null>(null);
  if (!items.length) return null;
  return (
    <Card>
      <T v="bodyBold">Evidence ({items.length})</T>
      {items.map((e, i) => (
        <View key={e.id} style={{ gap: 8 }}>
          {i > 0 ? <Divider /> : null}
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="small" style={{ color: C.ink, fontWeight: '700' }}>
              {e.userName}
            </T>
            <T v="tiny">{format(parseISO(e.createdAt), 'MMM d · h:mm a')}</T>
          </Row>
          {e.text ? <T v="body">{e.text}</T> : null}
          {e.imageBase64 ? (
            <Pressable onPress={() => setZoom(e.imageBase64!)}>
              <Image source={{ uri: `data:image/jpeg;base64,${e.imageBase64}` }} style={s.preview} contentFit="cover" />
            </Pressable>
          ) : null}
        </View>
      ))}
      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <Pressable style={s.zoomBg} onPress={() => setZoom(null)}>
          {zoom ? <Image source={{ uri: `data:image/jpeg;base64,${zoom}` }} style={{ width: '100%', height: '80%' }} contentFit="contain" /> : null}
        </Pressable>
      </Modal>
    </Card>
  );
}

const s = StyleSheet.create({
  note: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, minHeight: 80, fontSize: 16, color: C.ink, textAlignVertical: 'top' },
  addPhoto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  preview: { width: '100%', height: 200, borderRadius: 14, backgroundColor: C.fill },
  remove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  zoomBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
});
