import {
  DefaultTheme,
  DarkTheme as NavDarkTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { persistOptions, queryClient } from './src/api';
import { DevHud } from './src/components/DevHud';
import { ToastHost } from './src/components/ToastHost';
import { ThemeProvider, useTheme } from './src/design/ThemeProvider';
import { palette } from './src/design/tokens';
import { useAppFonts } from './src/design/typography';
import { initI18n } from './src/i18n';
import { RootNavigator, linking, navigationRef } from './src/navigation';
import { useAuthStore } from './src/store/useAuthStore';

// Initialize i18n eagerly at module load so screens can call `useTranslation()`
// from their first render without an extra hydration tick.
initI18n();

/**
 * Provider chain (mounting order matters):
 *
 *   GestureHandlerRootView    ← required for any gesture handler in the tree
 *     SafeAreaProvider        ← supplies insets to SafeAreaView in screens
 *       PersistQueryClientProvider ← rehydrates react-query cache from MMKV
 *         ThemeProvider       ← exposes useTheme(), drives status-bar style
 *           NavigationContainer + linking ← single deep-link config for all roles
 *             RootNavigator   ← role-switched (Onboarding | Customer | Owner | Staff)
 *           <ToastHost />     ← always last so it z-sits above content
 *           <DevHud />        ← dev-only, top-right (above the nav)
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <ThemeProvider>
            <Root />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Root() {
  const [fontsLoaded, fontsError] = useAppFonts();
  const hydrate = useAuthStore((s) => s.hydrate);
  const { mode, theme } = useTheme();

  useEffect(() => {
    hydrate().catch(() => {
      /* swallowed — auth hydration errors surface via toast */
    });
  }, [hydrate]);

  // React Navigation theme — wires the stock dark/light split into our
  // palette so headers and the tab bar honour the active mode.
  const navTheme = useMemo<NavTheme>(() => {
    const base = mode === 'dark' ? NavDarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.red,
        background: theme.bg,
        card: theme.surface,
        text: theme.text,
        border: theme.line,
        notification: palette.red,
      },
    };
  }, [mode, theme]);

  if (!fontsLoaded && !fontsError) {
    // Solid brand splash while fonts load. Avoids FOUC into system fallback.
    return <View style={[styles.bootSplash, { backgroundColor: palette.ink }]} />;
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
      <ToastHost />
      <DevHud />
    </>
  );
}

const styles = StyleSheet.create({
  bootSplash: {
    flex: 1,
  },
});
