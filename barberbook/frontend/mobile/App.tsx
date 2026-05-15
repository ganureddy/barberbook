import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { persistOptions, queryClient } from './src/api';
import { DevHud } from './src/components/DevHud';
import { Text } from './src/components/Text';
import { ToastHost } from './src/components/ToastHost';
import { ThemeProvider, useTheme } from './src/design/ThemeProvider';
import { palette, radii, spacing, tagline } from './src/design/tokens';
import { useAppFonts } from './src/design/typography';
import { Showcase } from './src/screens/Showcase';
import { useAuthStore } from './src/store/useAuthStore';

/**
 * Provider chain (mounted in this order — order matters):
 *
 *   GestureHandlerRootView    ← required for any gesture handler in the tree
 *     SafeAreaProvider        ← supplies insets to SafeAreaView in screens
 *       PersistQueryClientProvider ← rehydrates react-query cache from MMKV
 *         ThemeProvider       ← exposes useTheme(), drives status-bar style
 *           <Splash | Showcase>
 *           <ToastHost />     ← always last so it z-sits above content
 *           <DevHud />        ← dev-only, top-right
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <ThemeProvider>
            <Root />
            <ToastHost />
            <DevHud />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

type Route = 'splash' | 'showcase';

function Root() {
  const [fontsLoaded, fontsError] = useAppFonts();
  const [route, setRoute] = useState<Route>('splash');
  const hydrate = useAuthStore((s) => s.hydrate);

  // Hydrate sid + session at first render. Idempotent — safe under
  // strict-mode double-invocation in dev. We deliberately don't await:
  // the splash render path doesn't depend on auth state.
  useEffect(() => {
    hydrate().catch(() => {
      /* intentionally swallowed — auth hydration errors surface via toast */
    });
  }, [hydrate]);

  if (!fontsLoaded && !fontsError) {
    // Solid brand splash while fonts load. Avoids FOUC into system fallback.
    return <View style={[styles.bootSplash, { backgroundColor: palette.ink }]} />;
  }

  if (route === 'showcase') {
    return (
      <Showcase
        onClose={() => {
          setRoute('splash');
        }}
      />
    );
  }
  return (
    <Splash
      onOpenShowcase={() => {
        setRoute('showcase');
      }}
    />
  );
}

interface SplashProps {
  onOpenShowcase: () => void;
}

function Splash({ onOpenShowcase }: SplashProps) {
  const { theme, mode } = useTheme();

  return (
    <View style={[styles.splash, { backgroundColor: palette.ink }]}>
      <StatusBar style="light" />

      <View style={styles.poleAccent} />

      <View style={styles.splashContent}>
        <Text variant="labelSm" color={palette.gold}>
          BARBERBOOK · v0.1
        </Text>
        <Text variant="displayXl" color={palette.cream}>
          BARBER
        </Text>
        <Text variant="displayXl" color={palette.red}>
          BOOK
        </Text>
        <Text variant="editorial" color={palette.gold} style={{ marginTop: spacing.lg }}>
          {tagline}
        </Text>
      </View>

      {__DEV__ && (
        <Pressable
          onPress={onOpenShowcase}
          accessibilityRole="button"
          accessibilityLabel="Open design showcase"
          style={({ pressed }) => [
            styles.devLink,
            {
              borderColor: palette.gold,
              opacity: pressed ? 0.7 : 1,
              backgroundColor: theme.scrim,
            },
          ]}
        >
          <Text variant="label" color={palette.gold}>
            Open Design Showcase →
          </Text>
          <Text variant="caption" color={palette.cream}>
            dev only · theme: {mode}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bootSplash: {
    flex: 1,
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  splashContent: {
    gap: spacing.xs,
  },
  poleAccent: {
    position: 'absolute',
    top: 40,
    right: -60,
    width: 220,
    height: 220,
    backgroundColor: palette.red,
    borderRadius: radii.lg,
    transform: [{ rotate: '28deg' }],
    opacity: 0.85,
  },
  devLink: {
    position: 'absolute',
    left: spacing['2xl'],
    right: spacing['2xl'],
    bottom: spacing['3xl'],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: 2,
    alignItems: 'center',
  },
});
