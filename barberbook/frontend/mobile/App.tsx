import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from './src/components/Text';
import { ThemeProvider, useTheme } from './src/design/ThemeProvider';
import { palette, radii, spacing, tagline } from './src/design/tokens';
import { useAppFonts } from './src/design/typography';
import { Showcase } from './src/screens/Showcase';

/**
 * Top-level providers, in mounting order:
 *
 *   GestureHandlerRootView   ← required by react-native-gesture-handler
 *     SafeAreaProvider       ← provides insets to SafeAreaView in screens
 *       ThemeProvider        ← exposes useTheme() + persists preference
 *         <Splash | Showcase>
 *
 * Real navigation (react-navigation) lands in the next iteration; for now
 * the dev-only Showcase is reached via a single state toggle.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

type Route = 'splash' | 'showcase';

function Root() {
  const [fontsLoaded, fontsError] = useAppFonts();
  const [route, setRoute] = useState<Route>('splash');

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
