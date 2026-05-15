import React from 'react';
import Svg, { Circle, G, Line, Path, Polyline, Rect, type SvgProps } from 'react-native-svg';

import { useTheme } from '../design/ThemeProvider';

/**
 * Hand-rolled line-icon set for BarberBook. We deliberately avoid third-party
 * icon libraries so:
 *   1. Icon style stays consistent with the canvas (1.75 stroke, rounded,
 *      no fills except for the brand-specific glyphs).
 *   2. Bundle size stays small — only the icons we draw ship.
 *
 * All icons render in a 24x24 viewBox. Stroke color defaults to the active
 * theme's `text`. Override with `color`.
 *
 * To add a new icon: add a key to ICONS and a paint function returning the
 * raw <G> contents at 24x24. Icon names should be domain-relevant (`scissors`)
 * not visual (`x-shape`).
 */

export type IconName =
  | 'scissors'
  | 'razor'
  | 'comb'
  | 'pole'
  | 'pin'
  | 'clock'
  | 'calendar'
  | 'qr'
  | 'trophy'
  | 'star'
  | 'heart'
  | 'bell'
  | 'search'
  | 'filter'
  | 'rupee'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'check'
  | 'close'
  | 'menu'
  | 'plus';

export interface IconProps extends Omit<SvgProps, 'children'> {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color, strokeWidth = 1.75, ...rest }: IconProps) {
  const { theme } = useTheme();
  const stroke = color ?? theme.text;
  const Glyph = ICONS[name];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <G stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Glyph color={stroke} strokeWidth={strokeWidth} />
      </G>
    </Svg>
  );
}

interface GlyphProps {
  color: string;
  strokeWidth: number;
}

// Each glyph is rendered inside a stroked <G>, so most paths inherit. Glyphs
// that need fills (like the QR cells) opt-in explicitly.

const ICONS: Record<IconName, React.FC<GlyphProps>> = {
  scissors: () => (
    <>
      <Circle cx="6" cy="6" r="2.5" />
      <Circle cx="6" cy="18" r="2.5" />
      <Line x1="20" y1="4" x2="8.5" y2="14" />
      <Line x1="20" y1="20" x2="8.5" y2="10" />
      <Line x1="14" y1="12" x2="11" y2="12" />
    </>
  ),

  razor: () => (
    <>
      {/* Handle */}
      <Path d="M14 3l7 7-3 3-7-7z" />
      {/* Blade */}
      <Path d="M11 6L4 13l3 3 7-7" />
      {/* Edge */}
      <Line x1="5.5" y1="11.5" x2="8.5" y2="14.5" />
    </>
  ),

  comb: () => (
    <>
      <Rect x="3" y="9" width="18" height="4" rx="1" />
      <Line x1="6" y1="13" x2="6" y2="20" />
      <Line x1="9" y1="13" x2="9" y2="19" />
      <Line x1="12" y1="13" x2="12" y2="20" />
      <Line x1="15" y1="13" x2="15" y2="19" />
      <Line x1="18" y1="13" x2="18" y2="20" />
    </>
  ),

  pole: () => (
    <>
      <Rect x="8" y="3" width="8" height="18" rx="3" />
      {/* Diagonal stripes implied via two slashes */}
      <Line x1="9" y1="8" x2="15" y2="6" />
      <Line x1="9" y1="13" x2="15" y2="11" />
      <Line x1="9" y1="18" x2="15" y2="16" />
    </>
  ),

  pin: () => (
    <>
      <Path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" />
      <Circle cx="12" cy="9.5" r="2.5" />
    </>
  ),

  clock: () => (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Polyline points="12,7 12,12 16,14" />
    </>
  ),

  calendar: () => (
    <>
      <Rect x="3.5" y="5" width="17" height="15" rx="2" />
      <Line x1="3.5" y1="10" x2="20.5" y2="10" />
      <Line x1="8" y1="3" x2="8" y2="7" />
      <Line x1="16" y1="3" x2="16" y2="7" />
    </>
  ),

  qr: ({ color }) => (
    <>
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
      <Rect x="6" y="6" width="1" height="1" fill={color} stroke="none" />
      <Rect x="17" y="6" width="1" height="1" fill={color} stroke="none" />
      <Rect x="6" y="17" width="1" height="1" fill={color} stroke="none" />
      <Line x1="14" y1="14" x2="14" y2="17" />
      <Line x1="17" y1="14" x2="17" y2="14" />
      <Line x1="20" y1="14" x2="20" y2="17" />
      <Line x1="14" y1="20" x2="17" y2="20" />
      <Line x1="20" y1="20" x2="20" y2="20" />
    </>
  ),

  trophy: () => (
    <>
      <Path d="M8 4h8v6a4 4 0 01-8 0V4z" />
      <Path d="M8 6H5a3 3 0 003 3" />
      <Path d="M16 6h3a3 3 0 01-3 3" />
      <Line x1="12" y1="14" x2="12" y2="17" />
      <Path d="M9 20h6l-1-3h-4l-1 3z" />
    </>
  ),

  star: () => (
    <Path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z" />
  ),

  heart: () => <Path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" />,

  bell: () => (
    <>
      <Path d="M6 16h12l-1.5-2V11a4.5 4.5 0 10-9 0v3L6 16z" />
      <Path d="M10 19a2 2 0 004 0" />
    </>
  ),

  search: () => (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Line x1="20" y1="20" x2="16" y2="16" />
    </>
  ),

  filter: () => (
    <>
      <Line x1="4" y1="6" x2="20" y2="6" />
      <Line x1="7" y1="12" x2="17" y2="12" />
      <Line x1="10" y1="18" x2="14" y2="18" />
    </>
  ),

  rupee: () => (
    <>
      <Line x1="6" y1="5" x2="18" y2="5" />
      <Line x1="6" y1="9" x2="18" y2="9" />
      <Path d="M8 5c4 0 7 1 7 4s-3 4-7 4" />
      <Path d="M8 9l8 11" />
    </>
  ),

  chevronRight: () => <Polyline points="9,5 16,12 9,19" />,
  chevronLeft: () => <Polyline points="15,5 8,12 15,19" />,
  chevronDown: () => <Polyline points="5,9 12,16 19,9" />,

  check: () => <Polyline points="4,12 10,18 20,6" />,

  close: () => (
    <>
      <Line x1="5" y1="5" x2="19" y2="19" />
      <Line x1="19" y1="5" x2="5" y2="19" />
    </>
  ),

  menu: () => (
    <>
      <Line x1="4" y1="7" x2="20" y2="7" />
      <Line x1="4" y1="12" x2="20" y2="12" />
      <Line x1="4" y1="17" x2="20" y2="17" />
    </>
  ),

  plus: () => (
    <>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
};

export const ICON_NAMES = Object.keys(ICONS) as readonly IconName[];
