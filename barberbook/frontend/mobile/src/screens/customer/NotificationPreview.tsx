import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Icon, Text } from '../../components';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { presentLocalPreview } from '../../lib/push';
import { toast } from '../../lib/toast';
import type { MeStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MeStackParamList, 'NotificationPreview'>;

/**
 * In-app demo of what BarberBook's lock-screen notification looks like.
 * Useful as a reference for designers and as a button users can press if
 * they want to verify their device has notifications enabled (the "send
 * me one" CTA fires a real local notification 1s in the future).
 */
export function NotificationPreview() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();

  const slideIn = useSharedValue(0);
  useEffect(() => {
    slideIn.value = withDelay(
      120,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
  }, [slideIn]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - slideIn.value) * 24 }],
    opacity: slideIn.value,
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Faux lock-screen background — gradient ink to charcoal so the
          floating notification card pops in the canvas style. */}
      <View style={styles.bg}>
        <View style={styles.bgScrim} />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              nav.goBack();
            }}
            hitSlop={20}
            style={styles.iconBtn}
            accessibilityLabel={t('common.back')}
          >
            <Icon name="chevronLeft" size={20} color={palette.cream} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="labelSm" color={palette.gold}>
              {t('notifications.preview_title').toUpperCase()}
            </Text>
            <Text variant="bodyBold" color={palette.cream}>
              {t('notifications.preview_subtitle')}
            </Text>
          </View>
        </View>

        {/* Faux clock + date — "lock-screen vibe". */}
        <View style={styles.clockBlock}>
          <Text style={styles.clockGlyph}>11:42</Text>
          <Text variant="editorial" color={palette.cream}>
            Saturday, 10 May
          </Text>
        </View>

        <Animated.View style={[styles.notifWrap, cardStyle]}>
          <Card padded style={[styles.notifCard, shadow.lg]}>
            <View style={styles.notifHeader}>
              <View style={styles.appIcon}>
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.appIconImg}
                  resizeMode="contain"
                />
              </View>
              <Text variant="labelSm" color={palette.muted}>
                BARBERBOOK
              </Text>
              <Text variant="caption" color={palette.muted}>
                · now
              </Text>
            </View>
            <Text variant="bodyBold" style={{ marginTop: spacing.xs }}>
              The chair is ready
            </Text>
            <Text variant="body" color={palette.muted} numberOfLines={2}>
              Imran K. is calling token 07 at Raj's Classic Cuts.
            </Text>
          </Card>

          {/* Stack-effect: a faded copy under the main card to suggest more. */}
          <View style={styles.notifGhost} />
        </Animated.View>

        <View style={{ flex: 1 }} />

        <View style={styles.footer}>
          <Button
            block
            size="lg"
            variant="red"
            label="Send me one in 1s"
            leading={<Icon name="bell" size={16} color={palette.cream} />}
            onPress={() => {
              presentLocalPreview()
                .then(() =>
                  toast.info(
                    'Lock the device or background the app to see it on the lock screen.',
                    'Sent',
                  ),
                )
                .catch((err: unknown) => {
                  toast.error(
                    err instanceof Error ? err.message : 'Could not schedule a local notification',
                  );
                });
            }}
          />
          <Button
            block
            size="md"
            variant="ghost"
            label={t('common.back')}
            onPress={() => {
              nav.goBack();
            }}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#101015' },
  bgScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(212,50,44,0.08)' },
  safe: { flex: 1, paddingHorizontal: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockBlock: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    gap: spacing.xs,
  },
  clockGlyph: {
    color: palette.cream,
    fontSize: 84,
    fontWeight: '300',
    letterSpacing: -2,
  },
  notifWrap: {
    marginTop: spacing['2xl'],
  },
  notifCard: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  appIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconImg: { width: 22, height: 22 },
  notifGhost: {
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.lg,
    marginTop: -16,
    marginHorizontal: spacing.md,
    transform: [{ scaleY: 0.85 }],
    opacity: 0.55,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
