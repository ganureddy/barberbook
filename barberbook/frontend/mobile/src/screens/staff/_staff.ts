import { useWorkspaceStore } from '../../store/useWorkspaceStore';

/**
 * Fallback barber id (first canvas fixture) used only when the barber hasn't
 * picked a workspace yet.
 */
export const ACTIVE_BARBER = 'BB-BAR-2001';

/**
 * The BB Barber row the staff user is currently operating as. A barber can
 * work in multiple shops (one BB Barber row each); the selection lives in
 * `useWorkspaceStore` and is chosen on the BarberShops picker.
 */
export function useActiveBarber(): string {
  return useWorkspaceStore((s) => s.activeBarberId) ?? ACTIVE_BARBER;
}

/** The shop the active barber row belongs to. */
export function useActiveWorkShop(): string | null {
  return useWorkspaceStore((s) => s.activeWorkShopId);
}

/** Pretty-prints minutes as "Xh Ym". */
export function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.max(0, min)}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function timeOfDayKey(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
