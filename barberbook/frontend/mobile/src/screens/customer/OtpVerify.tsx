import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestOtp, verifyOtp } from '../../api/auth';
import { BackIcon, Button, Icon, OtpInput, Text, type OtpInputHandle } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { env } from '../../lib/env';
import { toast } from '../../lib/toast';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'OtpVerify'>;
type Rt = RouteProp<OnboardingStackParamList, 'OtpVerify'>;

const RESEND_COOLDOWN_S = 30;
const OTP_LENGTH = 6;

// Default OTP for dev / mock-mode login — matches MOCK_OTP_CODE in
// src/api/mocks/fixtures.ts and the server-side dev bypass. Prefilled
// into the input when env.mock is on so testers can just tap Continue.
const DEFAULT_DEV_OTP = '424242';

export function OtpVerify() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const setSession = useAuthStore((s) => s.setSession);
  const setActiveRole = useAuthStore((s) => s.setActiveRole);

  const [code, setCode] = useState(env.mock ? DEFAULT_DEV_OTP : '');
  const [errored, setErrored] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_S);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<OtpInputHandle>(null);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => {
      setResendIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [resendIn]);

  // Shake animation for wrong-code state.
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));
  const triggerShake = useCallback(() => {
    shake.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withRepeat(
        withSequence(
          withTiming(10, { duration: 60, easing: Easing.linear }),
          withTiming(-10, { duration: 60, easing: Easing.linear }),
        ),
        2,
        false,
      ),
      withTiming(0, { duration: 60 }),
    );
  }, [shake]);

  const handleSubmit = useCallback(
    async (value: string) => {
      if (verifying) return;
      setVerifying(true);
      setErrored(false);
      try {
        const result = await verifyOtp(params.phone, value);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setSession(result.user, result.sid);

        // Owner / Staff: enter the chosen workspace. The root navigator
        // switches trees off `activeRole`, so setting it here is enough —
        // no LocationPerm step (that's a customer-discovery concern).
        if (params.role === 'Owner' || params.role === 'Staff') {
          setActiveRole(params.role);
          return;
        }

        // Customer (default): location step before discovery.
        nav.navigate('LocationPerm');
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setErrored(true);
        triggerShake();
        toast.error(t('otp.wrong_code'));
        setCode('');
        inputRef.current?.focus();
      } finally {
        setVerifying(false);
      }
    },
    [nav, params.phone, params.role, setSession, setActiveRole, t, triggerShake, verifying],
  );

  const onChange = (next: string) => {
    setCode(next);
    if (errored) setErrored(false);
  };

  const onResend = async () => {
    if (resendIn > 0 || resending) return;
    setResending(true);
    try {
      await requestOtp(params.phone);
      setResendIn(RESEND_COOLDOWN_S);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not resend';
      toast.error(msg);
    } finally {
      setResending(false);
    }
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
              {t('otp.kicker')}
            </Text>
            <Text variant="display" style={{ marginTop: spacing.xs }}>
              {t('otp.title')}
            </Text>
            <Text variant="editorial" color={theme.muted} style={{ marginTop: spacing.sm }}>
              {t('otp.subtitle_prefix')}
              <Text variant="bodyBold">{params.phone}</Text>
            </Text>
            <Pressable
              onPress={() => {
                nav.goBack();
              }}
              style={styles.editPhone}
            >
              <Icon name="plus" size={12} color={palette.red} />
              <Text variant="bodyBold" color={palette.red}>
                {t('otp.edit_phone')}
              </Text>
            </Pressable>
          </View>

          <Animated.View style={shakeStyle}>
            <OtpInput
              ref={inputRef}
              value={code}
              onChange={onChange}
              onComplete={handleSubmit}
              errored={errored}
              disabled={verifying}
            />
          </Animated.View>

          <Text variant="caption" color={theme.muted}>
            {t('otp.autofill_hint')}
            {env.mock && (
              <Text variant="caption" color={palette.gold}>
                {'  '}· {t('otp.mock_hint')}
              </Text>
            )}
          </Text>

          <View style={{ flex: 1 }} />

          <Button
            block
            size="lg"
            variant="red"
            label={verifying ? t('otp.verifying') : t('common.continue')}
            disabled={code.length < OTP_LENGTH || verifying}
            loading={verifying}
            onPress={() => handleSubmit(code)}
          />

          <View style={styles.resendRow}>
            {resendIn > 0 ? (
              <Text variant="caption" color={theme.muted}>
                {t('otp.resend_in', { seconds: resendIn })}
              </Text>
            ) : (
              <Pressable
                onPress={onResend}
                disabled={resending}
                style={styles.resendBtn}
                accessibilityRole="button"
                accessibilityLabel={t('otp.resend')}
              >
                <Icon name="bell" size={14} color={palette.red} />
                <Text variant="bodyBold" color={palette.red}>
                  {t('otp.resend')}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
  editPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  resendRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
