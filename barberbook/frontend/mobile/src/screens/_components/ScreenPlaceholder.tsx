import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text, type ButtonVariant } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, spacing } from '../../design/tokens';

export type RoleTag = 'Customer' | 'Owner' | 'Staff' | 'Onboarding' | 'Dev';

export interface NextStep {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
}

interface Props {
  /** Big display title — usually the human-readable screen name. */
  title: string;
  /** Optional editorial subtitle. */
  subtitle?: string;
  /** Drives the kicker color so the active flow is visually obvious in dev. */
  role: RoleTag;
  /** Used in the kicker line. Should match the route name in the navigator. */
  routeName: string;
  /** Dumped into a code block so the dev can see what params arrived. */
  params?: Record<string, unknown>;
  /** "What do I do next" buttons. Rendered full-width, vertically. */
  nextSteps?: NextStep[];
  /** Free-form children rendered between params and next steps. */
  children?: React.ReactNode;
}

/**
 * A consistent placeholder scaffold for every screen in the navigation tree.
 *
 * Real screens replace this with actual content as the canvas frames are
 * implemented. The point here is that nav + params + design-system access
 * are all wired correctly today, so we can prove role flows + deep links
 * end-to-end before any real UI lands.
 */
export function ScreenPlaceholder({
  title,
  subtitle,
  role,
  routeName,
  params,
  nextSteps,
  children,
}: Props) {
  const { theme } = useTheme();
  const kickerColor = ROLE_COLOR[role];

  const hasParams = !!params && Object.keys(params).length > 0;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="labelSm" color={kickerColor}>
          {role.toUpperCase()} · {routeName}
        </Text>
        <Text variant="display" style={{ marginTop: spacing.xs }}>
          {title}
        </Text>
        {subtitle != null && subtitle.length > 0 && (
          <Text variant="editorial" color={theme.muted} style={{ marginTop: spacing.sm }}>
            {subtitle}
          </Text>
        )}

        {hasParams && (
          <Card style={{ marginTop: spacing.xl }}>
            <Text variant="label" color={theme.muted}>
              ROUTE PARAMS
            </Text>
            <Text variant="mono" style={{ marginTop: spacing.xs }}>
              {JSON.stringify(params, null, 2)}
            </Text>
          </Card>
        )}

        {children}

        {nextSteps && nextSteps.length > 0 && (
          <View style={styles.nextSteps}>
            <Text variant="label" color={theme.muted}>
              NEXT STEPS
            </Text>
            {nextSteps.map((s, i) => (
              <Button
                key={`${s.label}-${i}`}
                block
                label={s.label}
                variant={s.variant ?? 'primary'}
                onPress={s.onPress}
              />
            ))}
          </View>
        )}

        <View style={{ height: spacing['4xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const ROLE_COLOR: Record<RoleTag, string> = {
  Customer: palette.red,
  Owner: palette.navy,
  Staff: palette.gold,
  Onboarding: palette.charcoal,
  Dev: palette.gold,
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  nextSteps: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
