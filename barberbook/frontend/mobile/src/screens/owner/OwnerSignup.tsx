import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { createShop } from '../../api/resources/owner';
import { Button, DenseHeader, Icon, Text } from '../../components';
import { LeafletMap } from '../../components/LeafletMap';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { reverseGeocode } from '../../lib/geocode';
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
const DEFAULT_COORDS = { latitude: 12.9716, longitude: 77.5946 };

const INITIAL: FormState = {
  shop_name: '',
  slug: '',
  phone: '',
  address_line: '',
  city: 'Bengaluru',
  pincode: '',
  latitude: DEFAULT_COORDS.latitude,
  longitude: DEFAULT_COORDS.longitude,
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
  const [geoBusy, setGeoBusy] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const didAutoLocate = useRef(false);

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

  const finish = async () => {
    if (enrolling) return;
    setEnrolling(true);
    try {
      await createShop({
        shop_name: form.shop_name,
        slug: form.slug,
        phone: form.phone,
        address_line: form.address_line,
        city: form.city,
        pincode: form.pincode,
        latitude: form.latitude,
        longitude: form.longitude,
        open_time: form.open_time,
        close_time: form.close_time,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.success(`${form.shop_name || 'Your shop'} is live — customers can find it now.`);
      nav.navigate('OwnerKYC');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create the shop.';
      toast.error(msg);
    } finally {
      setEnrolling(false);
    }
  };

  // Resolve the pinned coordinate into a street address via the backend
  // OpenCage proxy (key lives in Rideshare Settings — never in the bundle).
  const lookupAddress = async (lat: number, lng: number) => {
    setGeoBusy(true);
    try {
      const r = await reverseGeocode(lat, lng);
      if (r.address) set('address_line', r.address);
      if (r.city) set('city', r.city);
      if (r.postcode) set('pincode', r.postcode);
    } catch {
      toast.warn('Reverse-geocode failed; fill in the address manually.');
    } finally {
      setGeoBusy(false);
    }
  };

  // Grab a GPS fix, then auto-fill the address from it.
  const detectMyLocation = async () => {
    Haptics.selectionAsync().catch(() => {});
    setGeoBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        toast.warn('Enable location to auto-detect your shop position.');
        return;
      }
      const fix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = fix.coords.latitude;
      const lng = fix.coords.longitude;
      set('latitude', lat);
      set('longitude', lng);
      await lookupAddress(lat, lng);
    } catch {
      toast.warn("Couldn't get your location. Enter the address manually.");
    } finally {
      setGeoBusy(false);
    }
  };

  // On enrollment start: capture the shop's live location ONCE (GPS fix +
  // OpenCage reverse geocode) so the pin + address are pre-filled. The owner
  // can still fine-tune the pin on the map or edit the address manually. Runs
  // quietly — if permission is denied we just leave the defaults for manual entry.
  useEffect(() => {
    if (didAutoLocate.current) return;
    didAutoLocate.current = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) return;
        setGeoBusy(true);
        const fix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = fix.coords.latitude;
        const lng = fix.coords.longitude;
        set('latitude', lat);
        set('longitude', lng);
        await lookupAddress(lat, lng);
      } catch {
        // Non-fatal — manual map pin + address entry remain available.
      } finally {
        setGeoBusy(false);
      }
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

              <View style={[styles.mapHost, { borderColor: theme.line }]}>
                <LeafletMap
                  selectable
                  selected={{ lat: form.latitude, lng: form.longitude }}
                  center={{ lat: form.latitude, lng: form.longitude }}
                  zoom={15}
                  onSelect={(lat, lng) => {
                    set('latitude', lat);
                    set('longitude', lng);
                  }}
                />
                <View style={styles.mapHint} pointerEvents="none">
                  <Icon name="pin" size={12} color={palette.cream} />
                  <Text variant="labelSm" color={palette.cream}>
                    TAP MAP TO DROP PIN
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.locCard,
                  { backgroundColor: theme.surface, borderColor: theme.line },
                ]}
              >
                <View style={styles.locRow}>
                  <View style={styles.pinDot}>
                    <Icon name="pin" size={18} color={palette.cream} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="labelSm" color={theme.muted}>
                      PINNED LOCATION
                    </Text>
                    <Text variant="mono">
                      {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                    </Text>
                  </View>
                </View>

                <View style={styles.locActions}>
                  <Button
                    variant="ghost"
                    size="md"
                    label="Use my location"
                    loading={geoBusy}
                    disabled={geoBusy}
                    leading={<Icon name="pin" size={16} color={palette.red} />}
                    onPress={() => {
                      detectMyLocation().catch(() => {});
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="primary"
                    size="md"
                    label="Look up address"
                    loading={geoBusy}
                    disabled={geoBusy}
                    leading={<Icon name="search" size={16} color={palette.cream} />}
                    onPress={() => {
                      lookupAddress(form.latitude, form.longitude).catch(() => {});
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
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
            loading={enrolling}
            disabled={enrolling}
            onPress={() => {
              finish().catch(() => {});
            }}
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
    height: 240,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  mapHint: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(14,14,16,0.78)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  locCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  locActions: {
    flexDirection: 'row',
    gap: spacing.sm,
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
