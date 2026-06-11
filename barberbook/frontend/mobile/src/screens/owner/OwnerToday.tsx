import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getOwnerToday, type OwnerTodayKpis } from '../../api/resources';
import {
  Card,
  DenseHeader,
  Icon,
  KpiTile,
  ListRowSkeleton,
  SkeletonGroup,
  StatusPill,
  Text,
} from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { formatMoney } from '../../lib/booking';
import type { TodayStackParamList } from '../../navigation/types';

import { ACTIVE_SHOP } from './_owner';

type Filter = 'all' | 'upcoming' | 'active' | 'done' | 'cancelled';
type Nav = NativeStackNavigationProp<TodayStackParamList, 'OwnerToday'>;

export function OwnerToday() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>('all');

  const todayQ = useQuery<OwnerTodayKpis>({
    queryKey: ['owner', 'today', ACTIVE_SHOP],
    queryFn: () => getOwnerToday(ACTIVE_SHOP),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const data = todayQ.data;

  const filtered = useMemo(() => {
    const tl = data?.timeline ?? [];
    switch (filter) {
      case 'upcoming':
        return tl.filter((b) => b.status === 'Confirmed');
      case 'active':
        return tl.filter((b) => b.status === 'InService' || b.status === 'CheckedIn');
      case 'done':
        return tl.filter((b) => b.status === 'Completed');
      case 'cancelled':
        return tl.filter((b) => b.status === 'Cancelled' || b.status === 'NoShow');
      case 'all':
      default:
        return tl;
    }
  }, [data?.timeline, filter]);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker={(data?.date ?? new Date().toISOString().slice(0, 10)).toUpperCase()}
        title={t('owner.today_title')}
        trailing={
          <Pressable
            onPress={() => {
              nav.navigate('OwnerWalkin');
            }}
            style={[styles.headerCta, { backgroundColor: palette.red }]}
            accessibilityRole="button"
            accessibilityLabel={t('owner.walkin_title')}
          >
            <Icon name="pole" size={14} color={palette.cream} />
            <Text variant="label" color={palette.cream}>
              {t('owner.walkin_title').toUpperCase()}
            </Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* KPI strip — also acts as the filter selector */}
        <View style={styles.kpiRow}>
          <KpiTile
            label={t('owner.today_kpi_bookings')}
            value={String(data?.bookings ?? 0)}
            icon="calendar"
            active={filter === 'all'}
            onPress={() => {
              setFilter('all');
            }}
          />
          <KpiTile
            label={t('owner.today_kpi_walkins')}
            value={String(data?.walkins ?? 0)}
            icon="pole"
            active={filter === 'active'}
            onPress={() => {
              setFilter('active');
            }}
          />
          <KpiTile
            label={t('owner.today_kpi_revenue')}
            value={data ? formatMoney(data.revenue, data.currency as 'INR' | 'AED' | 'GBP') : '—'}
            icon="rupee"
          />
        </View>

        {/* Filter chip row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(['all', 'upcoming', 'active', 'done', 'cancelled'] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => {
                  setFilter(f);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? palette.ink : 'transparent',
                    borderColor: active ? palette.ink : theme.lineStrong,
                  },
                ]}
              >
                <Text variant="label" color={active ? palette.cream : theme.text}>
                  {t(`owner.today_filter_${f}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Timeline */}
        {todayQ.isLoading && !data ? (
          <SkeletonGroup count={4}>
            <ListRowSkeleton height={72} />
          </SkeletonGroup>
        ) : filtered.length === 0 ? (
          <Card>
            <Text variant="caption" color={theme.muted}>
              {t('owner.today_empty')}
            </Text>
          </Card>
        ) : (
          <View style={styles.timeline}>
            {filtered.map((row) => (
              <View key={row.name} style={styles.timeRow}>
                <View style={styles.timeBlock}>
                  <Text variant="mono" color={theme.text}>
                    {row.scheduled_at.slice(11, 16)}
                  </Text>
                  <Text variant="caption" color={theme.muted}>
                    {row.duration_minutes}m
                  </Text>
                </View>

                <View style={[styles.timeStripe, { backgroundColor: stripeColor(row.status) }]} />

                <Card padded style={styles.timeCard}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.timeCardTop}>
                      <Text variant="bodyBold" numberOfLines={1}>
                        {row.customer_name}
                      </Text>
                      <StatusPill status={row.status} />
                    </View>
                    <Text variant="caption" color={theme.muted} numberOfLines={1}>
                      {row.service_summary} · {row.barber ?? 'Any barber'}
                    </Text>
                  </View>
                  <Text variant="monoLg">{formatMoney(row.total_amount, row.currency)}</Text>
                </Card>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  headerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterRow: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  timeline: {
    gap: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  timeBlock: {
    width: 56,
    paddingTop: spacing.sm,
    alignItems: 'flex-start',
  },
  timeStripe: {
    width: 3,
    borderRadius: 2,
    marginVertical: 2,
  },
  timeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
