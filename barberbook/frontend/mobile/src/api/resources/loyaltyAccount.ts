import { rpc } from '../client';
import type { LoyaltyAccount } from '../types';

import { makeRepo } from './_factory';

export const loyaltyAccountRepo = makeRepo<LoyaltyAccount>('BB Loyalty Account');

export function getMyLoyaltyForShop(shop: string): Promise<LoyaltyAccount | null> {
  return loyaltyAccountRepo
    .list({
      filters: [['shop', '=', shop]],
      order_by: 'modified desc',
      limit_page_length: 1,
    })
    .then((rows) => rows[0] ?? null);
}

export interface RedeemPayload {
  shop: string;
  points: number;
}

export interface RedeemResult {
  account: LoyaltyAccount;
  /** Currency-denominated value of the redemption. */
  redeemed_value: number;
}

export function redeemPoints(payload: RedeemPayload): Promise<RedeemResult> {
  return rpc<RedeemResult>('barberbook.api.loyalty.redeem', payload);
}
