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
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Icon, Tag, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import type { RosterStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RosterStackParamList, 'OwnerRosterConflict'>;
type Rt = RouteProp<RosterStackParamList, 'OwnerRosterConflict'>;
type Action = 'auto' | 'keep' | 'cancel';

interface AffectedBooking {
  id: string;
  customer: string;
  time: string;
  service: string;
  amount: string;
}

const AFFECTED: AffectedBooking[] = [
  {
    id: 'BB-BKG-9001',
    customer: 'Aarav Mehta',
    time: 'Wed · 14:30',
    service: 'Skin Fade · Imran K.',
    amount: '₹800',
  },
  {
    id: 'BB-BKG-9002',
    customer: 'Priya Iyer',
    time: 'Wed · 15:15',
    service: 'Combo · Imran K.',
    amount: '₹500',
  },
  {
    id: 'BB-BKG-9003',
    customer: 'Devansh',
    time: 'Wed · 16:00',
    service: 'Beard Trim · Imran K.',
    amount: '₹200',
  },
];

export function OwnerRosterConflict() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const sheetRef = useRef<BottomSheet>(null);
  const [action, setAction] = useState<Action>('auto');

  const close = useCallback(() => {
    sheetRef.current?.close();
    setTimeout(() => {
      nav.goBack();
    }, 180);
  }, [nav]);

  const apply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    close();
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.55}
        pressBehavior="close"
      />
    ),
    [],
  );

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
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="labelSm" color={palette.red}>
              ROSTER · {params?.rosterName ?? 'BB-ROS-CURRENT'}
            </Text>
            <Text variant="display">{t('owner.rosterconflict_title')}</Text>
            <Text variant="editorial" color={theme.muted} style={{ marginTop: spacing.sm }}>
              {t('owner.rosterconflict_subtitle', { n: AFFECTED.length })}
            </Text>
          </View>
          <Pressable onPress={close} hitSlop={20} accessibilityLabel={t('common.cancel')}>
            <Icon name="close" size={22} />
          </Pressable>
        </View>

        {/* Affected bookings */}
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {AFFECTED.map((b) => (
            <Card key={b.id} padded style={styles.affRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.affTop}>
                  <Text variant="bodyBold">{b.customer}</Text>
                  <Tag label="AT RISK" bg={palette.red} color={palette.cream} />
                </View>
                <Text variant="caption" color={theme.muted}>
                  {b.time} · {b.service}
                </Text>
              </View>
              <Text variant="mono">{b.amount}</Text>
            </Card>
          ))}
        </View>

        {/* Three radio options */}
        <View style={[styles.options, { marginTop: spacing.lg }]}>
          <Option
            id="auto"
            active={action === 'auto'}
            title={t('owner.rosterconflict_auto')}
            subtitle={t('owner.rosterconflict_auto_sub')}
            tone={palette.gold}
            onPress={() => {
              setAction('auto');
            }}
          />
          <Option
            id="keep"
            active={action === 'keep'}
            title={t('owner.rosterconflict_keep')}
            subtitle={t('owner.rosterconflict_keep_sub')}
            tone={palette.navy}
            onPress={() => {
              setAction('keep');
            }}
          />
          <Option
            id="cancel"
            active={action === 'cancel'}
            title={t('owner.rosterconflict_cancel')}
            subtitle={t('owner.rosterconflict_cancel_sub')}
            tone={palette.red}
            onPress={() => {
              setAction('cancel');
            }}
          />
        </View>

        <Button
          block
          size="lg"
          variant="red"
          label={t('owner.rosterconflict_apply', { n: AFFECTED.length })}
          onPress={apply}
          style={{ marginTop: spacing.lg }}
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

interface OptionProps {
  id: Action;
  active: boolean;
  title: string;
  subtitle: string;
  tone: string;
  onPress: () => void;
}

function Option({ active, title, subtitle, tone, onPress }: OptionProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: active ? `${tone}10` : theme.surfaceAlt,
          borderColor: active ? tone : theme.line,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.optionRadio, { borderColor: active ? tone : theme.lineStrong }]}>
        {active && <View style={[styles.optionRadioInner, { backgroundColor: tone }]} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold">{title}</Text>
        <Text variant="caption" color={theme.muted} style={{ marginTop: 2 }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing['3xl'],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  affRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  affTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
