import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyBarberWorkspaces } from '../../api/hooks';
import { getStaffSchedule, type StaffSchedule as StaffScheduleData } from '../../api/resources';
import type { Currency } from '../../api/types';
import {
  Card,
  Icon,
  KpiTile,
  ListRowSkeleton,
  SkeletonGroup,
  StatusPill,
  Tag,
  Text,
} from '../../components';
import { LogoutButton } from '../../components/LogoutButton';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { formatCurrency, formatLocalTime } from '../../lib/format';
import type { StaffStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';

import { useActiveBarber, fmtMinutes, timeOfDayKey } from './_staff';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffSchedule'>;

interface DayChip {
  date: string;
  label: string;
  weekday: string;
  day: number;
}

function buildWeek(): DayChip[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      label: i === 0 ? 'today' : i === 1 ? 'tomorrow' : '',
      weekday: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
      day: d.getDate(),
    };
  });
}

export function StaffSchedule() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const activeBarber = useActiveBarber();
  const workspacesQ = useMyBarberWorkspaces(user?.phone);
  const workspace = workspacesQ.data?.find((w) => w.barber === activeBarber);
  const days = useMemo(buildWeek, []);
  const [selectedDate, setSelectedDate] = useState(days[0].date);

  const scheduleQ = useQuery<StaffScheduleData>({
    queryKey: ['staff', 'schedule', activeBarber, selectedDate],
    queryFn: () => getStaffSchedule(activeBarber, selectedDate),
    refetchInterval: 60 * 1000,
  });

  const data = scheduleQ.data;
  const greetingKey = `staff.greeting_${timeOfDayKey()}` as const;
  const firstName = (user?.full_name ?? '').split(' ')[0] ?? user?.full_name ?? 'Barber';

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View style={styles.greeting}>
            <Text variant="labelSm" color={palette.gold}>
              {t('staff.appointments_label').toUpperCase()}
            </Text>
            <Text variant="display" numberOfLines={2}>
              {t(greetingKey, { name: firstName })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                // 'BarberShops' lives in the StaffRoot stack (an ancestor).
                nav.getParent()?.navigate('BarberShops' as never);
              }}
              style={[styles.switchChip, { borderColor: theme.lineStrong }]}
              accessibilityRole="button"
              accessibilityLabel={t('staff.shops_switch')}
            >
              <Icon name="pole" size={14} color={palette.gold} />
            </Pressable>
            <LogoutButton />
          </View>
        </View>

        {/* Today summary */}
        <Card padded style={[styles.summaryCard, { backgroundColor: palette.ink }]}>
          <Text variant="labelSm" color={palette.gold}>
            {t('staff.today_summary').toUpperCase()}
          </Text>
          <View style={styles.summaryRow}>
            <SummaryStat
              label={t('staff.today_bookings')}
              value={String(data?.total_bookings ?? 0)}
            />
            <View style={styles.summarySep} />
            <SummaryStat
              label={t('staff.today_billed')}
              value={fmtMinutes(data?.billed_minutes ?? 0)}
            />
            <View style={styles.summarySep} />
            <SummaryStat
              label={t('staff.today_tips')}
              value={data ? formatCurrency(data.tips_today, data.currency as Currency) : '—'}
            />
          </View>
        </Card>

        {/* Your shift + profile — tap to edit (barbers manage their own). */}
        {workspace != null && (
          <Pressable
            onPress={() => {
              nav.navigate('StaffProfile');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('staff.profile_title')}
          >
            <Card padded style={styles.shiftCard}>
              <View style={styles.shiftHead}>
                <Icon name="clock" size={16} color={palette.gold} />
                <Text variant="labelSm" color={theme.muted} style={{ flex: 1 }}>
                  {t('staff.shift_title', { shop: workspace.shop.shop_name }).toUpperCase()}
                </Text>
                <Text variant="labelSm" color={palette.red}>
                  {t('staff.profile_edit').toUpperCase()}
                </Text>
                <Icon name="chevronRight" size={14} color={palette.red} />
              </View>
              <Text variant="bodyBold">
                {(workspace.available_days ?? []).join(' · ') || t('staff.shift_unset')}
              </Text>
              <Text variant="caption" color={theme.muted}>
                {workspace.shift_start ?? '—'}–{workspace.shift_end ?? '—'}
                {workspace.specialties ? ` · ${workspace.specialties}` : ''}
              </Text>
            </Card>
          </Pressable>
        )}

        {/* 7-day strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStrip}
        >
          {days.map((d) => {
            const active = d.date === selectedDate;
            return (
              <Pressable
                key={d.date}
                onPress={() => {
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
                  {d.weekday}
                </Text>
                <Text
                  variant="display"
                  color={active ? palette.cream : theme.text}
                  style={{ fontSize: 24, lineHeight: 26 }}
                >
                  {String(d.day).padStart(2, '0')}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Appointments list */}
        <View style={styles.section}>
          <Text variant="label" color={theme.muted} style={{ marginBottom: spacing.sm }}>
            {t('staff.appointments_label').toUpperCase()}
          </Text>

          {scheduleQ.isLoading && !data ? (
            <SkeletonGroup count={4}>
              <ListRowSkeleton height={72} />
            </SkeletonGroup>
          ) : !data || data.appointments.length === 0 ? (
            <Card>
              <Text variant="caption" color={theme.muted}>
                {t('staff.schedule_empty')}
              </Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {data.appointments.map((a) => (
                <Pressable
                  key={a.name}
                  onPress={() => {
                    if (a.in_chair) nav.navigate('StaffInService', { bookingId: a.name });
                    else nav.navigate('StaffCustomer', { customerId: a.customer_id });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.customer_name} at ${formatLocalTime(a.scheduled_at)}`}
                >
                  <Card
                    padded
                    style={[
                      styles.apptRow,
                      a.in_chair && {
                        borderColor: palette.red,
                        backgroundColor: 'rgba(212,50,44,0.06)',
                      },
                    ]}
                  >
                    <View style={styles.apptTime}>
                      <Text variant="mono">{formatLocalTime(a.scheduled_at)}</Text>
                      <Text variant="caption" color={theme.muted}>
                        {a.duration_minutes}m
                      </Text>
                    </View>
                    <View style={[styles.apptStripe, { backgroundColor: stripeColor(a.status) }]} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.apptHead}>
                        <Text variant="bodyBold" numberOfLines={1}>
                          {a.customer_name}
                        </Text>
                        {a.in_chair ? (
                          <Tag label={t('staff.in_chair')} bg={palette.red} color={palette.cream} />
                        ) : (
                          <StatusPill status={a.status} />
                        )}
                      </View>
                      <Text variant="caption" color={theme.muted} numberOfLines={1}>
                        {a.service_summary}
                      </Text>
                    </View>
                    <Text variant="monoLg">
                      {formatCurrency(a.total_amount, a.currency as Currency)}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <KpiTile
            label="EARNINGS"
            value="→"
            icon="trophy"
            onPress={() => {
              nav.navigate('StaffEarnings');
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SummaryStatProps {
  label: string;
  value: string;
}

function SummaryStat({ label, value }: SummaryStatProps) {
  return (
    <View style={styles.summaryStat}>
      <Text variant="labelSm" color={palette.gold}>
        {label.toUpperCase()}
      </Text>
      <Text style={styles.summaryNum}>{value}</Text>
    </View>
  );
}

function stripeColor(status: string): string {
  switch (status) {
    case 'InService':
      return palette.red;
    case 'CheckedIn':
      return palette.gold;
    case 'Completed':
      return '#3F6B5F';
    case 'Cancelled':
    case 'NoShow':
      return palette.charcoal;
    default:
      return palette.navy;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  greeting: {
    flex: 1,
    gap: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchChip: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    borderColor: palette.ink,
  },
  shiftCard: {
    gap: 2,
  },
  shiftHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  summaryStat: {
    flex: 1,
    gap: 4,
  },
  summarySep: {
    width: StyleSheet.hairlineWidth * 2,
    height: 36,
    backgroundColor: 'rgba(245,241,232,0.12)',
  },
  summaryNum: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 32,
    color: palette.cream,
  },
  dayStrip: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  dayCell: {
    width: 56,
    height: 68,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  section: {},
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  apptTime: {
    width: 48,
  },
  apptStripe: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  apptHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
