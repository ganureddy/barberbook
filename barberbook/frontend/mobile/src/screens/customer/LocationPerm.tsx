import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
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
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Button, Icon, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { toast } from '../../lib/toast';
import { useAuthStore } from '../../store/useAuthStore';
import { useLocationStore } from '../../store/useLocationStore';

/**
 * Explain-then-ask permission screen. The faux map is pure SVG (no
 * react-native-maps weight) so it renders crisply on Expo Go and never
 * hits the network. The pulsing pin draws the eye to the value of granting
 * the permission before we actually ask.
 */
export function LocationPerm() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const setPermission = useLocationStore((s) => s.setPermission);
  const setCoords = useLocationStore((s) => s.setCoords);
  const setDevRole = useAuthStore((s) => s.setDevRole);
  const status = useAuthStore((s) => s.status);

  const [requesting, setRequesting] = useState(false);

  // Probe current OS-level permission once on mount so users who already
  // granted aren't bounced through the explainer.
  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (p.granted) setPermission('granted');
        else if (p.status === 'denied') setPermission('denied');
      })
      .catch(() => {});
  }, [setPermission]);

  const handleAllow = async () => {
    Haptics.selectionAsync().catch(() => {});
    setRequesting(true);
    setPermission('prompting');
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      if (!res.granted) {
        setPermission('denied');
        toast.warn(t('location.denied_hint'));
        finishOnboarding();
        return;
      }
      setPermission('granted');
      try {
        const fix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({
          latitude: fix.coords.latitude,
          longitude: fix.coords.longitude,
          accuracy: fix.coords.accuracy ?? undefined,
        });
      } catch {
        // Ignore fix failure — we still have the fallback coords.
      }
      finishOnboarding();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not request permission';
      toast.error(msg);
      setPermission('denied');
    } finally {
      setRequesting(false);
    }
  };

  const handleLater = () => {
    Haptics.selectionAsync().catch(() => {});
    setPermission('denied');
    finishOnboarding();
  };

  const finishOnboarding = () => {
    // If the OTP path produced a real session, the root navigator already
    // sees `status === 'authenticated'` and will swap to Customer on next
    // render. The dev-skip pathways need an explicit setDevRole.
    if (status !== 'authenticated') setDevRole('Customer');
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar style="auto" />
      <View style={styles.body}>
        <View>
          <Text variant="labelSm" color={palette.red}>
            {t('location.kicker')}
          </Text>
          <Text variant="display" style={{ marginTop: spacing.xs }}>
            {t('location.title')}
          </Text>
          <Text variant="editorial" color={theme.muted} style={{ marginTop: spacing.sm }}>
            {t('location.subtitle')}
          </Text>
        </View>

        <FauxMap />

        <View style={{ flex: 1 }} />

        <View style={{ gap: spacing.sm }}>
          <Button
            block
            size="lg"
            variant="red"
            label={t('location.allow')}
            loading={requesting}
            disabled={requesting}
            leading={<Icon name="pin" size={18} color={palette.cream} />}
            onPress={() => {
              handleAllow().catch(() => {});
            }}
          />
          <Pressable
            onPress={handleLater}
            hitSlop={20}
            style={styles.laterBtn}
            accessibilityRole="button"
            accessibilityLabel={t('location.later')}
          >
            <Text variant="bodyBold" color={theme.muted}>
              {t('location.later')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * Pure-SVG mock of a city map block. Three abstracted "roads" cross a cream
 * surface, with three faint shop pins clustered near the active pin. The
 * active pin pulses outward via Reanimated, mimicking a fresh GPS fix.
 */
function FauxMap() {
  const pulse = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 8000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [drift, pulse]);

  const pulseOuter = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 0.6 + pulse.value * 1.6 }],
  }));
  const pulseMid = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - pulse.value),
    transform: [{ scale: 0.6 + pulse.value * 1.05 }],
  }));
  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 + drift.value * 8 }],
  }));

  return (
    <View style={styles.mapWrap}>
      <Animated.View style={[StyleSheet.absoluteFill, driftStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice">
          <Defs>
            <LinearGradient id="lp_bg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F0E9D5" />
              <Stop offset="1" stopColor={palette.creamDeep} />
            </LinearGradient>
          </Defs>
          {/* Background */}
          <Rect x="0" y="0" width="320" height="220" fill="url(#lp_bg)" />

          {/* Roads — long horizontals + a diagonal */}
          <G stroke="#FFFFFF" strokeWidth={14} strokeLinecap="round">
            <Path d="M-20 60 L 340 90" />
            <Path d="M-20 160 L 340 130" />
            <Path d="M40 -10 L 220 240" />
          </G>
          <G stroke={palette.gold} strokeOpacity={0.55} strokeWidth={1.2} strokeDasharray="4 6">
            <Path d="M-20 60 L 340 90" />
            <Path d="M-20 160 L 340 130" />
          </G>

          {/* Building blocks */}
          <G fill={palette.ink} opacity={0.06}>
            <Rect x="20" y="100" width="60" height="40" rx="4" />
            <Rect x="240" y="40" width="60" height="38" rx="4" />
            <Rect x="200" y="160" width="50" height="40" rx="4" />
            <Rect x="100" y="40" width="40" height="40" rx="4" />
          </G>

          {/* Faint shop pins */}
          <G fill={palette.red} opacity={0.45}>
            <Circle cx="64" cy="78" r="5" />
            <Circle cx="248" cy="170" r="5" />
            <Circle cx="206" cy="48" r="5" />
          </G>
        </Svg>
      </Animated.View>

      {/* Pulsing "you are here" pin sits dead center for visual focus. */}
      <View style={styles.pinAnchor} pointerEvents="none">
        <Animated.View style={[styles.pulseRing, pulseOuter]} />
        <Animated.View style={[styles.pulseRing, styles.pulseRingMid, pulseMid]} />
        <View style={[styles.pinDot, shadow.md]}>
          <Icon name="pin" size={20} color={palette.cream} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  mapWrap: {
    height: 240,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: palette.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadow.md as object),
  },
  pinAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.red,
  },
  pulseRingMid: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  pinDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.cream,
  },
  laterBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
