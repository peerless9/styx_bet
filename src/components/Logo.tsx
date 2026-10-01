import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { C } from '@/constants/theme';

/** Charon's oar — the same path as the app icon (100×100 units). */
export const OAR_PATH =
  'M 46.75 85 L 46.75 46 Q 46.75 40.5 42.5 34 L 42.5 19.5 A 7.5 7.5 0 0 1 57.5 19.5 L 57.5 34 Q 53.25 40.5 53.25 46 L 53.25 85 A 3.25 3.25 0 0 1 46.75 85 Z';

/** Black tile with the white oar. Matches the app icon. */
export function Logo({ size = 34, radius }: { size?: number; radius?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size * 0.28, backgroundColor: C.ink, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={OAR_PATH} fill="#fff" />
      </Svg>
    </View>
  );
}
