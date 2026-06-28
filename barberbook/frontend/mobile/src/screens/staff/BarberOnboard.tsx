import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNearbyShops, useOnboardBarber } from '../../api/hooks';
import type { DayOfWeek } from '../../api/types';
import {
  Button,
  Card,
  DenseHeader,
  Icon,
  ListRowSkeleton,
  SkeletonGroup,
  Text,
} from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { env } from '../../lib/env';
import { pickImageFromLibrary } from '../../lib/files';
import { toast } from '../../lib/toast';
import type { StaffRootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { DayPicker } from '../owner/OwnerOnboard';

type Nav = NativeStackNavigationProp<StaffRootStackParamList, 'BarberOnboard'>;

// Default map center for the shop search (Kozhikode) — the radius is wide so
// the search behaves like a name/city lookup rather than a strict geo filter.
const SEARCH_CENTER = { latitude: 11.2588, longitude: 75.7804 };

const STEP_KEYS = [
  'onb_step_profile',
  'onb_step_shops',
  'onb_step_schedule',
  'onb_step_review',
] as const;
const TOTAL = STEP_KEYS.length;

export function BarberOnboard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setProfileName = useAuthStore((s) => s.setProfileName);
  const setActiveBarber = useWorkspaceStore((s) => s.setActiveBarber);
  const onboardMut = useOnboardBarber();

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [specialties, setSpecialties] = useState('');
  const [years, setYears] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedShops, setSelectedShops] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [days, setDays] = useState<DayOfWeek[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');

  const searchQ = useNearbyShops({
    latitude: SEARCH_CENTER.latitude,
    longitude: SEARCH_CENTER.longitude,
    radius_km: 50,
    q: query || undefined,
    country: env.defaultCountry,
    limit: 25,
  });

  const selectedCount = Object.keys(selectedShops).length;

  const toggleShop = (id: string, name: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedShops((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = name;
      return next;
    });
  };

  const back = () => {
    Haptics.selectionAsync().catch(() => {});
    if (step === 0) {
      nav.goBack();
      return;
    }
    setStep((s) => s - 1);
  };

  const next = () => {
    Haptics.selectionAsync().catch(() => {});
    if (step === 0 && fullName.trim().length === 0) {
      toast.warn(t('staff.onb_err_name'));
      return;
    }
    if (step === 1 && selectedCount === 0) {
      toast.warn(t('staff.onb_err_shops'));
      return;
    }
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  };

  const addPhoto = async () => {
    try {
      const picked = await pickImageFromLibrary();
      if (picked) setPhoto(picked.uri);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add photo');
    }
  };

  const finish = () => {
    if (onboardMut.isPending) return;
    onboardMut.mutate(
      {
        full_name: fullName.trim(),
        phone: phone.trim(),
        specialties: specialties.trim(),
        years_experience: parseInt(years, 10) || 0,
        avatar_seed: photo ?? fullName.trim().toLowerCase(),
        shop_ids: Object.keys(selectedShops),
        available_days: days,
        shift_start: shiftStart,
        shift_end: shiftEnd,
      },
      {
        onSuccess: (workspaces) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          toast.success(t('staff.onb_success', { n: workspaces.length }));
          const first = workspaces[0];
          if (first) {
            setActiveBarber(first.barber, first.shop.name);
            setProfileName(fullName.trim());
          }
          nav.reset({
            index: 0,
            routes: [{ name: 'StaffHome', params: { screen: 'StaffSchedule' } }],
          });
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not finish setup.');
        },
      },
    );
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker={t('staff.onb_step', { n: step + 1, total: TOTAL })}
        title={t(`staff.${STEP_KEYS[step]}`)}
        onBack={back}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <>
              <Pressable
                onPress={() => {
                  addPhoto().catch(() => {});
                }}
                style={styles.avatarPicker}
                accessibilityRole="button"
                accessibilityLabel={t('staff.onb_profile_photo')}
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarFallback,
                      { backgroundColor: palette.navy },
                    ]}
                  >
                    <Icon name="plus" size={26} color={palette.cream} />
                  </View>
                )}
                <Text variant="labelSm" color={theme.muted}>
                  {t('staff.onb_profile_photo').toUpperCase()}
                </Text>
              </Pressable>
              <LabeledInput
                label={t('staff.onb_profile_name')}
                value={fullName}
                onChange={setFullName}
                placeholder="Imran Khan"
              />
              <LabeledInput
                label={t('staff.onb_profile_phone')}
                value={phone}
                onChange={setPhone}
                placeholder="+91 98000 00000"
                keyboardType="phone-pad"
                mono
              />
              <LabeledInput
                label={t('staff.onb_profile_specialties')}
                value={specialties}
                onChange={setSpecialties}
                placeholder={t('staff.onb_profile_specialties_ph')}
              />
              <LabeledInput
                label={t('staff.onb_profile_experience')}
                value={years}
                onChange={(v) => {
                  setYears(v.replace(/\D/g, ''));
                }}
                placeholder="5"
                keyboardType="number-pad"
                mono
              />
            </>
          )}

          {step === 1 && (
            <>
              <Text variant="caption" color={theme.muted}>
                {t('staff.onb_shops_hint')}
              </Text>
              <View
                style={[
                  styles.search,
                  { borderColor: theme.lineStrong, backgroundColor: theme.surface },
                ]}
              >
                <Icon name="search" size={18} color={theme.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('staff.onb_shops_search')}
                  placeholderTextColor={theme.muted}
                  style={[styles.searchInput, { color: theme.text }]}
                />
              </View>
              {selectedCount > 0 && (
                <Text variant="labelSm" color={palette.red}>
                  {t('staff.onb_shops_selected', { n: selectedCount }).toUpperCase()}
                </Text>
              )}
              {searchQ.isLoading && !searchQ.data ? (
                <SkeletonGroup count={4}>
                  <ListRowSkeleton height={64} />
                </SkeletonGroup>
              ) : (searchQ.data ?? []).length === 0 ? (
                <Card>
                  <Text variant="caption" color={theme.muted}>
                    {t('staff.onb_shops_empty')}
                  </Text>
                </Card>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {(searchQ.data ?? []).map((s) => {
                    const checked = !!selectedShops[s.name];
                    return (
                      <Pressable
                        key={s.name}
                        onPress={() => {
                          toggleShop(s.name, s.shop_name);
                        }}
                        style={[
                          styles.shopRow,
                          {
                            borderColor: checked ? palette.red : theme.line,
                            backgroundColor: checked ? 'rgba(212,50,44,0.06)' : theme.surface,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyBold" numberOfLines={1}>
                            {s.shop_name}
                          </Text>
                          <Text variant="caption" color={theme.muted} numberOfLines={1}>
                            {s.city} · {s.distance_km} km
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: checked ? palette.red : theme.lineStrong,
                              backgroundColor: checked ? palette.red : 'transparent',
                            },
                          ]}
                        >
                          {checked && <Icon name="check" size={14} color={palette.cream} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <View style={{ gap: spacing.xs }}>
                <Text variant="labelSm" color={theme.muted}>
                  {t('staff.onb_schedule_days').toUpperCase()}
                </Text>
                <DayPicker value={days} onChange={setDays} />
              </View>
              <View style={styles.row2}>
                <LabeledInput
                  label={t('staff.onb_schedule_shift')}
                  value={shiftStart}
                  onChange={setShiftStart}
                  mono
                  style={{ flex: 1 }}
                />
                <LabeledInput
                  label=" "
                  value={shiftEnd}
                  onChange={setShiftEnd}
                  mono
                  style={{ flex: 1 }}
                />
              </View>
            </>
          )}

          {step === 3 && (
            <View style={{ gap: spacing.md }}>
              <ReviewLine label={t('staff.onb_review_name')} value={fullName} />
              <ReviewLine label={t('staff.onb_review_specialties')} value={specialties} />
              <ReviewLine
                label={t('staff.onb_review_shops')}
                value={t('staff.onb_review_shops_count', { n: selectedCount })}
              />
              <ReviewLine
                label={t('staff.onb_review_schedule')}
                value={`${days.length}d · ${shiftStart}–${shiftEnd}`}
                mono
              />
              <View style={{ gap: spacing.xs }}>
                {Object.values(selectedShops).map((name) => (
                  <Card key={name} padded style={styles.reviewShop}>
                    <Icon name="pole" size={16} color={palette.navy} />
                    <Text variant="bodyBold">{name}</Text>
                  </Card>
                ))}
              </View>
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
          label={t('staff.onb_back')}
          onPress={back}
          style={{ flex: 1 }}
        />
        {step === TOTAL - 1 ? (
          <Button
            variant="red"
            size="lg"
            label={onboardMut.isPending ? t('staff.onb_creating') : t('staff.onb_finish')}
            loading={onboardMut.isPending}
            disabled={onboardMut.isPending}
            onPress={finish}
            style={{ flex: 2 }}
          />
        ) : (
          <Button
            variant="red"
            size="lg"
            label={t('staff.onb_next')}
            onPress={next}
            style={{ flex: 2 }}
            trailing={<Icon name="chevronRight" size={16} color={palette.cream} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'decimal-pad';
  mono?: boolean;
  style?: object;
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
  mono = false,
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
        keyboardType={keyboardType}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.lineStrong,
            backgroundColor: theme.surface,
            fontFamily: mono ? fontFamilies.monoBold : fontFamilies.body,
          },
        ]}
      />
    </View>
  );
}

function ReviewLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
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
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
  row2: { flexDirection: 'row', gap: spacing.md },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  avatarPicker: { alignItems: 'center', gap: spacing.sm },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: spacing.md, fontSize: 16 },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewLine: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 4,
  },
  reviewShop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    gap: spacing.sm,
  },
});
