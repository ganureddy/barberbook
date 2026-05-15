import { rpc } from '../client';
import type { WalkinTicket } from '../types';

import { makeRepo } from './_factory';

export const walkinTicketRepo = makeRepo<WalkinTicket>('BB Walkin Ticket');

export interface JoinWalkinPayload {
  shop: string;
  customer_phone?: string;
}

export function joinWalkinQueue(payload: JoinWalkinPayload): Promise<WalkinTicket> {
  return rpc<WalkinTicket>('barberbook.api.walkin.join', payload);
}

export function cancelWalkinTicket(name: string): Promise<WalkinTicket> {
  return rpc<WalkinTicket>('barberbook.api.walkin.cancel', { name });
}

export interface WalkinSnapshot {
  shop: string;
  total_in_queue: number;
  next_token: string | null;
  estimated_wait_minutes: number;
  tickets: WalkinTicket[];
}

export function getWalkinSnapshot(shop: string): Promise<WalkinSnapshot> {
  return rpc<WalkinSnapshot>('barberbook.api.walkin.snapshot', { shop });
}
