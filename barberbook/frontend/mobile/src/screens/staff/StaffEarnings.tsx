import { useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { getStaffEarnings, type StaffEarnings as StaffEarningsT } from '../../api/resources';
import type { Currency } from '../../api/types';
import { Card, Icon, ListRowSkeleton, SkeletonGroup, Stars, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { formatCurrency, formatLocalTime, formatShortDate } from '../../lib/format';

import { useActiveBarber } from './_staff';

export function StaffEarnings() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const activeBarber = useActiveBarber();

  const earningsQ = useQuery<StaffEarningsT>({
    queryKey: ['staff', 'earnings', activeBarber],
    queryFn: () => getStaffEarnings(activeBarber),
  });
  const data = earningsQ.data;
  const currency = (data?.currency ?? 'INR') as Currency;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Gold gradient hero */}
        <View style={[styles.hero, shadow.lg]}>
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="staff-gold" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={palette.goldSoft} />
                <Stop offset="1" stopColor={palette.gold} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#staff-gold)" />
          </Svg>
          <View style={styles.heroBody}>
            <Text variant="labelSm" color={palette.ink}>
              {t('staff.earnings_this_month').toUpperCase()}
            </Text>
            <Text style={styles.heroAmount}>
              {data ? formatCurrency(data.total_amount, currency) : '—'}
            </Text>
            <Text variant="caption" color={palette.ink}>
              {data ? formatShortDate(data.month_start) : ''}
            </Text>
          </View>
          <Icon name="trophy" size={32} color={palette.ink} style={styles.heroIcon} />
        </View>

        {/* Personal stats grid */}
        <View style={styles.statsGrid}>
          <StatTile
            label={t('staff.earnings_cuts')}
            value={String(data?.cuts ?? 0)}
            icon="scissors"
          />
          <StatTile
            label={t('staff.earnings_rating')}
            value={data ? data.avg_rating.toFixed(1) : '—'}
            icon="star"
          />
          <StatTile
            label={t('staff.earnings_repeat')}
            value={data ? `${Math.round(data.repeat_rate * 100)}%` : '—'}
            icon="heart"
          />
          <StatTile
            label={t('staff.earnings_no_shows')}
            value={String(data?.no_shows ?? 0)}
            icon="close"
            tone="red"
          />
        </View>

        {/* Recent tips feed */}
        <View style={styles.section}>
          <Text variant="label" color={theme.muted} style={{ marginBottom: spacing.sm }}>
            {t('staff.earnings_recent_tips').toUpperCase()}
          </Text>

          {earningsQ.isLoading && !data ? (
            <SkeletonGroup count={3}>
              <ListRowSkeleton height={72} />
            </SkeletonGroup>
          ) : !data || data.recent_tips.length === 0 ? (
            <Card>
              <Text variant="caption" color={theme.muted}>
                No tips yet — keep cutting.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {data.recent_tips.map((tip) => (
                <Card key={tip.name} padded style={styles.tipRow}>
                  <View style={styles.tipIcon}>
                    <Icon name="rupee" size={18} color={palette.ink} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.tipHead}>
                      <Text variant="bodyBold" numberOfLines={1}>
                        {tip.customer_name ?? t('staff.earnings_tip_anonymous')}
                      </Text>
                      <Text variant="mono">+{formatCurrency(tip.amount, currency)}</Text>
                    </View>
                    {tip.message && (
                      <Text variant="caption" color={theme.muted} numberOfLines={2}>
                        “{tip.message}”
                      </Text>
                    )}
                    <View style={styles.tipMeta}>
                      {tip.rating != null && <Stars value={tip.rating} size={11} />}
                      <Text variant="labelSm" color={theme.muted}>
                        {formatShortDate(tip.posted_at)} · {formatLocalTime(tip.posted_at)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  icon: 'scissors' | 'star' | 'heart' | 'close';
  tone?: 'default' | 'red';
}

function StatTile({ label, value, icon, tone = 'default' }: StatTileProps) {
  const { theme } = useTheme();
  const valueColor = tone === 'red' ? palette.red : theme.text;
  return (
    <View style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <View style={styles.statTileTop}>
        <Text variant="labelSm" color={theme.muted}>
          {label.toUpperCase()}
        </Text>
        <Icon name={icon} size={14} color={theme.muted} />
      </View>
      <Text variant="display" color={valueColor} style={styles.statTileValue}>
        {value}
      </Text>
    </View>
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
  hero: {
    height: 160,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBody: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
    gap: 4,
  },
  heroAmount: {
    fontFamily: fontFamilies.display,
    fontSize: 56,
    lineHeight: 56,
    color: palette.ink,
    letterSpacing: 1,
    marginVertical: 2,
  },
  heroIcon: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    opacity: 0.45,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statTile: {
    width: '48%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
  },
  statTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTileValue: {
    fontSize: 32,
    lineHeight: 32,
    marginVertical: 2,
  },
  section: {},
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
});
