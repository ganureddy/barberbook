import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackIcon, Text } from '../../../components';
import { useTheme } from '../../../design/ThemeProvider';
import { palette, spacing } from '../../../design/tokens';

interface Props {
  /** Current step index (0-3) for the booking flow. */
  step: 0 | 1 | 2 | 3;
  /** Optional override title; defaults to the i18n step label. */
  title?: string;
}

const STEPS = ['step_services', 'step_barber', 'step_time', 'step_pay'] as const;

/**
 * Shared header for the booking flow's middle three screens (Services /
 * Barber / Time / Pay). Renders a back arrow, the step kicker (e.g.
 * "STEP 2/4"), the current title, and a four-pip progress strip.
 */
export function StepHeader({ step, title }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation();

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => {
          nav.goBack();
        }}
        hitSlop={20}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <BackIcon size={22} />
      </Pressable>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="labelSm" color={palette.red}>
          STEP {step + 1} / 4
        </Text>
        <Text variant="displaySm">{title ?? t(`booking.${STEPS[step]}`)}</Text>
      </View>

      <View style={styles.pips}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.pip,
              {
                backgroundColor: i <= step ? palette.red : theme.lineStrong,
                width: i === step ? 22 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pip: {
    height: 6,
    borderRadius: 3,
  },
});
