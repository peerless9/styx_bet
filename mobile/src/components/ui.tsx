import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, R } from '@/constants/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const tap = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
};
export const success = () => {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/* ---------- Layout ---------- */

/** Scrollable tab screen with safe-area top padding; native tab bar insets handled by iOS. */
export function Screen({
  children,
  header,
  contentStyle,
  ...rest
}: ScrollViewProps & { header?: React.ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {header ? <View style={{ paddingTop: insets.top, backgroundColor: C.card }}>{header}</View> : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[
          { padding: 16, gap: 16, paddingBottom: 40, paddingTop: header ? 16 : insets.top + 8 },
          contentStyle,
        ]}
        {...rest}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Scroll content for a modal sheet, with a title row and close button. */
export function Sheet({
  title,
  subtitle,
  onClose,
  right,
  children,
  scrollEnabled = true,
}: {
  scrollEnabled?: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.sheetHeader}>
        <View style={{ flex: 1 }}>
          <T v="h3">{title}</T>
          {subtitle ? <T v="small" style={{ marginTop: 2 }}>{subtitle}</T> : null}
        </View>
        {right}
        <IconButton icon="close" onPress={onClose} />
      </View>
      <ScrollView
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}>
        {children}
      </ScrollView>
    </View>
  );
}

export function Row({ style, children, gap = 8 }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Card({ style, children, onPress, highlight }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; onPress?: () => void; highlight?: boolean }) {
  const body = [s.card, highlight && { borderColor: C.green, borderWidth: 1.5 }, style];
  if (!onPress) return <View style={body}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [body, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line }} />;

/* ---------- Text ---------- */

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bodyBold' | 'small' | 'label' | 'tiny' | 'money';
const textStyles: Record<Variant, TextStyle> = {
  h1: { fontSize: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.6 },
  h2: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.2 },
  body: { fontSize: 15, color: C.text, lineHeight: 21 },
  bodyBold: { fontSize: 15, color: C.ink, fontWeight: '700', lineHeight: 21 },
  small: { fontSize: 13, color: C.muted, lineHeight: 18 },
  label: { fontSize: 11, color: C.faint, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  tiny: { fontSize: 11, color: C.muted },
  money: { fontSize: 22, color: C.ink, fontWeight: '900', fontVariant: ['tabular-nums'] },
};

export function T({ v = 'body', style, children, ...rest }: React.ComponentProps<typeof Text> & { v?: Variant }) {
  return (
    <Text style={[textStyles[v], style]} {...rest}>
      {children}
    </Text>
  );
}

/* ---------- Buttons ---------- */

type BtnKind = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  kind?: BtnKind;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const palette: Record<BtnKind, { bg: string; fg: string; border: string }> = {
    primary: { bg: C.ink, fg: '#fff', border: C.ink },
    secondary: { bg: C.card, fg: C.text, border: C.line },
    danger: { bg: C.card, fg: C.red, border: C.redLine },
    success: { bg: C.green, fg: '#fff', border: C.green },
    ghost: { bg: 'transparent', fg: C.text, border: 'transparent' },
  };
  const p = palette[kind];
  const off = disabled || loading;
  return (
    <Pressable
      disabled={off}
      onPress={() => {
        tap(kind === 'primary' || kind === 'success' ? Haptics.ImpactFeedbackStyle.Medium : undefined);
        onPress();
      }}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: p.bg, borderColor: p.border },
        off && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 18} color={p.fg} /> : null}
          <Text style={{ color: p.fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color = C.text }: { icon: IconName; onPress: () => void; color?: string }) {
  return (
    <Pressable
      hitSlop={8}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

/* ---------- Pills / chips ---------- */

type Tone = 'neutral' | 'green' | 'red' | 'amber' | 'dark';
const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: C.fill, fg: '#525252', border: C.line },
  green: { bg: C.greenBg, fg: C.greenDark, border: C.greenLine },
  red: { bg: C.redBg, fg: C.red, border: C.redLine },
  amber: { bg: C.amberBg, fg: C.amber, border: C.amberLine },
  dark: { bg: C.ink, fg: '#fff', border: C.ink },
};

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = tones[tone];
  return (
    <View style={[s.pill, { backgroundColor: t.bg, borderColor: t.border }]}>
      {icon ? <Ionicons name={icon} size={11} color={t.fg} /> : null}
      <Text style={{ color: t.fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        s.chip,
        selected ? { backgroundColor: C.ink, borderColor: C.ink } : { backgroundColor: C.card, borderColor: C.line },
        pressed && { opacity: 0.75 },
      ]}>
      {icon ? <Ionicons name={icon} size={14} color={selected ? '#fff' : C.muted} /> : null}
      <Text style={{ color: selected ? '#fff' : '#404040', fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

/** Horizontal chip picker — replaces <select> for sides/options. */
export function ChoiceRow<T extends string>({ options, value, onChange, labels }: { options: T[]; value: T; onChange: (v: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => (
        <Chip key={o} label={labels?.[o] ?? o} selected={o === value} onPress={() => onChange(o)} />
      ))}
    </ScrollView>
  );
}

export function Segmented<T extends string>({ items, value, onChange }: { items: { id: T; label: string; badge?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.segment}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable
            key={it.id}
            onPress={() => {
              tap();
              onChange(it.id);
            }}
            style={[s.segmentItem, on && s.segmentOn]}>
            <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: on ? '700' : '500', color: on ? C.ink : C.muted }}>
              {it.label}
            </Text>
            {it.badge ? (
              <View style={s.badge}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{it.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Inputs ---------- */

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6, flex: (style as ViewStyle)?.flex }}>
      {label ? <T v="label">{label}</T> : null}
      <TextInput placeholderTextColor={C.faint} style={[s.input, props.multiline && { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 }, style]} {...props} />
    </View>
  );
}

export function MoneyField({ label, value, onChange, flex }: { label?: string; value: number; onChange: (n: number) => void; flex?: number }) {
  return (
    <View style={{ gap: 6, flex }}>
      {label ? <T v="label">{label}</T> : null}
      <View style={[s.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
        <Text style={{ color: C.faint, fontWeight: '700', fontSize: 16 }}>$</Text>
        <TextInput
          keyboardType="number-pad"
          returnKeyType="done"
          value={value ? String(value) : ''}
          onChangeText={(t) => onChange(Math.max(0, parseInt(t.replace(/[^0-9]/g, ''), 10) || 0))}
          style={{ flex: 1, fontSize: 16, fontWeight: '700', color: C.ink, paddingVertical: 12, paddingLeft: 4 }}
          placeholder="0"
          placeholderTextColor={C.faint}
        />
      </View>
    </View>
  );
}

export function Check({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onToggle();
      }}
      style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={[s.checkbox, checked && { backgroundColor: C.ink, borderColor: C.ink }]}>
        {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <T v="small" style={{ flex: 1, color: '#404040' }}>
        {label}
      </T>
    </Pressable>
  );
}

/* ---------- Misc ---------- */

export function Avatar({ name, photo, size = 36, dark }: { name?: string; photo?: string; size?: number; dark?: boolean }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.fill }} contentFit="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: dark ? C.ink : C.fill, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: dark ? '#fff' : C.text, fontWeight: '800', fontSize: size * 0.4 }}>{(name || '?').charAt(0)}</Text>
    </View>
  );
}

