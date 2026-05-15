import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { channels, useChannel } from '../../api/realtime';
import {
  callNextWalkin,
  completeWalkin,
  getOwnerWalkinQueue,
  type OwnerWalkinQueue,
} from '../../api/resources';
import {
  Button,
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
import { fontFamilies } from '../../design/typography';
import { toast } from '../../lib/toast';

import { ACTIVE_SHOP } from './_owner';

const QK = ['owner', 'walkin', ACTIVE_SHOP] as const;

export function OwnerWalkin() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();

  const queueQ = useQuery<OwnerWalkinQueue>({
    queryKey: QK,
    queryFn: () => getOwnerWalkinQueue(ACTIVE_SHOP),
    refetchInterval: 15 * 1000,
  });

  // Realtime: refetch the snapshot whenever a queue update arrives. Cheaper
  // than reconciling the local view against the channel payload.
  const live = useChannel<unknown>(channels.walkinQueue(ACTIVE_SHOP));
  useEffect(() => {
    if (live) {
      qc.invalidateQueries({ queryKey: QK }).catch(() => {});
    }
  }, [live, qc]);

  const callMut = useMutation({
    mutationFn: (ticketName: string) => callNextWalkin(ACTIVE_SHOP, ticketName),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Could not call ticket'),
  });

  const doneMut = useMutation({
    mutationFn: (ticketName: string) => completeWalkin(ACTIVE_SHOP, ticketName),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Could not complete ticket'),
  });

  const data = queueQ.data;
  const tickets = (data?.tickets ?? []).filter((tk) => tk.status !== 'Cancelled');
  const inService = tickets.filter((tk) => tk.status === 'InService' || tk.status === 'NextUp');
  const waiting = tickets.filter((tk) => tk.status === 'Waiting');
  const done = tickets.filter((tk) => tk.status === 'Completed');

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker="LIVE"
        title={t('owner.walkin_title')}
        trailing={
          <View style={styles.liveBadge}>
            <View style={[styles.liveDot, { backgroundColor: palette.red }]} />
            <Text variant="labelSm" color={palette.red}>
              REALTIME
            </Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* KPI strip */}
        <View style={styles.kpiRow}>
          <KpiTile
            label={t('owner.walkin_holding', { n: data?.total_in_queue ?? 0 })}
            value={String(data?.total_in_queue ?? 0)}
            icon="pole"
          />
          <KpiTile
            label={t('owner.walkin_avg_wait', { min: data?.avg_wait_minutes ?? 0 })}
            value={`${data?.avg_wait_minutes ?? 0}m`}
            icon="clock"
          />
        </View>

        {queueQ.isLoading && !data ? (
          <SkeletonGroup count={4}>
            <ListRowSkeleton height={72} />
          </SkeletonGroup>
        ) : tickets.length === 0 ? (
          <Card>
            <Text variant="caption" color={theme.muted}>
              {t('owner.walkin_empty')}
            </Text>
          </Card>
        ) : (
          <>
            {inService.length > 0 && (
              <Section title="IN SERVICE">
                <View style={{ gap: spacing.sm }}>
                  {inService.map((tk) => (
                    <Card key={tk.name} padded style={[styles.row, styles.rowActive]}>
                      <Text style={styles.tokenLg}>{tk.token_number}</Text>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyBold" color={palette.cream}>
                          {tk.customer_name ?? 'Walk-in customer'}
                        </Text>
                        <Text variant="caption" color={palette.gold}>
                          {tk.service_summary ?? '—'} · joined {tk.joined_at.slice(11, 16)}
                        </Text>
                      </View>
                      <Button
                        size="sm"
                        variant="gold"
                        label={t('owner.walkin_done')}
                        loading={doneMut.isPending && doneMut.variables === tk.name}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          doneMut.mutate(tk.name);
                        }}
                      />
                    </Card>
                  ))}
                </View>
              </Section>
            )}

            {waiting.length > 0 && (
              <Section title="WAITING">
                <View style={{ gap: spacing.sm }}>
                  {waiting.map((tk, i) => (
                    <Card key={tk.name} padded style={styles.row}>
                      <Text style={[styles.tokenLg, { color: palette.ink }]}>
                        {tk.token_number}
                      </Text>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyBold">{tk.customer_name ?? 'Walk-in customer'}</Text>
                        <Text variant="caption" color={theme.muted}>
                          {tk.service_summary ?? '—'} · ~{tk.estimated_wait_minutes}m wait
                        </Text>
                      </View>
                      <View style={styles.rowMeta}>
                        <StatusPill status={i === 0 ? 'NextUp' : 'Waiting'} />
                        <Button
                          size="sm"
                          variant="red"
                          label={t('owner.walkin_call')}
                          loading={callMut.isPending && callMut.variables === tk.name}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                            callMut.mutate(tk.name);
                          }}
                        />
                      </View>
                    </Card>
                  ))}
                </View>
              </Section>
            )}

            {done.length > 0 && (
              <Section title="DONE TODAY">
                <View style={{ gap: spacing.sm }}>
                  {done.map((tk) => (
                    <Card key={tk.name} padded style={[styles.row, { opacity: 0.6 }]}>
                      <Text style={[styles.tokenLg, { color: palette.muted, fontSize: 36 }]}>
                        {tk.token_number}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyBold">{tk.customer_name ?? 'Walk-in customer'}</Text>
                        <Text variant="caption" color={theme.muted}>
                          Served {tk.served_at?.slice(11, 16) ?? '—'}
                        </Text>
                      </View>
                      <Icon name="check" size={20} color="#3F6B5F" />
                    </Card>
                  ))}
                </View>
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="label" color={theme.muted} style={styles.sectionLabel}>
        {title}
      </Text>
      {children}
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
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(212,50,44,0.10)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowActive: {
    backgroundColor: palette.ink,
    borderColor: palette.ink,
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  tokenLg: {
    fontFamily: fontFamilies.display,
    fontSize: 44,
    lineHeight: 44,
    color: palette.cream,
    letterSpacing: 1,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    paddingHorizontal: spacing.xs,
  },
});
