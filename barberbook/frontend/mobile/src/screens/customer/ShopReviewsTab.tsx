import { useRoute, type RouteProp } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useShop } from '../../api/hooks';
import { Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { spacing } from '../../design/tokens';
import type { DiscoverStackParamList } from '../../navigation/types';

import { ReviewsTab } from './_shop/ReviewsTab';

type Rt = RouteProp<DiscoverStackParamList, 'ShopReviewsTab'>;

export function ShopReviewsTab() {
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

        <ReviewsTab shopId={params.id} />
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
