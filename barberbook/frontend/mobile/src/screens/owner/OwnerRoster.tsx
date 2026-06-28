import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBarbersForShop } from '../../api/hooks';
import type { Barber, DayOfWeek } from '../../api/types';
import { Button, DenseHeader, Icon, Portrait, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import type { RosterStackParamList } from '../../navigation/types';

import { useActiveShop } from './_owner';

type Nav = NativeStackNavigationProp<RosterStackParamList, 'OwnerRoster'>;

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// 14h grid (08:00–22:00). Each hour = HOUR_HEIGHT pt; gestures snap to
// 30-minute increments so shifts read as half-hour blocks.
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const HOUR_HEIGHT = 56;
const SLOT_HEIGHT = HOUR_HEIGHT / 2; // 30 minutes
const COLUMN_WIDTH = 96;
const TIME_GUTTER = 56;

interface Shift {
  id: string;
  day: DayOfWeek;
  barber: string;
  /** Top-left in minutes from 08:00. */
  startMin: number;
  /** Length in minutes. */
  durationMin: number;
}

const BARBER_COLORS = [palette.red, palette.navy, palette.gold, '#3F6B5F', '#7A4E2D'];

export function OwnerRoster() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const shop = useActiveShop();
  const barbersQ = useBarbersForShop(shop);
  const barbers = barbersQ.data ?? [];

  const [activeDay, setActiveDay] = useState<DayOfWeek>('Mon');
  const [shifts, setShifts] = useState<Shift[]>(() => seedShifts(barbers));

  // Re-seed once when barbers data lands so the initial render isn't empty.
  React.useEffect(() => {
    if (barbers.length && shifts.length === 0) setShifts(seedShifts(barbers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbers.length]);

  const conflicts = useMemo(() => detectConflicts(shifts), [shifts]);

  const dayShifts = useMemo(() => shifts.filter((s) => s.day === activeDay), [shifts, activeDay]);

  const upsertShift = useCallback((next: Shift) => {
    setShifts((prev) => {
      const idx = prev.findIndex((s) => s.id === next.id);
      if (idx < 0) return [...prev, next];
      const out = prev.slice();
      out[idx] = next;
      return out;
    });
  }, []);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker={
          conflicts === 0
            ? t('owner.roster_no_conflicts').toUpperCase()
            : t('owner.roster_conflicts', { n: conflicts }).toUpperCase()
        }
        title={t('owner.roster_title')}
        trailing={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {conflicts > 0 && (
              <Pressable
                onPress={() => {
                  nav.navigate('OwnerRosterConflict', {
                    rosterName: 'BB-ROS-4001',
                  });
                }}
                style={[styles.conflictBtn, { borderColor: palette.red }]}
              >
                <Icon name="bell" size={14} color={palette.red} />
                <Text variant="label" color={palette.red}>
                  {conflicts}
                </Text>
              </Pressable>
            )}
            <Button
              size="sm"
              variant="red"
              label={t('owner.roster_publish')}
              onPress={() =>
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
              }
            />
          </View>
        }
      />

      {/* 7-day strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStrip}
      >
        {DAYS.map((d) => {
          const active = d === activeDay;
          return (
            <Pressable
              key={d}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setActiveDay(d);
              }}
              style={[
                styles.dayPill,
                {
                  backgroundColor: active ? palette.ink : 'transparent',
                  borderColor: active ? palette.ink : theme.lineStrong,
                },
              ]}
            >
              <Text variant="label" color={active ? palette.cream : theme.text}>
                {d.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text variant="caption" color={theme.muted} style={styles.hint}>
        {t('owner.roster_drag_hint')}
      </Text>

      {/* Grid */}
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.gridBody}>
          {/* Time gutter */}
          <View style={[styles.timeGutter, { borderColor: theme.line }]}>
            {HOURS.map((h) => (
              <View key={h} style={styles.timeCell}>
                <Text variant="mono" color={theme.muted}>
                  {String(h).padStart(2, '0')}:00
                </Text>
              </View>
            ))}
          </View>

          {/* Barber columns scroll horizontally */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.columns}>
              {barbers.map((b, i) => {
                const color = BARBER_COLORS[i % BARBER_COLORS.length];
                return (
                  <BarberColumn
                    key={b.name}
                    barber={b}
                    color={color}
                    shifts={dayShifts.filter((s) => s.barber === b.name)}
                    onCreate={(startMin, durationMin) => {
                      const shift: Shift = {
                        id: `S-${Date.now()}-${b.name}`,
                        day: activeDay,
                        barber: b.name,
                        startMin,
                        durationMin,
                      };
                      upsertShift(shift);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                        () => {},
                      );
                    }}
                    onUpdate={(s) => {
                      upsertShift(s);
                    }}
                  />
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface BarberColumnProps {
  barber: Barber;
  color: string;
  shifts: Shift[];
  onCreate: (startMin: number, durationMin: number) => void;
  onUpdate: (s: Shift) => void;
}

function BarberColumn({ barber, color, shifts, onCreate, onUpdate }: BarberColumnProps) {
  const { theme } = useTheme();

  // Live drag scratchpad — populated while a "create" gesture is in flight.
  const dragStart = useSharedValue<number | null>(null);
  const dragHeight = useSharedValue(0);

  const dragPan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(180)
        .onStart((e) => {
          // y is in column-local coords. Snap top to a 30-min slot.
          const startY = Math.max(0, Math.floor(e.y / SLOT_HEIGHT) * SLOT_HEIGHT);
          dragStart.value = startY;
          dragHeight.value = SLOT_HEIGHT; // start at 30 min
        })
        .onChange((e) => {
          if (dragStart.value == null) return;
          const total = e.y - dragStart.value;
          const clamped = Math.max(SLOT_HEIGHT, total);
          const snapped = Math.round(clamped / SLOT_HEIGHT) * SLOT_HEIGHT;
          dragHeight.value = snapped;
        })
        .onEnd(() => {
          if (dragStart.value == null) return;
          const startMin = (dragStart.value / HOUR_HEIGHT) * 60;
          const durationMin = (dragHeight.value / HOUR_HEIGHT) * 60;
          runOnJS(onCreate)(startMin, durationMin);
          dragStart.value = null;
          dragHeight.value = 0;
        })
        .onFinalize(() => {
          dragStart.value = null;
          dragHeight.value = 0;
        }),
    [dragHeight, dragStart, onCreate],
  );

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: dragStart.value == null ? 0 : 0.85,
    top: dragStart.value ?? 0,
    height: dragHeight.value,
  }));

  return (
    <View style={[styles.column, { borderColor: theme.line }]}>
      {/* Header */}
      <View style={styles.colHeader}>
        <Portrait seed={barber.avatar_seed} size={28} initials={barber.initials} />
        <View style={[styles.colColorDot, { backgroundColor: color }]} />
        <Text variant="labelSm" numberOfLines={1}>
          {barber.short_name}
        </Text>
      </View>

      {/* Body */}
      <GestureDetector gesture={dragPan}>
        <View style={styles.colBody}>
          {/* Hour grid lines */}
          {HOURS.map((h, i) => (
            <View
              key={h}
              style={[styles.gridLine, { top: i * HOUR_HEIGHT, borderColor: theme.line }]}
            />
          ))}

          {/* Existing shift blocks */}
          {shifts.map((s) => (
            <ShiftBlock key={s.id} shift={s} color={color} onUpdate={onUpdate} />
          ))}

          {/* Drag-create ghost */}
          <Animated.View
            pointerEvents="none"
            style={[styles.ghostBlock, { backgroundColor: color }, ghostStyle]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

interface ShiftBlockProps {
  shift: Shift;
  color: string;
  onUpdate: (s: Shift) => void;
}

function ShiftBlock({ shift, color, onUpdate }: ShiftBlockProps) {
  const top = (shift.startMin / 60) * HOUR_HEIGHT;
  const height = (shift.durationMin / 60) * HOUR_HEIGHT;

  // Bottom-edge handle to resize. Snaps to 30-min slots.
  const localHeight = useSharedValue(height);
  const resizePan = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          const next = Math.max(SLOT_HEIGHT, height + e.translationY);
          localHeight.value = next;
        })
        .onEnd(() => {
          const snapped = Math.round(localHeight.value / SLOT_HEIGHT) * SLOT_HEIGHT;
          localHeight.value = snapped;
          const nextDur = Math.round((snapped / HOUR_HEIGHT) * 60);
          runOnJS(onUpdate)({ ...shift, durationMin: nextDur });
        }),
    [height, localHeight, onUpdate, shift],
  );

  const blockStyle = useAnimatedStyle(() => ({
    height: localHeight.value,
  }));

  const startLabel = formatMinutes(shift.startMin);
  const endLabel = formatMinutes(shift.startMin + shift.durationMin);

  return (
    <Animated.View
      style={[styles.shiftBlock, { top, backgroundColor: color, borderColor: color }, blockStyle]}
    >
      <Text variant="labelSm" color={palette.cream}>
        {startLabel}–{endLabel}
      </Text>
      <Text variant="caption" color={palette.cream}>
        {Math.round(shift.durationMin / 60)}h shift
      </Text>

      <GestureDetector gesture={resizePan}>
        <View style={styles.resizeHandle} />
      </GestureDetector>
    </Animated.View>
  );
}

function formatMinutes(min: number): string {
  const total = min;
  const h = Math.floor(total / 60) + 8; // grid starts at 08:00
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function seedShifts(barbers: Barber[]): Shift[] {
  if (barbers.length === 0) return [];
  return [
    { id: 'seed-1', day: 'Mon', barber: barbers[0]?.name ?? '', startMin: 60, durationMin: 480 },
    {
      id: 'seed-2',
      day: 'Mon',
      barber: barbers[1]?.name ?? barbers[0]?.name ?? '',
      startMin: 300,
      durationMin: 480,
    },
    { id: 'seed-3', day: 'Tue', barber: barbers[0]?.name ?? '', startMin: 60, durationMin: 480 },
    { id: 'seed-4', day: 'Wed', barber: barbers[0]?.name ?? '', startMin: 0, durationMin: 360 },
  ];
}

function detectConflicts(shifts: Shift[]): number {
  // Same (day, barber): two shifts overlap → conflict.
  let n = 0;
  const grouped = new Map<string, Shift[]>();
  for (const s of shifts) {
    const k = `${s.day}:${s.barber}`;
    const arr = grouped.get(k);
    if (arr) arr.push(s);
    else grouped.set(k, [s]);
  }
  for (const arr of grouped.values()) {
    arr.sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < arr.length; i++) {
      const prev = arr[i - 1];
      const cur = arr[i];
      if (prev.startMin + prev.durationMin > cur.startMin) n += 1;
    }
  }
  return n;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  conflictBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  dayStrip: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  dayPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  hint: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  gridBody: {
    flexDirection: 'row',
    paddingStart: spacing.xl,
  },
  timeGutter: {
    width: TIME_GUTTER,
    borderRightWidth: StyleSheet.hairlineWidth * 2,
  },
  timeCell: {
    height: HOUR_HEIGHT,
    paddingHorizontal: spacing.xs,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  columns: {
    flexDirection: 'row',
  },
  column: {
    width: COLUMN_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth * 2,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    minHeight: 36,
  },
  colColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  colBody: {
    height: HOUR_HEIGHT * (HOURS.length - 1),
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  shiftBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: radii.sm,
    borderWidth: 0,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  ghostBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: radii.sm,
    opacity: 0.6,
  },
  resizeHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
});
