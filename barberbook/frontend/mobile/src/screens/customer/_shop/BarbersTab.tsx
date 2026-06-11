import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useBarbersForShop } from '../../../api/hooks';
import type { Barber } from '../../../api/types';
import {
  Card,
  Icon,
  ListRowSkeleton,
  Portrait,
  SkeletonGroup,
  Stars,
  Tag,
  Text,
} from '../../../components';
import { useTheme } from '../../../design/ThemeProvider';
import { palette, radii, spacing } from '../../../design/tokens';
import type { DiscoverStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<DiscoverStackParamList>;

interface Props {
  shopId: string;
}

/** Made-up future slots so the row reads as "scheduled". Real availability
 *  comes from `getAvailability` once it's wired to the booking flow. */
function fakeNextSlots(barber: Barber, idx: number): string[] {
  const base = 9 + idx; // start time per barber
  return [
    `${String(base).padStart(2, '0')}:30`,
    `${String(base + 1).padStart(2, '0')}:00`,
    `${String(base + 2).padStart(2, '0')}:30`,
  ];
}

export function BarbersTab({ shopId }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const barbersQ = useBarbersForShop(shopId);

  if (barbersQ.isLoading && !barbersQ.data) {
    return (
      <View style={styles.root}>
        <SkeletonGroup count={3}>
          <ListRowSkeleton height={96} />
        </SkeletonGroup>
      </View>
    );
  }

  const barbers = barbersQ.data ?? [];

  return (
    <View style={styles.root}>
      <Text variant="label" color={theme.muted}>
        {t('shop.barbers_label').toUpperCase()}
      </Text>

      {barbers.map((b, i) => (
        <Card key={b.name} padded={false} style={styles.row}>
          <Portrait seed={b.avatar_seed} size={56} initials={b.initials} />

          <View style={styles.rowBody}>
            <View style={styles.rowHead}>
              <Text variant="bodyBold">{b.short_name}</Text>
              <Tag
                label={t('shop.barbers_seat', { n: (i % 3) + 1 })}
                bg={palette.cream}
                color={palette.ink}
              />
            </View>

            <View style={styles.rowMeta}>
              <Stars value={Math.round(b.rating)} size={11} />
              <Text variant="bodyBold">{b.rating.toFixed(1)}</Text>
              <Text variant="caption" color={theme.muted}>
                ({b.rating_count}) · {b.years_experience}y
              </Text>
            </View>

            <Text variant="caption" color={theme.muted} numberOfLines={1}>
              {t('shop.barbers_skills')} · {b.specialties}
            </Text>

            <View style={styles.slotsRow}>
              <Text variant="labelSm" color={theme.muted}>
                {t('shop.barbers_next').toUpperCase()}
              </Text>
              {fakeNextSlots(b, i).map((slot) => (
                <View key={slot} style={[styles.slotPill, { borderColor: theme.lineStrong }]}>
                  <Text variant="mono">{slot}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => {
              nav.navigate('BookingServices', { shopId });
            }}
            accessibilityRole="button"
            accessibilityLabel={t('shop.barbers_pick', { name: b.short_name })}
            style={styles.cta}
          >
            <Icon name="chevronRight" size={20} color={palette.red} />
          </Pressable>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  slotPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  cta: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
