import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNearbyShops } from '../../api/hooks';
import { BackIcon, Icon, Text } from '../../components';
import { LeafletMap, type MapMarker } from '../../components/LeafletMap';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import type { DiscoverStackParamList } from '../../navigation/types';
import { useLocationStore } from '../../store/useLocationStore';

import { FilterRow } from './_discovery/FilterRow';
import { applyDiscovery, useDiscoveryControls } from './_discovery/types';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'DiscoveryMap'>;

/**
 * Nearby shops on an interactive map (Leaflet + OpenStreetMap via WebView —
 * no Google Maps SDK / API key). Tap a price-pill marker to open the shop.
 */
export function DiscoveryMap() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const loc = useLocationStore((s) => s.current);
  const { sort, filters, toggleFilter } = useDiscoveryControls();

  const shopsQ = useNearbyShops({
    latitude: loc.latitude,
    longitude: loc.longitude,
    radius_km: 25,
    limit: 50,
  });

  const visible = useMemo(
    () => applyDiscovery(shopsQ.data ?? [], sort, filters),
    [filters, shopsQ.data, sort],
  );

  const markers = useMemo<MapMarker[]>(
    () =>
      visible.map((s) => ({
        id: s.name,
        lat: s.latitude,
        lng: s.longitude,
        label: '₹'.repeat(Math.max(1, s.price_tier)),
      })),
    [visible],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      <LeafletMap
        style={StyleSheet.absoluteFill}
        markers={markers}
        center={{ lat: loc.latitude, lng: loc.longitude }}
        zoom={13}
        onMarkerPress={(id) => {
          nav.navigate('ShopDetail', { id });
        }}
      />

      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.topOverlay}
        pointerEvents="box-none"
      >
        <View style={styles.headerRow} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              nav.goBack();
            }}
            hitSlop={20}
            style={[
              styles.iconBtn,
              { backgroundColor: theme.surface, borderColor: theme.line },
              shadow.sm,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <BackIcon size={20} color={theme.text} />
          </Pressable>

          <View
            style={[
              styles.cityBadge,
              { backgroundColor: theme.surface, borderColor: theme.line },
              shadow.sm,
            ]}
          >
            <Icon name="pin" size={14} color={palette.red} />
            <Text variant="label" color={theme.text}>
              {loc.city ?? 'Around you'}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              nav.navigate('DiscoveryList');
            }}
            hitSlop={20}
            style={[
              styles.iconBtn,
              { backgroundColor: theme.surface, borderColor: theme.line },
              shadow.sm,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('discover.view_list')}
          >
            <Icon name="menu" size={20} color={theme.text} />
          </Pressable>
        </View>

        <FilterRow state={filters} onToggle={toggleFilter} />
      </SafeAreaView>

      {shopsQ.isLoading && !shopsQ.data && (
        <View style={[styles.loaderPill, { backgroundColor: theme.surface }, shadow.md]}>
          <ActivityIndicator color={palette.red} />
          <Text variant="caption">{t('discover.loading')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cityBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  loaderPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
});
