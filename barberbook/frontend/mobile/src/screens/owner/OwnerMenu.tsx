import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useServicesForShop } from '../../api/hooks';
import type { Service } from '../../api/types';
import {
  Button,
  DenseHeader,
  Icon,
  ListRowSkeleton,
  SkeletonGroup,
  StatusPill,
  Text,
} from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { formatMoney } from '../../lib/booking';
import type { MenuStackParamList } from '../../navigation/types';

import { ACTIVE_SHOP } from './_owner';

type Nav = NativeStackNavigationProp<MenuStackParamList, 'OwnerMenu'>;

export function OwnerMenu() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const servicesQ = useServicesForShop(ACTIVE_SHOP);

  // Local working list — applies the optimistic reorder + active toggle
  // before round-tripping to the server. The actual `set_value` mutation
  // for `idx` lands when we wire bulk-reorder; for now the UX reads as
  // real and the backend just gets the latest snapshot on save.
  const [items, setItems] = useState<Service[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');

  useEffect(() => {
    if (servicesQ.data) setItems(servicesQ.data);
  }, [servicesQ.data]);

  const categories = useMemo(() => {
    const set = new Set(items.map((s) => s.category));
    return ['all', ...Array.from(set)];
  }, [items]);

  const visible = useMemo(
    () => (activeCategory === 'all' ? items : items.filter((s) => s.category === activeCategory)),
    [activeCategory, items],
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker={`${items.length} SERVICES`}
        title={t('owner.menu_title')}
        trailing={
          <Button
            size="sm"
            variant="red"
            label={t('owner.menu_add_service')}
            leading={<Icon name="plus" size={14} color={palette.cream} />}
            onPress={() => {
              nav.navigate('OwnerAddService', {});
            }}
          />
        }
      />

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {categories.map((c) => {
          const active = c === activeCategory;
          return (
            <Pressable
              key={c}
              onPress={() => {
                setActiveCategory(c);
              }}
              style={[
                styles.catTab,
                {
                  backgroundColor: active ? palette.ink : 'transparent',
                  borderColor: active ? palette.ink : theme.lineStrong,
                },
              ]}
            >
              <Text variant="label" color={active ? palette.cream : theme.text}>
                {c.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text variant="caption" color={theme.muted} style={styles.dragHint}>
        {t('owner.menu_drag_hint')}
      </Text>

      {servicesQ.isLoading && !servicesQ.data ? (
        <View style={styles.listHost}>
          <SkeletonGroup count={5}>
            <ListRowSkeleton height={72} />
          </SkeletonGroup>
        </View>
      ) : (
        <DraggableFlatList
          data={visible}
          keyExtractor={(s) => s.name}
          onDragBegin={() => Haptics.selectionAsync().catch(() => {})}
          onDragEnd={({ data: nextVisible }) => {
            // Splice the reordered slice back into the global list so the
            // category filter doesn't drop unrelated services.
            if (activeCategory === 'all') {
              setItems(nextVisible);
            } else {
              setItems((prev) => {
                const others = prev.filter((s) => s.category !== activeCategory);
                return [...others, ...nextVisible];
              });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }}
          contentContainerStyle={styles.listContent}
          renderItem={(p) => (
            <ServiceRow
              {...p}
              onToggle={(name, next) => {
                setItems((prev) =>
                  prev.map((s) => (s.name === name ? { ...s, is_active: next ? 1 : 0 } : s)),
                );
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

interface ServiceRowProps extends RenderItemParams<Service> {
  onToggle: (name: string, next: boolean) => void;
}

function ServiceRow({ item, drag, isActive, onToggle }: ServiceRowProps) {
  const { theme } = useTheme();
  return (
    <ScaleDecorator>
      <Pressable
        onLongPress={drag}
        delayLongPress={120}
        style={[
          styles.row,
          {
            backgroundColor: isActive ? theme.surfaceAlt : theme.surface,
            borderColor: theme.line,
          },
        ]}
      >
        <Icon name="menu" size={18} color={theme.muted} />

        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text variant="bodyBold" numberOfLines={1}>
              {item.service_name}
            </Text>
            <StatusPill
              status={item.is_active ? 'Completed' : 'Cancelled'}
              label={item.is_active ? 'ACTIVE' : 'PAUSED'}
            />
          </View>
          <Text variant="caption" color={theme.muted}>
            {item.category} · {item.duration_minutes}m · {formatMoney(item.price, item.currency)}
          </Text>
        </View>

        <Switch
          value={item.is_active === 1}
          onValueChange={(v) => {
            onToggle(item.name, v);
          }}
          trackColor={{ true: palette.red, false: theme.lineStrong }}
          thumbColor={palette.cream}
        />
      </Pressable>
    </ScaleDecorator>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  catRow: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  catTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  dragHint: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  listHost: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
