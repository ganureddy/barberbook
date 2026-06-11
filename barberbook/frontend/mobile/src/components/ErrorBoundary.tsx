import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Top-level crash net.
 *
 * In a RELEASE build there is no red-box: an uncaught error during render
 * just produces a blank screen, which is impossible to debug from the field.
 * This boundary catches that error and paints it on screen (plain RN
 * primitives only — no theme/font/native deps that might themselves be the
 * thing that failed), so a tester can screenshot the actual message and stack.
 */
interface State {
  error: Error | null;
  info: string | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    this.setState({ error, info: info?.componentStack ?? null });
    // eslint-disable-next-line no-console
    console.error('[barberbook] uncaught render error:', error, info?.componentStack);
  }

  render(): React.ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>App failed to start</Text>
          <Text style={styles.subtitle}>{error.name}</Text>
          <Text style={styles.message}>{error.message}</Text>
          {error.stack ? <Text style={styles.stack}>{error.stack}</Text> : null}
          {info ? <Text style={styles.stack}>{info}</Text> : null}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0E10' },
  content: { padding: 24, paddingTop: 80 },
  title: { color: '#D4322C', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#C9A24C', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  message: { color: '#F5F1E8', fontSize: 15, marginBottom: 16, lineHeight: 21 },
  stack: { color: '#9A968E', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
});
