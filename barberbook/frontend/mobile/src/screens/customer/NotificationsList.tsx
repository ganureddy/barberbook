import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Icon, Tag, Text, type IconName } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import type { MeStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MeStackParamList, 'NotificationsList'>;

interface NotifItem {
  id: string;
  kind: 'booking_confirmation' | 'walkin_update' | 'review_prompt' | 'loyalty_earned' | 'reminder';
  title: string;
  body: string;
  receivedAt: string;
  unread?: boolean;
  bookingId?: string;
  shopId?: string;
  // Optional geo so the "directions" action can hand off to the OS map.
  geo?: { lat: number; lng: number; label: string };
}

const ITEMS: NotifItem[] = [
  {
    id: 'n1',
    kind: 'reminder',
    title: 'Heading to BarberBook?',
    body: "Raj's Classic Cuts in 1 hour · Sat 11:30",
    receivedAt: 'Today · 10:30',
    unread: true,
    bookingId: 'BB-BKG-5001',
    geo: { lat: 12.9719, lng: 77.6412, label: "Raj's Classic Cuts" },
  },
  {
    id: 'n2',
    kind: 'booking_confirmation',
    title: 'Booked at Pole & Pomade',
    body: 'Token BB-48-291 · Mon 18:20',
    receivedAt: 'Mon · 17:50',
    bookingId: 'BB-BKG-4900',
    geo: { lat: 12.9356, lng: 77.6245, label: 'Pole & Pomade' },
  },
  {
    id: 'n3',
    kind: 'review_prompt',
    title: 'Rate your visit',
    body: 'Imran K. would love your feedback.',
    receivedAt: 'Sun · 14:10',
    bookingId: 'BB-BKG-4900',
  },
  {
    id: 'n4',
    kind: 'loyalty_earned',
    title: '+120 loyalty points',
    body: 'Booking @ Pole & Pomade · 760 to Gold',
    receivedAt: 'Sun · 14:08',
  },
  {
    id: 'n5',
    kind: 'walkin_update',
    title: "You're next",
    body: "Imran K. is calling token 07 at Raj's Classic Cuts.",
    receivedAt: 'Apr 22 · 13:18',
  },
];

const KIND_ICON: Record<NotifItem['kind'], IconName> = {
  booking_confirmation: 'calendar',
  walkin_update: 'pole',
  review_prompt: 'star',
  loyalty_earned: 'trophy',
  reminder: 'bell',
};

const KIND_TONE: Record<NotifItem['kind'], string> = {
  booking_confirmation: palette.red,
  walkin_update: palette.gold,
  review_prompt: palette.gold,
  loyalty_earned: palette.gold,
  reminder: palette.red,
};

export function NotificationsList() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['left', 'right']}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="display">{t('notifications.title')}</Text>
        </View>

        {ITEMS.map((item) => (
          <Card key={item.id} padded style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: KIND_TONE[item.kind] }]}>
                <Icon name={KIND_ICON[item.kind]} size={18} color={palette.cream} />
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <View style={styles.titleRow}>
                  <Text variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                    {item.title}
                  </Text>
                  {item.unread && <Tag label="NEW" bg={palette.red} color={palette.cream} />}
                </View>
                <Text variant="caption" color={theme.muted} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text variant="labelSm" color={theme.muted} style={{ marginTop: 4 }}>
                  {item.receivedAt.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Action shortcuts */}
            <View style={styles.actions}>
              {(item.kind === 'booking_confirmation' || item.kind === 'reminder') && (
                <ActionBtn
                  label={t('notifications.action_rebook')}
                  icon="plus"
                  onPress={() =>
                    nav.getParent()?.navigate('DiscoverTab', {
                      screen: 'ShopDetail',
                      params: { id: item.shopId ?? 'BB-SHOP-00001' },
                    })
                  }
                />
              )}
              {item.kind === 'review_prompt' && item.bookingId && (
                <ActionBtn
                  label={t('notifications.action_rate')}
                  icon="star"
                  onPress={() =>
                    nav.getParent()?.navigate('DiscoverTab', {
                      screen: 'RateExperience',
                      params: { bookingId: item.bookingId! },
                    })
                  }
                />
              )}
              {item.geo && (
                <ActionBtn
                  label={t('notifications.action_directions')}
                  icon="pin"
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    const { lat, lng, label } = item.geo!;
                    const url = `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(
                      label,
                    )}`;
                    Linking.openURL(url).catch(() => {});
                  }}
                />
              )}
            </View>
          </Card>
        ))}

        {ITEMS.length === 0 && (
          <Card>
            <Text variant="caption" color={theme.muted}>
              {t('notifications.empty')}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ActionBtnProps {
  label: string;
  icon: IconName;
  onPress: () => void;
}

function ActionBtn({ label, icon, onPress }: ActionBtnProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.lineStrong,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
    >
      <Icon name={icon} size={14} color={theme.text} />
      <Text variant="label" color={theme.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  card: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
});
