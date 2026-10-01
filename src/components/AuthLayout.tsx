import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T, tap } from '@/components/ui';
import { C, R } from '@/constants/theme';
import { US_STATES } from '@/lib/validation';

/** Full-screen layout for welcome / sign-up / log-in. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  onBack,
  progress,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  /** 0–1, shows a progress bar under the header */
  progress?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={s.header}>
        <Pressable
          hitSlop={10}
          onPress={() => {
            tap();
            if (onBack) onBack();
            else router.back();
          }}
          style={s.back}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        {progress !== undefined ? (
          <View style={s.track}>
            <View style={[s.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        ) : null}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16, paddingBottom: 24 }}>
        <View style={{ gap: 6, marginBottom: 4 }}>
          <T v="h1">{title}</T>
          {subtitle ? <T v="small" style={{ fontSize: 15, lineHeight: 21 }}>{subtitle}</T> : null}
        </View>
        {children}
      </ScrollView>
      {footer ? <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{footer}</View> : null}
    </View>
  );
}

/** Text field with label, error text and optional show/hide for passwords. */
export function AuthField({
  label,
  error,
  hint,
  secure,
  ...props
}: TextInputProps & { label: string; error?: string | null; hint?: string; secure?: boolean }) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <View style={[s.inputWrap, error ? { borderColor: C.red } : null]}>
        <TextInput placeholderTextColor={C.faint} style={s.input} secureTextEntry={secure && hidden} {...props} />
        {secure ? (
          <Pressable hitSlop={10} onPress={() => setHidden(!hidden)}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={{ color: C.red, fontSize: 13 }}>{error}</Text>
      ) : hint ? (
        <T v="tiny">{hint}</T>
      ) : null}
    </View>
  );
}

/** Tappable field that opens a searchable list of US states. */
export function StatePicker({ value, onChange, error }: { value: string; onChange: (code: string) => void; error?: string | null }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const name = US_STATES.find(([c]) => c === value)?.[1];
  const list = US_STATES.filter(([c, n]) => !q || n.toLowerCase().includes(q.toLowerCase()) || c.toLowerCase() === q.toLowerCase());
  return (
    <View style={{ gap: 6 }}>
      <T v="label">State you live in</T>
      <Pressable
        onPress={() => {
          tap();
          setOpen(true);
        }}
        style={[s.inputWrap, { paddingVertical: 14 }, error ? { borderColor: C.red } : null]}>
        <Text style={{ flex: 1, fontSize: 16, color: name ? C.ink : C.faint }}>{name || 'Choose your state'}</Text>
        <Ionicons name="chevron-down" size={18} color={C.muted} />
      </Pressable>
      {error ? <Text style={{ color: C.red, fontSize: 13 }}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 }}>
            <View style={[s.inputWrap, { flex: 1 }]}>
              <Ionicons name="search" size={17} color={C.faint} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search states" placeholderTextColor={C.faint} autoFocus style={s.input} />
            </View>
            <Pressable onPress={() => setOpen(false)} hitSlop={8}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: C.ink }}>Cancel</Text>
            </Pressable>
          </View>
          <FlatList
            data={list}
            keyExtractor={([c]) => c}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: [code, n] }) => (
              <Pressable
                onPress={() => {
                  tap();
                  onChange(code);
                  setOpen(false);
                  setQ('');
                }}
                style={({ pressed }) => [s.row, pressed && { backgroundColor: C.fill }]}>
                <Text style={{ flex: 1, fontSize: 16, color: C.ink }}>{n}</Text>
                {code === value ? <Ionicons name="checkmark" size={20} color={C.green} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 8 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden', marginRight: 8 },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.ink },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 10, backgroundColor: C.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 16, color: C.ink, paddingVertical: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
});
