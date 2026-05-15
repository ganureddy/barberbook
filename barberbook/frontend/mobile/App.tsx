import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, tagline } from './src/theme';

/**
 * Scaffold landing screen. Real navigation, screens, and providers
 * (NavigationContainer, QueryClientProvider, GestureHandlerRootView, i18n init,
 * theme provider) are wired up in subsequent commits as the screens from the
 * Design Canvas are implemented.
 */
export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.poleAccent} />
      <Text style={styles.kicker}>BARBERBOOK · v0.1</Text>
      <Text style={styles.wordmark}>BARBER</Text>
      <Text style={[styles.wordmark, styles.wordmarkRed]}>BOOK</Text>
      <Text style={styles.tagline}>{tagline}</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.ink,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
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
  kicker: {
    color: palette.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  wordmark: {
    color: palette.cream,
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 76,
  },
  wordmarkRed: {
    color: palette.red,
  },
  tagline: {
    color: palette.gold,
    fontStyle: 'italic',
    fontSize: 18,
    marginTop: spacing.lg,
  },
});
