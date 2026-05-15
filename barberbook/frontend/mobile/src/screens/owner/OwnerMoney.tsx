import { useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getOwnerPayoutSummary, type OwnerPayoutSummary } from '../../api/resources';
import {
  BarChart,
  Card,
  DenseHeader,
  Icon,
  ListRowSkeleton,
  SkeletonGroup,
  StatusPill,
  Text,
} from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, shadow, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { formatMoney } from '../../lib/booking';

import { ACTIVE_SHOP } from './_owner';

export function OwnerMoney() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const summaryQ = useQuery<OwnerPayoutSummary>({
    queryKey: ['owner', 'payouts', ACTIVE_SHOP],
    queryFn: () => getOwnerPayoutSummary(ACTIVE_SHOP),
  });
  const data = summaryQ.data;
  const currency = (data?.currency ?? 'INR') as 'INR' | 'AED' | 'GBP';

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.daily.map((d) => ({
      label: d.date.slice(5).replace('-', '/'),
      value: d.amount,
    }));
  }, [data]);

  // Highlight the most recent day in red so the chart has a focal point.
  const highlightIndex = data ? data.daily.length - 1 : undefined;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader kicker="THIS MONTH" title={t('owner.money_title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pending payout hero card */}
        <Card padded style={[styles.heroCard, shadow.lg]}>
          <View style={styles.heroTop}>
            <Text variant="labelSm" color={palette.gold}>
              {t('owner.money_pending_payout').toUpperCase()}
            </Text>
            <Icon name="rupee" size={22} color={palette.gold} />
          </View>
          <Text style={styles.heroAmount}>
            {data ? formatMoney(data.pending_amount, currency) : '—'}
          </Text>
          <Text variant="caption" color={palette.gold}>
            {data?.next_payout_at
              ? t('owner.money_payout_eta', {
                  when: new Date(data.next_payout_at).toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  }),
                })
              : '—'}
          </Text>
        </Card>

        {/* 30-day bar chart */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text variant="label" color={theme.muted}>
              {t('owner.money_30d').toUpperCase()}
            </Text>
            {data && (
              <Text variant="labelSm" color={theme.muted}>
                {formatMoney(
                  data.daily.reduce((s, d) => s + d.amount, 0),
                  currency,
                )}
              </Text>
            )}
          </View>
          {summaryQ.isLoading && !data ? (
            <ListRowSkeleton height={180} />
          ) : (
            <BarChart
              data={chartData}
              height={180}
              highlightIndex={highlightIndex}
              formatValue={(n) => formatMoney(n, currency)}
            />
          )}
        </View>

        {/* Top services breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text variant="label" color={theme.muted}>
              {t('owner.money_top_services').toUpperCase()}
            </Text>
          </View>

          {summaryQ.isLoading && !data ? (
            <SkeletonGroup count={3}>
              <ListRowSkeleton height={56} />
            </SkeletonGroup>
          ) : (
            <Card padded style={{ paddingVertical: 0 }}>
              {data?.top_services.map((s, i, arr) => {
                const max = data.top_services[0]?.amount ?? 1;
                const ratio = (s.amount / Math.max(1, max)) * 100;
                return (
                  <View
                    key={s.service_name}
                    style={[
                      styles.tsRow,
                      i < arr.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth * 2,
                        borderBottomColor: theme.line,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.tsHead}>
                        <Text variant="bodyBold" numberOfLines={1}>
                          {s.service_name}
                        </Text>
                        <Text variant="mono">{formatMoney(s.amount, currency)}</Text>
                      </View>
                      <View style={[styles.tsTrack, { backgroundColor: theme.line }]}>
                        <View
                          style={[
                            styles.tsFill,
                            { width: `${ratio}%`, backgroundColor: palette.gold },
                          ]}
                        />
                      </View>
                      <Text variant="caption" color={theme.muted} style={{ marginTop: 4 }}>
                        {s.count} bookings
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        {/* Payout history (Frappe Payment Entry rows) */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text variant="label" color={theme.muted}>
              {t('owner.money_payouts').toUpperCase()}
            </Text>
          </View>

          {summaryQ.isLoading && !data ? (
            <SkeletonGroup count={3}>
              <ListRowSkeleton height={64} />
            </SkeletonGroup>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {data?.payouts.map((p) => (
                <Card key={p.name} padded style={styles.payoutRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold">{formatMoney(p.amount, currency)}</Text>
                    <Text variant="caption" color={theme.muted}>
                      {new Date(p.posted_at).toLocaleDateString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      · {p.bank_ref ?? p.name}
                    </Text>
                  </View>
                  <StatusPill
                    status={p.status === 'pending' ? 'Waiting' : 'Completed'}
                    label={
                      p.status === 'pending'
                        ? t('owner.money_payment_pending')
                        : t('owner.money_payment_settled')
                    }
                  />
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroAmount: {
    fontFamily: fontFamilies.display,
    color: palette.cream,
    fontSize: 56,
    lineHeight: 56,
    marginVertical: spacing.xs,
    letterSpacing: 1,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tsRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
  },
  tsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tsTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tsFill: {
    height: '100%',
    borderRadius: 3,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
