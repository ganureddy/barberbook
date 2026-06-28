import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
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

import { useCreateShop } from '../../api/hooks';
import type { OnboardBarberDraft, OnboardServiceDraft } from '../../api/resources';
import type { DayOfWeek } from '../../api/types';
import { Button, Card, DenseHeader, Icon, Text } from '../../components';
import { LeafletMap } from '../../components/LeafletMap';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { pickImageFromCamera, pickImageFromLibrary } from '../../lib/files';
import { reverseGeocode } from '../../lib/geocode';
import { toast } from '../../lib/toast';
import type { OwnerRootStackParamList } from '../../navigation/types';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

type Nav = NativeStackNavigationProp<OwnerRootStackParamList, 'OwnerOnboard'>;

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_COORDS = { latitude: 11.2588, longitude: 75.7804 };
const CATEGORIES = ['Hair', 'Beard', 'Color', 'Spa', 'Combo'];

interface BarberRow extends OnboardBarberDraft {
  id: string;
}
interface ServiceRow extends OnboardServiceDraft {
  id: string;
}

interface FormState {
  shop_name: string;
  phone: string;
  photos: string[];
  address_line: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
  open_time: string;
  close_time: string;
  seat_count: string;
  barbers: BarberRow[];
  services: ServiceRow[];
}

const INITIAL: FormState = {
  shop_name: '',
  phone: '',
  photos: [],
  address_line: '',
  city: 'Kozhikode',
  pincode: '',
  latitude: DEFAULT_COORDS.latitude,
  longitude: DEFAULT_COORDS.longitude,
  open_time: '09:00',
  close_time: '21:00',
  seat_count: '2',
  barbers: [],
  services: [],
};

const STEP_KEYS = [
  'onb_step_basics',
  'onb_step_photos',
  'onb_step_location',
  'onb_step_hours',
  'onb_step_team',
  'onb_step_menu',
  'onb_step_review',
] as const;
const TOTAL = STEP_KEYS.length;

