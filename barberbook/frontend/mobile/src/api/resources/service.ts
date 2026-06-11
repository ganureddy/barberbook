import type { Service } from '../types';

import { makeRepo } from './_factory';

export const serviceRepo = makeRepo<Service>('BB Service');

export function listServicesForShop(shop: string): Promise<Service[]> {
  return serviceRepo.list({
    filters: [
      ['shop', '=', shop],
      ['is_active', '=', 1],
    ],
    order_by: 'category asc, service_name asc',
    limit_page_length: 100,
  });
}
