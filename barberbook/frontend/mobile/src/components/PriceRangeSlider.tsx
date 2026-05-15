import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../design/ThemeProvider';
import { palette, shadow } from '../design/tokens';

import { Text } from './Text';

export interface PriceRangeSliderProps {
  /** Min absolute value (₹). */
  min: number;
  /** Max absolute value (₹). */
  max: number;
  /** Step granularity (₹). Defaults to 50. */
  step?: number;
  /** Current low end (₹). */
  low: number;
  /** Current high end (₹). */
  high: number;
  onChange: (low: number, high: number) => void;
  /** Visual format for the badges. Defaults to '₹{n}'. */
  formatValue?: (n: number) => string;
}

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 28;

/**
 * Dual-thumb price-range slider. Track is laid out at full container width;
 * each thumb's `translateX` is driven by a `useSharedValue` updated on
 * pan. We clamp on the worklet thread so dragging stays buttery; JS gets
 * the final value via `runOnJS(onChange)` after the gesture settles.
 *
 * Why custom rather than a community lib: most react-native sliders ship
 * a single thumb or rely on the deprecated PanResponder. This one uses
 * the modern Gesture API + Reanimated 4 worklets and weighs <100 lines.
 */
export function PriceRangeSlider({
  min,
  max,
  step = 50,
  low,
  high,
  onChange,
  formatValue = (n) => `₹${n}`,
}: PriceRangeSliderProps) {
  const { theme } = useTheme();
  const trackWidth = useSharedValue(0);

  const xLow = useSharedValue(0);
  const xHigh = useSharedValue(0);

  // Initial position whenever the bounds or values change externally.
  useEffect(() => {
    if (trackWidth.value <= 0) return;
    xLow.value = withTiming(toX(low, min, max, trackWidth.value), { duration: 220 });
    xHigh.value = withTiming(toX(high, min, max, trackWidth.value), { duration: 220 });
  }, [high, low, max, min, trackWidth.value, xHigh, xLow]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      trackWidth.value = e.nativeEvent.layout.width;
      xLow.value = toX(low, min, max, e.nativeEvent.layout.width);
      xHigh.value = toX(high, min, max, e.nativeEvent.layout.width);
    },
    [high, low, max, min, trackWidth, xHigh, xLow],
  );

  const commit = useCallback(
    (xLowVal: number, xHighVal: number) => {
      const w = trackWidth.value;
      if (w <= 0) return;
      const lo = snap(toValue(xLowVal, min, max, w), step, min, max);
      const hi = snap(toValue(xHighVal, min, max, w), step, min, max);
      onChange(Math.min(lo, hi), Math.max(lo, hi));
    },
    [max, min, onChange, step, trackWidth.value],
  );

  const lowGesture = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          xLow.value = clamp(xLow.value + e.changeX, 0, xHigh.value);
          // Clamp re-emit so the badge tracks live.
          runOnJS(commit)(xLow.value, xHigh.value);
        })
        .onEnd(() => {
          // Snap the visual to the stepped value.
          const w = trackWidth.value;
          const v = snap(toValue(xLow.value, min, max, w), step, min, max);
          xLow.value = withTiming(toX(v, min, max, w), { duration: 120 });
        }),
    [commit, max, min, step, trackWidth.value, xHigh.value, xLow],
  );

  const highGesture = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          const w = trackWidth.value;
          xHigh.value = clamp(xHigh.value + e.changeX, xLow.value, w);
          runOnJS(commit)(xLow.value, xHigh.value);
        })
        .onEnd(() => {
          const w = trackWidth.value;
          const v = snap(toValue(xHigh.value, min, max, w), step, min, max);
          xHigh.value = withTiming(toX(v, min, max, w), { duration: 120 });
        }),
    [commit, max, min, step, trackWidth.value, xHigh, xLow.value],
  );

  const filledStyle = useAnimatedStyle(() => ({
    left: xLow.value,
    width: Math.max(0, xHigh.value - xLow.value),
  }));
  const lowThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xLow.value - THUMB_SIZE / 2 }],
  }));
  const highThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xHigh.value - THUMB_SIZE / 2 }],
  }));

  return (
    <View>
      <View style={styles.badgeRow}>
        <Text variant="labelSm" color={theme.muted}>
          {formatValue(low)}
        </Text>
        <Text variant="labelSm" color={theme.muted}>
          {formatValue(high)}
        </Text>
      </View>

      <View style={styles.trackHost} onLayout={onLayout}>
        <View style={[styles.track, { backgroundColor: theme.lineStrong }]} />
        <Animated.View style={[styles.trackFill, filledStyle]} />

        <GestureDetector gesture={lowGesture}>
          <Animated.View style={[styles.thumb, lowThumbStyle, shadow.sm]}>
            <View style={styles.thumbInner} />
          </Animated.View>
        </GestureDetector>

        <GestureDetector gesture={highGesture}>
          <Animated.View style={[styles.thumb, highThumbStyle, shadow.sm]}>
            <View style={styles.thumbInner} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

function toX(value: number, min: number, max: number, width: number): number {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * width;
}

function toValue(x: number, min: number, max: number, width: number): number {
  if (width <= 0) return min;
  return min + (x / width) * (max - min);
}

function snap(v: number, step: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, v));
  const stepped = Math.round((clamped - min) / step) * step + min;
  return Math.max(min, Math.min(max, stepped));
}

function clamp(n: number, lo: number, hi: number): number {
  'worklet';
  return Math.max(lo, Math.min(hi, n));
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  trackHost: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  trackFill: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: palette.red,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: palette.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.ink,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.red,
  },
});
