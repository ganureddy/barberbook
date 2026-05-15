import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useServicesForShop } from '../../api/hooks';
import type { Service } from '../../api/types';
import { Button, Card, Icon, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { calculateBookingTotal, formatMoney } from '../../lib/booking';
import type { DiscoverStackParamList } from '../../navigation/types';
import { useBookingDraftStore } from '../../store/useBookingDraftStore';

import { StepHeader } from './_shop/StepHeader';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'BookingServices'>;
type Rt = RouteProp<DiscoverStackParamList, 'BookingServices'>;

export function BookingServices() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const servicesQ = useServicesForShop(params.shopId);
  const draftServices = useBookingDraftStore((s) => s.services);
  const startForShop = useBookingDraftStore((s) => s.startForShop);
  const toggleService = useBookingDraftStore((s) => s.toggleService);

  useEffect(() => {
    startForShop(params.shopId);
  }, [params.shopId, startForShop]);

  const draftMap = useMemo(() => new Set(draftServices.map((s) => s.name)), [draftServices]);
  const services = servicesQ.data ?? [];

  const totals = useMemo(
    () =>
      calculateBookingTotal({
        services: draftServices.map((s) => ({ name: s.service_name, price: s.price })),
        currency: services[0]?.currency,
      }),
    [draftServices, services],
  );

  const totalDuration = draftServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <StepHeader step={0} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 140 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {services.map((s) => {
          const added = draftMap.has(s.name);
          return (
            <ServiceRow
              key={s.name}
              service={s}
              added={added}
              onToggle={() => {
                Haptics.selectionAsync().catch(() => {});
                toggleService(s);
              }}
            />
          );
        })}
      </ScrollView>

      {/* Sticky subtotal footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.md, backgroundColor: theme.surface },
          shadow.lg,
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <Text variant="labelSm" color={theme.muted}>
              {t('booking.selected_n', { n: draftServices.length })}
              {totalDuration > 0 ? ` · ${t('booking.duration_n', { min: totalDuration })}` : ''}
            </Text>
            <Text variant="displaySm">{formatMoney(totals.subtotal, totals.currency)}</Text>
          </View>
          <Button
            variant="red"
            size="lg"
            label={t('booking.continue_to_barber')}
            disabled={draftServices.length === 0}
            onPress={() => {
              nav.navigate('BookingBarbers', { shopId: params.shopId });
            }}
            trailing={<Icon name="chevronRight" size={18} color={palette.cream} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

interface ServiceRowProps {
  service: Service;
  added: boolean;
  onToggle: () => void;
}

function ServiceRow({ service, added, onToggle }: ServiceRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: added }}
    >
      <Card padded={false} style={[styles.card, { borderColor: added ? palette.red : theme.line }]}>
        <View style={styles.cardRow}>
          <View
            style={[
              styles.checkbox,
              {
                borderColor: added ? palette.red : theme.lineStrong,
                backgroundColor: added ? palette.red : 'transparent',
              },
            ]}
          >
            {added && <Icon name="check" size={14} color={palette.cream} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyBold">{service.service_name}</Text>
            <Text variant="caption" color={theme.muted}>
              {service.category} · {t('shop.duration_label', { min: service.duration_minutes })}
            </Text>
          </View>
          <Text variant="monoLg">{formatMoney(service.price, service.currency)}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderWidth: 2,
    borderRadius: radii.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
