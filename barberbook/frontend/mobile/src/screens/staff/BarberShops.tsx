import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyBarberWorkspaces } from '../../api/hooks';
import type { BarberWorkspace } from '../../api/resources';
import {
  Button,
  Card,
  DenseHeader,
  Icon,
  ListRowSkeleton,
  SkeletonGroup,
  StatusPill,
  Text,
} from '../../components';
import { LogoutButton } from '../../components/LogoutButton';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import type { StaffRootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

type Nav = NativeStackNavigationProp<StaffRootStackParamList, 'BarberShops'>;

export function BarberShops() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const setActiveBarber = useWorkspaceStore((s) => s.setActiveBarber);
  const setProfileName = useAuthStore((s) => s.setProfileName);
  const phone = useAuthStore((s) => s.user?.phone);
  const workspacesQ = useMyBarberWorkspaces(phone);
  const workspaces = workspacesQ.data ?? [];

  const open = (ws: BarberWorkspace) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveBarber(ws.barber, ws.shop.name);
    // Adopt the name the owner put on the barber record so the staff app
    // greets and bills under the right identity.
    if (ws.barber_name) setProfileName(ws.barber_name);
    nav.navigate('StaffHome', { screen: 'StaffSchedule' });
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker={t('staff.shops_kicker')}
        title={t('staff.shops_title')}
        trailing={<LogoutButton />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="editorial" color={theme.muted}>
          {t('staff.shops_subtitle')}
        </Text>

        {workspacesQ.isLoading && !workspacesQ.data ? (
          <SkeletonGroup count={3}>
            <ListRowSkeleton height={84} />
          </SkeletonGroup>
        ) : (
          <View style={{ gap: spacing.md }}>
            {workspaces.map((ws) => (
              <Pressable
                key={ws.barber}
                onPress={() => {
                  open(ws);
                }}
                accessibilityRole="button"
                accessibilityLabel={ws.shop.shop_name}
              >
                <Card padded style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: palette.navy }]}>
                    <Icon name="pole" size={22} color={palette.gold} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.titleRow}>
                      <Text variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
                        {ws.shop.shop_name}
                      </Text>
                      <StatusPill
                        status={ws.shop.is_open ? 'Completed' : 'Cancelled'}
                        label={ws.shop.is_open ? 'OPEN' : 'CLOSED'}
                      />
                    </View>
                    <Text variant="caption" color={theme.muted} numberOfLines={1}>
                      {ws.shop.city || ws.shop.address_line}
                    </Text>
                    <Text variant="labelSm" color={palette.red}>
                      {t('staff.shops_today_bookings', { n: ws.bookings_today }).toUpperCase()}
                    </Text>
                  </View>
                  <Icon name="chevronRight" size={20} color={theme.muted} />
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        <Button
          variant="ghost"
          size="lg"
          block
          label={t('staff.shops_add')}
          leading={<Icon name="plus" size={16} color={palette.red} />}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            nav.navigate('BarberOnboard');
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
