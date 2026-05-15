import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useServicesForShop } from '../../../api/hooks';
import type { Service } from '../../../api/types';
import { Card, Icon, ListRowSkeleton, SkeletonGroup, Text } from '../../../components';
import { useTheme } from '../../../design/ThemeProvider';
import { palette, radii, spacing } from '../../../design/tokens';
import { formatMoney } from '../../../lib/booking';
import { useBookingDraftStore } from '../../../store/useBookingDraftStore';

interface Props {
  shopId: string;
}

export function MenuTab({ shopId }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const servicesQ = useServicesForShop(shopId);
  const startForShop = useBookingDraftStore((s) => s.startForShop);
  const toggleService = useBookingDraftStore((s) => s.toggleService);
  const draftServiceNames = useBookingDraftStore((s) => new Set(s.services.map((x) => x.name)));

  // Group by category so the menu reads like a printed barber-shop board.
  const grouped = useMemo(() => {
    const out: Record<string, Service[]> = {};
    for (const s of servicesQ.data ?? []) {
      (out[s.category] ??= []).push(s);
    }
    return Object.entries(out).sort(([a], [b]) => a.localeCompare(b));
  }, [servicesQ.data]);

  if (servicesQ.isLoading && !servicesQ.data) {
    return (
      <View style={styles.root}>
        <SkeletonGroup count={4}>
          <ListRowSkeleton height={80} />
        </SkeletonGroup>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {grouped.map(([category, services]) => (
        <View key={category} style={styles.categoryBlock}>
          <Text variant="label" color={theme.muted} style={styles.categoryLabel}>
            {category.toUpperCase()}
          </Text>
          <View style={styles.cardList}>
            {services.map((s) => {
              const added = draftServiceNames.has(s.name);
              return (
                <Card key={s.name} padded={false} style={styles.serviceCard}>
                  <View style={styles.serviceRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyBold">{s.service_name}</Text>
                      <Text variant="caption" color={theme.muted}>
                        {t('shop.duration_label', { min: s.duration_minutes })}
                      </Text>
                      {s.description != null && s.description.length > 0 && (
                        <Text
                          variant="caption"
                          color={theme.muted}
                          numberOfLines={2}
                          style={{ marginTop: 4 }}
                        >
                          {s.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.priceCol}>
                      <Text variant="monoLg" color={theme.text}>
                        {formatMoney(s.price, s.currency)}
                      </Text>
                      <AddPill
                        active={added}
                        onPress={() => {
                          startForShop(shopId);
                          toggleService(s);
                        }}
                      />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

interface AddPillProps {
  active: boolean;
  onPress: () => void;
}

function AddPill({ active, onPress }: AddPillProps) {
  const { theme } = useTheme();
  return (
    <View
      onTouchEnd={onPress}
      style={[
        styles.addPill,
        {
          backgroundColor: active ? palette.red : 'transparent',
          borderColor: active ? palette.red : theme.lineStrong,
        },
      ]}
    >
      <Icon
        name={active ? 'check' : 'plus'}
        size={14}
        color={active ? palette.cream : theme.text}
      />
      <Text variant="label" color={active ? palette.cream : theme.text}>
        {active ? '' : 'ADD'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  categoryBlock: {
    gap: spacing.sm,
  },
  categoryLabel: {
    paddingHorizontal: spacing.xs,
  },
  cardList: {
    gap: spacing.sm,
  },
  serviceCard: {
    padding: spacing.md,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  priceCol: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    minWidth: 64,
    justifyContent: 'center',
  },
});
