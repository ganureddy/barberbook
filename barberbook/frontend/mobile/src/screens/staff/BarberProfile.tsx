import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
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

import { useMyBarberWorkspaces, useUpdateBarberProfile } from '../../api/hooks';
import type { DayOfWeek } from '../../api/types';
import { Button, Card, DenseHeader, Icon, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { pickImageFromLibrary } from '../../lib/files';
import { toast } from '../../lib/toast';
import type { StaffStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { DayPicker } from '../owner/OwnerOnboard';

import { useActiveBarber } from './_staff';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffProfile'>;

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function BarberProfile() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setProfileName = useAuthStore((s) => s.setProfileName);
  const activeBarber = useActiveBarber();
  const workspacesQ = useMyBarberWorkspaces(user?.phone);
  const ws = workspacesQ.data?.find((w) => w.barber === activeBarber);
  const updateMut = useUpdateBarberProfile();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [seeded, setSeeded] = useState(false);

  // Seed the form once the active workspace resolves.
  useEffect(() => {
    if (seeded || !ws) return;
    setFullName(ws.barber_name ?? user?.full_name ?? '');
    setPhone(user?.phone ?? '');
    setSpecialties(ws.specialties ?? '');
    setDays((ws.available_days ?? []).filter((d) => ALL_DAYS.includes(d)));
    if (ws.shift_start) setShiftStart(ws.shift_start);
    if (ws.shift_end) setShiftEnd(ws.shift_end);
    setSeeded(true);
  }, [ws, seeded, user]);

  const addPhoto = async () => {
    try {
      const picked = await pickImageFromLibrary();
      if (picked) setPhoto(picked.uri);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add photo');
    }
  };

  const save = () => {
    if (fullName.trim().length === 0) {
      toast.warn(t('staff.profile_err_name'));
      return;
    }
    if (updateMut.isPending) return;
    updateMut.mutate(
      {
        full_name: fullName.trim(),
        phone: phone.trim(),
        specialties: specialties.trim(),
        avatar_seed: photo ?? undefined,
        barber: activeBarber,
        available_days: days,
        shift_start: shiftStart,
        shift_end: shiftEnd,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setProfileName(fullName.trim());
          toast.success(t('staff.profile_saved'));
          nav.goBack();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Could not save profile.');
        },
      },
    );
  };

  const avatarUri = photo;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker={t('staff.profile_kicker')}
        title={t('staff.profile_title')}
        onBack={() => {
          nav.goBack();
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => {
              addPhoto().catch(() => {});
            }}
            style={styles.avatarPicker}
            accessibilityRole="button"
            accessibilityLabel={t('staff.profile_photo')}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View
                style={[styles.avatar, styles.avatarFallback, { backgroundColor: palette.navy }]}
              >
                <Icon name="plus" size={26} color={palette.cream} />
              </View>
            )}
            <Text variant="labelSm" color={theme.muted}>
              {t('staff.profile_photo').toUpperCase()}
            </Text>
          </Pressable>

          <LabeledInput
            label={t('staff.profile_name')}
            value={fullName}
            onChange={setFullName}
            placeholder="Imran Khan"
          />
          <LabeledInput
            label={t('staff.profile_phone')}
            value={phone}
            onChange={setPhone}
            placeholder="+91 98000 00000"
            keyboardType="phone-pad"
            mono
          />
          <LabeledInput
            label={t('staff.profile_specialties')}
            value={specialties}
            onChange={setSpecialties}
            placeholder="Fades, Beard, Color"
          />

          {ws != null && (
            <Card style={{ gap: spacing.md }}>
              <Text variant="labelSm" color={theme.muted}>
                {t('staff.profile_schedule_for', { shop: ws.shop.shop_name }).toUpperCase()}
              </Text>
              <DayPicker value={days} onChange={setDays} />
              <View style={styles.row2}>
                <LabeledInput
                  label={t('staff.profile_shift')}
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
            </Card>
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
          variant="red"
          size="lg"
          block
          label={updateMut.isPending ? t('staff.profile_saving') : t('staff.profile_save')}
          loading={updateMut.isPending}
          disabled={updateMut.isPending}
          onPress={save}
        />
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg },
  row2: { flexDirection: 'row', gap: spacing.md },
  avatarPicker: { alignItems: 'center', gap: spacing.sm },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
