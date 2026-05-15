import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBooking } from '../../api/hooks';
import { Button, Card, Confetti, Icon, Text } from '../../components';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { formatMoney } from '../../lib/booking';
import { env } from '../../lib/env';
import type { DiscoverStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingSuccess'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingSuccess'>;

export function BookingSuccess() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const bookingId = (params as { bookingId?: string } | undefined)?.bookingId ?? null;
  const bookingQ = useBooking(bookingId);
  const booking = bookingQ.data;

  // Re-fire success haptic on mount.
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  // QR payload — a stable URL the shop's scanner will recognise. In live
  // mode this is the deep link to the booking detail; in mock mode we
  // still use the same shape so the QR renders properly.
  const qrValue = useMemo(() => {
    return `barberbook://booking/${bookingId ?? 'mock'}`;
  }, [bookingId]);

  // Pop-in animation for the QR card.
  const qrIn = useSharedValue(0);
  useEffect(() => {
    qrIn.value = withDelay(180, withSpring(1, { damping: 14, stiffness: 220 }));
  }, [qrIn]);
  const qrCardStyle = useAnimatedStyle(() => ({
    opacity: qrIn.value,
    transform: [{ scale: 0.9 + qrIn.value * 0.1 }],
  }));

  // Loyalty banner — slide-in from below.
  const loyaltyIn = useSharedValue(0);
  useEffect(() => {
    loyaltyIn.value = withDelay(
      420,
      withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }),
    );
  }, [loyaltyIn]);
  const loyaltyStyle = useAnimatedStyle(() => ({
    opacity: loyaltyIn.value,
    transform: [{ translateY: (1 - loyaltyIn.value) * 18 }],
  }));

  const onShare = async () => {
    if (!booking) return;
    Haptics.selectionAsync().catch(() => {});
    try {
      await Share.share({
        message: t('share.message', {
          shop: booking.shop,
          token: booking.token_code,
          when: booking.scheduled_at,
        }),
        title: t('share.subject', { shop: booking.shop }),
      });
    } catch {
      // User cancelled or share unavailable; nothing to do.
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.ink }]}>
      <StatusBar style="light" />
      <Confetti />

      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (nav.canGoBack()) nav.popToTop();
              else nav.navigate('DiscoveryList');
            }}
            hitSlop={20}
            style={styles.iconBtn}
            accessibilityLabel={t('common.done')}
          >
            <Icon name="close" size={20} color={palette.cream} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text variant="labelSm" color={palette.gold}>
            {t('booking.success_kicker')}
          </Text>
          <Text variant="display" color={palette.cream} style={{ marginTop: spacing.xs }}>
            {t('booking.success_title')}
          </Text>
          <Text variant="editorial" color={palette.gold} style={{ marginTop: spacing.sm }}>
            {booking?.scheduled_at?.replace('T', ' · ')}
          </Text>

          <Animated.View style={[styles.qrCardWrap, qrCardStyle]}>
            <Card padded style={styles.qrCard}>
              <Text variant="labelSm" color={palette.muted}>
                {t('booking.success_token')}
              </Text>
              <Text variant="display" style={{ marginTop: 2 }}>
                {booking?.token_code ?? '—'}
              </Text>

              <View style={styles.qrFrame}>
                <QRCode
                  value={qrValue}
                  size={184}
                  color={palette.ink}
                  backgroundColor={palette.cream}
                  ecl="M"
                />
              </View>

              <Text variant="caption" color={palette.muted} style={{ textAlign: 'center' }}>
                {t('booking.success_show_qr')}
              </Text>

              {booking != null && (
                <Text
                  variant="mono"
                  color={palette.muted}
                  style={{ marginTop: spacing.xs, textAlign: 'center' }}
                >
                  {formatMoney(booking.total_amount, booking.currency)} · {booking.payment_status}
                </Text>
              )}
            </Card>
          </Animated.View>

          <Animated.View style={loyaltyStyle}>
            <View style={styles.loyaltyBanner}>
              <Icon name="trophy" size={20} color={palette.ink} />
              <Text variant="bodyBold" color={palette.ink}>
                {t('booking.success_loyalty_earned', { n: 50 })}
              </Text>
            </View>
          </Animated.View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                block
                size="lg"
                variant="cream"
                label={t('booking.success_share')}
                onPress={() => {
                  onShare().catch(() => {});
                }}
                leading={<Icon name="chevronRight" size={16} />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                block
                size="lg"
                variant="red"
                label={t('booking.success_done')}
                onPress={() => {
                  if (nav.canGoBack()) nav.popToTop();
                  else nav.navigate('DiscoveryList');
                }}
              />
            </View>
          </View>

          {env.mock && (
            <Text
              variant="caption"
              color={palette.gold}
              style={{ textAlign: 'center', marginTop: spacing.sm }}
            >
              MOCK MODE · QR points at {qrValue}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
  },
  qrCardWrap: {
    marginTop: spacing.xl,
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: palette.cream,
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    ...(shadow.lg as object),
  },
  qrFrame: {
    padding: spacing.md,
    backgroundColor: palette.cream,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: palette.ink,
  },
  loyaltyBanner: {
    marginTop: spacing.lg,
    backgroundColor: palette.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
