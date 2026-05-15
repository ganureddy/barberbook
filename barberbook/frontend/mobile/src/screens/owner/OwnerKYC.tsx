import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, DenseHeader, Icon, Text, type IconName } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import {
  pickDocument,
  pickImageFromCamera,
  pickImageFromLibrary,
  uploadFile,
  type FrappeFile,
  type LocalFile,
} from '../../lib/files';
import { toast } from '../../lib/toast';
import type { ShopStackParamList } from '../../navigation/types';

import { ACTIVE_SHOP } from './_owner';

type Nav = NativeStackNavigationProp<ShopStackParamList, 'OwnerKYC'>;
type DocState = 'missing' | 'pending' | 'approved' | 'rejected';

interface DocSlot {
  id: 'pan' | 'gst' | 'owner_photo' | 'shop_photo' | 'bank';
  /** Whether this slot accepts a PDF (defaults to image-only). */
  acceptsPdf: boolean;
  /** Hint label icon. */
  icon: IconName;
}

const SLOTS: DocSlot[] = [
  { id: 'pan', acceptsPdf: true, icon: 'check' },
  { id: 'gst', acceptsPdf: true, icon: 'check' },
  { id: 'owner_photo', acceptsPdf: false, icon: 'star' },
  { id: 'shop_photo', acceptsPdf: false, icon: 'pole' },
  { id: 'bank', acceptsPdf: true, icon: 'rupee' },
];

interface SlotState {
  state: DocState;
  preview?: string; // local URI
  remoteFile?: FrappeFile;
  error?: string;
  uploading?: boolean;
}

type SlotMap = Record<DocSlot['id'], SlotState>;

const INITIAL: SlotMap = {
  pan: { state: 'missing' },
  gst: { state: 'missing' },
  owner_photo: { state: 'missing' },
  shop_photo: { state: 'missing' },
  bank: { state: 'missing' },
};

export function OwnerKYC() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const [slots, setSlots] = useState<SlotMap>(INITIAL);

  const setSlot = (id: DocSlot['id'], next: Partial<SlotState>) => {
    setSlots((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
  };

  const allUploaded = SLOTS.every(
    (s) => slots[s.id].state === 'pending' || slots[s.id].state === 'approved',
  );

  const startPick = (slot: DocSlot) => {
    Haptics.selectionAsync().catch(() => {});
    const opts = [
      t('owner.kyc_pick_camera'),
      t('owner.kyc_pick_library'),
      slot.acceptsPdf ? t('owner.kyc_pick_document') : null,
      t('common.cancel'),
    ].filter(Boolean) as string[];
    const cancelIndex = opts.length - 1;

    const onChoice = (idx: number) => {
      if (idx === cancelIndex) return;
      const choice = opts[idx];
      const handler =
        choice === t('owner.kyc_pick_camera')
          ? pickImageFromCamera
          : choice === t('owner.kyc_pick_library')
            ? pickImageFromLibrary
            : pickDocument;
      handler()
        .then(async (picked: LocalFile | null) => {
          if (!picked) return;
          await uploadAndPersist(slot.id, picked);
        })
        .catch((err: unknown) => {
          toast.error(err instanceof Error ? err.message : 'Could not pick file');
        });
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: opts, cancelButtonIndex: cancelIndex },
        onChoice,
      );
    } else {
      Alert.alert(t(`owner.kyc_doc_${slot.id}`), '', [
        ...opts.slice(0, -1).map((label, i) => ({
          text: label,
          onPress: () => {
            onChoice(i);
          },
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ]);
    }
  };

  const uploadAndPersist = async (id: DocSlot['id'], file: LocalFile) => {
    setSlot(id, { state: 'pending', uploading: true, preview: file.uri, error: undefined });
    try {
      const remote = await uploadFile(file, {
        attachTo: { doctype: 'BB Shop', name: ACTIVE_SHOP, field: id },
        isPrivate: true,
      });
      setSlot(id, { uploading: false, remoteFile: remote });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setSlot(id, {
        state: 'rejected',
        uploading: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const submit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast.success(t('owner.kyc_state_pending'), t('owner.kyc_submit'));
    nav.goBack();
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader
        kicker="VERIFY"
        title={t('owner.kyc_title')}
        onBack={() => {
          nav.goBack();
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="editorial" color={theme.muted}>
          {t('owner.kyc_subtitle')}
        </Text>

        <View style={{ gap: spacing.sm }}>
          {SLOTS.map((slot) => (
            <DocRow
              key={slot.id}
              slot={slot}
              state={slots[slot.id]}
              onPress={() => {
                startPick(slot);
              }}
            />
          ))}
        </View>

        <Button
          block
          size="lg"
          variant="red"
          label={t('owner.kyc_submit')}
          disabled={!allUploaded}
          onPress={submit}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

interface DocRowProps {
  slot: DocSlot;
  state: SlotState;
  onPress: () => void;
}

function DocRow({ slot, state, onPress }: DocRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const stateLabelKey = state.uploading ? 'owner.kyc_uploading' : `owner.kyc_state_${state.state}`;

  const tone = STATE_TONE[state.state];

  return (
    <Pressable onPress={onPress}>
      <Card padded style={[styles.row, { borderColor: tone.border }]}>
        <View style={[styles.rowIcon, { backgroundColor: tone.iconBg }]}>
          {state.preview ? (
            <Image source={{ uri: state.preview }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <Icon name={slot.icon} size={20} color={tone.iconFg} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="bodyBold">{t(`owner.kyc_doc_${slot.id}`)}</Text>
          <Text variant="caption" color={theme.muted}>
            {state.error ??
              (slot.acceptsPdf ? 'PDF or image · Up to 10MB' : 'Photo · Auto-compressed')}
          </Text>
        </View>

        <View style={[styles.statePill, { backgroundColor: tone.pillBg }]}>
          <Text variant="labelSm" color={tone.pillFg}>
            {t(stateLabelKey).toUpperCase()}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const STATE_TONE: Record<
  DocState | 'uploading',
  { border: string; iconBg: string; iconFg: string; pillBg: string; pillFg: string }
> = {
  missing: {
    border: 'rgba(0,0,0,0.10)',
    iconBg: 'rgba(14,14,16,0.08)',
    iconFg: palette.ink,
    pillBg: palette.cream,
    pillFg: palette.ink,
  },
  pending: {
    border: palette.gold,
    iconBg: 'rgba(201,162,76,0.20)',
    iconFg: palette.ink,
    pillBg: palette.gold,
    pillFg: palette.ink,
  },
  approved: {
    border: '#3F6B5F',
    iconBg: 'rgba(63,107,95,0.20)',
    iconFg: '#3F6B5F',
    pillBg: '#3F6B5F',
    pillFg: palette.cream,
  },
  rejected: {
    border: palette.red,
    iconBg: 'rgba(212,50,44,0.16)',
    iconFg: palette.red,
    pillBg: palette.red,
    pillFg: palette.cream,
  },
  uploading: {
    border: palette.navy,
    iconBg: 'rgba(30,58,138,0.16)',
    iconFg: palette.navy,
    pillBg: palette.navy,
    pillFg: palette.cream,
  },
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
  },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumb: {
    width: 48,
    height: 48,
  },
  statePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
});
