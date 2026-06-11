import { rpc } from '../client';
import type { Review } from '../types';

import { makeRepo } from './_factory';

export const reviewRepo = makeRepo<Review>('BB Review');

export function listReviewsForShop(shop: string, limit = 25): Promise<Review[]> {
  return reviewRepo.list({
    filters: [['shop', '=', shop]],
    order_by: 'creation desc',
    limit_page_length: limit,
  });
}

export interface SubmitReviewPayload {
  booking?: string;
  shop: string;
  barber?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body?: string;
}

export function submitReview(payload: SubmitReviewPayload): Promise<Review> {
  return rpc<Review>('barberbook.api.review.submit', payload);
}

export function replyToReview(name: string, reply: string): Promise<Review> {
  return rpc<Review>('barberbook.api.review.reply', { name, reply });
}
