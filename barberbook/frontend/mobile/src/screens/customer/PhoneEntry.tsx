import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestOtp } from '../../api/auth';
import { BackIcon, Button, Divider, Icon, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { toast } from '../../lib/toast';
import type { OnboardingStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'PhoneEntry'>;
type Rt = RouteProp<OnboardingStackParamList, 'PhoneEntry'>;

const PREFIX = '+91';
const PHONE_MAX_DIGITS = 10;

/**
 * Indian phone number entry. Big mono digits, real-time format
 * (`98765 43210`) so it reads at a glance. Continue is disabled until
 * the format check passes; CTA fires `requestOtp` and pushes to OtpVerify
 * with the full E.164 number on the route.
 */
export function PhoneEntry() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [digits, setDigits] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = digits.length === PHONE_MAX_DIGITS;
  const formatted = useMemo(() => formatIndianMobile(digits), [digits]);

  const submit = async () => {
    if (!isValid || submitting) return;
    Haptics.selectionAsync().catch(() => {});
    setSubmitting(true);
    const e164 = `${PREFIX} ${formatted}`;
    try {
      await requestOtp(e164);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send OTP';
      toast.error(msg);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    nav.navigate('OtpVerify', { phone: e164, role: params?.role });
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Pressable
            onPress={() => {
              nav.goBack();
            }}
            hitSlop={20}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <BackIcon size={22} />
          </Pressable>

          <View>
            <Text variant="labelSm" color={palette.red}>
              {t('phone.kicker')}
            </Text>
            <Text variant="display" style={{ marginTop: spacing.xs }}>
              {t('phone.title')}
            </Text>
            <Text variant="editorial" color={theme.muted} style={{ marginTop: spacing.sm }}>
              {t('phone.subtitle')}
            </Text>
          </View>

          <PhoneField
            digits={digits}
            formatted={formatted}
            onChangeDigits={(d) => {
              setDigits(d.slice(0, PHONE_MAX_DIGITS));
            }}
            invalid={digits.length > 0 && !isValid && digits.length === PHONE_MAX_DIGITS}
          />

          {digits.length > 0 && !isValid && (
            <Text variant="caption" color={palette.red}>
              {t('phone.invalid')}
            </Text>
          )}

          <Button
            block
            size="lg"
            variant="red"
            label={t('common.continue')}
            disabled={!isValid}
            loading={submitting}
            onPress={submit}
          />

          <View style={styles.dividerRow}>
            <Divider />
            <View style={[styles.dividerLabel, { backgroundColor: theme.bg }]}>
              <Text variant="labelSm" color={theme.muted}>
                {t('phone.or_continue_with')}
              </Text>
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <SocialButton
              label={t('phone.apple')}
              icon="star"
              onPress={() => toast.info('Apple Sign-In is wired in a follow-up commit.', 'Mock')}
            />
            <SocialButton
              label={t('phone.google')}
              icon="search"
              onPress={() => toast.info('Google Sign-In is wired in a follow-up commit.', 'Mock')}
            />
          </View>

          <Text variant="caption" color={theme.muted} style={{ marginTop: spacing.lg }}>
            {t('phone.tos')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface PhoneFieldProps {
  digits: string;
  formatted: string;
  onChangeDigits: (d: string) => void;
  invalid: boolean;
}

function PhoneField({ digits, formatted, onChangeDigits, invalid }: PhoneFieldProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: invalid ? palette.red : focus.value > 0.5 ? theme.text : theme.lineStrong,
  }));

  return (
    <Animated.View
      style={[styles.fieldRing, { backgroundColor: theme.surface }, shadow.sm, ringStyle]}
    >
      <View style={[styles.prefixBadge, { borderColor: theme.line }]}>
        <Text variant="bodyBold" color={theme.text}>
          {PREFIX}
        </Text>
      </View>

      <TextInput
        value={formatted}
        onChangeText={(t) => {
          onChangeDigits(t.replace(/\D/g, ''));
        }}
        keyboardType="number-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        autoFocus
        maxLength={PHONE_MAX_DIGITS + 2}
        placeholder="98765 43210"
        placeholderTextColor={theme.muted}
        selectionColor={palette.red}
        onFocus={() => {
          setFocused(true);
          focus.value = withTiming(1, { duration: 160 });
        }}
        onBlur={() => {
          setFocused(false);
          focus.value = withTiming(0, { duration: 160 });
        }}
        style={[
          styles.fieldInput,
          {
            color: theme.text,
            fontFamily: fontFamilies.monoBold,
          },
        ]}
      />

      <View style={styles.fieldCounter}>
        <Text variant="caption" color={focused ? palette.red : theme.muted}>
          {digits.length}/{PHONE_MAX_DIGITS}
        </Text>
      </View>
    </Animated.View>
  );
}

interface SocialButtonProps {
  label: string;
  icon: 'star' | 'search';
  onPress: () => void;
}

function SocialButton({ label, icon, onPress }: SocialButtonProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.socialBtn,
        {
          backgroundColor: theme.surface,
          borderColor: theme.lineStrong,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Icon name={icon} size={18} />
      <Text variant="bodyBold">{label}</Text>
    </Pressable>
  );
}

/** '9876543210' → '98765 43210'. Empty input passes through. */
function formatIndianMobile(digits: string): string {
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fieldRing: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  prefixBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.sm,
  },
  fieldInput: {
    flex: 1,
    fontSize: 26,
    paddingVertical: 0,
  },
  fieldCounter: {
    paddingHorizontal: spacing.xs,
  },
  dividerRow: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLabel: {
    position: 'absolute',
    paddingHorizontal: spacing.md,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
  },
});
