import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLoyaltyForShop } from '../../api/hooks';
import {
  Card,
  Icon,
  ListRowSkeleton,
  SkeletonGroup,
  Tag,
  Text,
  type IconName,
} from '../../components';
import { palette, radii, shadow, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { formatMoney } from '../../lib/booking';

interface Reward {
  id: string;
  title: string;
  cost: number;
  icon: IconName;
}

interface HistoryEntry {
  id: string;
  delta: number;
  reason: string;
  date: string;
}

const REWARDS: Reward[] = [
  { id: 'free-trim', title: 'Free beard trim', cost: 500, icon: 'razor' },
  { id: 'haircut-50', title: '50% off next haircut', cost: 1500, icon: 'scissors' },
  { id: 'shave', title: 'Free hot-towel shave', cost: 2400, icon: 'comb' },
  { id: 'spa', title: 'Free head massage', cost: 3000, icon: 'trophy' },
];

const HISTORY: HistoryEntry[] = [
  { id: 'h1', delta: +50, reason: "Booking @ Raj's Classic Cuts", date: 'Today · 11:45' },
  { id: 'h2', delta: +120, reason: 'Booking @ Pole & Pomade', date: 'Mon · 18:20' },
  { id: 'h3', delta: -500, reason: 'Free beard trim redeemed', date: 'Last week · 14:00' },
  { id: 'h4', delta: +75, reason: "Booking @ Raj's Classic Cuts", date: 'Apr 28 · 19:00' },
  { id: 'h5', delta: +60, reason: 'Booking @ The Sharp Edge', date: 'Apr 22 · 13:15' },
];

const TIER_THRESHOLDS = { Silver: 0, Gold: 2000, Platinum: 5000 } as const;

/**
 * Loyalty / rewards. Dark canvas with the brand-gold tier card on top —
 * the only screen that's intentionally inverted in light mode too, since
 * "rewards" reads as a premium experience and gold-on-ink is the canvas
 * design.
 */
export function Loyalty() {
  const { t } = useTranslation();
  // The Loyalty tab doesn't currently scope to a shop; we use the canvas's
  // first shop as the lookup key so the LoyaltyAccount hook resolves.
  const loyaltyQ = useLoyaltyForShop('BB-SHOP-00001');
  const balance = loyaltyQ.data?.points_balance ?? 1240;
  const lifetime = loyaltyQ.data?.lifetime_points ?? 4180;

  const { tier, nextTier, toNext, ratio } = useMemo(() => {
    if (lifetime >= TIER_THRESHOLDS.Platinum) {
      return { tier: 'Platinum', nextTier: null, toNext: 0, ratio: 1 };
    }
    if (lifetime >= TIER_THRESHOLDS.Gold) {
      const span = TIER_THRESHOLDS.Platinum - TIER_THRESHOLDS.Gold;
      const inTier = lifetime - TIER_THRESHOLDS.Gold;
      return {
        tier: 'Gold',
        nextTier: 'Platinum',
        toNext: TIER_THRESHOLDS.Platinum - lifetime,
        ratio: inTier / span,
      };
    }
    const span = TIER_THRESHOLDS.Gold - TIER_THRESHOLDS.Silver;
    return {
      tier: 'Silver',
      nextTier: 'Gold',
      toNext: TIER_THRESHOLDS.Gold - lifetime,
      ratio: lifetime / span,
    };
  }, [lifetime]);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      120,
      withTiming(Math.max(0, Math.min(1, ratio)), {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [progress, ratio]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={[styles.root, { backgroundColor: palette.ink }]}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="labelSm" color={palette.gold}>
              {t('loyalty.title').toUpperCase()}
            </Text>
            <Text variant="display" color={palette.cream}>
              {t('loyalty.points_balance', { n: balance.toLocaleString() })}
            </Text>
          </View>

          {/* Gold tier card */}
          <Card padded style={[styles.tierCard, shadow.lg]}>
            <View style={styles.tierTop}>
              <View>
                <Text variant="labelSm" color={palette.ink}>
                  CURRENT TIER
                </Text>
                <Text style={styles.tierName}>{t(`loyalty.tier_${tier.toLowerCase()}`)}</Text>
              </View>
              <Icon name="trophy" size={36} color={palette.ink} />
            </View>

            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, fillStyle]} />
            </View>

            {nextTier && (
              <Text variant="caption" color={palette.ink} style={{ marginTop: spacing.xs }}>
                {t('loyalty.to_next_tier', {
                  n: toNext.toLocaleString(),
                  next: t(`loyalty.tier_${nextTier.toLowerCase()}`),
                })}
              </Text>
            )}
          </Card>

          {/* Quick actions */}
          <View style={styles.actionsRow}>
            <ActionTile icon="qr" label="Redeem at shop" />
            <ActionTile icon="heart" label="Refer a friend" />
            <ActionTile icon="bell" label="Earn more" />
          </View>

          {/* Rewards list */}
          <Section title={t('loyalty.rewards_title')}>
            {loyaltyQ.isLoading ? (
              <SkeletonGroup count={3}>
                <ListRowSkeleton height={72} />
              </SkeletonGroup>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {REWARDS.map((r) => (
                  <RewardRow key={r.id} reward={r} balance={balance} />
                ))}
              </View>
            )}
          </Section>

          {/* History feed */}
          <Section title={t('loyalty.history_title')}>
            <Card padded style={styles.historyCard}>
              {HISTORY.map((h, i) => (
                <View
                  key={h.id}
                  style={[
                    styles.historyRow,
                    i < HISTORY.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth * 2,
                      borderBottomColor: 'rgba(245,241,232,0.10)',
                    },
                  ]}
                >
                  <View style={styles.historyIcon}>
                    <Icon
                      name={h.delta > 0 ? 'plus' : 'check'}
                      size={14}
                      color={h.delta > 0 ? palette.gold : palette.red}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold" color={palette.cream}>
                      {h.reason}
                    </Text>
                    <Text variant="caption" color="rgba(245,241,232,0.6)">
                      {h.date}
                    </Text>
                  </View>
                  <Text variant="monoLg" color={h.delta > 0 ? palette.gold : palette.red}>
                    {h.delta > 0 ? '+' : ''}
                    {h.delta}
                  </Text>
                </View>
              ))}
            </Card>
          </Section>

          <Text variant="caption" color="rgba(245,241,232,0.55)" style={styles.foot}>
            Lifetime · {lifetime.toLocaleString()} pts (~{formatMoney(lifetime * 0.5, 'INR')})
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text variant="label" color={palette.gold} style={{ marginBottom: spacing.sm }}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

interface ActionTileProps {
  icon: IconName;
  label: string;
}

function ActionTile({ icon, label }: ActionTileProps) {
  return (
    <View style={styles.actionTile}>
      <Icon name={icon} size={22} color={palette.gold} />
      <Text variant="label" color={palette.cream}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

interface RewardRowProps {
  reward: Reward;
  balance: number;
}

function RewardRow({ reward, balance }: RewardRowProps) {
  const locked = balance < reward.cost;
  return (
    <Card padded style={styles.rewardRow}>
      <View
        style={[
          styles.rewardIcon,
          { backgroundColor: locked ? 'rgba(245,241,232,0.08)' : palette.gold },
        ]}
      >
        <Icon
          name={locked ? 'pole' : reward.icon}
          size={18}
          color={locked ? 'rgba(245,241,232,0.4)' : palette.ink}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold" color={palette.cream}>
          {reward.title}
        </Text>
        <Text variant="caption" color="rgba(245,241,232,0.6)">
          {reward.cost.toLocaleString()} pts
        </Text>
      </View>
      {locked ? (
        <Tag label="LOCKED" bg={palette.charcoal} color="rgba(245,241,232,0.55)" />
      ) : (
        <Tag label="REDEEM" bg={palette.gold} color={palette.ink} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  header: {
    gap: 4,
  },
  tierCard: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
    borderWidth: 0,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  tierTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  tierName: {
    fontFamily: fontFamilies.display,
    fontSize: 56,
    lineHeight: 56,
    color: palette.ink,
    marginTop: 2,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(14,14,16,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.ink,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionTile: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(245,241,232,0.06)',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(245,241,232,0.10)',
  },
  section: {
    gap: spacing.sm,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(245,241,232,0.04)',
    borderColor: 'rgba(245,241,232,0.10)',
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCard: {
    backgroundColor: 'rgba(245,241,232,0.04)',
    borderColor: 'rgba(245,241,232,0.10)',
    paddingVertical: 0,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(245,241,232,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foot: {
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
