import { useRoute, type RouteProp } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useShop } from '../../api/hooks';
import { Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { spacing } from '../../design/tokens';
import type { DiscoverStackParamList } from '../../navigation/types';

import { BarbersTab } from './_shop/BarbersTab';

type Rt = RouteProp<DiscoverStackParamList, 'ShopBarbersTab'>;

/**
 * Standalone "Barbers" view — same content the ShopDetail in-screen tab
 * shows, but reachable via deep link `barberbook://shop/:id/barbers` and
 * registered as its own route in the canvas screen list.
 */
export function ShopBarbersTab() {
  const { params } = useRoute<Rt>();
  const { theme } = useTheme();
  const shopQ = useShop(params.id);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="display">{shopQ.data?.shop_name ?? 'Shop'}</Text>
          <Text variant="caption" color={theme.muted}>
            {shopQ.data?.city ?? ''}
          </Text>
        </View>

        <BarbersTab shopId={params.id} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingBottom: spacing['3xl'],
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
});
