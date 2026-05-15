/**
 * Skeleton loading primitives built on react-content-loader.
 *
 * The library provides an animated SVG-based shimmer (one paint per frame
 * via SMIL on web / Reanimated under-the-hood on native). We expose a
 * small set of pre-tuned shapes so feature code never imports from
 * react-content-loader/native directly — keeps the design surface
 * consistent and lets us swap libs later without a churn.
 *
 * Color choices come from `useTheme()` so skeletons don't fight the
 * theme mode the screen is using.
 */

import React from 'react';
import ContentLoaderImport, { Rect } from 'react-content-loader/native';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '../design/ThemeProvider';
import { radii, spacing } from '../design/tokens';

// react-content-loader's native typings are extremely thin (don't declare
// width / height / children even though the runtime accepts them all).
// Cast to a permissive component type so call sites stay clean. The
// actual prop names are taken from the library's documented examples.
interface ContentLoaderRuntimeProps {
  speed?: number;
  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
  foregroundColor?: string;
  children?: React.ReactNode;
}
const ContentLoader =
  ContentLoaderImport as unknown as React.ComponentType<ContentLoaderRuntimeProps>;

interface SkeletonProps {
  height?: number;
  width?: number | `${number}%`;
  rounded?: keyof typeof radii;
  style?: ViewStyle;
}

function useSkeletonColors() {
  const { theme } = useTheme();
  return {
    background: theme.line,
    foreground: theme.lineStrong,
  };
}

/** Single-line text-shaped block. */
export function SkeletonLine({ height = 14, width = '70%', rounded = 'sm', style }: SkeletonProps) {
  const c = useSkeletonColors();
  return (
    <View style={[{ height, width, borderRadius: radii[rounded] }, style]}>
      <ContentLoader
        speed={1.4}
        width="100%"
        height={height}
        backgroundColor={c.background}
        foregroundColor={c.foreground}
      >
        <Rect x="0" y="0" rx={radii[rounded]} ry={radii[rounded]} width="100%" height="100%" />
      </ContentLoader>
    </View>
  );
}

/** Rectangular block — for square thumbnails, hero placeholders, etc. */
export function SkeletonBlock({
  height = 96,
  width = '100%',
  rounded = 'md',
  style,
}: SkeletonProps) {
  return <SkeletonLine height={height} width={width} rounded={rounded} style={style} />;
}

/** Circle (avatar / icon). */
export function SkeletonCircle({ size = 48, style }: { size?: number; style?: ViewStyle }) {
  const c = useSkeletonColors();
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, style]}>
      <ContentLoader
        speed={1.4}
        width={size}
        height={size}
        backgroundColor={c.background}
        foregroundColor={c.foreground}
      >
        <Rect x="0" y="0" rx={size / 2} ry={size / 2} width={size} height={size} />
      </ContentLoader>
    </View>
  );
}

/** Discovery list shop card skeleton — matches the real ShopCard layout. */
export function ShopCardSkeleton() {
  const { theme } = useTheme();
  const c = useSkeletonColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.md,
        backgroundColor: theme.surface,
        borderColor: theme.line,
        borderWidth: 1,
        borderRadius: radii.lg,
      }}
    >
      <ContentLoader
        speed={1.4}
        width={96}
        height={96}
        backgroundColor={c.background}
        foregroundColor={c.foreground}
      >
        <Rect x="0" y="0" rx={radii.md} ry={radii.md} width="96" height="96" />
      </ContentLoader>
      <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
        <SkeletonLine height={10} width="40%" />
        <SkeletonLine height={18} width="80%" />
        <SkeletonLine height={12} width="60%" />
        <SkeletonLine height={12} width="50%" />
      </View>
    </View>
  );
}

/** Booking-flow list row (service card, time slot, etc.). */
export function ListRowSkeleton({ height = 64 }: { height?: number }) {
  const { theme } = useTheme();
  const c = useSkeletonColors();
  return (
    <View
      style={{
        height,
        backgroundColor: theme.surface,
        borderColor: theme.line,
        borderWidth: 1,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
      }}
    >
      <ContentLoader
        speed={1.4}
        width="100%"
        height={height - 24}
        backgroundColor={c.background}
        foregroundColor={c.foreground}
      >
        <Rect x="0" y="6" rx={6} ry={6} width="60%" height="14" />
        <Rect x="0" y="26" rx={6} ry={6} width="35%" height="10" />
      </ContentLoader>
    </View>
  );
}

interface SkeletonGroupProps {
  count?: number;
  gap?: number;
  children: React.ReactNode;
}

/** Vertical stack of N copies of `children`. Convenience for placeholder lists. */
export function SkeletonGroup({ count = 4, gap = spacing.md, children }: SkeletonGroupProps) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }, (_, i) => (
        <React.Fragment key={i}>{children}</React.Fragment>
      ))}
    </View>
  );
}
