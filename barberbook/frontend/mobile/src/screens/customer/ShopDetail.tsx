import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShop } from '../../api/hooks';
import { BackIcon, Button, Icon, ShopPhoto, Stars, Tag, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import type { DiscoverStackParamList } from '../../navigation/types';
import { useBookingDraftStore } from '../../store/useBookingDraftStore';

import { AboutTab } from './_shop/AboutTab';
import { BarbersTab } from './_shop/BarbersTab';
import { MenuTab } from './_shop/MenuTab';
import { ReviewsTab } from './_shop/ReviewsTab';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'ShopDetail'>;
type Rt = RouteProp<DiscoverStackParamList, 'ShopDetail'>;

type Tab = 'menu' | 'barbers' | 'reviews' | 'about';
const TABS: Tab[] = ['menu', 'barbers', 'reviews', 'about'];

const HERO_HEIGHT = 280;

export function ShopDetail() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const shopQ = useShop(params.id);

  const [activeTab, setActiveTab] = useState<Tab>('menu');
  const [heroPage, setHeroPage] = useState(0);
  const draftServiceCount = useBookingDraftStore((s) => s.services.length);
  const startForShop = useBookingDraftStore((s) => s.startForShop);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, HERO_HEIGHT],
          [0, -HERO_HEIGHT * 0.4],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(scrollY.value, [-100, 0], [1.15, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  // Compact header that fades IN as the hero scrolls past.
  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HERO_HEIGHT * 0.5, HERO_HEIGHT * 0.85],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const shop = shopQ.data;
  const photos = useMemo(() => {
    if (!shop) return [];
    if (shop.photos && shop.photos.length > 0) return shop.photos;
    return shop.cover_image ? [shop.cover_image] : [];
  }, [shop]);

  const onHeroScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, screenW));
    setHeroPage(page);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style="light" />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        stickyHeaderIndices={[1]}
      >
        {/* HERO */}
        <Animated.View style={[styles.hero, heroStyle]}>
          {photos.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onHeroScroll}
                scrollEventThrottle={16}
              >
                {photos.map((uri) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={{ width: screenW, height: HERO_HEIGHT }}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {photos.length > 1 && (
                <View style={styles.heroDots} pointerEvents="none">
                  {photos.map((uri, i) => (
                    <View
                      key={uri}
                      style={[
                        styles.heroDot,
                        { opacity: i === heroPage ? 1 : 0.4, width: i === heroPage ? 18 : 6 },
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            shop != null && (
              <ShopPhoto
                variant={shop.cover_variant}
                width={screenW}
                height={HERO_HEIGHT}
                radius={0}
                name={shop.shop_name.split(' ')[0]?.toUpperCase()}
              />
            )
          )}
          <View style={styles.heroScrim} pointerEvents="none" />
          <SafeAreaView edges={['top', 'left', 'right']} style={styles.heroOverlay}>
            <Pressable
              onPress={() => {
                nav.goBack();
              }}
              hitSlop={20}
              style={styles.iconBtnDark}
              accessibilityLabel={t('common.back')}
            >
              <BackIcon size={20} color={palette.cream} />
            </Pressable>

            <View style={{ flex: 1 }} />

            <Pressable hitSlop={20} style={styles.iconBtnDark} accessibilityLabel="Like">
              <Icon name="heart" size={18} color={palette.cream} />
            </Pressable>
          </SafeAreaView>
        </Animated.View>

        {/* STICKY: tab bar + (when collapsed) compact header */}
        <View>
          <View style={[styles.titleBlock, { backgroundColor: theme.bg }]}>
            <View style={styles.tagRow}>
              {shop?.is_open === 1 ? (
                <Tag label={t('discover.open')} bg={palette.red} color={palette.cream} />
              ) : (
                <Tag label={t('discover.closed')} bg={palette.charcoal} color={palette.cream} />
              )}
              {shop?.accepts_walkin === 1 && (
                <Tag label={t('discover.walkin_ok')} bg={palette.gold} color={palette.ink} />
              )}
            </View>
            <Text variant="display" numberOfLines={2}>
              {shop?.shop_name ?? '—'}
            </Text>
            <View style={styles.metaRow}>
              <Stars value={Math.round(shop?.rating ?? 0)} size={13} />
              <Text variant="bodyBold">{(shop?.rating ?? 0).toFixed(1)}</Text>
              <Text variant="caption" color={theme.muted}>
                ({shop?.rating_count ?? 0}) · {shop?.city ?? ''} ·{' '}
                {'₹'.repeat(shop?.price_tier ?? 1)}
              </Text>
            </View>
          </View>

          {/* Sticky tab bar */}
          <View
            style={[styles.tabBar, { backgroundColor: theme.bg, borderBottomColor: theme.line }]}
          >
            <Animated.View
              pointerEvents="none"
              style={[styles.compactHeader, { backgroundColor: theme.bg }, compactStyle]}
            >
              <Text variant="bodyBold" numberOfLines={1}>
                {shop?.shop_name ?? '—'}
              </Text>
            </Animated.View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabRow}
            >
              {TABS.map((tab) => {
                const active = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setActiveTab(tab);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={styles.tabBtn}
                  >
                    <Text variant="label" color={active ? theme.text : theme.muted}>
                      {t(`shop.tabs.${tab}`).toUpperCase()}
                    </Text>
                    {active && <View style={styles.tabUnderline} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* TAB CONTENT */}
        {activeTab === 'menu' && <MenuTab shopId={params.id} />}
        {activeTab === 'barbers' && <BarbersTab shopId={params.id} />}
        {activeTab === 'reviews' && <ReviewsTab shopId={params.id} />}
        {activeTab === 'about' && <AboutTab shopId={params.id} />}
      </Animated.ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyCta, { paddingBottom: insets.bottom + spacing.md }, shadow.lg]}>
        <View style={styles.ctaRow}>
          <View style={{ flex: 1 }}>
            <Button
              block
              size="lg"
              variant="red"
              label={
                draftServiceCount > 0
                  ? `${t('shop.book_cta')} · ${draftServiceCount}`
                  : t('shop.book_cta')
              }
              onPress={() => {
                startForShop(params.id);
                nav.navigate('BookingServices', { shopId: params.id });
              }}
            />
          </View>
          <Pressable
            onPress={() => nav.getParent()?.navigate('BookingsTab', { screen: 'Walkin' })}
            accessibilityRole="button"
            accessibilityLabel={t('shop.book_walkin')}
            style={[styles.walkinBtn, { borderColor: theme.lineStrong }]}
          >
            <Icon name="pole" size={18} color={palette.red} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    height: HERO_HEIGHT,
    backgroundColor: palette.creamDeep,
    overflow: 'hidden',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,14,16,0.18)',
  },
  heroDots: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  heroDot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.cream,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  iconBtnDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,14,16,0.55)',
  },
  titleBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tabBar: {
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  compactHeader: {
    position: 'absolute',
    top: -56,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  tabRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  tabBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: palette.red,
    borderRadius: 1.5,
  },
  stickyCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: 'transparent',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  walkinBtn: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: palette.cream,
  },
});
