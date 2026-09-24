import React from 'react';
import Svg, { Path } from 'react-native-svg';
const paths = {
  home: 'M3 10 12 3 21 10M5 9v12h5v-7h4v7h5V9',
  modules: 'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16',
  scan: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M7 7h3v3H7ZM14 7h3v3h-3ZM7 14h3v3H7ZM14 14h3v3h-3Z',
  history: 'M3 12a9 9 0 1 0 3-7L3 8M3 3v5h5M12 7v5l3 2',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 5 0 0 1 16 0v2',
  chart: 'M4 3v18h17M8 17v-5M13 17V8M18 17V5',
  add: 'M12 4v16M4 12h16',
  report: 'M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8M8 16h8',
};
export function AppIcon({ name, color, size = 22 }: { name: keyof typeof paths; color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden><Path d={paths[name]} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
