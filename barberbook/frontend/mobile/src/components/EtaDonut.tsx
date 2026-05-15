import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { palette } from '../design/tokens';

import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface EtaDonutProps {
  /** Current minutes remaining. */
  minutesLeft: number;
  /** When the queue was joined, in minutes-of-wait. Drives the unfilled portion. */
  totalMinutes: number;
  size?: number;
  strokeWidth?: number;
  /** Override the donut color. Defaults to brand red. */
  color?: string;
  /** Background ring color. */
  trackColor?: string;
}

/**
 * Donut progress ring used on the Walkin screen. The ring fills clockwise
 * from 12 o'clock as the queue moves; the center shows the live minute
 * count. Animation is opt-in via Reanimated worklet on the SVG dashoffset.
 *
 * Why SVG + worklet rather than a layout-based ring: a Reanimated layout
 * ring needs N children with separate transforms; a single Circle with an
 * animated `strokeDashoffset` is one paint op, which is what we want when
 * the value is updating once per second.
 */
export function EtaDonut({
  minutesLeft,
  totalMinutes,
  size = 188,
  strokeWidth = 14,
  color = palette.red,
  trackColor = 'rgba(255,255,255,0.12)',
}: EtaDonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(1, totalMinutes);
  const fraction = Math.max(0, Math.min(1, 1 - minutesLeft / safeTotal));

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(fraction, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [fraction, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Rotate the ring so the start of the stroke is at 12 o'clock.
          originX={size / 2}
          originY={size / 2}
          rotation={-90}
        />
      </Svg>
      <View style={styles.center}>
        <Text variant="display" color={palette.cream}>
          {Math.max(0, Math.round(minutesLeft))}
        </Text>
        <Text variant="labelSm" color={palette.gold}>
          MIN LEFT
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
});
