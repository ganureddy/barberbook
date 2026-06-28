import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  completeStaffService,
  getStaffInService,
  type StaffInServiceState,
} from '../../api/resources';
import { BackIcon, Button, Card, Icon, Portrait, Text, type IconName } from '../../components';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { formatCurrency, formatLocalTime } from '../../lib/format';
import { toast } from '../../lib/toast';
import type { StaffStackParamList } from '../../navigation/types';

import { useActiveBarber } from './_staff';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffInService'>;

interface QuickAction {
  id: 'pause' | 'extend' | 'break' | 'swap';
  icon: IconName;
}
const QUICK_ACTIONS: QuickAction[] = [
  { id: 'pause', icon: 'clock' },
  { id: 'extend', icon: 'plus' },
  { id: 'break', icon: 'star' },
  { id: 'swap', icon: 'pole' },
];

export function StaffInService() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const activeBarber = useActiveBarber();
  const QK = ['staff', 'in_service', activeBarber] as const;

  const stateQ = useQuery<StaffInServiceState>({
    queryKey: QK,
    queryFn: () => getStaffInService(activeBarber),
    refetchInterval: 30 * 1000,
  });

  const data = stateQ.data;
  const booking = data?.booking ?? null;
  const startedAt = data?.started_at ?? booking?.scheduled_at ?? null;

  // Live timer ticks every second; recomputes minutes-remaining locally
  // so the UI reads as "real time" without a network round-trip per tick.
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const remaining = useMemo(() => {
    if (!booking || !startedAt) return null;
    const start = new Date(startedAt).getTime();
    const elapsed = (now - start) / 1000 / 60; // minutes
    return Math.round(booking.duration_minutes - elapsed);
  }, [booking, now, startedAt]);

  const completeMut = useMutation({
    mutationFn: () => completeStaffService(activeBarber, booking?.name ?? ''),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: ['staff'] }).catch(() => {});
      nav.popToTop();
    },
    onError: (err: unknown) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toast.error(err instanceof Error ? err.message : 'Could not complete');
    },
  });

  const overrun = remaining != null && remaining < 0;

  return (
    <View style={[styles.root, { backgroundColor: palette.ink }]}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              nav.goBack();
            }}
            hitSlop={20}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <BackIcon size={20} color={palette.cream} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="labelSm" color={palette.gold}>
              {t('staff.service_title').toUpperCase()}
            </Text>
            <Text variant="bodyBold" color={palette.cream}>
              {booking ? `Token ${booking.token_code}` : '—'}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Current customer card */}
          {data?.customer_name && (
            <Card padded style={styles.customerCard}>
              <Portrait
                seed={data.customer_id ?? 'customer'}
                size={56}
                initials={data.customer_name.slice(0, 2).toUpperCase()}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyBold" color={palette.cream}>
                  {data.customer_name}
                </Text>
                <Text variant="caption" color={palette.gold}>
                  {booking ? formatCurrency(booking.total_amount, booking.currency) : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  nav.navigate('StaffCustomer', {
                    customerId: data.customer_id ?? 'cust-priya',
                  });
                }}
                accessibilityRole="button"
                accessibilityLabel={t('staff.customer_title')}
                style={styles.iconBtn}
              >
                <Icon name="chevronRight" size={20} color={palette.cream} />
              </Pressable>
            </Card>
          )}

          {/* Service card with live timer */}
          <Card padded style={styles.serviceCard}>
            <Text variant="labelSm" color={palette.muted}>
              {(booking?.services?.[0]?.service ?? 'Service').toUpperCase()}
            </Text>
            <Text style={styles.timerGlyph}>
              {remaining == null ? '—' : overrun ? `+${Math.abs(remaining)}m` : `${remaining}m`}
            </Text>
            <Text variant="bodyBold" color={overrun ? palette.red : palette.ink}>
              {remaining == null
                ? t('staff.service_duration', { min: booking?.duration_minutes ?? 0 })
                : overrun
                  ? t('staff.service_overrun', { min: Math.abs(remaining) })
                  : t('staff.service_remaining', { min: remaining })}
            </Text>
            <Text variant="caption" color={palette.muted} style={{ marginTop: spacing.xs }}>
              {startedAt ? t('staff.service_started', { at: formatLocalTime(startedAt) }) : ''}
              {booking
                ? ` · ${t('staff.service_duration', { min: booking.duration_minutes })}`
                : ''}
            </Text>
          </Card>

          {/* Notes from last visit */}
          {data?.notes_from_last_visit && (
            <Card padded style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Icon name="star" size={14} color={palette.gold} />
                <Text variant="labelSm" color={palette.gold}>
                  {t('staff.service_notes_title').toUpperCase()}
                </Text>
              </View>
              <Text variant="body" color={palette.cream} style={{ marginTop: spacing.xs }}>
                {data.notes_from_last_visit}
              </Text>
            </Card>
          )}

          {/* Quick actions grid */}
          <Text variant="labelSm" color={palette.gold} style={styles.qaLabel}>
            {t('staff.service_quick_actions').toUpperCase()}
          </Text>
          <View style={styles.qaGrid}>
            {QUICK_ACTIONS.map((qa) => (
              <Pressable
                key={qa.id}
                onPress={() => Haptics.selectionAsync().catch(() => {})}
                accessibilityRole="button"
                accessibilityLabel={t(`staff.qa_${qa.id}`)}
                style={({ pressed }) => [styles.qaTile, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Icon name={qa.icon} size={22} color={palette.cream} />
                <Text variant="label" color={palette.cream}>
                  {t(`staff.qa_${qa.id}`).toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Mark complete CTA */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }, shadow.lg]}>
          <Button
            block
            size="lg"
            variant="gold"
            label={
              completeMut.isPending ? t('staff.service_completing') : t('staff.service_complete')
            }
            disabled={!booking || completeMut.isPending}
            loading={completeMut.isPending}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
              completeMut.mutate();
            }}
            leading={<Icon name="check" size={18} color={palette.ink} />}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.charcoal,
    borderColor: 'rgba(245,241,232,0.10)',
  },
  serviceCard: {
    backgroundColor: palette.cream,
    borderColor: palette.cream,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  timerGlyph: {
    fontFamily: fontFamilies.display,
    fontSize: 96,
    lineHeight: 96,
    color: palette.ink,
    letterSpacing: 1,
    marginVertical: spacing.xs,
  },
  notesCard: {
    backgroundColor: 'rgba(201,162,76,0.10)',
    borderColor: 'rgba(201,162,76,0.30)',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  qaLabel: {
    paddingHorizontal: spacing.xs,
  },
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  qaTile: {
    width: '48%',
    minHeight: 72,
    borderRadius: radii.md,
    backgroundColor: 'rgba(245,241,232,0.06)',
    borderColor: 'rgba(245,241,232,0.10)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: palette.charcoal,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
});
