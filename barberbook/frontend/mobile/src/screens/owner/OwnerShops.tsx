import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyShops } from '../../api/hooks';
import type { MyShopSummary } from '../../api/resources';
import {
  Button,
  Card,
  DenseHeader,
  Icon,
  ListRowSkeleton,
  SkeletonGroup,
  StatusPill,
  Stars,
  Text,
} from '../../components';
import { LogoutButton } from '../../components/LogoutButton';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { formatMoney } from '../../lib/booking';
import type { OwnerRootStackParamList } from '../../navigation/types';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

type Nav = NativeStackNavigationProp<OwnerRootStackParamList, 'OwnerShops'>;

export function OwnerShops() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const setActiveShop = useWorkspaceStore((s) => s.setActiveShop);
  const myShopsQ = useMyShops();
  const shops = myShopsQ.data ?? [];

  const openShop = (summary: MyShopSummary) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveShop(summary.shop.name);
    nav.navigate('OwnerHome', { screen: 'TodayTab', params: { screen: 'OwnerToday' } });
  };

  const addShop = () => {
    Haptics.selectionAsync().catch(() => {});
    nav.navigate('OwnerOnboard');
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker={t('owner.shops_kicker')}
        title={t('owner.shops_title')}
        trailing={<LogoutButton />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="editorial" color={theme.muted}>
          {t('owner.shops_subtitle')}
        </Text>

        {myShopsQ.isLoading && !myShopsQ.data ? (
          <SkeletonGroup count={3}>
            <ListRowSkeleton height={132} />
          </SkeletonGroup>
        ) : (
          <View style={{ gap: spacing.md }}>
            {shops.map((s) => (
              <ShopCard
                key={s.shop.name}
                summary={s}
                onPress={() => {
                  openShop(s);
                }}
              />
            ))}
          </View>
        )}

        <Pressable
          onPress={addShop}
          accessibilityRole="button"
          accessibilityLabel={t('owner.shops_add')}
          style={[
            styles.addCard,
            { borderColor: theme.lineStrong, backgroundColor: theme.surface },
          ]}
        >
          <View style={[styles.addIcon, { backgroundColor: palette.red }]}>
            <Icon name="plus" size={22} color={palette.cream} />
          </View>
          <Text variant="bodyBold">{t('owner.shops_add')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ShopCardProps {
  summary: MyShopSummary;
  onPress: () => void;
}

function ShopCard({ summary, onPress }: ShopCardProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { shop } = summary;
  const cover = shop.cover_image ?? shop.photos?.[0];

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={shop.shop_name}>
      <Card style={styles.shopCard}>
        <View style={styles.coverRow}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.cover, styles.coverFallback, { backgroundColor: palette.navy }]}>
              <Icon name="pole" size={28} color={palette.gold} />
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.titleRow}>
              <Text variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                {shop.shop_name}
              </Text>
              <StatusPill
                status={shop.is_open ? 'Completed' : 'Cancelled'}
                label={shop.is_open ? 'OPEN' : 'CLOSED'}
              />
            </View>
            <Text variant="caption" color={theme.muted} numberOfLines={1}>
              {shop.address_line || shop.city}
            </Text>
            {shop.rating_count > 0 && (
              <View style={styles.ratingRow}>
                <Stars value={shop.rating} size={12} />
                <Text variant="caption" color={theme.muted}>
                  {shop.rating.toFixed(1)} · {shop.rating_count}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.metrics, { borderTopColor: theme.line }]}>
          <Metric label={t('owner.shops_metric_barbers')} value={String(summary.barber_count)} />
          <View style={[styles.metricSep, { backgroundColor: theme.line }]} />
          <Metric label={t('owner.shops_metric_services')} value={String(summary.service_count)} />
          <View style={[styles.metricSep, { backgroundColor: theme.line }]} />
          <Metric
            label={t('owner.shops_metric_today')}
            value={formatMoney(summary.revenue_today, summary.currency)}
          />
        </View>

        <Button
          variant="primary"
          size="md"
          block
          label={t('owner.shops_manage')}
          trailing={<Icon name="chevronRight" size={16} color={theme.bg} />}
          onPress={onPress}
        />
      </Card>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.metric}>
      <Text variant="labelSm" color={theme.muted}>
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyBold">{value}</Text>
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
  shopCard: {
    gap: spacing.md,
  },
  coverRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  cover: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: spacing.md,
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  metricSep: {
    width: StyleSheet.hairlineWidth * 2,
    height: 28,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
