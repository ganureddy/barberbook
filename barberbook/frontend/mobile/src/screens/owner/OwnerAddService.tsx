import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { Button, Chip, Icon, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import type { MenuStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MenuStackParamList, 'OwnerAddService'>;
type Rt = RouteProp<MenuStackParamList, 'OwnerAddService'>;

const CATEGORIES = ['Hair', 'Beard', 'Color', 'Spa', 'Combo'];
const GENDERS = ['all', 'men', 'women', 'kids'] as const;
type Gender = (typeof GENDERS)[number];

const TAG_PRESETS = ['Quick', 'Premium', 'Beginner-friendly', 'Bookable', 'Walk-in'];

export function OwnerAddService() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const sheetRef = useRef<BottomSheet>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('350');
  const [gender, setGender] = useState<Gender>('all');
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [perBarber, setPerBarber] = useState(false);

  const close = useCallback(() => {
    sheetRef.current?.close();
    setTimeout(() => {
      nav.goBack();
    }, 180);
  }, [nav]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const submit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // The actual mutation lands when wired to the Service repo on the backend.
    // For now the sheet just closes; the menu screen's optimistic state
    // would receive the new row via react-query invalidation on success.
    close();
  };

  const isValid = name.trim().length > 1 && Number(duration) > 0 && Number(price) >= 0;

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={['82%']}
      onClose={() => {
        nav.goBack();
      }}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.lineStrong }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text variant="labelSm" color={palette.navy}>
                {params?.serviceName ? 'EDIT SERVICE' : 'NEW SERVICE'}
              </Text>
              <Text variant="display">{t('owner.addservice_title')}</Text>
            </View>
            <Pressable onPress={close} hitSlop={20} accessibilityLabel={t('common.cancel')}>
              <Icon name="close" size={22} />
            </Pressable>
          </View>

          <Field label={t('owner.addservice_name')}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Skin Fade"
              placeholderTextColor={theme.muted}
              style={[styles.input, { color: theme.text, borderColor: theme.lineStrong }]}
            />
          </Field>

          <Field label={t('owner.addservice_category')}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={category === c}
                  onPress={() => {
                    setCategory(c);
                  }}
                />
              ))}
            </View>
          </Field>

          <View style={styles.numbersRow}>
            <Field style={{ flex: 1 }} label={t('owner.addservice_duration')}>
              <TextInput
                value={duration}
                onChangeText={(v) => {
                  setDuration(v.replace(/\D/g, ''));
                }}
                keyboardType="number-pad"
                style={[
                  styles.input,
                  styles.mono,
                  { color: theme.text, borderColor: theme.lineStrong },
                ]}
              />
            </Field>
            <Field style={{ flex: 1 }} label={t('owner.addservice_price')}>
              <TextInput
                value={price}
                onChangeText={(v) => {
                  setPrice(v.replace(/[^\d.]/g, ''));
                }}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  styles.mono,
                  { color: theme.text, borderColor: theme.lineStrong },
                ]}
              />
            </Field>
          </View>

          <Field label={t('owner.addservice_gender')}>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <Chip
                  key={g}
                  label={t(`owner.addservice_gender_${g}`)}
                  active={gender === g}
                  onPress={() => {
                    setGender(g);
                  }}
                />
              ))}
            </View>
          </Field>

          <Field label={t('owner.addservice_tags')}>
            <View style={styles.chipRow}>
              {TAG_PRESETS.map((tg) => (
                <Chip
                  key={tg}
                  label={tg}
                  active={tags.has(tg)}
                  color={palette.gold}
                  onPress={() => {
                    setTags((prev) => {
                      const next = new Set(prev);
                      if (next.has(tg)) next.delete(tg);
                      else next.add(tg);
                      return next;
                    });
                  }}
                />
              ))}
            </View>
          </Field>

          <View style={[styles.toggleRow, { borderColor: theme.line }]}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">{t('owner.addservice_per_barber')}</Text>
              <Text variant="caption" color={theme.muted}>
                Senior barbers can charge a premium for the same service.
              </Text>
            </View>
            <Switch
              value={perBarber}
              onValueChange={setPerBarber}
              trackColor={{ true: palette.red, false: theme.lineStrong }}
              thumbColor={palette.cream}
            />
          </View>

          <Button
            block
            size="lg"
            variant="red"
            label={t('owner.addservice_save')}
            disabled={!isValid}
            onPress={submit}
            style={{ marginTop: spacing.md }}
          />
        </BottomSheetScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  style?: object;
}

function Field({ label, children, style }: FieldProps) {
  const { theme } = useTheme();
  return (
    <View style={[{ gap: spacing.xs }, style]}>
      <Text variant="labelSm" color={theme.muted}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  mono: {
    fontFamily: fontFamilies.monoBold,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  numbersRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
});
