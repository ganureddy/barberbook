import React from 'react';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { palette } from '../design/tokens';

export interface PortraitProps {
  /**
   * Stable seed (typically a user/barber id). Drives the palette and shape
   * variant so the same person always gets the same avatar.
   */
  seed: number | string;
  size?: number;
  /** Optional initials drawn over the silhouette. */
  initials?: string;
}

const PALETTES: [string, string][] = [
  [palette.red, palette.redDeep],
  [palette.navy, palette.navyDeep],
  [palette.gold, palette.goldSoft],
  [palette.ink, palette.charcoal],
  ['#3F6B5F', '#2A4A41'],
  ['#7A4E2D', '#5A3820'],
];

function hash(seed: number | string): number {
  if (typeof seed === 'number') return Math.abs(seed | 0);
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Geometric avatar placeholder. Renders a colored block (palette derived from
 * the seed) with a stylized head + shoulders silhouette. Cheap to render at
 * list-cell sizes and never network-dependent — important for the Discovery
 * list where dozens of barbers show at once.
 */
export function Portrait({ seed, size = 56, initials }: PortraitProps) {
  const h = hash(seed);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const variant = (h >> 3) % 3;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id={`bg-${h}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c1} />
          <Stop offset="1" stopColor={c2} />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="64" height="64" rx="12" fill={`url(#bg-${h})`} />

      {variant === 0 && (
        <>
          <Circle cx="32" cy="26" r="11" fill={palette.cream} opacity={0.92} />
          <Path d="M12 64 C 16 46, 48 46, 52 64 Z" fill={palette.cream} opacity={0.92} />
        </>
      )}
      {variant === 1 && (
        <>
          <Circle cx="32" cy="24" r="10" fill={palette.cream} opacity={0.92} />
          {/* Beard hint */}
          <Path
            d="M24 28 Q 32 38 40 28 Q 38 36 32 38 Q 26 36 24 28 Z"
            fill={palette.ink}
            opacity={0.35}
          />
          <Path d="M10 64 C 16 44, 48 44, 54 64 Z" fill={palette.cream} opacity={0.92} />
        </>
      )}
      {variant === 2 && (
        <>
          <Circle cx="32" cy="26" r="11" fill={palette.cream} opacity={0.92} />
          {/* Cap */}
          <Path d="M19 22 Q 32 6 45 22 L 45 24 L 19 24 Z" fill={palette.ink} opacity={0.55} />
          <Path d="M14 64 C 18 46, 46 46, 50 64 Z" fill={palette.cream} opacity={0.92} />
        </>
      )}

      {initials != null && initials.length > 0 && (
        <SvgText
          x="32"
          y="40"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill={palette.ink}
        >
          {initials.slice(0, 2).toUpperCase()}
        </SvgText>
      )}
    </Svg>
  );
}
