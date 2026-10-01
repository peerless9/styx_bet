import { Platform } from 'react-native';

/** Styx palette — matches the web app (neutral + emerald accent). */
export const C = {
  bg: '#F8FAFC',
  card: '#FFFFFF',
  ink: '#0A0A0A',
  text: '#171717',
  muted: '#737373',
  faint: '#A3A3A3',
  line: '#E5E5E5',
  lineSoft: '#F0F0F0',
  fill: '#F5F5F5',
  green: '#059669',
  greenDark: '#047857',
  greenBg: '#ECFDF5',
  greenLine: '#A7F3D0',
  red: '#DC2626',
  redBg: '#FEF2F2',
  redLine: '#FECACA',
  amber: '#B45309',
  amberBg: '#FFFBEB',
  amberLine: '#FDE68A',
} as const;

export const R = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

export const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

export const money = (n: number | undefined) => `$${(n || 0).toFixed(2)}`;
