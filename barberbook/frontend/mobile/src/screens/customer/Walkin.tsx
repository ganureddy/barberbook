import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { useCancelWalkin, useJoinWalkin, useWalkinSnapshot } from '../../api/hooks';
import { channels, useChannel } from '../../api/realtime';
import type { WalkinSnapshot } from '../../api/resources';
import type { WalkinTicket } from '../../api/types';
import { Button, Card, EtaDonut, Icon, Tag, Text } from '../../components';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { toast } from '../../lib/toast';
import type { BookingsStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';

type Nav = NativeStackNavigationProp<BookingsStackParamList, 'Walkin'>;

// Default to the canvas's "Pole & Pomade" shop. In a future commit the
// Walkin route accepts an optional `shopId` param so a customer can join
// the queue from any shop card. For now this lands on a known fixture so
// the screen always has something to show.
const DEFAULT_SHOP = 'BB-SHOP-00003';
const STRIPE_HEIGHT = 56;

export function Walkin() {
  const { t } = useTranslation();
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const userPhone = useAuthStore((s) => s.user?.phone ?? '');
  const snapshotQ = useWalkinSnapshot(DEFAULT_SHOP);
  const join = useJoinWalkin();
  const cancel = useCancelWalkin();

  // Bridge realtime updates into the same place react-query holds the data,
  // so the UI re-renders whenever the queue moves.
  const live = useChannel<WalkinSnapshot & { reason?: string }>(channels.walkinQueue(DEFAULT_SHOP));
  const [overlay, setOverlay] = useState<WalkinSnapshot | null>(null);
  useEffect(() => {
    if (live) {
      setOverlay(live);
      Haptics.selectionAsync().catch(() => {});
    }
  }, [live]);

  const snapshot = overlay ?? snapshotQ.data ?? null;
  const myTicket: WalkinTicket | null = useMemo(() => {
    if (!snapshot) return null;
    const mine = snapshot.tickets.find(
      (t) => t.customer_phone === userPhone || t.customer === 'arya@barberbook.app',
    );
    return mine && mine.status !== 'Cancelled' ? mine : null;
  }, [snapshot, userPhone]);

  // Background pole-stripe slow climb.
  const stripeOffset = useSharedValue(0);
  useEffect(() => {
    stripeOffset.value = withRepeat(
      withTiming(-STRIPE_HEIGHT * 4, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [stripeOffset]);
  const stripeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stripeOffset.value }],
  }));

  const handleJoin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    join.mutateAsync({ shop: DEFAULT_SHOP, customer_phone: userPhone }).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not join queue');
    });
  };
  const handleLeave = () => {
    if (!myTicket) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    cancel.mutateAsync(myTicket.name).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not leave queue');
    });
  };

  const aheadOfMe = useMemo(() => {
    if (!myTicket || !snapshot) return [];
    return snapshot.tickets
      .filter((t) => t.status !== 'Cancelled' && t.position_in_queue < myTicket.position_in_queue)
      .sort((a, b) => a.position_in_queue - b.position_in_queue);
  }, [myTicket, snapshot]);

  return (
    <View style={[styles.root, { backgroundColor: palette.ink }]}>
      <StatusBar style="light" />

      {/* Animated barber-pole stripes spanning the top half. */}
      <View style={styles.stripeMask} pointerEvents="none">
        <Animated.View style={[styles.stripeAnim, stripeStyle]}>
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern
                id="walkinStripes"
                patternUnits="userSpaceOnUse"
                width={STRIPE_HEIGHT * 2}
                height={STRIPE_HEIGHT}
                patternTransform="rotate(28)"
              >
                <Rect x={0} y={0} width={STRIPE_HEIGHT * 2} height={14} fill={palette.red} />
                <Rect x={0} y={14} width={STRIPE_HEIGHT * 2} height={14} fill={palette.cream} />
                <Rect x={0} y={28} width={STRIPE_HEIGHT * 2} height={14} fill={palette.navy} />
                <Rect x={0} y={42} width={STRIPE_HEIGHT * 2} height={14} fill={palette.cream} />
              </Pattern>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#walkinStripes)" />
          </Svg>
        </Animated.View>
      </View>
      {/* Scrim so the body content reads against the stripes. */}
      <View pointerEvents="none" style={styles.scrim} />

      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              if (nav.canGoBack()) nav.goBack();
            }}
            hitSlop={20}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Icon name="chevronLeft" size={20} color={palette.cream} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="labelSm" color={palette.gold}>
              {t('walkin.title').toUpperCase()}
            </Text>
            <Text variant="bodyBold" color={palette.cream}>
              Pole & Pomade
            </Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text variant="labelSm" color={palette.cream}>
              {t('walkin.live')}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 140 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {myTicket ? (
            <View style={styles.tokenBlock}>
              <Text variant="labelSm" color={palette.gold}>
                {t('walkin.your_token').toUpperCase()}
              </Text>
              <Text
                color={palette.cream}
                style={[styles.tokenGlyph, { fontFamily: fontFamilies.display }]}
              >
                {myTicket.token_number}
              </Text>
              <Text variant="bodyBold" color={palette.cream}>
                {t('walkin.position_label', { n: myTicket.position_in_queue })}
              </Text>

              <View style={styles.donutWrap}>
                <EtaDonut
                  minutesLeft={myTicket.estimated_wait_minutes}
                  totalMinutes={Math.max(20, myTicket.estimated_wait_minutes + 8)}
                />
              </View>
            </View>
          ) : (
            <Card style={styles.joinCard}>
              <Text variant="bodyBold">Not in the queue yet</Text>
              <Text variant="caption" color={palette.muted}>
                Join the walk-in queue and we'll text you when it's your turn.
              </Text>
              <Button
                block
                size="lg"
                variant="red"
                label={t('walkin.join')}
                loading={join.isPending}
                onPress={handleJoin}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          )}

          <Card style={styles.queueCard} alt>
            <Text variant="label" color={palette.gold}>
              {t('walkin.queue_ahead').toUpperCase()}
            </Text>

            {aheadOfMe.length === 0 ? (
              <Text variant="body" color={palette.cream} style={{ marginTop: spacing.sm }}>
                {t('walkin.queue_empty')}
              </Text>
            ) : (
              <View style={styles.queueList}>
                {aheadOfMe.map((ticket) => (
                  <View key={ticket.name} style={styles.queueRow}>
                    <View style={styles.queueDot}>
                      <Text variant="mono" color={palette.cream}>
                        {ticket.token_number}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyBold" color={palette.cream}>
                        Token {ticket.token_number}
                      </Text>
                      <Text variant="caption" color={palette.gold}>
                        {t('walkin.joined_at', { time: ticket.joined_at.slice(11, 16) })}
                      </Text>
                    </View>
                    {ticket.status === 'InService' && (
                      <Tag label="IN SERVICE" bg={palette.gold} color={palette.ink} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </Card>
        </ScrollView>

        {myTicket != null && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }, shadow.lg]}>
            <Button
              block
              size="lg"
              variant="ghost"
              label={t('walkin.leave_queue')}
              loading={cancel.isPending}
              onPress={handleLeave}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stripeMask: {
    position: 'absolute',
    top: 0,
    left: -60,
    right: -60,
    height: 360,
    overflow: 'hidden',
    opacity: 0.18,
  },
  stripeAnim: {
    position: 'absolute',
    top: -STRIPE_HEIGHT,
    left: 0,
    right: 0,
    height: 360 + STRIPE_HEIGHT * 4,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,14,16,0.55)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(212,50,44,0.22)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.red,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.red,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  tokenBlock: {
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: spacing.lg,
  },
  tokenGlyph: {
    color: palette.cream,
    fontSize: 188,
    lineHeight: 188,
    letterSpacing: -2,
  },
  donutWrap: {
    marginTop: spacing.lg,
  },
  joinCard: {
    backgroundColor: palette.charcoal,
    borderColor: 'rgba(245,241,232,0.12)',
    marginTop: spacing['2xl'],
    gap: spacing.xs,
  },
  queueCard: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(245,241,232,0.12)',
  },
  queueList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  queueDot: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: palette.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: palette.charcoal,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
});
