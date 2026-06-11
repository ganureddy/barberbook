import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBarbersForShop } from '../../api/hooks';
import type { Barber } from '../../api/types';
import { Button, Card, Icon, Portrait, Stars, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import type { DiscoverStackParamList } from '../../navigation/types';
import { useBookingDraftStore } from '../../store/useBookingDraftStore';

import { StepHeader } from './_shop/StepHeader';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingBarbers'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingBarbers'>;

export function BookingBarbers() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const barbersQ = useBarbersForShop(params.shopId);
  const draftBarber = useBookingDraftStore((s) => s.barber);
  const setBarber = useBookingDraftStore((s) => s.setBarber);

  const select = (b: Barber | null) => {
    Haptics.selectionAsync().catch(() => {});
    setBarber(b);
  };

  const barbers = (barbersQ.data ?? []).slice(0, 4);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <StepHeader step={1} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card: Any available */}
        <Pressable
          onPress={() => {
            select(null);
          }}
        >
          <Card
            padded={false}
            style={[
              styles.heroCard,
              {
                backgroundColor: draftBarber == null ? palette.red : theme.surface,
                borderColor: draftBarber == null ? palette.red : theme.line,
              },
            ]}
          >
            <View style={styles.heroIcon}>
              <Icon
                name="scissors"
                size={28}
                color={draftBarber == null ? palette.cream : palette.red}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyLg" color={draftBarber == null ? palette.cream : theme.text}>
                {t('booking.any_available')}
              </Text>
              <Text
                variant="caption"
                color={draftBarber == null ? palette.cream : theme.muted}
                style={{ opacity: 0.9 }}
              >
                {t('booking.any_available_sub')}
              </Text>
            </View>
            {draftBarber == null && <Icon name="check" size={20} color={palette.cream} />}
          </Card>
        </Pressable>

        <Text variant="label" color={theme.muted} style={styles.gridLabel}>
          {t('booking.pick_barber').toUpperCase()}
        </Text>

        <View style={styles.grid}>
          {barbers.map((b, i) => {
            const active = draftBarber?.name === b.name;
            return (
              <Pressable
                key={b.name}
                onPress={() => {
                  select(b);
                }}
                style={styles.gridCell}
              >
                <Card
                  padded={false}
                  style={[
                    styles.barberCard,
                    {
                      borderColor: active ? palette.red : theme.line,
                    },
                  ]}
                >
                  <Portrait seed={b.avatar_seed} size={64} initials={b.initials} />
                  <Text variant="bodyBold" numberOfLines={1} style={{ marginTop: spacing.sm }}>
                    {b.short_name}
                  </Text>
                  <View style={styles.starsRow}>
                    <Stars value={Math.round(b.rating)} size={11} />
                    <Text variant="caption">{b.rating.toFixed(1)}</Text>
                  </View>
                  <Text variant="caption" color={theme.muted} numberOfLines={1}>
                    Seat {(i % 3) + 1} · {b.years_experience}y
                  </Text>
                  {active && (
                    <View style={styles.activeDot}>
                      <Icon name="check" size={12} color={palette.cream} />
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.md, backgroundColor: theme.surface },
        ]}
      >
        <Button
          block
          variant="red"
          size="lg"
          label={t('booking.continue_to_time')}
          onPress={() => {
            nav.navigate('BookingTime', { shopId: params.shopId });
          }}
          trailing={<Icon name="chevronRight" size={18} color={palette.cream} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridCell: {
    width: '48%',
  },
  barberCard: {
    padding: spacing.md,
    alignItems: 'flex-start',
    borderWidth: 2,
    minHeight: 168,
    overflow: 'hidden',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
});
