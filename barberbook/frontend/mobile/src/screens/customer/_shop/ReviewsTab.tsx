import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useReviewsForShop } from '../../../api/hooks';
import type { Review } from '../../../api/types';
import { Card, Chip, Stars, Text } from '../../../components';
import { useTheme } from '../../../design/ThemeProvider';
import { palette, radii, spacing } from '../../../design/tokens';

interface Props {
  shopId: string;
}

type Filter = 'all' | '5' | 'photos' | 'with_response';

export function ReviewsTab({ shopId }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const reviewsQ = useReviewsForShop(shopId);
  const [filter, setFilter] = useState<Filter>('all');

  const reviews = reviewsQ.data ?? [];
  const filtered = useMemo(() => {
    switch (filter) {
      case '5':
        return reviews.filter((r) => r.rating === 5);
      case 'with_response':
        return reviews.filter((r) => !!r.reply);
      case 'photos':
        // No photo metadata yet — return all so the chip is harmless.
        return reviews;
      case 'all':
      default:
        return reviews;
    }
  }, [filter, reviews]);

  const histogram = useMemo(() => buildHistogram(reviews), [reviews]);
  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  if (reviewsQ.isLoading && !reviewsQ.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.red} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Card>
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <Text variant="labelSm" color={theme.muted}>
              {t('shop.reviews_avg').toUpperCase()}
            </Text>
            <Text variant="display" color={theme.text}>
              {avg ? avg.toFixed(1) : '—'}
            </Text>
            <Stars value={Math.round(avg)} size={14} />
            <Text variant="caption" color={theme.muted}>
              {t('shop.reviews_count', { n: reviews.length })}
            </Text>
          </View>

          <View style={styles.summaryRight}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = histogram[star] ?? 0;
              const max = Math.max(1, ...Object.values(histogram));
              const w = `${Math.round((count / max) * 100)}%` as const;
              return (
                <View key={star} style={styles.histRow}>
                  <Text variant="labelSm" color={theme.muted}>
                    {star}★
                  </Text>
                  <View style={[styles.histTrack, { backgroundColor: theme.line }]}>
                    <View style={[styles.histFill, { width: w, backgroundColor: palette.gold }]} />
                  </View>
                  <Text variant="labelSm" color={theme.muted}>
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </Card>

      <View style={styles.filterRow}>
        <Chip
          label={t('shop.reviews_filter_all')}
          active={filter === 'all'}
          onPress={() => {
            setFilter('all');
          }}
        />
        <Chip
          label={t('shop.reviews_filter_5')}
          active={filter === '5'}
          onPress={() => {
            setFilter('5');
          }}
        />
        <Chip
          label={t('shop.reviews_filter_with_photos')}
          active={filter === 'photos'}
          onPress={() => {
            setFilter('photos');
          }}
        />
        <Chip
          label={t('shop.reviews_with_response')}
          active={filter === 'with_response'}
          color={palette.gold}
          onPress={() => {
            setFilter('with_response');
          }}
        />
      </View>

      {filtered.length === 0 ? (
        <Card>
          <Text variant="caption" color={theme.muted}>
            {t('shop.reviews_empty')}
          </Text>
        </Card>
      ) : (
        filtered.map((r) => <ReviewRow key={r.name} review={r} />)
      )}
    </View>
  );
}

function buildHistogram(reviews: Review[]): Record<number, number> {
  const out: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) out[r.rating] = (out[r.rating] ?? 0) + 1;
  return out;
}

interface ReviewRowProps {
  review: Review;
}

function ReviewRow({ review }: ReviewRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Card>
      <View style={styles.reviewHead}>
        <Stars value={review.rating} size={13} />
        <Text variant="caption" color={theme.muted}>
          {review.creation.slice(0, 10)}
        </Text>
      </View>
      <Text variant="body" style={{ marginTop: spacing.xs }}>
        {review.body ?? ''}
      </Text>

      {review.reply != null && review.reply.length > 0 && (
        <View
          style={[
            styles.replyBlock,
            { borderColor: theme.line, backgroundColor: theme.surfaceAlt },
          ]}
        >
          <Text variant="labelSm" color={palette.red}>
            {t('shop.reviews_owner_reply', { name: 'BarberBook' }).toUpperCase()}
          </Text>
          <Text variant="body" style={{ marginTop: 2 }}>
            {review.reply}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryLeft: {
    width: 96,
    gap: spacing.xs,
  },
  summaryRight: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  histTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  histFill: {
    height: '100%',
    borderRadius: 3,
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
  replyBlock: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: palette.red,
    borderRadius: radii.sm,
  },
  center: {
    paddingVertical: spacing['3xl'],
    alignItems: 'center',
  },
});
