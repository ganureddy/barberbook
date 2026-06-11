import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateBooking, useLoyaltyForShop, useShop } from '../../api/hooks';
import { Button, Card, Divider, Icon, Text, type IconName } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { calculateBookingTotal, formatMoney } from '../../lib/booking';
import { toast } from '../../lib/toast';
import type { DiscoverStackParamList } from '../../navigation/types';
import { toCreatePayload, useBookingDraftStore } from '../../store/useBookingDraftStore';

import { StepHeader } from './_shop/StepHeader';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingPay'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingPay'>;
type PaymentMethod = 'upi' | 'card' | 'cash';

interface PaymentOption {
  id: PaymentMethod;
  icon: IconName;
}

const PAYMENT_METHODS: PaymentOption[] = [
  { id: 'upi', icon: 'qr' },
  { id: 'card', icon: 'rupee' },
  { id: 'cash', icon: 'check' },
];

const GST_RATE = 0.18;

export function BookingPay() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const draft = useBookingDraftStore();
  const setLoyaltyPointsToRedeem = useBookingDraftStore((s) => s.setLoyaltyPointsToRedeem);
  const reset = useBookingDraftStore((s) => s.reset);

  const shopQ = useShop(params.shopId);
  const loyaltyQ = useLoyaltyForShop(params.shopId);
  const createBooking = useCreateBooking();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');

  const currency = shopQ.data?.currency ?? 'INR';
  const totals = useMemo(
    () =>
      calculateBookingTotal({
        services: draft.services.map((s) => ({ name: s.service_name, price: s.price })),
        gstRate: GST_RATE,
        loyaltyPointsToRedeem: draft.loyaltyPointsToRedeem,
        currency,
      }),
    [draft.services, draft.loyaltyPointsToRedeem, currency],
  );

  const balance = loyaltyQ.data?.points_balance ?? 0;
  const halfBalance = Math.floor(balance / 2);

  const submit = async () => {
    if (!toCreatePayload(draft)) {
      toast.error('Please complete the booking flow first.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const payload = toCreatePayload(draft)!;
      const booking = await createBooking.mutateAsync({
        ...payload,
        client_total: totals.total,
        loyalty_points_to_redeem: totals.pointsConsumed,
        payment_method: paymentMethod,
      });
      reset();
      nav.navigate('BookingSuccess', { bookingId: booking.name });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not confirm booking';
      toast.error(msg);
    }
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <StepHeader step={3} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 160 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Itemized summary */}
        <Card>
          <Text variant="label" color={theme.muted}>
            {t('booking.step_services').toUpperCase()}
          </Text>
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            {draft.services.map((s) => (
              <View key={s.name} style={styles.lineRow}>
                <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                  {s.service_name}
                </Text>
                <Text variant="mono">{formatMoney(s.price, currency)}</Text>
              </View>
            ))}
          </View>

          <Divider style={{ marginVertical: spacing.md }} />

          <View style={styles.lineRow}>
            <Text variant="caption" color={theme.muted} style={{ flex: 1 }}>
              {t('booking.subtotal')}
            </Text>
            <Text variant="mono" color={theme.muted}>
              {formatMoney(totals.subtotal, currency)}
            </Text>
          </View>
          <View style={styles.lineRow}>
            <Text variant="caption" color={theme.muted} style={{ flex: 1 }}>
              {t('booking.gst', { pct: Math.round(GST_RATE * 100) })}
            </Text>
            <Text variant="mono" color={theme.muted}>
              {formatMoney(totals.gstAmount, currency)}
            </Text>
          </View>
          {totals.loyaltyDiscount > 0 && (
            <View style={styles.lineRow}>
              <Text variant="caption" color={palette.gold} style={{ flex: 1 }}>
                {t('booking.loyalty_discount')} · {totals.pointsConsumed} pts
              </Text>
              <Text variant="mono" color={palette.gold}>
                -{formatMoney(totals.loyaltyDiscount, currency)}
              </Text>
            </View>
          )}

          <Divider style={{ marginVertical: spacing.md }} />

          <View style={styles.lineRow}>
            <Text variant="bodyBold" style={{ flex: 1 }}>
              {t('booking.total')}
            </Text>
            <Text variant="monoLg">{formatMoney(totals.total, currency)}</Text>
          </View>
        </Card>

        {/* Loyalty */}
        {balance > 0 && (
          <Card alt>
            <Text variant="label" color={palette.gold}>
              {t('booking.loyalty_available', { n: balance }).toUpperCase()}
            </Text>
            <View style={styles.loyaltyRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setLoyaltyPointsToRedeem(halfBalance);
                }}
                style={[styles.loyaltyBtn, { borderColor: palette.gold }]}
              >
                <Text variant="bodyBold" color={palette.gold}>
                  {t('booking.loyalty_redeem', {
                    n: halfBalance,
                    value: formatMoney(halfBalance * 0.5, currency),
                  })}
                </Text>
              </Pressable>
              {draft.loyaltyPointsToRedeem > 0 && (
                <Pressable
                  onPress={() => {
                    setLoyaltyPointsToRedeem(0);
                  }}
                  style={styles.loyaltyClearBtn}
                >
                  <Text variant="bodyBold" color={theme.muted}>
                    {t('booking.loyalty_clear')}
                  </Text>
                </Pressable>
              )}
            </View>
          </Card>
        )}

        {/* Payment */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color={theme.muted}>
            {t('booking.pay_method').toUpperCase()}
          </Text>
          {PAYMENT_METHODS.map((m) => {
            const active = paymentMethod === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setPaymentMethod(m.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Card
                  padded={false}
                  style={[
                    styles.payCard,
                    {
                      borderColor: active ? palette.red : theme.line,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.payIcon,
                      { backgroundColor: active ? palette.red : theme.surfaceAlt },
                    ]}
                  >
                    <Icon name={m.icon} size={18} color={active ? palette.cream : theme.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold">{t(`booking.pay_${m.id}`)}</Text>
                    <Text variant="caption" color={theme.muted}>
                      {t(`booking.pay_${m.id}_sub`)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.payRadio,
                      { borderColor: active ? palette.red : theme.lineStrong },
                    ]}
                  >
                    {active && <View style={styles.payRadioInner} />}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <Text variant="caption" color={theme.muted} style={{ marginTop: spacing.md }}>
          {t('booking.tos_short')}
        </Text>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.md, backgroundColor: theme.surface },
        ]}
      >
        <Button
          block
          variant="red"
          size="lg"
          loading={createBooking.isPending}
          label={
            createBooking.isPending
              ? t('booking.creating')
              : t('booking.pay_cta', {
                  total: formatMoney(
                    totals.total,
                    currency,
                    i18n.language === 'hi' ? 'hi-IN' : 'en-IN',
                  ),
                })
          }
          onPress={() => {
            submit().catch(() => {});
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loyaltyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  loyaltyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 2,
  },
  loyaltyClearBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  payIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.red,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
});