export function OwnerOnboard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const setActiveShop = useWorkspaceStore((s) => s.setActiveShop);
  const createShopMut = useCreateShop();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [geoBusy, setGeoBusy] = useState(false);
  const didAutoLocate = useRef(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
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
    // Light per-step validation.
    if (step === 0 && form.shop_name.trim().length === 0) {
      toast.warn(t('owner.onb_err_name'));
      return;
    }
    if (step === 4 && form.barbers.length === 0) {
      toast.warn(t('owner.onb_err_team'));
      return;
    }
    if (step === 5 && form.services.length === 0) {
      toast.warn(t('owner.onb_err_menu'));
      return;
    }
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  };

  const finish = () => {
    if (createShopMut.isPending) return;
    createShopMut.mutate(
      {
        shop_name: form.shop_name.trim(),
        phone: form.phone.trim(),
        address_line: form.address_line.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        open_time: form.open_time,
        close_time: form.close_time,
        cover_image: form.photos[0],
        photos: form.photos,
        seat_count: Math.max(0, parseInt(form.seat_count, 10) || 0),
        barbers: form.barbers.map(({ id: _id, ...rest }) => rest),
        services: form.services.map(({ id: _id, ...rest }) => rest),
      },
      {
        onSuccess: (shop) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          toast.success(t('owner.onb_success', { name: shop.shop_name }));
          setActiveShop(shop.name);
          nav.reset({
            index: 0,
            routes: [
              {
                name: 'OwnerHome',
                params: { screen: 'TodayTab', params: { screen: 'OwnerToday' } },
              },
            ],
          });
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not open the shop.');
        },
      },
    );
  };

  // ── Location helpers ───────────────────────────────────────────────
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

  const detectMyLocation = async () => {
    Haptics.selectionAsync().catch(() => {});
    setGeoBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        toast.warn('Enable location to auto-detect your shop position.');
        return;
      }
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      set('latitude', fix.coords.latitude);
      set('longitude', fix.coords.longitude);
      await lookupAddress(fix.coords.latitude, fix.coords.longitude);
    } catch {
      toast.warn("Couldn't get your location. Enter the address manually.");
    } finally {
      setGeoBusy(false);
    }
  };

  useEffect(() => {
    if (didAutoLocate.current) return;
    didAutoLocate.current = true;
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) return;
        const fix = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        set('latitude', fix.coords.latitude);
        set('longitude', fix.coords.longitude);
        await lookupAddress(fix.coords.latitude, fix.coords.longitude);
      } catch {
        /* manual entry remains available */
      }
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Photos ─────────────────────────────────────────────────────────
  const addPhoto = async (fromCamera: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    try {
      const picked = fromCamera ? await pickImageFromCamera() : await pickImageFromLibrary();
      if (picked) set('photos', [...form.photos, picked.uri]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add photo');
    }
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker={t('owner.onb_step', { n: step + 1, total: TOTAL })}
        title={t(`owner.${STEP_KEYS[step]}`)}
        onBack={back}
        trailing={<Progress total={TOTAL} active={step} />}
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
              <LabeledInput
                label={t('owner.onb_basics_name')}
                value={form.shop_name}
                onChange={(v) => {
                  set('shop_name', v);
                }}
                placeholder="Raj's Classic Cuts"
              />
              <LabeledInput
                label={t('owner.onb_basics_phone')}
                value={form.phone}
                onChange={(v) => {
                  set('phone', v);
                }}
                placeholder={t('owner.onb_basics_phone_ph')}
                keyboardType="phone-pad"
                mono
              />
            </>
          )}

          {step === 1 && (
            <PhotosStep
              photos={form.photos}
              onAdd={addPhoto}
              onRemove={(uri) => {
                set(
                  'photos',
                  form.photos.filter((p) => p !== uri),
                );
              }}
            />
          )}

          {step === 2 && (
            <LocationStep
              form={form}
              set={set}
              geoBusy={geoBusy}
              onDetect={() => detectMyLocation().catch(() => {})}
              onLookup={() => lookupAddress(form.latitude, form.longitude).catch(() => {})}
            />
          )}

          {step === 3 && (
            <>
              <View style={styles.row2}>
                <LabeledInput
                  label={t('owner.onb_hours_open')}
                  value={form.open_time}
                  onChange={(v) => {
                    set('open_time', v);
                  }}
                  placeholder="09:00"
                  mono
                  style={{ flex: 1 }}
                />
                <LabeledInput
                  label={t('owner.onb_hours_close')}
                  value={form.close_time}
                  onChange={(v) => {
                    set('close_time', v);
                  }}
                  placeholder="21:00"
                  mono
                  style={{ flex: 1 }}
                />
              </View>
              <LabeledInput
                label={t('owner.onb_seats_label')}
                value={form.seat_count}
                onChange={(v) => {
                  set('seat_count', v.replace(/\D/g, ''));
                }}
                placeholder="2"
                keyboardType="number-pad"
                mono
              />
            </>
          )}

          {step === 4 && (
            <TeamStep
              barbers={form.barbers}
              onAdd={(b) => {
                set('barbers', [...form.barbers, b]);
              }}
              onRemove={(id) => {
                set(
                  'barbers',
                  form.barbers.filter((b) => b.id !== id),
                );
              }}
            />
          )}

          {step === 5 && (
            <MenuStep
              services={form.services}
              onAdd={(s) => {
                set('services', [...form.services, s]);
              }}
              onRemove={(id) => {
                set(
                  'services',
                  form.services.filter((s) => s.id !== id),
                );
              }}
            />
          )}

          {step === 6 && <ReviewStep form={form} />}
        </ScrollView>
      </KeyboardAvoidingView>

      <Footer
        insetBottom={insets.bottom}
        isLast={step === TOTAL - 1}
        onBack={back}
        onNext={next}
        onFinish={finish}
        loading={createShopMut.isPending}
      />
    </SafeAreaView>
  );
}

