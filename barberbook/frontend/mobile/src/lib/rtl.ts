/**
 * RTL helpers.
 *
 * RN's layout engine handles `marginStart` / `marginEnd` /
 * `paddingStart` / `paddingEnd` flips natively when `I18nManager.isRTL`
 * flips. The pieces it does NOT auto-flip are SVG icons (chevrons,
 * arrows) and explicit `Animated` translate values, so we expose:
 *
 *   - `useChevronIcon('forward')` → 'chevronRight' on LTR,
 *     'chevronLeft' on RTL.
 *   - `useDir()` → -1 on RTL, 1 on LTR — multiply your `translateX`
 *     by this to keep slide-ins coming from the leading edge.
 *
 * Existing screens already use `gap` + `padding` + `marginStart` (where
 * applicable) so the bulk of the layout is RTL-safe out of the box.
 */

import { useMemo } from 'react';
import { I18nManager } from 'react-native';

import type { IconName } from '../components/Icon';

type ChevronDirection = 'back' | 'forward' | 'up' | 'down';

const LTR_CHEVRON: Record<ChevronDirection, IconName> = {
  back: 'chevronLeft',
  forward: 'chevronRight',
  up: 'chevronDown',
  down: 'chevronDown',
};

const RTL_CHEVRON: Record<ChevronDirection, IconName> = {
  back: 'chevronRight',
  forward: 'chevronLeft',
  up: 'chevronDown',
  down: 'chevronDown',
};

/**
 * Returns the correct chevron name for the active layout direction.
 * "back" / "forward" are semantic, not directional — `back` always
 * points to the previous screen no matter the layout direction.
 */
export function useChevronIcon(direction: ChevronDirection): IconName {
  return useMemo(
    () => (I18nManager.isRTL ? RTL_CHEVRON[direction] : LTR_CHEVRON[direction]),
    [direction],
  );
}

/** -1 in RTL, +1 in LTR. Multiply translateX values by this. */
export function useDir(): -1 | 1 {
  return I18nManager.isRTL ? -1 : 1;
}

/** Picks one of two values based on the active layout direction. */
export function dirPick<T>(ltr: T, rtl: T): T {
  return I18nManager.isRTL ? rtl : ltr;
}
