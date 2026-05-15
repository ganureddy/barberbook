import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNearbyShops } from '../../api/hooks';
import type { NearbyShop } from '../../api/resources';
import { Icon, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import type { DiscoverStackParamList } from '../../navigation/types';
import { useLocationStore } from '../../store/useLocationStore';

import { FilterRow } from './_discovery/FilterRow';
import { ShopCard } from './_discovery/ShopCard';
import { applyDiscovery, useDiscoveryControls } from './_discovery/types';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'DiscoveryMap'>;

const DEFAULT_DELTA = 0.04;

export function DiscoveryMap() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const loc = useLocationStore((s) => s.current);
  const { sort, filters, toggleFilter } = useDiscoveryControls();

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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => visible.find((s) => s.name === selectedId) ?? visible[0] ?? null,
    [selectedId, visible],
  );

  // Auto-pick the first result whenever the visible list churns and the
  // selection no longer exists.
  useEffect(() => {
    if (selected == null && visible[0]) setSelectedId(visible[0].name);
  }, [selected, visible]);

  // Pan the camera to keep the selected shop on screen.
  const mapRef = useRef<MapView | null>(null);
  useEffect(() => {
    if (!selected || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: selected.latitude,
        longitude: selected.longitude - DEFAULT_DELTA / 4, // bias up so the bottom card doesn't cover it
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      },
      350,
    );
  }, [selected]);

  const initialRegion: Region = {
    latitude: loc.latitude,
    longitude: loc.longitude,
    latitudeDelta: DEFAULT_DELTA,
    longitudeDelta: DEFAULT_DELTA,
  };

  // Animated card slide-up.
  const [cardH, setCardH] = useState(0);
  const cardY = useSharedValue(0);
  useEffect(() => {
    cardY.value = withTiming(selected ? 1 : 0, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [cardY, selected]);
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - cardY.value) * (cardH + 24) }],
  }));
  const onCardLayout = (e: LayoutChangeEvent) => {
    setCardH(e.nativeEvent.layout.height);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {visible.map((s) => (
          <Marker
            key={s.name}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            onPress={() => {
              setSelectedId(s.name);
            }}
            tracksViewChanges={false}
          >
            <PriceMarker shop={s} active={s.name === selected?.name} />
          </Marker>
        ))}
      </MapView>

      {/* Top scrim so the header reads against any tile color. */}
      <View
        pointerEvents="none"
        style={[styles.topScrim, { paddingTop: insets.top, backgroundColor: theme.bg }]}
      />

      <SafeAreaView edges={['top', 'left', 'right']} style={styles.topOverlay}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              nav.goBack();
            }}
            hitSlop={20}
            style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Icon name="chevronLeft" size={20} color={theme.text} />
          </Pressable>

          <View
            style={[styles.cityBadge, { backgroundColor: theme.surface, borderColor: theme.line }]}
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
            style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.line }]}
            accessibilityRole="button"
            accessibilityLabel={t('discover.view_list')}
          >
            <Icon name="menu" size={20} color={theme.text} />
          </Pressable>
        </View>

        <FilterRow state={filters} onToggle={toggleFilter} />
      </SafeAreaView>

      {/* Loading indicator floats over the map until first results land. */}
      {shopsQ.isLoading && !shopsQ.data && (
        <View style={[styles.loaderPill, { backgroundColor: theme.surface }, shadow.md]}>
          <ActivityIndicator color={palette.red} />
          <Text variant="caption">{t('discover.loading')}</Text>
        </View>
      )}

      {/* Bottom selected-shop card. */}
      <Animated.View
        onLayout={onCardLayout}
        pointerEvents={selected ? 'auto' : 'none'}
        style={[styles.bottomCard, { paddingBottom: insets.bottom + spacing.md }, cardAnimStyle]}
      >
        {selected && (
          <ShopCard
            shop={selected}
            compact
            onPress={() => {
              nav.navigate('ShopDetail', { id: selected.name });
            }}
          />
        )}
      </Animated.View>
    </View>
  );
}

interface PriceMarkerProps {
  shop: NearbyShop;
  active: boolean;
}

/**
 * Custom map marker — reads as a price-pill ('₹', '₹₹', '₹₹₹') with a small
 * tail underneath. The active marker pops to the brand red; inactive markers
 * are ink with a thin gold border so they're legible on any tile color.
 */
function PriceMarker({ shop, active }: PriceMarkerProps) {
  const tier = '₹'.repeat(shop.price_tier);
  const bg = active ? palette.red : palette.ink;
  const fg = palette.cream;
  return (
    <View style={[markerStyles.wrap, active && markerStyles.wrapActive]} pointerEvents="none">
      <View
        style={[
          markerStyles.pill,
          { backgroundColor: bg, borderColor: active ? palette.cream : palette.gold },
        ]}
      >
        <Text variant="label" color={fg}>
          {tier}
        </Text>
      </View>
      <View style={[markerStyles.tail, { borderTopColor: bg }]} />
      {active && <View style={markerStyles.dot} />}
    </View>
  );
}

const markerStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  wrapActive: {
    transform: [{ scale: 1.08 }],
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 2,
  },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.red,
    marginTop: 2,
    borderWidth: 2,
    borderColor: palette.cream,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.0,
  },
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
    top: '40%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  bottomCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
  },
});
