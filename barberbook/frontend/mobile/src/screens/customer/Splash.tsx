import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '../../components';
import { palette, radii, spacing, tagline } from '../../design/tokens';
import type { OnboardingStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Splash'>;

/**
 * Brand splash. Auto-advances to RoleSelect on tap. Real production splash
 * will time out after ~2s, but for the dev scaffold a manual tap keeps the
 * brand artwork visible long enough to QA.
 */
export function Splash() {
  const nav = useNavigation<Nav>();
  return (
    <Pressable
      style={styles.root}
      onPress={() => {
        nav.navigate('RoleSelect');
      }}
    >
      <StatusBar style="light" />
      <View style={styles.poleAccent} />

      <View style={styles.body}>
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

      <View style={styles.tapHint}>
        <Text variant="caption" color={palette.gold}>
          tap anywhere to continue →
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.ink,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  body: { gap: spacing.xs },
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
  tapHint: {
    position: 'absolute',
    bottom: spacing['3xl'],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
