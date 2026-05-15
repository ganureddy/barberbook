import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyBookings } from '../../api/hooks';
import {
  Card,
  Icon,
  LanguageSwitcher,
  ListRowSkeleton,
  Portrait,
  SkeletonGroup,
  Stars,
  Tag,
  Text,
  ThemeSwitcher,
  type IconName,
} from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { formatMoney } from '../../lib/booking';
import type { MeStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';

type Nav = NativeStackNavigationProp<MeStackParamList, 'Profile'>;

export function Profile() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const bookingsQ = useMyBookings();

  const bookings = bookingsQ.data ?? [];
  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => new Date(b.scheduled_at).getTime() > Date.now() - 60 * 60 * 1000)
        .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at))[0],
    [bookings],
  );
  const past = useMemo(
    () =>
      bookings
        .filter((b) => b.name !== upcoming?.name)
        .sort((a, b) => +new Date(b.scheduled_at) - +new Date(a.scheduled_at))
        .slice(0, 5),
    [bookings, upcoming],
  );

  const totalSpent = useMemo(
    () => bookings.reduce((sum, b) => sum + (b.total_amount ?? 0), 0),
    [bookings],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Portrait
            seed={user?.avatar_seed ?? 'me'}
            size={64}
            initials={(user?.full_name ?? 'U').slice(0, 2).toUpperCase()}
          />
          <View style={{ flex: 1 }}>
            <Text variant="display" numberOfLines={1}>
              {user?.full_name ?? 'BarberBook user'}
            </Text>
            <Text variant="caption" color={theme.muted}>
              {user?.phone ?? ''} · {user?.email ?? ''}
            </Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsRow}>
          <Stat label={t('profile.stats_bookings')} value={bookings.length.toString()} />
          <Stat label={t('profile.stats_favs')} value="3" />
          <Stat label={t('profile.stats_spent')} value={formatMoney(totalSpent, 'INR')} mono />
        </View>

        {/* Upcoming */}
        <Section title={t('profile.upcoming')}>
          {bookingsQ.isLoading ? (
            <ListRowSkeleton height={88} />
          ) : upcoming ? (
            <Pressable
              onPress={() =>
                nav.getParent()?.navigate('PassTab', {
                  screen: 'BookingSuccess',
                  params: { bookingId: upcoming.name },
                })
              }
            >
              <Card style={styles.upcomingCard}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Tag label="UPCOMING" bg={palette.red} color={palette.cream} />
                  <Text variant="bodyLg">{upcoming.shop}</Text>
                  <Text variant="caption" color={theme.muted}>
                    {upcoming.scheduled_at.replace('T', ' · ')} · token {upcoming.token_code}
                  </Text>
                </View>
                <View style={[styles.qrShortcut, { borderColor: theme.lineStrong }]}>
                  <Icon name="qr" size={22} color={theme.text} />
                  <Text variant="labelSm" color={theme.muted}>
                    {t('profile.show_qr').toUpperCase()}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ) : (
            <Card>
              <Text variant="caption" color={theme.muted}>
                No upcoming bookings.
              </Text>
            </Card>
          )}
        </Section>

        {/* Past */}
        <Section title={t('profile.past')}>
          {bookingsQ.isLoading ? (
            <SkeletonGroup count={3}>
              <ListRowSkeleton />
            </SkeletonGroup>
          ) : past.length === 0 ? (
            <Card>
              <Text variant="caption" color={theme.muted}>
                No past bookings yet.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {past.map((b) => (
                <Card key={b.name} padded style={styles.pastCard}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="bodyBold" numberOfLines={1}>
                      {b.shop}
                    </Text>
                    <Text variant="caption" color={theme.muted}>
                      {b.scheduled_at.replace('T', ' · ').slice(0, 19)} ·{' '}
                      {formatMoney(b.total_amount, b.currency)}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Stars value={5} size={11} />
                    <Text variant="labelSm" color={theme.muted}>
                      RATED
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </Section>

        {/* Settings */}
        <Section title={t('profile.settings')}>
          <View style={{ gap: spacing.sm }}>
            <SettingRow
              icon="bell"
              label={t('profile.preview_notification')}
              onPress={() => {
                nav.navigate('NotificationPreview');
              }}
            />
            <SettingRow
              icon="qr"
              label={t('notifications.title')}
              onPress={() => {
                nav.navigate('NotificationsList');
              }}
            />
          </View>

          <View style={{ marginTop: spacing.md, gap: spacing.md }}>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </View>

          <View style={{ marginTop: spacing.md }}>
            <SettingRow
              icon="close"
              label={t('profile.sign_out')}
              tone="red"
              onPress={() => {
                logout().catch(() => {});
              }}
            />
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
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

interface StatProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Stat({ label, value, mono = false }: StatProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Text variant={mono ? 'monoLg' : 'displaySm'} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="labelSm" color={theme.muted}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

interface SettingRowProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'red';
}

function SettingRow({ icon, label, onPress, tone = 'default' }: SettingRowProps) {
  const { theme } = useTheme();
  const color = tone === 'red' ? palette.red : theme.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.settingRow,
        { backgroundColor: theme.surface, borderColor: theme.line, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon name={icon} size={18} color={color} />
      <Text variant="bodyBold" color={color} style={{ flex: 1 }}>
        {label}
      </Text>
      <Icon name="chevronRight" size={16} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  qrShortcut: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    gap: 4,
  },
  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingBadge: {
    alignItems: 'flex-end',
    gap: 2,
  },
  section: {
    gap: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
});
