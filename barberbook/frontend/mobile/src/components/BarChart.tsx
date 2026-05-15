import React, { useMemo } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '../design/ThemeProvider';
import { palette, radii, spacing } from '../design/tokens';

import { Text } from './Text';

export interface BarDatum {
  /** Short label rendered under (or skipped on) the x-axis. */
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarDatum[];
  height?: number;
  /** Highlights the bar at this index in brand red instead of gold. */
  highlightIndex?: number;
  /** Optional axis labels — top-left value formatter. */
  formatValue?: (n: number) => string;
}

const PADDING_BOTTOM = 18;
const BAR_GAP = 3;

/**
 * Compact 30-day bar chart for OwnerMoney. SVG-only (no victory-native) so
 * the chart compiles on Expo without an extra dep + native pipeline.
 *
 * Each bar is a single rounded `<Rect>` with a top→bottom gradient. The
 * highlighted bar swaps to red so a single "today / latest" callout is
 * obvious without a tooltip.
 */
export function BarChart({ data, height = 160, highlightIndex, formatValue }: BarChartProps) {
  const { theme } = useTheme();
  const [width, setWidth] = React.useState(0);

  const max = useMemo(() => data.reduce((m, d) => (d.value > m ? d.value : m), 0) || 1, [data]);
  const min = useMemo(() => data.reduce((m, d) => (d.value < m ? d.value : m), Infinity), [data]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const barWidth =
    data.length > 0 ? Math.max(2, (width - BAR_GAP * (data.length - 1)) / data.length) : 0;

  return (
    <View onLayout={onLayout} style={[styles.root, { height, backgroundColor: theme.surface }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="bar-gold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.gold} />
            <Stop offset="1" stopColor={palette.goldSoft} stopOpacity={0.6} />
          </LinearGradient>
          <LinearGradient id="bar-red" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.red} />
            <Stop offset="1" stopColor={palette.redDeep} stopOpacity={0.85} />
          </LinearGradient>
        </Defs>

        {data.map((d, i) => {
          const drawHeight = Math.max(2, ((d.value / max) * (height - PADDING_BOTTOM)) | 0);
          const x = i * (barWidth + BAR_GAP);
          const y = height - PADDING_BOTTOM - drawHeight;
          const fill = i === highlightIndex ? 'url(#bar-red)' : 'url(#bar-gold)';
          return (
            <Rect
              key={d.label + i}
              x={x}
              y={y}
              rx={2}
              ry={2}
              width={barWidth}
              height={drawHeight}
              fill={fill}
            />
          );
        })}
      </Svg>

      {/* Axis row (compact — only first / mid / last labels to avoid overlap) */}
      <View style={styles.axisRow} pointerEvents="none">
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) =>
          data[i] ? (
            <Text key={i} variant="labelSm" color={theme.muted} style={styles.axisLabel}>
              {data[i].label}
            </Text>
          ) : null,
        )}
      </View>

      {formatValue && (
        <View style={styles.legend} pointerEvents="none">
          <Text variant="labelSm" color={theme.muted}>
            MIN {formatValue(min === Infinity ? 0 : min)}
          </Text>
          <Text variant="labelSm" color={theme.muted}>
            MAX {formatValue(max)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    overflow: 'hidden',
  },
  axisRow: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    flex: 1,
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
