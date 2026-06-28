import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getStaffCustomerProfile, type StaffCustomerProfile } from '../../api/resources';
import type { Currency } from '../../api/types';
import {
  Card,
  Icon,
  ListRowSkeleton,
  Portrait,
  SkeletonGroup,
  Stars,
  Text,
  type IconName,
} from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { formatCurrency, formatShortDate } from '../../lib/format';
import type { StaffStackParamList } from '../../navigation/types';

import { useActiveBarber } from './_staff';

type Rt = RouteProp<StaffStackParamList, 'StaffCustomer'>;

interface PrefRow {
  key: 'hair' | 'beard' | 'allergies' | 'music';
  icon: IconName;
}
const PREFS: PrefRow[] = [
  { key: 'hair', icon: 'scissors' },
  { key: 'beard', icon: 'razor' },
  { key: 'allergies', icon: 'bell' },
  { key: 'music', icon: 'star' },
];

export function StaffCustomer() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { params } = useRoute<Rt>();
  const activeBarber = useActiveBarber();

  const profileQ = useQuery<StaffCustomerProfile>({
    queryKey: ['staff', 'customer', activeBarber, params.customerId],
    queryFn: () => getStaffCustomerProfile(activeBarber, params.customerId),
  });

  const data = profileQ.data;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="labelSm" color={palette.gold}>
              {t('staff.customer_title').toUpperCase()}
            </Text>
            <Text variant="display" numberOfLines={1}>
              {data?.full_name ?? '—'}
            </Text>
            <Text variant="caption" color={theme.muted}>
              {data?.phone ?? ''}
            </Text>
          </View>
          {data && (
            <Portrait
              seed={data.avatar_seed}
              size={64}
              initials={data.full_name.slice(0, 2).toUpperCase()}
            />
          )}
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <Stat
            label={t('staff.customer_stats_visits')}
            value={String(data?.stats.visits_with_you ?? 0)}
          />
          <Stat
            label={t('staff.customer_stats_spent')}
            value={
              data ? formatCurrency(data.stats.total_spent, data.stats.currency as Currency) : '—'
            }
            mono
          />
          <Stat
            label={t('staff.customer_stats_avg_rating')}
            value={data ? data.stats.avg_rating.toFixed(1) : '—'}
          />
        </View>

        {/* Preferences */}
        {profileQ.isLoading && !data ? (
          <Card padded>
            <SkeletonGroup count={3}>
              <ListRowSkeleton height={40} />
            </SkeletonGroup>
          </Card>
        ) : (
          <Card padded>
            {PREFS.map((p, i) => {
              const value = data?.preferences[p.key];
              return (
                <View
                  key={p.key}
                  style={[
                    styles.prefRow,
                    i < PREFS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth * 2,
                      borderBottomColor: theme.line,
                    },
                  ]}
                >
                  <View style={[styles.prefIcon, { backgroundColor: theme.surfaceAlt }]}>
                    <Icon name={p.icon} size={16} color={theme.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelSm" color={theme.muted}>
                      {t(`staff.customer_pref_${p.key}`).toUpperCase()}
                    </Text>
                    <Text variant="body" color={value ? theme.text : theme.muted} numberOfLines={2}>
                      {value ?? '—'}
                    </Text>
                  </View>
                </View>
              );
            })}
            {data?.preferences.notes && (
              <View
                style={[
                  styles.notesBlock,
                  { borderColor: theme.line, backgroundColor: theme.surfaceAlt },
                ]}
              >
                <Text variant="labelSm" color={theme.muted}>
                  NOTES
                </Text>
                <Text variant="body" style={{ marginTop: 2 }}>
                  {data.preferences.notes}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Past visits */}
        <View style={styles.section}>
          <Text variant="label" color={theme.muted} style={{ marginBottom: spacing.sm }}>
            {t('staff.customer_past_visits').toUpperCase()}
          </Text>

          {profileQ.isLoading && !data ? (
            <SkeletonGroup count={3}>
              <ListRowSkeleton height={64} />
            </SkeletonGroup>
          ) : !data || data.past_visits.length === 0 ? (
            <Card>
              <Text variant="caption" color={theme.muted}>
                {t('staff.customer_no_past')}
              </Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {data.past_visits.map((v) => (
                <Card key={v.name} padded style={styles.visitRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold">{v.service_summary}</Text>
                    <Text variant="caption" color={theme.muted}>
                      {formatShortDate(v.scheduled_at)} ·{' '}
                      {formatCurrency(v.total_amount, v.currency as Currency)}
                    </Text>
                  </View>
                  {v.rating != null && (
                    <View style={styles.ratingBadge}>
                      <Stars value={v.rating} size={11} />
                      <Text variant="labelSm" color={theme.muted}>
                        {v.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Stat({ label, value, mono }: StatProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Text variant={mono ? 'monoLg' : 'displaySm'} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="labelSm" color={theme.muted}>
        {label.toUpperCase()}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 2,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  prefIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesBlock: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
    borderLeftWidth: 3,
    borderLeftColor: palette.gold,
    borderWidth: 1,
  },
  section: {},
  visitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingBadge: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
