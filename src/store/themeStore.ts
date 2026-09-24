import { create } from 'zustand';
import { useColorScheme } from 'react-native';
import { Colors as LightColors } from '../constants/colors';
import { Storage } from '../utils/storage.utils';
export type ThemeColors = typeof LightColors;
type Mode = 'system' | 'light' | 'dark';
const DarkColors: ThemeColors = {
  ...LightColors, primary: '#93B4FF', primaryLight: '#B7CDFF', primaryDark: '#172554', accent: '#B6ADFF',
  background: '#0B1220', surface: '#142033', card: '#142033', border: '#334155', divider: '#475569',
  textPrimary: '#F1F5F9', textSecondary: '#CBD5E1', textMuted: '#A8B8CE',
  present: '#6EE7B7', presentBg: '#064E3B', absent: '#FCA5A5', absentBg: '#641D25',
  late: '#FDE68A', lateBg: '#593B0D', excused: '#7DD3FC', excusedBg: '#0C4A6E',
  error: '#B91C1C', success: '#047857', warning: '#92400E',
};
export const useThemeStore = create<{ mode: Mode; setMode: (mode: Mode) => void; initialize: () => Promise<void> }>(set => ({
  mode: 'system',
  setMode: mode => { set({ mode }); void Storage.setItem('theme', mode); },
  initialize: async () => { const mode = await Storage.getItem('theme'); if (mode === 'system' || mode === 'light' || mode === 'dark') set({ mode }); },
}));
export function useTheme() {
  const system = useColorScheme();
  const mode = useThemeStore(s => s.mode);
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return { Colors: dark ? DarkColors : LightColors, dark };
}
