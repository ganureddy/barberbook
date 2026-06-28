/**
 * Owner-side shared utilities.
 *
 * An owner can run more than one shop, so the "active shop" is a runtime
 * selection held in `useWorkspaceStore` (chosen on the OwnerShops picker or
 * right after onboarding a new shop). `useActiveShop()` reads it; the
 * `ACTIVE_SHOP` constant remains only as a last-resort fallback so a screen
 * never queries with an empty id during the brief window before a selection
 * is hydrated.
 */

import { useWorkspaceStore } from '../../store/useWorkspaceStore';

/** Fallback shop id (first canvas fixture) used only when nothing is selected. */
export const ACTIVE_SHOP = 'BB-SHOP-00001';

/** The shop the owner is currently managing. */
export function useActiveShop(): string {
  return useWorkspaceStore((s) => s.activeShopId) ?? ACTIVE_SHOP;
}
