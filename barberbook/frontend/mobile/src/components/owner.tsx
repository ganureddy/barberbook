/**
 * Owner-side shared primitives: KpiTile, StatusPill, DenseHeader.
 *
 * Co-located here so feature screens import a single module. The owner
 * design language is denser than the customer side — bigger numbers,
 * tighter padding, status-tone color coding everywhere.
 */

import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import type { BookingStatus } from '../api/types';
import { useTheme } from '../design/ThemeProvider';
import { palette, radii, spacing } from '../design/tokens';

import { BackIcon, Icon, type IconName } from './Icon';
import { Text } from './Text';

// ─── KPI tile ──────────────────────────────────────────────────────────────

export interface KpiTileProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon?: IconName;
  /** Marks the tile as the active filter; used in OwnerToday's KPI strip. */
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function KpiTile({
  label,
  value,
  delta,
  icon,
  active = false,
  onPress,
  style,
}: KpiTileProps) {
  const { theme } = useTheme();
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[
        styles.kpi,
        {
          backgroundColor: active ? palette.navy : theme.surface,
          borderColor: active ? palette.navy : theme.line,
        },
        style,
      ]}
    >
      <View style={styles.kpiTop}>
        <Text variant="labelSm" color={active ? palette.cream : theme.muted}>
          {label.toUpperCase()}
        </Text>
        {icon && <Icon name={icon} size={14} color={active ? palette.gold : theme.muted} />}
      </View>
      <Text variant="display" color={active ? palette.cream : theme.text} style={styles.kpiValue}>
        {value}
      </Text>
      {delta && (
        <Text variant="labelSm" color={delta.positive ? '#3F6B5F' : palette.red}>
          {delta.positive ? '▲' : '▼'} {delta.value}
        </Text>
      )}
    </Wrap>
  );
}

// ─── Status pill ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<
  BookingStatus | 'NextUp' | 'Waiting' | 'OPEN' | 'BREAK' | 'OFF',
  string
> = {
  Draft: palette.charcoal,
  Confirmed: palette.navy,
  CheckedIn: palette.gold,
  InService: palette.red,
  Completed: '#3F6B5F',
  Cancelled: palette.charcoal,
  NoShow: palette.charcoal,
  NextUp: palette.gold,
  Waiting: palette.navy,
  OPEN: '#3F6B5F',
  BREAK: palette.gold,
  OFF: palette.charcoal,
};

export interface StatusPillProps {
  status: keyof typeof STATUS_COLOR | string;
  label?: string;
  style?: ViewStyle;
}

export function StatusPill({ status, label, style }: StatusPillProps) {
  const color = STATUS_COLOR[status as keyof typeof STATUS_COLOR] ?? palette.charcoal;
  return (
    <View style={[styles.pill, { backgroundColor: color }, style]}>
      <Text variant="labelSm" color={palette.cream}>
        {(label ?? status).toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Dense header (owner screens) ──────────────────────────────────────────

export interface DenseHeaderProps {
  kicker?: string;
  title: string;
  /** Pinned to the right — usually a primary action like "Add" or "Publish". */
  trailing?: React.ReactNode;
  onBack?: () => void;
  /** Removes the bottom border — useful when the screen has its own divider. */
  borderless?: boolean;
}

export function DenseHeader({
  kicker,
  title,
  trailing,
  onBack,
  borderless = false,
}: DenseHeaderProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.bg,
          borderBottomColor: borderless ? 'transparent' : theme.line,
        },
      ]}
    >
      <View style={styles.headerLeft}>
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={20}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backBtn}
          >
            <BackIcon size={22} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {kicker != null && kicker.length > 0 && (
            <Text variant="labelSm" color={palette.navy}>
              {kicker.toUpperCase()}
            </Text>
          )}
          <Text variant="displaySm">{title}</Text>
        </View>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  kpi: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
    minWidth: 96,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 28,
    lineHeight: 30,
    marginVertical: 2,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
