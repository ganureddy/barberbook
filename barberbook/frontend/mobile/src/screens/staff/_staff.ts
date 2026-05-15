/**
 * Active barber id. In a real session this comes from
 * `useAuthStore.user.staff_link → BB Barber.name`; for the scaffold we
 * pin to the canvas's first fixture so every staff screen has data.
 */
export const ACTIVE_BARBER = 'BB-BAR-2001';

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
