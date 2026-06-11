import type { Seat } from '../types';

import { makeRepo } from './_factory';

export const seatRepo = makeRepo<Seat>('BB Seat');

export function listSeatsForShop(shop: string): Promise<Seat[]> {
  return seatRepo.list({
    filters: [
      ['shop', '=', shop],
      ['is_active', '=', 1],
    ],
    order_by: 'seat_number asc',
    limit_page_length: 50,
  });
}
