import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Chip, Divider, Icon, PriceRangeSlider, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import type { DiscoverStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'FiltersSheet'>;

type SortKey = 'recommended' | 'distance' | 'rating' | 'price_low' | 'price_high';

interface SheetState {
  services: Set<string>;
  priceLow: number;
  priceHigh: number;
  sort: SortKey;
  open_now: boolean;
  walkin: boolean;
  verified: boolean;
}

const SERVICES = ['haircut', 'beard', 'color', 'spa', 'combo'] as const;
const SORTS: SortKey[] = ['recommended', 'distance', 'rating', 'price_low', 'price_high'];
const PRICE_MIN = 0;
const PRICE_MAX = 2000;

const INITIAL_STATE: SheetState = {
  services: new Set(),
  priceLow: 100,
  priceHigh: 1500,
  sort: 'recommended',
  open_now: true,
  walkin: false,
  verified: false,
};

export function FiltersSheet() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);

  const [state, setState] = useState<SheetState>(INITIAL_STATE);

  const close = useCallback(() => {
    sheetRef.current?.close();
    // Slight delay so the close animation lands before the route pops.
    setTimeout(() => {
      nav.goBack();
    }, 180);
  }, [nav]);

  const toggleService = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setState((s) => {
      const next = new Set(s.services);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, services: next };
    });
  };

  const setPrice = useCallback((lo: number, hi: number) => {
    setState((s) =>
      s.priceLow === lo && s.priceHigh === hi ? s : { ...s, priceLow: lo, priceHigh: hi },
    );
  }, []);

  const reset = () => {
    Haptics.selectionAsync().catch(() => {});
    setState(INITIAL_STATE);
  };

  const apply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Currently only re-opens DiscoveryList — actual filter merging into
    // useNearbyShops lands when the discovery store grows a free-form
    // filter slice. The sheet still functions as a UX harness today.
    close();
  };

  // Cheap "live preview" — count how many filters are non-default.
  const activeCount = useMemo(() => {
    let n = 0;
    n += state.services.size;
    if (state.priceLow !== INITIAL_STATE.priceLow || state.priceHigh !== INITIAL_STATE.priceHigh)
      n += 1;
    if (state.sort !== INITIAL_STATE.sort) n += 1;
    if (state.open_now !== INITIAL_STATE.open_now) n += 1;
    if (state.walkin !== INITIAL_STATE.walkin) n += 1;
    if (state.verified !== INITIAL_STATE.verified) n += 1;
    return n;
  }, [state]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={['78%']}
      onClose={() => {
        nav.goBack();
      }}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.lineStrong }}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="display">{t('filters.title')}</Text>
          </View>
          <Pressable onPress={close} hitSlop={20} accessibilityLabel={t('common.cancel')}>
            <Icon name="close" size={22} />
          </Pressable>
        </View>

        <Section title={t('filters.section_services')}>
          <View style={styles.chipRow}>
            {SERVICES.map((id) => (
              <Chip
                key={id}
                label={t(`filters.service_${id}`)}
                active={state.services.has(id)}
                onPress={() => {
                  toggleService(id);
                }}
              />
            ))}
          </View>
        </Section>

        <Section title={t('filters.section_price')}>
          <PriceRangeSlider
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={50}
            low={state.priceLow}
            high={state.priceHigh}
            onChange={setPrice}
          />
        </Section>

        <Section title={t('filters.section_sort')}>
          <View style={{ gap: spacing.xs }}>
            {SORTS.map((s) => (
              <RadioRow
                key={s}
                label={t(`filters.sort_${s}`)}
                selected={state.sort === s}
                onPress={() => {
                  setState((cur) => ({ ...cur, sort: s }));
                }}
              />
            ))}
          </View>
        </Section>

        <Section title={t('filters.section_toggles')}>
          <View style={styles.chipRow}>
            <Chip
              label={t('filters.open_now')}
              active={state.open_now}
              onPress={() => {
                setState((s) => ({ ...s, open_now: !s.open_now }));
              }}
            />
            <Chip
              label={t('filters.walkin')}
              active={state.walkin}
              color={palette.red}
              onPress={() => {
                setState((s) => ({ ...s, walkin: !s.walkin }));
              }}
            />
            <Chip
              label={t('filters.verified')}
              active={state.verified}
              color={palette.gold}
              onPress={() => {
                setState((s) => ({ ...s, verified: !s.verified }));
              }}
            />
          </View>
        </Section>

        <Divider />

        <View style={styles.footerRow}>
          <Pressable onPress={reset} hitSlop={20} style={styles.resetBtn}>
            <Text variant="bodyBold" color={theme.muted}>
              {t('filters.reset')}
            </Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Button
              block
              variant="red"
              size="lg"
              label={
                activeCount > 0 ? `${t('filters.apply')} · ${activeCount}` : t('filters.apply')
              }
              onPress={apply}
            />
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="label" color={theme.muted} style={{ marginBottom: spacing.sm }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

interface RadioRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function RadioRow({ label, selected, onPress }: RadioRowProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.radioRow,
        {
          backgroundColor: selected ? 'rgba(212,50,44,0.07)' : 'transparent',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.radioOuter, { borderColor: selected ? palette.red : theme.lineStrong }]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text variant="body" color={theme.text} style={{ flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.red,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  resetBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
