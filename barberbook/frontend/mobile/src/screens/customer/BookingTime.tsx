import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAvailability } from '../../api/hooks';
import { Button, Icon, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import type { DiscoverStackParamList } from '../../navigation/types';
import { useBookingDraftStore } from '../../store/useBookingDraftStore';

import { StepHeader } from './_shop/StepHeader';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingTime'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingTime'>;

const DAY_COUNT = 14;

interface DayChip {
  date: string; // YYYY-MM-DD
  label: string;
  weekday: string;
  day: number;
}

function buildDays(): DayChip[] {
  const out: DayChip[] = [];
  const today = new Date();
  for (let i = 0; i < DAY_COUNT; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      date: d.toISOString().slice(0, 10),
      label:
        i === 0
          ? 'today'
          : i === 1
            ? 'tomorrow'
            : d.toLocaleDateString(undefined, { weekday: 'short' }),
      weekday: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
      day: d.getDate(),
    });
  }
  return out;
}

export function BookingTime() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const days = useMemo(buildDays, []);
  const draftDate = useBookingDraftStore((s) => s.date);
  const draftTime = useBookingDraftStore((s) => s.time);
  const services = useBookingDraftStore((s) => s.services);
  const setSlot = useBookingDraftStore((s) => s.setSlot);

  const [selectedDate, setSelectedDate] = useState<string>(draftDate ?? days[0].date);

  const slotsQ = useAvailability(
    params.shopId,
    selectedDate,
    services.map((s) => s.name),
  );
  const slots = slotsQ.data ?? [];

  const onPickSlot = (start: string) => {
    Haptics.selectionAsync().catch(() => {});
    const time = start.slice(11, 16);
    setSlot(selectedDate, time);
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <StepHeader step={2} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Day strip */}
        <View style={[styles.dayStripWrap, { backgroundColor: theme.bg }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayStrip}
          >
            {days.map((d, i) => {
              const active = d.date === selectedDate;
              return (
                <Pressable
                  key={d.date}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedDate(d.date);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.weekday} ${d.day}`}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: active ? palette.red : theme.surface,
                      borderColor: active ? palette.red : theme.lineStrong,
                    },
                  ]}
                >
                  <Text variant="labelSm" color={active ? palette.cream : theme.muted}>
                    {i === 0
                      ? t('booking.today').toUpperCase()
                      : i === 1
                        ? t('booking.tomorrow').toUpperCase()
                        : d.weekday}
                  </Text>
                  <Text
                    variant="display"
                    color={active ? palette.cream : theme.text}
                    style={{ fontSize: 26, lineHeight: 28 }}
                  >
                    {String(d.day).padStart(2, '0')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Time grid */}
        {slotsQ.isLoading && !slotsQ.data ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.red} />
            <Text variant="caption" color={theme.muted}>
              {t('booking.loading_slots')}
            </Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.loading}>
            <Text variant="body" color={theme.muted}>
              {t('booking.no_slots')}
            </Text>
          </View>
        ) : (
          <View style={styles.timeGrid}>
            {slots.map((slot) => {
              const time = slot.start_at.slice(11, 16);
              const active = draftDate === selectedDate && draftTime === time;
              return (
                <Pressable
                  key={slot.start_at}
                  onPress={() => {
                    if (slot.available) onPickSlot(slot.start_at);
                  }}
                  disabled={!slot.available}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !slot.available, selected: active }}
                  style={[
                    styles.slotCell,
                    {
                      backgroundColor: active ? palette.red : theme.surface,
                      borderColor: active
                        ? palette.red
                        : slot.available
                          ? theme.lineStrong
                          : theme.line,
                      opacity: slot.available ? 1 : 0.55,
                    },
                  ]}
                >
                  <Text
                    variant="mono"
                    color={active ? palette.cream : slot.available ? theme.text : theme.muted}
                    style={slot.available ? undefined : { textDecorationLine: 'line-through' }}
                  >
                    {time}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
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
          label={t('booking.continue_to_pay')}
          disabled={draftDate == null || draftTime == null}
          onPress={() => {
            nav.navigate('BookingPay', { shopId: params.shopId });
          }}
          trailing={<Icon name="chevronRight" size={18} color={palette.cream} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingTop: spacing.sm,
  },
  dayStripWrap: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: 'transparent',
  },
  dayStrip: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  dayCell: {
    width: 64,
    height: 76,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  loading: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeGrid: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotCell: {
    width: '23.5%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1.5,
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
