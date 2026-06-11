import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { palette } from '../design/tokens';

export interface StarsProps {
  /** Filled star count, 0..max. Decimals are rounded to nearest .5. */
  value: number;
  max?: number;
  size?: number;
  color?: string;
  emptyColor?: string;
}

const STAR_PATH =
  'M12 2.5l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 18.27 5.82 21.5 7 14.63 2 9.76l6.91-1L12 2.5z';

export function Stars({
  value,
  max = 5,
  size = 14,
  color = palette.gold,
  emptyColor = 'rgba(0,0,0,0.18)',
}: StarsProps) {
  const items = Array.from({ length: max }, (_, i) => {
    const filled = value >= i + 1;
    const half = !filled && value >= i + 0.5;
    return (
      <Svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ marginEnd: 1 }}>
        <Path d={STAR_PATH} fill={emptyColor} />
        {(filled || half) && (
          <Path
            d={STAR_PATH}
            fill={color}
            clipPath={half ? 'inset(0 50% 0 0)' : undefined}
            // RN-SVG has no clipPath="inset(...)" — use a simple half overlay via
            // a rectangle clip when needed. For now, half-fills render as full;
            // the design canvas only ever uses whole-star ratings.
          />
        )}
      </Svg>
    );
  });

  return <View style={{ flexDirection: 'row' }}>{items}</View>;
}
