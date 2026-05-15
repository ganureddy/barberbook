/**
 * Generic CRUD factory for Frappe DocTypes. Most resource files just
 * `export const shopRepo = makeRepo<Shop>('BB Shop');` — they stay tiny
 * and uniform. Domain-specific endpoints (e.g. `findNearby`) live on the
 * individual files alongside the factory output.
 */

import { encodeListParams, rpc, rpcGet } from '../client';
import type { FrappeBaseDoc, ListParams } from '../types';

export interface Repo<T extends FrappeBaseDoc> {
  doctype: string;
  list: (params?: ListParams<T>) => Promise<T[]>;
  count: (params?: ListParams<T>) => Promise<number>;
  get: (name: string) => Promise<T>;
  create: (doc: Partial<T> & { doctype?: string }) => Promise<T>;
  update: (name: string, patch: Partial<T>) => Promise<T>;
  remove: (name: string) => Promise<void>;
}

export function makeRepo<T extends FrappeBaseDoc>(doctype: string): Repo<T> {
  return {
    doctype,

    async list(params) {
      return await rpcGet<T[]>('frappe.client.get_list', {
        doctype,
        ...encodeListParams<T>(params),
      });
    },

    async count(params) {
      return await rpcGet<number>('frappe.client.get_count', {
        doctype,
        ...encodeListParams<T>(params),
      });
    },

    async get(name) {
      return await rpcGet<T>('frappe.client.get', { doctype, name });
    },

    async create(doc) {
      return await rpc<T>('frappe.client.insert', {
        doc: { doctype, ...doc },
      });
    },

    async update(name, patch) {
      return await rpc<T>('frappe.client.set_value', {
        doctype,
        name,
        fieldname: patch as Record<string, unknown>,
      });
    },

    async remove(name) {
      await rpc<unknown>('frappe.client.delete', { doctype, name });
    },
  };
}