// ─── Steps ──────────────────────────────────────────────────────────────────

function PhotosStep({
  photos,
  onAdd,
  onRemove,
}: {
  photos: string[];
  onAdd: (fromCamera: boolean) => Promise<void>;
  onRemove: (uri: string) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <>
      <Text variant="caption" color={theme.muted}>
        {t('owner.onb_photos_hint')}
      </Text>
      <View style={styles.photoGrid}>
        {photos.map((uri, i) => (
          <View key={uri} style={styles.photoTile}>
            <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
            {i === 0 && (
              <View style={styles.coverBadge}>
                <Text variant="labelSm" color={palette.cream}>
                  {t('owner.onb_photos_cover')}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                onRemove(uri);
              }}
              style={styles.photoRemove}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Icon name="close" size={16} color={palette.cream} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() => {
            onAdd(false).catch(() => {});
          }}
          onLongPress={() => {
            onAdd(true).catch(() => {});
          }}
          style={[
            styles.photoAdd,
            { borderColor: theme.lineStrong, backgroundColor: theme.surface },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('owner.onb_photos_add')}
        >
          <Icon name="plus" size={26} color={theme.muted} />
          <Text variant="labelSm" color={theme.muted}>
            {t('owner.onb_photos_add').toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

function LocationStep({
  form,
  set,
  geoBusy,
  onDetect,
  onLookup,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  geoBusy: boolean;
  onDetect: () => void;
  onLookup: () => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
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
      </View>
      <View style={styles.locActions}>
        <Button
          variant="ghost"
          size="md"
          label="Use my location"
          loading={geoBusy}
          disabled={geoBusy}
          leading={<Icon name="pin" size={16} color={palette.red} />}
          onPress={onDetect}
          style={{ flex: 1 }}
        />
        <Button
          variant="red"
          size="md"
          label="Look up address"
          loading={geoBusy}
          disabled={geoBusy}
          leading={<Icon name="search" size={16} color={palette.cream} />}
          onPress={onLookup}
          style={{ flex: 1 }}
        />
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
          placeholder="Kozhikode"
          style={{ flex: 1 }}
        />
        <LabeledInput
          label={t('owner.signup_field_pincode')}
          value={form.pincode}
          onChange={(v) => {
            set('pincode', v.replace(/\D/g, ''));
          }}
          placeholder="673004"
          keyboardType="number-pad"
          mono
          style={{ flex: 1 }}
        />
      </View>
    </>
  );
}

function TeamStep({
  barbers,
  onAdd,
  onRemove,
}: {
  barbers: BarberRow[];
  onAdd: (b: BarberRow) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [years, setYears] = useState('');
  const [days, setDays] = useState<DayOfWeek[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');

  const add = () => {
    if (name.trim().length === 0) {
      toast.warn(t('owner.onb_team_name'));
      return;
    }
    if (phone.trim().length === 0) {
      toast.warn(t('owner.onb_team_phone'));
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    onAdd({
      id: `b-${Date.now()}`,
      full_name: name.trim(),
      phone: phone.trim(),
      specialties: specialties.trim(),
      years_experience: parseInt(years, 10) || 0,
      available_days: days,
      shift_start: shiftStart,
      shift_end: shiftEnd,
    });
    setName('');
    setPhone('');
    setSpecialties('');
    setYears('');
  };

  return (
    <>
      <Text variant="caption" color={theme.muted}>
        {t('owner.onb_team_hint')}
      </Text>

      {barbers.map((b) => {
        const spec = b.specialties && b.specialties.length > 0 ? b.specialties : '—';
        return (
          <EntityRow
            key={b.id}
            title={`${b.full_name}  ·  ${b.phone ?? ''}`}
            subtitle={`${spec} · ${b.years_experience ?? 0}y · ${(b.available_days ?? []).length}d ${b.shift_start}-${b.shift_end}`}
            onRemove={() => {
              onRemove(b.id);
            }}
          />
        );
      })}

      <Card style={{ gap: spacing.md }}>
        <LabeledInput
          label={t('owner.onb_team_name')}
          value={name}
          onChange={setName}
          placeholder="Imran Khan"
        />
        <LabeledInput
          label={t('owner.onb_team_phone')}
          value={phone}
          onChange={setPhone}
          placeholder="+91 98000 00000"
          keyboardType="phone-pad"
          mono
        />
        <Text variant="caption" color={theme.muted}>
          {t('owner.onb_team_phone_hint')}
        </Text>
        <LabeledInput
          label={t('owner.onb_team_specialties')}
          value={specialties}
          onChange={setSpecialties}
          placeholder={t('owner.onb_team_specialties_ph')}
        />
        <LabeledInput
          label={t('owner.onb_team_experience')}
          value={years}
          onChange={(v) => {
            setYears(v.replace(/\D/g, ''));
          }}
          placeholder="5"
          keyboardType="number-pad"
          mono
        />
        <View style={{ gap: spacing.xs }}>
          <Text variant="labelSm" color={theme.muted}>
            {t('owner.onb_team_days').toUpperCase()}
          </Text>
          <DayPicker value={days} onChange={setDays} />
        </View>
        <View style={styles.row2}>
          <LabeledInput
            label={t('owner.onb_team_shift')}
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
        <Button
          variant="red"
          size="md"
          block
          label={t('owner.onb_team_add')}
          leading={<Icon name="plus" size={16} color={palette.cream} />}
          onPress={add}
        />
      </Card>
    </>
  );
}

function MenuStep({
  services,
  onAdd,
  onRemove,
}: {
  services: ServiceRow[];
  onAdd: (s: ServiceRow) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hair');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');

  const add = () => {
    if (name.trim().length === 0) {
      toast.warn(t('owner.onb_menu_name'));
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    onAdd({
      id: `s-${Date.now()}`,
      service_name: name.trim(),
      category,
      duration_minutes: parseInt(duration, 10) || 30,
      price: parseInt(price, 10) || 0,
    });
    setName('');
    setPrice('');
  };

  return (
    <>
      <Text variant="caption" color={theme.muted}>
        {t('owner.onb_menu_hint')}
      </Text>

      {services.map((s) => (
        <EntityRow
          key={s.id}
          title={s.service_name}
          subtitle={`${s.category} · ${s.duration_minutes}m · ₹${s.price}`}
          onRemove={() => {
            onRemove(s.id);
          }}
        />
      ))}

      <Card style={{ gap: spacing.md }}>
        <LabeledInput
          label={t('owner.onb_menu_name')}
          value={name}
          onChange={setName}
          placeholder="Men's Haircut"
        />
        <View style={{ gap: spacing.xs }}>
          <Text variant="labelSm" color={theme.muted}>
            {t('owner.onb_menu_category').toUpperCase()}
          </Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    setCategory(c);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? palette.ink : 'transparent',
                      borderColor: active ? palette.ink : theme.lineStrong,
                    },
                  ]}
                >
                  <Text variant="label" color={active ? palette.cream : theme.text}>
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.row2}>
          <LabeledInput
            label={t('owner.onb_menu_duration')}
            value={duration}
            onChange={(v) => {
              setDuration(v.replace(/\D/g, ''));
            }}
            placeholder="30"
            keyboardType="number-pad"
            mono
            style={{ flex: 1 }}
          />
          <LabeledInput
            label={t('owner.onb_menu_price')}
            value={price}
            onChange={(v) => {
              setPrice(v.replace(/\D/g, ''));
            }}
            placeholder="350"
            keyboardType="number-pad"
            mono
            style={{ flex: 1 }}
          />
        </View>
        <Button
          variant="red"
          size="md"
          block
          label={t('owner.onb_menu_add')}
          leading={<Icon name="plus" size={16} color={palette.cream} />}
          onPress={add}
        />
      </Card>
    </>
  );
}

function ReviewStep({ form }: { form: FormState }) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: spacing.md }}>
      <ReviewLine label={t('owner.onb_review_shop')} value={form.shop_name} />
      <ReviewLine label={t('owner.onb_review_contact')} value={form.phone} />
      <ReviewLine
        label={t('owner.onb_review_address')}
        value={`${form.address_line} ${form.pincode}`.trim()}
      />
      <ReviewLine
        label={t('owner.onb_review_hours')}
        value={`${form.open_time} – ${form.close_time}`}
        mono
      />
      <ReviewLine label={t('owner.onb_review_seats')} value={form.seat_count} mono />
      <ReviewLine
        label={t('owner.onb_review_team')}
        value={t('owner.onb_review_team_count', { n: form.barbers.length })}
      />
      <ReviewLine
        label={t('owner.onb_review_menu')}
        value={t('owner.onb_review_menu_count', { n: form.services.length })}
      />
      <ReviewLine
        label={t('owner.onb_review_photos')}
        value={t('owner.onb_review_photos_count', { n: form.photos.length })}
      />
    </View>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────

function Footer({
  insetBottom,
  isLast,
  onBack,
  onNext,
  onFinish,
  loading,
}: {
  insetBottom: number;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: insetBottom + spacing.md,
          backgroundColor: theme.surface,
          borderTopColor: theme.line,
        },
      ]}
    >
      <Button
        variant="ghost"
        size="lg"
        label={t('owner.onb_back')}
        onPress={onBack}
        style={{ flex: 1 }}
      />
      {isLast ? (
        <Button
          variant="red"
          size="lg"
          label={loading ? t('owner.onb_creating') : t('owner.onb_finish')}
          loading={loading}
          disabled={loading}
          onPress={onFinish}
          style={{ flex: 2 }}
        />
      ) : (
        <Button
          variant="red"
          size="lg"
          label={t('owner.onb_next')}
          onPress={onNext}
          style={{ flex: 2 }}
          trailing={<Icon name="chevronRight" size={16} color={palette.cream} />}
        />
      )}
    </View>
  );
}

function EntityRow({
  title,
  subtitle,
  onRemove,
}: {
  title: string;
  subtitle: string;
  onRemove: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Card padded style={styles.entityRow}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" color={theme.muted} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Remove"
      >
        <Icon name="close" size={20} color={palette.red} />
      </Pressable>
    </Card>
  );
}

export function DayPicker({
  value,
  onChange,
}: {
  value: DayOfWeek[];
  onChange: (v: DayOfWeek[]) => void;
}) {
  const { theme } = useTheme();
  const toggle = (d: DayOfWeek) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  };
  return (
    <View style={styles.dayRow}>
      {DAYS.map((d) => {
        const active = value.includes(d);
        return (
          <Pressable
            key={d}
            onPress={() => {
              toggle(d);
            }}
            style={[
              styles.dayPill,
              {
                backgroundColor: active ? palette.red : 'transparent',
                borderColor: active ? palette.red : theme.lineStrong,
              },
            ]}
          >
            <Text variant="labelSm" color={active ? palette.cream : theme.text}>
              {d[0]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Progress({ total, active }: { total: number; active: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.progress}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.pip,
            {
              width: i === active ? 18 : 5,
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
  progress: { flexDirection: 'row', gap: 3 },
  pip: { height: 5, borderRadius: 3 },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  mapHost: { height: 220, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1 },
  locActions: { flexDirection: 'row', gap: spacing.sm },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoTile: { width: 100, height: 100, borderRadius: radii.md, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: palette.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(14,14,16,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 100,
    height: 100,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  dayRow: { flexDirection: 'row', gap: spacing.xs },
  dayPill: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
