import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { palette, radii } from '../design/tokens';

export interface BarberPoleProps {
  width?: number;
  height?: number;
  /**
   * Animate the stripes to climb upward (the classic barber-pole illusion).
   * Defaults to true; pass `false` for static decorative use.
   */
  animated?: boolean;
  /** Seconds for one full stripe cycle. Default 2.5s. */
  speed?: number;
  style?: ViewStyle;
}

const STRIPE = 12;
const STRIPE_CYCLE = STRIPE * 4;

/**
 * Vertical barber pole: red / white / navy / white repeating diagonal stripes
 * inside a rounded capsule, with cream caps top and bottom.
 *
 * Animation is implemented by translating the SVG inside its clipping
 * container — much cheaper than animating SVG attrs and works in Hermes.
 */
export function BarberPole({
  width = 36,
  height = 96,
  animated = true,
  speed = 2.5,
  style,
}: BarberPoleProps) {
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      offset.value = 0;
      return;
    }
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(-STRIPE_CYCLE, { duration: speed * 1000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(offset);
    };
  }, [animated, speed, offset]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  const capH = Math.max(6, Math.round(height * 0.07));
  const innerH = height - capH * 2;

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radii.pill,
          overflow: 'hidden',
          backgroundColor: palette.cream,
          alignItems: 'center',
        },
        styles.shell,
        style,
      ]}
    >
      {/* Top cap */}
      <View style={{ width, height: capH, backgroundColor: palette.charcoal }} />

      {/* Stripe column */}
      <View
        style={{
          width,
          height: innerH,
          overflow: 'hidden',
          backgroundColor: palette.cream,
        }}
      >
        <Animated.View style={[{ width, height: innerH + STRIPE_CYCLE * 2 }, animStyle]}>
          <Svg width={width} height={innerH + STRIPE_CYCLE * 2}>
            <Defs>
              <Pattern
                id="poleStripes"
                patternUnits="userSpaceOnUse"
                width={width}
                height={STRIPE_CYCLE}
                patternTransform="rotate(28)"
              >
                <Rect x="0" y={0} width={width * 2} height={STRIPE} fill={palette.red} />
                <Rect x="0" y={STRIPE} width={width * 2} height={STRIPE} fill={palette.white} />
                <Rect x="0" y={STRIPE * 2} width={width * 2} height={STRIPE} fill={palette.navy} />
                <Rect x="0" y={STRIPE * 3} width={width * 2} height={STRIPE} fill={palette.white} />
              </Pattern>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={width}
              height={innerH + STRIPE_CYCLE * 2}
              fill="url(#poleStripes)"
            />
          </Svg>
        </Animated.View>
      </View>

      {/* Bottom cap */}
      <View style={{ width, height: capH, backgroundColor: palette.charcoal }} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(0,0,0,0.15)',
  },
});
