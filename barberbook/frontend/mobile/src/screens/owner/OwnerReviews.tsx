import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { qk, useReviewsForShop } from '../../api/hooks';
import { draftReviewResponse } from '../../api/resources';
import { replyToReview } from '../../api/resources/review';
import type { Review } from '../../api/types';
import {
  Button,
  Card,
  Chip,
  DenseHeader,
  Icon,
  ListRowSkeleton,
  SkeletonGroup,
  Stars,
  Text,
} from '../../components';
import { useTheme } from '../../design/ThemeProvider';
import { palette, radii, spacing } from '../../design/tokens';
import { fontFamilies } from '../../design/typography';
import { toast } from '../../lib/toast';

import { useActiveShop } from './_owner';

type Filter = 'all' | 'needs_reply' | 'low';

export function OwnerReviews() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const shop = useActiveShop();
  const reviewsQ = useReviewsForShop(shop);
  const [filter, setFilter] = useState<Filter>('all');

  const reviews = reviewsQ.data ?? [];
  const filtered = useMemo(() => {
    switch (filter) {
      case 'needs_reply':
        return reviews.filter((r) => !r.reply);
      case 'low':
        return reviews.filter((r) => r.rating <= 3);
      case 'all':
      default:
        return reviews;
    }
  }, [filter, reviews]);

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const needsReply = reviews.filter((r) => !r.reply).length;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="auto" />
      <DenseHeader kicker="WHAT CUSTOMERS SAY" title={t('owner.reviews_title')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Score header */}
        <Card padded style={styles.scoreCard}>
          <View>
            <Text variant="labelSm" color={theme.muted}>
              {t('owner.reviews_score', { score: avg.toFixed(1) }).toUpperCase()}
            </Text>
            <Text style={styles.scoreNumber}>{avg.toFixed(1)}</Text>
            <Stars value={Math.round(avg)} size={14} />
          </View>
          <View style={styles.scoreRight}>
            <Text variant="caption" color={theme.muted}>
              {t('owner.reviews_count', { n: reviews.length })}
            </Text>
            {needsReply > 0 && (
              <Pressable
                onPress={() => {
                  setFilter('needs_reply');
                }}
                style={[styles.needsReplyBadge, { backgroundColor: palette.red }]}
              >
                <Text variant="label" color={palette.cream}>
                  {needsReply} NEEDS REPLY
                </Text>
              </Pressable>
            )}
          </View>
        </Card>

        {/* Filters */}
        <View style={styles.filterRow}>
          <Chip
            label={t('owner.reviews_filter_all')}
            active={filter === 'all'}
            onPress={() => {
              setFilter('all');
            }}
          />
          <Chip
            label={t('owner.reviews_filter_needs_reply')}
            active={filter === 'needs_reply'}
            color={palette.red}
            onPress={() => {
              setFilter('needs_reply');
            }}
          />
          <Chip
            label={t('owner.reviews_filter_low')}
            active={filter === 'low'}
            color={palette.gold}
            onPress={() => {
              setFilter('low');
            }}
          />
        </View>

        {reviewsQ.isLoading && !reviewsQ.data ? (
          <SkeletonGroup count={3}>
            <ListRowSkeleton height={120} />
          </SkeletonGroup>
        ) : filtered.length === 0 ? (
          <Card>
            <Text variant="caption" color={theme.muted}>
              No reviews matching this filter.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.md }}>
            {filtered.map((r) => (
              <ReviewRow key={r.name} review={r} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ReviewRowProps {
  review: Review;
}

function ReviewRow({ review }: ReviewRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();

  const [replyText, setReplyText] = useState(review.reply ?? '');
  const [drafting, setDrafting] = useState(false);

  const replyMut = useMutation({
    mutationFn: (body: string) => replyToReview(review.name, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reviews.forShop(review.shop) }),
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Could not send reply'),
  });

  const draftMut = useMutation({
    mutationFn: () =>
      draftReviewResponse({
        review: review.name,
        tone: review.rating >= 4 ? 'grateful' : 'apologetic',
      }),
    onMutate: () => {
      setDrafting(true);
    },
    onSettled: () => {
      setDrafting(false);
    },
    onSuccess: (res) => {
      setReplyText(res.draft);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Could not draft a response'),
  });

  return (
    <Card padded>
      <View style={styles.reviewHead}>
        <Stars value={review.rating} size={13} />
        <Text variant="caption" color={theme.muted}>
          {review.creation.slice(0, 10)}
        </Text>
      </View>
      <Text variant="body" style={{ marginTop: spacing.xs }}>
        {review.body ?? ''}
      </Text>

      {review.reply ? (
        <View
          style={[
            styles.repliedBlock,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.line },
          ]}
        >
          <Text variant="labelSm" color={palette.red}>
            YOUR REPLY · {review.reply_at?.slice(0, 10) ?? ''}
          </Text>
          <Text variant="body" style={{ marginTop: 4 }}>
            {review.reply}
          </Text>
        </View>
      ) : (
        <View style={styles.replyBlock}>
          <View
            style={[
              styles.replyInput,
              { borderColor: theme.lineStrong, backgroundColor: theme.surface },
            ]}
          >
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder={t('owner.reviews_reply_placeholder')}
              placeholderTextColor={theme.muted}
              multiline
              style={[styles.replyInputText, { color: theme.text, fontFamily: fontFamilies.body }]}
            />
          </View>

          <View style={styles.replyActions}>
            <Button
              size="sm"
              variant="ghost"
              label={drafting ? t('owner.reviews_drafting') : t('owner.reviews_ai_draft')}
              loading={drafting}
              leading={<Icon name="star" size={14} />}
              onPress={() => {
                draftMut.mutate();
              }}
            />
            <Button
              size="sm"
              variant="red"
              label={t('owner.reviews_send')}
              disabled={replyText.trim().length === 0 || replyMut.isPending}
              loading={replyMut.isPending}
              onPress={() => {
                replyMut.mutate(replyText.trim());
              }}
            />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  scoreNumber: {
    fontFamily: fontFamilies.display,
    fontSize: 64,
    lineHeight: 64,
    color: palette.ink,
    letterSpacing: 1,
    marginVertical: 4,
  },
  scoreRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  needsReplyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reviewHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repliedBlock: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: palette.red,
    borderRadius: radii.sm,
  },
  replyBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  replyInput: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
  },
  replyInputText: {
    minHeight: 64,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
