import * as Haptics from 'expo-haptics';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { NearbyShop } from '../../../api/resources';
import { Card, ShopPhoto, Stars, Tag, Text } from '../../../components';
import { useTheme } from '../../../design/ThemeProvider';
import { palette, radii, spacing } from '../../../design/tokens';

interface Props {
  shop: NearbyShop;
  onPress: () => void;
  /** When true, renders compact (used in the bottom card on the map). */
  compact?: boolean;
}

/**
 * Vertical shop card. Used as a list cell in DiscoveryList and as the
 * persistent bottom card in DiscoveryMap (compact=true). The thumbnail is
 * the SVG ShopPhoto so loading is instant and offline-safe.
 */
export function ShopCard({ shop, onPress, compact = false }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const tier = '₹'.repeat(shop.price_tier);

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={shop.shop_name}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      <Card padded={false} style={styles.card}>
        <View style={styles.row}>
          <ShopPhoto
            variant={shop.cover_variant}
            width={compact ? 72 : 96}
            height={compact ? 72 : 96}
            radius={radii.md}
            name={shop.shop_name.split(' ')[0]?.toUpperCase()}
          />

          <View style={styles.copy}>
            <View style={styles.tagRow}>
              {shop.is_open === 1 ? (
                <Tag label={t('discover.open')} bg={palette.red} color={palette.cream} />
              ) : (
                <Tag label={t('discover.closed')} bg={palette.charcoal} color={palette.cream} />
              )}
              {shop.accepts_walkin === 1 && (
                <Tag label={t('discover.walkin_ok')} bg={palette.gold} color={palette.ink} />
              )}
            </View>

            <Text variant={compact ? 'bodyBold' : 'bodyLg'} numberOfLines={1}>
              {shop.shop_name}
            </Text>

            <Text variant="caption" color={theme.muted} numberOfLines={1}>
              {t('discover.distance_eta', {
                distance: shop.distance_km.toFixed(1),
                eta: shop.eta_label ?? '—',
              })}
              {`  ·  ${tier}`}
            </Text>

            <View style={styles.starsRow}>
              <Stars value={Math.round(shop.rating)} size={compact ? 12 : 13} />
              <Text variant="bodyBold">{shop.rating.toFixed(1)}</Text>
              <Text variant="caption" color={theme.muted}>
                ({shop.rating_count})
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: 2,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
});