export function Banner({ text, tone = 'red', action }: { text: string; tone?: Tone; action?: { label: string; onPress: () => void } }) {
  const t = tones[tone];
  return (
    <View style={[s.banner, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Ionicons name={tone === 'green' ? 'checkmark-circle' : 'alert-circle'} size={18} color={t.fg} />
      <Text style={{ flex: 1, color: t.fg, fontSize: 13, fontWeight: '600' }}>{text}</Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={6}>
          <Text style={{ color: t.fg, fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' }}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Empty({ icon, title, text, children }: { icon: IconName; title: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={[s.card, { alignItems: 'center', paddingVertical: 36, gap: 8 }]}>
      <Ionicons name={icon} size={30} color={C.faint} />
      <T v="h3">{title}</T>
      <T v="small" style={{ textAlign: 'center', maxWidth: 280 }}>
        {text}
      </T>
      {children}
    </View>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' }) {
  return (
    <View style={{ gap: 2 }}>
      <T v="label">{label}</T>
      <Text style={{ fontSize: 15, fontWeight: '800', color: tone === 'green' ? C.greenDark : C.ink }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: C.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: R.md,
    borderWidth: 1,
  },
  btnSmall: { minHeight: 38, paddingHorizontal: 12, borderRadius: R.sm },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.fill,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: R.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  segment: { flexDirection: 'row', backgroundColor: '#EDEDED', borderRadius: 12, padding: 3, gap: 2 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentOn: { backgroundColor: C.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  badge: { backgroundColor: C.green, borderRadius: 8, minWidth: 16, height: 16, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16, // 16+ avoids iOS zoom & reads well
    color: C.ink,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#A3A3A3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: R.md, borderWidth: 1 },
});

/** Yes/no confirmation that works on iPhone (native alert) and in the browser (window.confirm). */
export function confirmAction(title: string, message: string | undefined, actionLabel: string, onConfirm: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: actionLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
