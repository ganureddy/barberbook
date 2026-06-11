import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { Button, Text } from '../../components';
import { palette, radii, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import type { OnboardingStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Splash'>;

const POLE_STRIPE_HEIGHT = 320;
const POLE_STRIPE_CYCLE = 56;

/**
 * Brand splash with the canvas's diagonal pole stripes climbing in the
 * top-right corner. The wordmark fades in with a slight stagger; the
 * Anton condensed face does the heavy visual lift. The CTA pulses every
 * few seconds to draw the eye downward.
 */
export function Splash() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();

  const stripeOffset = useSharedValue(0);
  const wordmark1 = useSharedValue(0);
  const wordmark2 = useSharedValue(0);
  const tagline = useSharedValue(0);
  const ctaPulse = useSharedValue(1);
  const ctaIn = useSharedValue(0);

  useEffect(() => {
    stripeOffset.value = withRepeat(
      withTiming(-POLE_STRIPE_CYCLE * 4, { duration: 4200, easing: Easing.linear }),
      -1,
      false,
    );
    wordmark1.value = withDelay(
      120,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    wordmark2.value = withDelay(
      280,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    tagline.value = withDelay(620, withTiming(1, { duration: 480 }));
    ctaIn.value = withDelay(900, withTiming(1, { duration: 360 }));
    ctaPulse.value = withDelay(
      1600,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
  }, [ctaIn, ctaPulse, stripeOffset, tagline, wordmark1, wordmark2]);

  const stripeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stripeOffset.value }, { rotate: '28deg' }],
  }));
  const wordmark1Style = useAnimatedStyle(() => ({
    opacity: wordmark1.value,
    transform: [{ translateY: (1 - wordmark1.value) * 24 }],
  }));
  const wordmark2Style = useAnimatedStyle(() => ({
    opacity: wordmark2.value,
    transform: [{ translateY: (1 - wordmark2.value) * 24 }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: tagline.value }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaIn.value,
    transform: [{ scale: ctaPulse.value }, { translateY: (1 - ctaIn.value) * 16 }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Animated barber-pole stripes pinned to the top-right. */}
      <View style={styles.stripeMask} pointerEvents="none">
        <Animated.View style={[styles.stripeAnim, stripeStyle]}>
          <Svg width={POLE_STRIPE_HEIGHT} height={POLE_STRIPE_HEIGHT * 2}>
            <Defs>
              <Pattern
                id="poleStripes"
                patternUnits="userSpaceOnUse"
                width={POLE_STRIPE_HEIGHT}
                height={POLE_STRIPE_CYCLE}
              >
                <Rect x={0} y={0} width={POLE_STRIPE_HEIGHT} height={14} fill={palette.red} />
                <Rect x={0} y={14} width={POLE_STRIPE_HEIGHT} height={14} fill={palette.cream} />
                <Rect x={0} y={28} width={POLE_STRIPE_HEIGHT} height={14} fill={palette.navy} />
                <Rect x={0} y={42} width={POLE_STRIPE_HEIGHT} height={14} fill={palette.cream} />
              </Pattern>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={POLE_STRIPE_HEIGHT}
              height={POLE_STRIPE_HEIGHT * 2}
              fill="url(#poleStripes)"
            />
          </Svg>
        </Animated.View>
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.body}>
          <Text variant="labelSm" color={palette.gold}>
            {t('splash.kicker')} · v0.1
          </Text>

          <Animated.View style={wordmark1Style}>
            <WordmarkLine text={t('splash.wordmark_line_1')} color={palette.cream} />
          </Animated.View>
          <Animated.View style={wordmark2Style}>
            <WordmarkLine text={t('splash.wordmark_line_2')} color={palette.red} />
          </Animated.View>

          <Animated.View style={[{ marginTop: spacing.lg }, taglineStyle]}>
            <Text variant="editorial" color={palette.gold}>
              {t('splash.tagline')}
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.ctaWrap, ctaStyle]}>
          <Button
            block
            size="lg"
            variant="red"
            label={t('splash.cta')}
            onPress={() => {
              nav.navigate('RoleSelect');
            }}
          />
          <Pressable
            onPress={() => {
              nav.navigate('RoleSelect');
            }}
            hitSlop={20}
            style={styles.skipLink}
          >
            <Text variant="caption" color={palette.gold}>
              {t('splash.loading')}
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/**
 * Anton-driven wordmark glyphs sized to the screen. Rendered as plain Text
 * so the system handles glyph caching; we keep the style local because the
 * Splash is the only screen that wants the 96pt scale.
 */
function WordmarkLine({ text, color }: { text: string; color: string }) {
  return (
    <Text
      variant="displayXl"
      color={color}
      style={{ fontFamily: fontFamilies.display, fontSize: 88, lineHeight: 84 }}
    >
      {text.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  safe: { flex: 1, paddingHorizontal: spacing['2xl'] },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  stripeMask: {
    position: 'absolute',
    top: -120,
    right: -160,
    width: POLE_STRIPE_HEIGHT,
    height: POLE_STRIPE_HEIGHT * 1.4,
    overflow: 'hidden',
    opacity: 0.92,
    borderRadius: radii.lg,
  },
  stripeAnim: {
    position: 'absolute',
    top: -POLE_STRIPE_HEIGHT,
    left: 0,
    width: POLE_STRIPE_HEIGHT,
    height: POLE_STRIPE_HEIGHT * 4,
  },
  ctaWrap: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  skipLink: {
    paddingVertical: spacing.xs,
  },
});
