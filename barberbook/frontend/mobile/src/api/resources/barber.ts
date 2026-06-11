import type { Barber } from '../types';

import { makeRepo } from './_factory';

export const barberRepo = makeRepo<Barber>('BB Barber');

export function listBarbersForShop(shop: string): Promise<Barber[]> {
  return barberRepo.list({
    filters: [
      ['shop', '=', shop],
      ['is_active', '=', 1],
    ],
    order_by: 'rating desc, full_name asc',
    limit_page_length: 50,
  });
}
