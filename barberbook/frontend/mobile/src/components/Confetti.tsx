import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '../design/tokens';

export interface ConfettiProps {
  /** Number of pieces. Default 32. Higher numbers cost a Reanimated worklet each. */
  count?: number;
  /** Total fall duration per piece (ms). Default 2200. */
  duration?: number;
  colors?: string[];
}

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

/**
 * Lightweight confetti for the BookingSuccess screen.
 *
 * Pure JS — each piece is a Reanimated-driven absolutely-positioned View
 * that drops + drifts + rotates from above the top edge to below the
 * bottom edge. Cheaper than spawning 32 SVGs and good enough to read as
 * "celebration" without crossing into "Times Square ticker tape".
 */
export function Confetti({
  count = 32,
  duration = 2200,
  colors = [palette.red, palette.gold, palette.cream, palette.navy, palette.goldSoft],
}: ConfettiProps) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      color: colors[i % colors.length],
      startX: Math.random() * SCREEN_W,
      drift: (Math.random() - 0.5) * 180,
      rotateFrom: Math.random() * 360,
      rotateTo: Math.random() * 720 + 360,
      delay: Math.floor(Math.random() * 400),
      width: 6 + Math.random() * 6,
      height: 10 + Math.random() * 10,
    }));
  }, [colors, count]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map(({ key, ...rest }) => (
        <Piece key={key} {...rest} duration={duration} />
      ))}
    </View>
  );
}

interface PieceProps {
  color: string;
  startX: number;
  drift: number;
  rotateFrom: number;
  rotateTo: number;
  delay: number;
  width: number;
  height: number;
  duration: number;
}

function Piece({
  color,
  startX,
  drift,
  rotateFrom,
  rotateTo,
  delay,
  width,
  height,
  duration,
}: PieceProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.linear }));
  }, [delay, duration, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -40 + t.value * (SCREEN_H + 80) },
      { translateX: t.value * drift },
      { rotate: `${rotateFrom + (rotateTo - rotateFrom) * t.value}deg` },
    ],
    opacity: t.value < 0.05 ? 0 : t.value > 0.95 ? 1 - (t.value - 0.95) / 0.05 : 1,
  }));

  return (
    <Animated.View
      style={[styles.piece, { backgroundColor: color, left: startX, width, height }, style]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    borderRadius: 1,
  },
});
