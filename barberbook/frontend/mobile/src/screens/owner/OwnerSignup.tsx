import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, DenseHeader, Icon, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { toast } from '../../lib/toast';
import type { ShopStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<ShopStackParamList, 'OwnerSignup'>;

interface FormState {
  shop_name: string;
  slug: string;
  phone: string;
  address_line: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  open_time: string;
  close_time: string;
}

const TOTAL_STEPS = 5;
const DEFAULT_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

const INITIAL: FormState = {
  shop_name: '',
  slug: '',
  phone: '',
  address_line: '',
  city: 'Bengaluru',
  pincode: '',
  latitude: DEFAULT_REGION.latitude,
  longitude: DEFAULT_REGION.longitude,
  open_time: '09:00',
  close_time: '21:00',
};

export function OwnerSignup() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [form, setForm] = useState<FormState>(INITIAL);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const next = () => {
    Haptics.selectionAsync().catch(() => {});
    setStep((s) => (s < TOTAL_STEPS - 1 ? ((s + 1) as 0 | 1 | 2 | 3 | 4) : s));
  };
  const back = () => {
    Haptics.selectionAsync().catch(() => {});
    if (step === 0) {
      nav.goBack();
      return;
    }
    setStep((s) => (s - 1) as 0 | 1 | 2 | 3 | 4);
  };

  const finish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    nav.navigate('OwnerKYC');
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const top = results[0];
      if (!top) return;
      set('address_line', [top.name, top.street].filter(Boolean).join(', ') || form.address_line);
      set('city', top.city ?? form.city);
      set('pincode', top.postalCode ?? form.pincode);
    } catch {
      // Permission missing or offline; non-fatal.
    }
  };

  const stepLabel = [
    'signup_step_basics',
    'signup_step_contact',
    'signup_step_location',
    'signup_step_hours',
    'signup_step_review',
  ][step];

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker={t('owner.signup_step', { n: step + 1 })}
        title={t(`owner.${stepLabel}`)}
        onBack={back}
        trailing={<Progress total={TOTAL_STEPS} active={step} />}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <>
              <LabeledInput
                label={t('owner.signup_field_name')}
                value={form.shop_name}
                onChange={(v) => {
                  set('shop_name', v);
                  set(
                    'slug',
                    v
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, ''),
                  );
                }}
                placeholder="Raj's Classic Cuts"
              />
              <Text variant="caption" color={theme.muted}>
                {t('owner.signup_field_slug_hint', { slug: form.slug || 'your-shop' })}
              </Text>
            </>
          )}

          {step === 1 && (
            <>
              <LabeledInput
                label={t('owner.signup_field_phone')}
                value={form.phone}
                onChange={(v) => {
                  set('phone', v);
                }}
                placeholder="+91 98000 00000"
                keyboardType="phone-pad"
                mono
              />
              <LabeledInput
                label={t('phone.tos').toUpperCase()}
                value={form.shop_name}
                onChange={() => {}}
                placeholder="Read-only"
                multiline
                disabled
              />
            </>
          )}

          {step === 2 && (
            <>
              <Text variant="caption" color={theme.muted}>
                {t('owner.signup_pin_hint')}
              </Text>

              <View style={styles.mapHost}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  initialRegion={{
                    latitude: form.latitude,
                    longitude: form.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  onRegionChangeComplete={(r) => {
                    set('latitude', r.latitude);
                    set('longitude', r.longitude);
                  }}
                  showsUserLocation
                  showsMyLocationButton={false}
                />
                {/* Center pin overlay so the user just frames the map under it. */}
                <View style={styles.pinOverlay} pointerEvents="none">
                  <View style={styles.pinDot}>
                    <Icon name="pin" size={18} color={palette.cream} />
                  </View>
                  <View style={styles.pinShadow} />
                </View>

                <Pressable
                  onPress={() => {
                    reverseGeocode(form.latitude, form.longitude).catch(() => {
                      toast.warn('Reverse-geocode failed; fill in the address manually.');
                    });
                  }}
                  style={[styles.geocodeBtn, { backgroundColor: palette.ink }]}
                >
                  <Icon name="search" size={14} color={palette.cream} />
                  <Text variant="label" color={palette.cream}>
                    REVERSE GEOCODE
                  </Text>
                </Pressable>
              </View>

              <LabeledInput
                label={t('owner.signup_field_address')}
                value={form.address_line}
                onChange={(v) => {
                  set('address_line', v);
                }}
                placeholder="17, 4th Cross, Indiranagar"
              />
              <View style={styles.row2}>
                <LabeledInput
                  label={t('owner.signup_field_city')}
                  value={form.city}
                  onChange={(v) => {
                    set('city', v);
                  }}
                  placeholder="Bengaluru"
                  style={{ flex: 1 }}
                />
                <LabeledInput
                  label={t('owner.signup_field_pincode')}
                  value={form.pincode}
                  onChange={(v) => {
                    set('pincode', v.replace(/\D/g, ''));
                  }}
                  placeholder="560038"
                  keyboardType="number-pad"
                  mono
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}

          {step === 3 && (
            <View style={styles.row2}>
              <LabeledInput
                label="OPEN"
                value={form.open_time}
                onChange={(v) => {
                  set('open_time', v);
                }}
                placeholder="09:00"
                mono
                style={{ flex: 1 }}
              />
              <LabeledInput
                label="CLOSE"
                value={form.close_time}
                onChange={(v) => {
                  set('close_time', v);
                }}
                placeholder="21:00"
                mono
                style={{ flex: 1 }}
              />
            </View>
          )}

          {step === 4 && (
            <View style={{ gap: spacing.md }}>
              <ReviewLine label={t('owner.signup_field_name')} value={form.shop_name} />
              <ReviewLine label={t('owner.signup_field_phone')} value={form.phone} />
              <ReviewLine label={t('owner.signup_field_address')} value={form.address_line} />
              <ReviewLine
                label={t('owner.signup_field_city')}
                value={`${form.city} ${form.pincode}`}
              />
              <ReviewLine
                label="LAT,LNG"
                value={`${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)}`}
                mono
              />
              <ReviewLine label="HOURS" value={`${form.open_time} – ${form.close_time}`} mono />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: theme.surface,
            borderTopColor: theme.line,
          },
        ]}
      >
        <Button
          variant="ghost"
          size="lg"
          label={t('owner.signup_back_step')}
          onPress={back}
          style={{ flex: 1 }}
        />
        {step < TOTAL_STEPS - 1 ? (
          <Button
            variant="red"
            size="lg"
            label={t('owner.signup_next_step')}
            onPress={next}
            style={{ flex: 1 }}
            trailing={<Icon name="chevronRight" size={16} color={palette.cream} />}
          />
        ) : (
          <Button
            variant="red"
            size="lg"
            label={t('owner.signup_finish')}
            onPress={finish}
            style={{ flex: 2 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

interface ProgressProps {
  total: number;
  active: number;
}

function Progress({ total, active }: ProgressProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.progress}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.pip,
            {
              width: i === active ? 22 : 6,
              backgroundColor: i <= active ? palette.red : theme.lineStrong,
            },
          ]}
        />
      ))}
    </View>
  );
}

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
  mono?: boolean;
  disabled?: boolean;
  style?: object;
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  mono = false,
  disabled = false,
  style,
}: LabeledInputProps) {
  const { theme } = useTheme();
  return (
    <View style={[{ gap: spacing.xs }, style]}>
      <Text variant="labelSm" color={theme.muted}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        editable={!disabled}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.lineStrong,
            backgroundColor: theme.surface,
            opacity: disabled ? 0.65 : 1,
            fontFamily: mono ? fontFamilies.monoBold : fontFamilies.body,
          },
          multiline && { minHeight: 96, textAlignVertical: 'top' },
        ]}
      />
    </View>
  );
}

interface ReviewLineProps {
  label: string;
  value: string;
  mono?: boolean;
}

function ReviewLine({ label, value, mono }: ReviewLineProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.reviewLine, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Text variant="labelSm" color={theme.muted}>
        {label.toUpperCase()}
      </Text>
      <Text variant={mono ? 'mono' : 'bodyBold'}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  progress: {
    flexDirection: 'row',
    gap: 4,
  },
  pip: {
    height: 6,
    borderRadius: 3,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  row2: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mapHost: {
    height: 220,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.cream,
  },
  pinShadow: {
    width: 12,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 4,
  },
  geocodeBtn: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  reviewLine: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    gap: spacing.sm,
  },
});
