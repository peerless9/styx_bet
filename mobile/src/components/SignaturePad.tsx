import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import { C } from '@/constants/theme';

/**
 * Finger-drawn signature. The value is an SVG path prefixed with "svg:" so it can be
 * stored in Firestore and drawn again anywhere.
 */
export function SignaturePad({
  value,
  onChange,
  placeholder = 'Sign here with your finger',
  height = 120,
  onDrawingChange,
}: {
  value: string;
  onChange: (sig: string) => void;
  placeholder?: string;
  height?: number;
  /** lets the parent pause scrolling while drawing */
  onDrawingChange?: (drawing: boolean) => void;
}) {
  const [d, setD] = useState(value.startsWith('svg:') ? value.slice(4) : '');
  const [strokes, setStrokes] = useState(0);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          onDrawingChange?.(true);
          setD((prev) => `${prev}M${e.x.toFixed(1)},${e.y.toFixed(1)} `);
        })
        .onUpdate((e) => setD((prev) => `${prev}L${e.x.toFixed(1)},${e.y.toFixed(1)} `))
        .onFinalize(() => {
          onDrawingChange?.(false);
          setStrokes((n) => n + 1);
        }),
    [onDrawingChange]
  );

  // Hand the finished signature to the parent after each stroke
  useEffect(() => {
    if (strokes > 0) onChange(d ? `svg:${d.trim()}` : '');
    // only when a stroke finishes, not on every point
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  const clear = () => {
    setD('');
    onChange('');
  };

  const hasLegacy = !!value && !value.startsWith('svg:'); // a signature saved from the web app

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: C.faint, fontWeight: '700', letterSpacing: 0.8 }}>DIGITAL SIGNATURE</Text>
        <Pressable onPress={clear} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="refresh" size={13} color={C.muted} />
          <Text style={{ fontSize: 12, color: C.muted, fontWeight: '600' }}>Clear</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
        <View style={[s.pad, { height }]}>
          <Svg width="100%" height="100%" pointerEvents="none">
            <Path d={d} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
          {!d ? (
            <View style={s.placeholder} pointerEvents="none">
              <Text style={{ color: C.faint, fontSize: 13 }}>{hasLegacy ? 'Signature on file — sign again to replace' : placeholder}</Text>
            </View>
          ) : null}
          <View style={s.line} pointerEvents="none" />
        </View>
      </GestureDetector>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed', overflow: 'hidden' },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', left: 20, right: 20, bottom: 26, height: 1, backgroundColor: C.line },
});
