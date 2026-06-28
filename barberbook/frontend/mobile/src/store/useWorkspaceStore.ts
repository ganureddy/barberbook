/**
 * Workspace selection state.
 *
 * Owners can run more than one shop and barbers can work in more than one
 * shop, so the app needs a notion of the *currently selected* workspace —
 * separate from auth (which only knows the role). This store holds:
 *
 *   - `activeShopId`        — the shop an Owner is currently managing.
 *   - `activeBarberId`      — the BB Barber row a Staff user is currently
 *                             operating as (one row per shop they work in).
 *   - `activeWorkShopId`    — the shop that `activeBarberId` belongs to.
 *
 * Selections are persisted (per device) via the MMKV/`kv` shim so a returning
 * user lands straight back in the workspace they last used. They are cleared
 * on logout (see `useAuthStore.logout`, which calls `resetWorkspace`).
 */

import { create } from 'zustand';

import { kv } from '../design/storage';

const SHOP_KEY = 'barberbook.workspace.shop.v1';
const BARBER_KEY = 'barberbook.workspace.barber.v1';
const WORK_SHOP_KEY = 'barberbook.workspace.workshop.v1';

interface WorkspaceStore {
  activeShopId: string | null;
  activeBarberId: string | null;
  activeWorkShopId: string | null;

  /** Re-read the persisted selections. Safe to call multiple times. */
  hydrate: () => void;

  setActiveShop: (shopId: string | null) => void;
  setActiveBarber: (barberId: string | null, shopId: string | null) => void;
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  activeShopId: null,
  activeBarberId: null,
  activeWorkShopId: null,

  hydrate() {
    set({
      activeShopId: kv.getString(SHOP_KEY) ?? null,
      activeBarberId: kv.getString(BARBER_KEY) ?? null,
      activeWorkShopId: kv.getString(WORK_SHOP_KEY) ?? null,
    });
  },

  setActiveShop(shopId) {
    if (shopId) kv.set(SHOP_KEY, shopId);
    else kv.delete(SHOP_KEY);
    set({ activeShopId: shopId });
  },

  setActiveBarber(barberId, shopId) {
    if (barberId) kv.set(BARBER_KEY, barberId);
    else kv.delete(BARBER_KEY);
    if (shopId) kv.set(WORK_SHOP_KEY, shopId);
    else kv.delete(WORK_SHOP_KEY);
    set({ activeBarberId: barberId, activeWorkShopId: shopId });
  },

  resetWorkspace() {
    kv.delete(SHOP_KEY);
    kv.delete(BARBER_KEY);
    kv.delete(WORK_SHOP_KEY);
    set({ activeShopId: null, activeBarberId: null, activeWorkShopId: null });
  },
}));
