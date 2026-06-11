import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNearbyShops } from '../../api/hooks';
import { Icon, ShopCardSkeleton, SkeletonGroup, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { radii, spacing } from '../../design/tokens';
import type { DiscoverStackParamList } from '../../navigation/types';
import { useLocationStore } from '../../store/useLocationStore';

import { FilterRow } from './_discovery/FilterRow';
import { ShopCard } from './_discovery/ShopCard';
import { SortTabs } from './_discovery/SortTabs';
import { applyDiscovery, useDiscoveryControls } from './_discovery/types';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'DiscoveryList'>;

export function DiscoveryList() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const loc = useLocationStore((s) => s.current);
  const { sort, filters, setSort, toggleFilter } = useDiscoveryControls();

  const shopsQ = useNearbyShops({
    latitude: loc.latitude,
    longitude: loc.longitude,
    radius_km: 8,
    limit: 25,
  });

  const visible = useMemo(
    () => applyDiscovery(shopsQ.data ?? [], sort, filters),
    [filters, shopsQ.data, sort],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />

      <View style={[styles.header, { borderBottomColor: theme.line }]}>
        <View style={{ flex: 1 }}>
          <Text variant="labelSm" color={theme.muted}>
            {(loc.city ?? 'Around you').toUpperCase()}
          </Text>
          <Text variant="display" style={{ marginTop: 2 }}>
            {t('discover.header_title')}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            nav.navigate('DiscoveryMap');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('discover.view_map')}
          style={[styles.viewToggle, { backgroundColor: theme.surface, borderColor: theme.line }]}
        >
          <Icon name="pin" size={16} color={theme.text} />
          <Text variant="label" color={theme.text}>
            {t('discover.view_map')}
          </Text>
        </Pressable>
      </View>

      <SortTabs value={sort} onChange={setSort} />
      <FilterRow state={filters} onToggle={toggleFilter} />

      {shopsQ.isLoading && !shopsQ.data ? (
        <View style={styles.skeletonHost}>
          <SkeletonGroup count={5}>
            <ShopCardSkeleton />
          </SkeletonGroup>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(s) => s.name}
          renderItem={({ item }) => (
            <ShopCard
              shop={item}
              onPress={() => {
                nav.navigate('ShopDetail', { id: item.name });
              }}
            />
          )}
          ListHeaderComponent={
            <View style={styles.countRow}>
              <Text variant="caption" color={theme.muted}>
                {visible.length === 0
                  ? t('discover.results_count_zero')
                  : visible.length === 1
                    ? t('discover.results_count_one')
                    : t('discover.results_count', { count: visible.length })}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={shopsQ.isRefetching}
          onRefresh={() => {
            shopsQ.refetch().catch(() => {});
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    gap: spacing.md,
  },
  viewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  countRow: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['4xl'],
  },
  skeletonHost: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
