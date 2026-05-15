import { rpc } from '../client';
import type { Roster, RosterShift } from '../types';

import { makeRepo } from './_factory';

export const rosterRepo = makeRepo<Roster>('BB Roster');

export function getCurrentRoster(shop: string): Promise<Roster | null> {
  return rosterRepo
    .list({
      filters: [
        ['shop', '=', shop],
        ['status', '=', 'Published'],
      ],
      order_by: 'week_starting desc',
      limit_page_length: 1,
    })
    .then((rows) => rows[0] ?? null);
}

/**
 * Server-side conflict check (overlapping shifts on the same seat, etc.).
 * The mobile UI uses this on the roster builder before publishing.
 */
export interface RosterConflict {
  day: RosterShift['day'];
  start_time: string;
  end_time: string;
  seat: string;
  reason: string;
}

export function checkRosterConflicts(
  shop: string,
  shifts: RosterShift[],
): Promise<RosterConflict[]> {
  return rpc<RosterConflict[]>('barberbook.api.roster.check_conflicts', { shop, shifts });
}
