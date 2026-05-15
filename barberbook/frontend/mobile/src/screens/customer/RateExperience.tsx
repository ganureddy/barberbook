import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
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
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useBooking, useSubmitReview } from '../../api/hooks';
import { Button, Card, Chip, Icon, Portrait, Text } from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { toast } from '../../lib/toast';
import type { DiscoverStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<DiscoverStackParamList, 'RateExperience'>;
type Rt = RouteProp<DiscoverStackParamList, 'RateExperience'>;

const STAND_OUT_TAGS = ['quick', 'skilled', 'friendly', 'clean', 'value', 'music'] as const;

export function RateExperience() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const bookingQ = useBooking(params.bookingId);
  const booking = bookingQ.data;
  const submitReview = useSubmitReview();

  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const onPickRating = (next: 1 | 2 | 3 | 4 | 5) => {
    Haptics.selectionAsync().catch(() => {});
    setRating(next);
  };

  const toggleTag = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (rating === 0 || !booking) return;
    try {
      await submitReview.mutateAsync({
        booking: params.bookingId,
        shop: booking.shop,
        barber: booking.barber,
        rating,
        body: [...tags, note].filter(Boolean).join(' · '),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSubmitted(true);
      // Earned-points banner shows for ~1.6s, then we pop back.
      setTimeout(() => {
        if (nav.canGoBack()) nav.goBack();
      }, 1600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not submit review';
      toast.error(msg);
    }
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 140 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                nav.goBack();
              }}
              hitSlop={20}
              style={styles.iconBtn}
              accessibilityLabel={t('common.back')}
            >
              <Icon name="chevronLeft" size={22} />
            </Pressable>
            <Text variant="labelSm" color={palette.red}>
              FEEDBACK
            </Text>
          </View>

          <Text variant="display">{t('rate.title')}</Text>

          {/* Barber + service summary card */}
          <Card padded style={styles.barberCard}>
            <Portrait
              seed={booking?.barber ?? 'arya'}
              size={56}
              initials={(booking?.barber ?? 'IK').slice(0, 2).toUpperCase()}
            />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">{booking?.barber ?? 'Imran K.'}</Text>
              <Text variant="caption" color={theme.muted}>
                {booking?.shop ?? 'BarberBook'} ·{' '}
                {(booking?.scheduled_at ?? '').replace('T', ' · ').slice(0, 19)}
              </Text>
            </View>
          </Card>

          <Text variant="editorial" color={theme.muted}>
            {t('rate.subtitle', { name: booking?.barber ?? 'your barber' })}
          </Text>

          {/* Animated star row */}
          <StarRow value={rating} onPick={onPickRating} />

          {/* Stand-out tags */}
          {rating > 0 && (
            <View style={styles.tagsBlock}>
              <Text variant="label" color={theme.muted}>
                {t('rate.stand_out').toUpperCase()}
              </Text>
              <View style={styles.tagsRow}>
                {STAND_OUT_TAGS.map((id) => (
                  <Chip
                    key={id}
                    label={t(`rate.tag_${id}`)}
                    active={tags.has(id)}
                    onPress={() => {
                      toggleTag(id);
                    }}
                    color={
                      id === 'skilled' ? palette.gold : id === 'value' ? palette.red : undefined
                    }
                  />
                ))}
              </View>
            </View>
          )}

          {/* Free-text note */}
          {rating > 0 && (
            <View
              style={[
                styles.noteWrap,
                { backgroundColor: theme.surface, borderColor: theme.lineStrong },
              ]}
            >
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('rate.free_text')}
                placeholderTextColor={theme.muted}
                multiline
                style={[styles.noteInput, { color: theme.text, fontFamily: fontFamilies.body }]}
              />
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + spacing.md, backgroundColor: theme.surface },
          ]}
        >
          <Button
            block
            size="lg"
            variant="red"
            label={t('rate.submit')}
            disabled={rating === 0 || submitted}
            loading={submitReview.isPending}
            onPress={() => {
              submit().catch(() => {});
            }}
          />
        </View>

        {submitted && <EarnedBanner pts={50} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface StarRowProps {
  value: number;
  onPick: (r: 1 | 2 | 3 | 4 | 5) => void;
}

function StarRow({ value, onPick }: StarRowProps) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          index={i}
          active={value >= i}
          onPick={() => {
            onPick(i as 1 | 2 | 3 | 4 | 5);
          }}
        />
      ))}
    </View>
  );
}

interface StarProps {
  index: number;
  active: boolean;
  onPick: () => void;
}

const STAR_PATH =
  'M12 2.5l3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 18.27 5.82 21.5 7 14.63 2 9.76l6.91-1L12 2.5z';

function Star({ index, active, onPick }: StarProps) {
  const scale = useSharedValue(1);
  const wasActive = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    // Pop animation only when the star transitions to active. The first
    // star also flickers to gold a fraction earlier than the next so the
    // row reads as "filling in" rather than snapping at once.
    if (active && wasActive.value === 0) {
      scale.value = withDelay(
        index * 30,
        withSequence(
          withSpring(1.35, { damping: 9, stiffness: 320 }),
          withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        ),
      );
      wasActive.value = 1;
    } else if (!active && wasActive.value === 1) {
      wasActive.value = 0;
    }
  }, [active, index, scale, wasActive]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPick}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Rate ${index} of 5`}
    >
      <Animated.View style={style}>
        <Svg width={48} height={48} viewBox="0 0 24 24">
          <Path
            d={STAR_PATH}
            fill={active ? palette.gold : 'rgba(0,0,0,0.10)'}
            stroke={active ? palette.gold : 'rgba(0,0,0,0.18)'}
            strokeWidth={1.5}
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

interface EarnedBannerProps {
  pts: number;
}

function EarnedBanner({ pts }: EarnedBannerProps) {
  const { t } = useTranslation();
  const drop = useSharedValue(0);
  useEffect(() => {
    drop.value = withSequence(
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
      withDelay(900, withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) })),
    );
  }, [drop]);
  const style = useAnimatedStyle(() => ({
    opacity: drop.value,
    transform: [{ translateY: (1 - drop.value) * -16 }],
  }));
  return (
    <Animated.View style={[styles.earned, shadow.lg, style]}>
      <Icon name="trophy" size={20} color={palette.ink} />
      <Text variant="bodyBold" color={palette.ink}>
        {t('rate.earned', { n: pts })}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  tagsBlock: {
    gap: spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  noteWrap: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 96,
  },
  noteInput: {
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  earned: {
    position: 'absolute',
    top: '36%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
});
