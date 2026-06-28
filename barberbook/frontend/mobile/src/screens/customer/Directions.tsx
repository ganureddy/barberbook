import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBooking, useShop } from '../../api/hooks';
import { BackIcon, Button, Card, Icon, RouteMap, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { locateMe } from '../../lib/locate';
import type { DiscoverStackParamList } from '../../navigation/types';
import { useLocationStore } from '../../store/useLocationStore';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'Directions'>;
type Rt = RouteProp<DiscoverStackParamList, 'Directions'>;

export function Directions() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const loc = useLocationStore((s) => s.current);
  const bookingQ = useBooking(params.bookingId);
  const shopQ = useShop(bookingQ.data?.shop ?? null);
  const shop = shopQ.data;

  const [route, setRoute] = useState<{ distanceKm: number; etaMin: number } | null>(null);

  // Refresh the user's real position once so the A* origin is "you, now".
  useEffect(() => {
    locateMe().catch(() => {});
  }, []);

  const start = { lat: loc.latitude, lng: loc.longitude };
  const end = shop ? { lat: shop.latitude, lng: shop.longitude } : null;

  const openExternal = () => {
    if (!end) return;
    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${start.lat},${start.lng}` +
      `&destination=${end.lat},${end.lng}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style="light" />

      {end ? (
        <RouteMap start={start} end={end} style={StyleSheet.absoluteFill} onRouteInfo={setRoute} />
      ) : (
        <View style={styles.loader}>
          <ActivityIndicator color={palette.red} />
        </View>
      )}

      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.topOverlay}
        pointerEvents="box-none"
      >
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
      </SafeAreaView>

      <View
        style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
        pointerEvents="box-none"
      >
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.routeIcon, { backgroundColor: palette.navy }]}>
              <Icon name="pin" size={18} color={palette.cream} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="labelSm" color={theme.muted}>
                {t('directions.kicker')}
              </Text>
              <Text variant="bodyBold" numberOfLines={1}>
                {shop?.shop_name ?? '—'}
              </Text>
              <Text variant="caption" color={theme.muted} numberOfLines={1}>
                {shop?.address_line ?? ''} {shop?.city ?? ''}
              </Text>
            </View>
          </View>

          <View style={[styles.statsRow, { borderTopColor: theme.line }]}>
            <Stat
              label={t('directions.distance')}
              value={route ? `${route.distanceKm.toFixed(1)} km` : '…'}
            />
            <View style={[styles.statSep, { backgroundColor: theme.line }]} />
            <Stat
              label={t('directions.eta')}
              value={route ? t('directions.eta_min', { n: route.etaMin }) : '…'}
            />
            <View style={[styles.statSep, { backgroundColor: theme.line }]} />
            <Stat label={t('directions.via')} value="A*" />
          </View>

          <Button
            block
            size="lg"
            variant="red"
            label={t('directions.open_maps')}
            leading={<Icon name="pin" size={16} color={palette.cream} />}
            onPress={openExternal}
          />
        </Card>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="labelSm" color={theme.muted}>
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyBold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl },
  card: { gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: spacing.md,
  },
  stat: { flex: 1, gap: 2 },
  statSep: { width: StyleSheet.hairlineWidth * 2, height: 28 },
});
