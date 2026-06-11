import React from 'react';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { palette, radii } from '../design/tokens';

export interface ShopPhotoProps {
  /** Storefront variant (0..3). Used as a stable visual seed. */
  variant?: number;
  width?: number;
  height?: number;
  /** Optional shop name rendered into the signage band. */
  name?: string;
  radius?: number;
}

const VARIANTS: { wall: string; awning: string; door: string; sign: string }[] = [
  { wall: '#EFE6D4', awning: palette.red, door: palette.charcoal, sign: palette.ink },
  { wall: '#E6DFC8', awning: palette.navy, door: palette.redDeep, sign: palette.ink },
  { wall: '#F0E2C0', awning: palette.ink, door: palette.gold, sign: palette.charcoal },
  { wall: '#DCD3BF', awning: palette.gold, door: palette.navyDeep, sign: palette.ink },
];

/**
 * Flat-illustrated storefront tile. Used as the listing-card thumbnail in
 * Discovery and the hero band on Shop Detail. SVG-only, no raster — so it
 * scales crisply on any density and ships zero KB of asset weight.
 */
export function ShopPhoto({
  variant = 0,
  width = 96,
  height = 96,
  name,
  radius = radii.md,
}: ShopPhotoProps) {
  const v = VARIANTS[variant % VARIANTS.length];
  const stripeW = width / 9;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F5F1E8" />
          <Stop offset="1" stopColor={v.wall} />
        </LinearGradient>
      </Defs>

      {/* Background wall */}
      <Rect x="0" y="0" width={width} height={height} rx={radius} fill={`url(#sky-${variant})`} />

      {/* Sidewalk */}
      <Rect
        x="0"
        y={height * 0.85}
        width={width}
        height={height * 0.15}
        fill={palette.charcoal}
        opacity={0.85}
      />

      {/* Awning stripes */}
      <G>
        {Array.from({ length: 9 }).map((_, i) => (
          <Rect
            key={i}
            x={i * stripeW}
            y={height * 0.18}
            width={stripeW}
            height={height * 0.12}
            fill={i % 2 === 0 ? v.awning : palette.cream}
          />
        ))}
        {/* Awning lower edge */}
        <Path
          d={`M0 ${height * 0.3} L${width} ${height * 0.3} L${width - 6} ${height * 0.34} L6 ${height * 0.34} Z`}
          fill={v.awning}
          opacity={0.85}
        />
      </G>

      {/* Sign band */}
      <Rect
        x={width * 0.1}
        y={height * 0.36}
        width={width * 0.8}
        height={height * 0.12}
        fill={v.sign}
      />
      {name != null && name.length > 0 && (
        <SvgText
          x={width / 2}
          y={height * 0.45}
          textAnchor="middle"
          fontSize={Math.max(8, width * 0.08)}
          fontWeight="800"
          fill={palette.cream}
        >
          {name}
        </SvgText>
      )}

      {/* Window */}
      <Rect
        x={width * 0.12}
        y={height * 0.52}
        width={width * 0.34}
        height={height * 0.3}
        fill="#A8C5D1"
        opacity={0.55}
      />
      <Rect
        x={width * 0.12}
        y={height * 0.52}
        width={width * 0.34}
        height={height * 0.3}
        fill="none"
        stroke={palette.ink}
        strokeWidth={1.2}
      />

      {/* Door */}
      <Rect
        x={width * 0.55}
        y={height * 0.52}
        width={width * 0.32}
        height={height * 0.33}
        fill={v.door}
      />
      <Rect x={width * 0.83} y={height * 0.68} width={2.5} height={4} fill={palette.gold} />

      {/* Pole accent (right edge) */}
      <Rect
        x={width - width * 0.075}
        y={height * 0.5}
        width={width * 0.05}
        height={height * 0.34}
        rx={width * 0.025}
        fill={palette.red}
      />
    </Svg>
  );
}
