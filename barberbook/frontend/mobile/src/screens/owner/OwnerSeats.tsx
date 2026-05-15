import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBarbersForShop, useSeatsForShop, useWalkinSnapshot } from '../../api/hooks';
import type { Barber } from '../../api/types';
import {
  Card,
  DenseHeader,
  Icon,
  ListRowSkeleton,
  Portrait,
  SkeletonGroup,
  StatusPill,
  Text,
} from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';

import { ACTIVE_SHOP } from './_owner';

type SeatStatus = 'OPEN' | 'IN_SERVICE' | 'BREAK' | 'OFF';

interface SeatVm {
  name: string;
  number: number;
  status: SeatStatus;
  barber?: Barber | null;
  customerName?: string;
  /** Minutes remaining on the current service (only for IN_SERVICE). */
  remaining?: number;
}

const STATUS_TO_PILL: Record<SeatStatus, 'OPEN' | 'BREAK' | 'OFF' | 'InService'> = {
  OPEN: 'OPEN',
  IN_SERVICE: 'InService',
  BREAK: 'BREAK',
  OFF: 'OFF',
};

const STATUS_BG: Record<SeatStatus, string> = {
  OPEN: '#3F6B5F22',
  IN_SERVICE: '#D4322C16',
  BREAK: '#C9A24C22',
  OFF: 'transparent',
};

export function OwnerSeats() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const seatsQ = useSeatsForShop(ACTIVE_SHOP);
  const barbersQ = useBarbersForShop(ACTIVE_SHOP);
  const walkinQ = useWalkinSnapshot(ACTIVE_SHOP);

  // Compose a deterministic floor map: every seat fixture gets a status
  // derived from the walkin queue + barber roster. In production these
  // come from the server; for now we build a coherent demo so the screen
  // reads as a real live floor.
  const seatVms = useMemo<SeatVm[]>(() => {
    const seats = seatsQ.data ?? [];
    const barbers = barbersQ.data ?? [];
    const inServiceCount =
      walkinQ.data?.tickets.filter((t) => t.status === 'InService').length ?? 1;
    return seats.map((s, i) => {
      const barber = barbers[i % Math.max(1, barbers.length)] ?? null;
      let status: SeatStatus = 'OPEN';
      if (i === 0 && inServiceCount > 0) status = 'IN_SERVICE';
      else if (i === seats.length - 1 && seats.length > 2) status = 'BREAK';
      else if (i === seats.length - 1 && seats.length > 3) status = 'OFF';
      return {
        name: s.name,
        number: s.seat_number,
        status,
        barber,
        customerName: status === 'IN_SERVICE' ? 'Imran K.' : undefined,
        remaining: status === 'IN_SERVICE' ? 12 : undefined,
      };
    });
  }, [barbersQ.data, seatsQ.data, walkinQ.data]);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader kicker="LIVE FLOOR" title={t('owner.seats_title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Floor visualization grid */}
        <View style={styles.grid}>
          {seatsQ.isLoading && !seatsQ.data
            ? Array.from({ length: 4 }, (_, i) => (
                <View key={i} style={styles.seatCell}>
                  <ListRowSkeleton height={132} />
                </View>
              ))
            : seatVms.map((s) => (
                <View key={s.name} style={styles.seatCell}>
                  <Card
                    padded
                    style={[styles.seatCard, { backgroundColor: STATUS_BG[s.status] }, shadow.sm]}
                  >
                    <View style={styles.seatTop}>
                      <Text variant="label" color={theme.muted}>
                        SEAT {String(s.number).padStart(2, '0')}
                      </Text>
                      <StatusPill status={STATUS_TO_PILL[s.status]} />
                    </View>

                    {s.barber ? (
                      <View style={styles.seatBarber}>
                        <Portrait
                          seed={s.barber.avatar_seed}
                          size={36}
                          initials={s.barber.initials}
                        />
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyBold" numberOfLines={1}>
                            {s.barber.short_name}
                          </Text>
                          <Text variant="caption" color={theme.muted} numberOfLines={1}>
                            {s.barber.specialties}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text variant="caption" color={theme.muted}>
                        Unassigned
                      </Text>
                    )}

                    {s.customerName && (
                      <View style={styles.seatFooter}>
                        <Icon name="scissors" size={14} color={palette.red} />
                        <Text variant="caption" numberOfLines={1}>
                          {s.customerName}
                        </Text>
                        {s.remaining != null && (
                          <Text variant="mono" color={palette.red}>
                            {s.remaining}m
                          </Text>
                        )}
                      </View>
                    )}
                  </Card>
                </View>
              ))}
        </View>

        {/* Today's roster */}
        <View style={styles.rosterBlock}>
          <Text variant="label" color={theme.muted} style={{ marginBottom: spacing.sm }}>
            {t('owner.seats_roster_title').toUpperCase()}
          </Text>

          {barbersQ.isLoading && !barbersQ.data ? (
            <SkeletonGroup count={3}>
              <ListRowSkeleton height={64} />
            </SkeletonGroup>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {(barbersQ.data ?? []).map((b, i) => (
                <Card key={b.name} padded style={styles.rosterRow}>
                  <Portrait seed={b.avatar_seed} size={40} initials={b.initials} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.rosterTop}>
                      <Text variant="bodyBold">{b.short_name}</Text>
                      <Text variant="mono" color={theme.muted}>
                        09:00 — 21:00
                      </Text>
                    </View>
                    <Text variant="caption" color={theme.muted}>
                      Seat {(i % seatVms.length) + 1} · {b.specialties}
                    </Text>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  seatCell: {
    width: '48%',
  },
  seatCard: {
    minHeight: 132,
    gap: spacing.sm,
    borderRadius: radii.lg,
  },
  seatTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seatBarber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  seatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  rosterBlock: {},
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rosterTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
